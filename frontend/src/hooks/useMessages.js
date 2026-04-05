/**
 * Messages Hooks Module
 *
 * Provides React Query hooks for messaging with real-time WebSocket integration.
 * This is the most complex hook module as it combines:
 * - React Query for caching and state management
 * - WebSocket events for real-time updates
 * - Optimistic updates for instant UI feedback
 *
 * Key Features:
 * - Real-time message delivery via WebSocket
 * - Conversations cached and updated incrementally
 * - Optimistic updates: Sent messages appear instantly
 * - Automatic cache updates when receiving new messages
 *
 * Available Hooks:
 * - useConversations(): Get all conversations with real-time updates
 * - useConversation(userId): Get messages with specific user
 * - useSendMessage(): Mutation to send a message
 * - useSearchUsers(query): Search for users to message
 *
 * WebSocket Events Handled:
 * - new_message: Incoming message from another user
 * - messages_read: Read receipt for sent messages
 *
 * Usage:
 *   const { data: conversations } = useConversations();
 *   const sendMutation = useSendMessage();
 *   sendMutation.mutate({ recipientId: 1, content: 'Hello!' });
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  getConversations,
  getConversation,
  sendMessage,
  searchUsersForMessages,
} from '../api/messages';
import { useSocketEvent } from '../contexts/SocketContext';
import { STALE_TIMES, GC_TIMES } from '../config/cache';

// =============================================================================
// Query Keys
// =============================================================================

export const messageKeys = {
  // Base key for all message queries
  all: ['messages'],

  // Key for conversations list
  conversations: () => [...messageKeys.all, 'conversations'],

  // Key for specific conversation
  conversation: (userId) => [...messageKeys.all, 'conversation', userId],

  // Key for user search
  userSearch: (query) => [...messageKeys.all, 'userSearch', query],

  // Key for unread message count (used by NavBar badge)
  unreadCount: () => [...messageKeys.all, 'unreadCount'],
};

/**
 * When GET /conversations includes recentConversation, seed the per-thread cache
 * so opening the latest chat does not wait on a second request.
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {object} data - API response from getConversations()
 */
function seedRecentConversationCache(queryClient, data) {
  const rc = data?.recentConversation;
  const uid = rc?.user?.id;
  if (uid == null) return;

  queryClient.setQueryData(messageKeys.conversation(uid), {
    success: true,
    user: rc.user,
    messages: rc.messages ?? [],
  });
}

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * useConversations Hook
 *
 * Fetches all conversations and sets up real-time WebSocket updates.
 * When a new message arrives, the cache is updated automatically.
 *
 * @returns {object} React Query result with conversations array
 *
 * Real-time Behavior:
 * - New messages update the conversation list automatically
 * - Conversation with new message moves to top
 * - Unread indicator appears for incoming messages
 *
 * @example
 * function ConversationList() {
 *   const { data: conversations, isLoading } = useConversations();
 *
 *   return conversations?.map(conv => (
 *     <ConversationItem key={conv.otherUser.id} {...conv} />
 *   ));
 * }
 */
export function useConversations() {
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // WebSocket Event Handler: New Message
  // ---------------------------------------------------------------------------
  // When we receive a new message, update the conversations list cache.
  // This provides real-time updates without polling.

  useSocketEvent('new_message', useCallback((data) => {
    // Update conversations list with new message
    queryClient.setQueryData(messageKeys.conversations(), (oldConversations) => {
      if (!oldConversations?.conversations) return oldConversations;

      const senderId = data.conversation?.sender_id || data.message?.sender_id;
      const lastMessage = createLastMessageObject(
        data.message.content,
        data.message.timestamp || 'Just now',
        false
      );

      if (conversationExists(oldConversations.conversations, senderId)) {
        // Existing conversation: Update and move to top
        const updatedConversations = updateConversationAndMoveToTop(
          oldConversations.conversations,
          senderId,
          lastMessage
        );

        // Mark the updated conversation as unread (it's now at index 0)
        updatedConversations[0] = { ...updatedConversations[0], hasUnread: true };

        return {
          ...oldConversations,
          conversations: updatedConversations,
        };
      } else {
        // New conversation: Add to top
        const userData = {
          id: senderId,
          name: data.conversation?.sender_name || 'Unknown',
          avatar: data.conversation?.sender_avatar,
          university: data.conversation?.sender_university || 'University',
        };

        const newConversation = {
          otherUser: {
            id: userData.id,
            name: userData.name,
            avatar: userData.avatar,
            university: userData.university,
          },
          lastMessage,
          hasUnread: true,
        };

        return {
          ...oldConversations,
          conversations: [newConversation, ...oldConversations.conversations],
        };
      }
    });

    // Invalidate the specific conversation so it refetches when opened.
    // When the user is viewing this conversation, useConversation adds the
    // message in real-time. When they're not, invalidation ensures a fresh
    // refetch on open. Avoids stale/missing messages when switching back.
    const senderId = data.message?.sender_id;
    if (senderId != null) {
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversation(senderId),
      });
    }
  }, [queryClient]));

  // ---------------------------------------------------------------------------
  // Query Configuration
  // ---------------------------------------------------------------------------

  return useQuery({
    queryKey: messageKeys.conversations(),
    queryFn: async () => {
      const data = await getConversations();
      seedRecentConversationCache(queryClient, data);
      return data;
    },

    // WebSocket handles real-time updates, so staleTime is just a safety net
    // for reconnection scenarios or multi-device sync
    staleTime: STALE_TIMES.CONVERSATIONS,

    // Keep conversations in cache for quick access
    gcTime: GC_TIMES.CONVERSATIONS,

    // Always refetch in background on mount to catch messages that arrived
    // between prefetch and page open. Cached data renders immediately while
    // the refetch runs, so there's no loading flash.
    refetchOnMount: 'always',
  });
}

/**
 * useConversation Hook
 *
 * Fetches messages for a specific conversation and handles real-time updates.
 *
 * @param {number|string} userId - The other user's ID
 * @returns {object} React Query result with user info and messages
 *
 * @example
 * function ConversationView({ userId }) {
 *   const { data, isLoading } = useConversation(userId);
 *
 *   return data?.messages?.map(msg => (
 *     <Message key={msg.id} {...msg} />
 *   ));
 * }
 */
export function useConversation(userId) {
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // WebSocket Event Handler: New Message
  // ---------------------------------------------------------------------------
  // Update this specific conversation when a new message arrives

  useSocketEvent('new_message', useCallback((data) => {
    // Only update if message is from/to the user we're viewing
    const messageUserId = data.message?.sender_id;
    if (messageUserId && messageUserId === parseInt(userId)) {
      queryClient.setQueryData(messageKeys.conversation(userId), (oldData) => {
        if (!oldData?.messages) return oldData;

        // Avoid duplicates (in case we also sent and got optimistic update)
        const exists = oldData.messages.some((m) => m.id === data.message.id);
        if (exists) return oldData;

        return {
          ...oldData,
          messages: [...oldData.messages, data.message],
        };
      });
    }
  }, [userId, queryClient]));

  return useQuery({
    queryKey: messageKeys.conversation(userId),
    queryFn: () => getConversation(userId),

    // Only fetch if we have a valid userId
    enabled: !!userId,

    // Short stale time for active conversations
    staleTime: STALE_TIMES.CONVERSATION,

    // Always refetch in background on mount to ensure fresh messages,
    // even if cached data exists from a previous visit or prefetch.
    refetchOnMount: 'always',
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * useSendMessage Hook
 *
 * Mutation hook for sending messages with optimistic updates.
 * Message appears instantly in UI before API confirms.
 *
 * Optimistic Update Flow:
 * 1. User clicks send → Message appears in conversation immediately
 * 2. API call sent in background
 * 3a. Success → Update with server message ID
 * 3b. Failure → Remove optimistic message, show error
 *
 * @returns {object} React Query mutation result
 *
 * @example
 * const sendMutation = useSendMessage();
 *
 * const handleSend = () => {
 *   sendMutation.mutate({
 *     recipientId: userId,
 *     content: messageText,
 *   });
 * };
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recipientId, content }) => sendMessage(recipientId, content),

    // -------------------------------------------------------------------------
    // Optimistic Update
    // -------------------------------------------------------------------------
    onMutate: async ({ recipientId, content, recipientUser }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: messageKeys.conversation(recipientId),
      });
      await queryClient.cancelQueries({
        queryKey: messageKeys.conversations(),
      });

      // Snapshot for rollback
      const previousConversation = queryClient.getQueryData(
        messageKeys.conversation(recipientId)
      );
      const previousConversations = queryClient.getQueryData(
        messageKeys.conversations()
      );

      // Create optimistic message with temporary ID
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        content,
        timestamp: 'Just now',
        isSentByCurrentUser: true,
        isRead: false,
      };

      // Update conversation messages
      // Check if conversation data exists in cache
      const existingConversationData = queryClient.getQueryData(
        messageKeys.conversation(recipientId)
      );

      if (!existingConversationData?.messages) {
        // Conversation doesn't exist yet - create it with just the optimistic message
        queryClient.setQueryData(messageKeys.conversation(recipientId), {
          messages: [optimisticMessage],
        });
      } else {
        // Conversation exists - append the optimistic message
        queryClient.setQueryData(
          messageKeys.conversation(recipientId),
          (oldData) => {
            if (!oldData?.messages) return oldData;
            return {
              ...oldData,
              messages: [...oldData.messages, optimisticMessage],
            };
          }
        );
      }

      // Update conversations list
      queryClient.setQueryData(messageKeys.conversations(), (oldData) => {
        if (!oldData?.conversations) return oldData;

        // Check if conversation already exists
        if (conversationExists(oldData.conversations, recipientId)) {
          // Conversation exists - update it and move to top
          const lastMessage = createLastMessageObject(content);
          const updatedConversations = updateConversationAndMoveToTop(
            oldData.conversations,
            recipientId,
            lastMessage
          );

          return {
            ...oldData,
            conversations: updatedConversations,
          };
        } else if (recipientUser) {
          // New conversation with known user data - add optimistically
          const lastMessage = createLastMessageObject(content);
          const newConversation = {
            otherUser: {
              id: recipientUser.id,
              name: recipientUser.name,
              avatar: recipientUser.avatar,
              university: recipientUser.university || '',
            },
            lastMessage,
            hasUnread: false,
          };
          return {
            ...oldData,
            conversations: [newConversation, ...oldData.conversations],
          };
        } else {
          return oldData;
        }
      });

      return { previousConversation, previousConversations, optimisticMessage };
    },

    // -------------------------------------------------------------------------
    // Error Handling (Rollback)
    // -------------------------------------------------------------------------
    onError: (err, { recipientId }, context) => {
      // Rollback to previous state
      if (context?.previousConversation) {
        queryClient.setQueryData(
          messageKeys.conversation(recipientId),
          context.previousConversation
        );
      }
      if (context?.previousConversations) {
        queryClient.setQueryData(
          messageKeys.conversations(),
          context.previousConversations
        );
      }
    },

    // -------------------------------------------------------------------------
    // Success Handler
    // -------------------------------------------------------------------------
    onSuccess: async (result, { recipientId }, context) => {
      // Replace optimistic message with real message from server
      queryClient.setQueryData(
        messageKeys.conversation(recipientId),
        (oldData) => {
          if (!oldData?.messages) return oldData;

          return {
            ...oldData,
            messages: oldData.messages.map((msg) => {
              if (msg.id === context.optimisticMessage.id) {
                return {
                  ...result.message,
                  isSentByCurrentUser: true,
                };
              }
              return msg;
            }),
          };
        }
      );

      // Check if conversation exists in conversations list
      const conversationsData = queryClient.getQueryData(
        messageKeys.conversations()
      );

      const exists = conversationExists(
        conversationsData?.conversations,
        recipientId
      );

      if (!exists) {
        // Conversation doesn't exist - fetch user info and add to conversations list
        try {
          const conversationData = await getConversation(recipientId);

          if (conversationData?.user) {
            // Create the new conversation object
            const lastMessage = createLastMessageObject(
              result.message.content,
              result.message.timestamp || 'Just now',
              true
            );

            const newConversation = {
              otherUser: {
                id: conversationData.user.id,
                name: conversationData.user.name,
                avatar: conversationData.user.avatar,
                university: conversationData.user.university || 'University',
              },
              lastMessage,
              hasUnread: false,
            };

            // Add new conversation to the top of the list
            queryClient.setQueryData(messageKeys.conversations(), (oldData) => {
              const previousConversations = oldData?.conversations || [];
              const conversationsData = addConversationToTop(
                newConversation,
                previousConversations
              );

              // If there was old data, preserve it, otherwise use the new structure
              return oldData
                ? { ...oldData, conversations: conversationsData.conversations }
                : conversationsData;
            });
          }
        } catch (error) {
          // If fetching user info fails, silently continue
          // The conversation will appear after refresh anyway
          console.error('Failed to fetch user info for new conversation:', error);
        }
      } else {
        // Conversation exists - update the last message and move to top
        queryClient.setQueryData(messageKeys.conversations(), (oldData) => {
          if (!oldData?.conversations) return oldData;

          const lastMessage = createLastMessageObject(
            result.message.content,
            result.message.timestamp || 'Just now',
            true
          );

          const updatedConversations = updateConversationAndMoveToTop(
            oldData.conversations,
            recipientId,
            lastMessage
          );

          return {
            ...oldData,
            conversations: updatedConversations,
          };
        });
      }
    },
  });
}

/**
 * useSearchUsers Hook
 *
 * Search for users to start a new conversation.
 * Debounced and cached by query string.
 *
 * @param {string} query - Search query (min 2 characters)
 * @returns {object} React Query result with users array
 *
 * @example
 * function RecipientSearch() {
 *   const [query, setQuery] = useState('');
 *   const { data: users, isFetching } = useSearchUsers(query);
 *
 *   return (
 *     <>
 *       <input value={query} onChange={(e) => setQuery(e.target.value)} />
 *       {users?.map(user => <UserOption key={user.id} {...user} />)}
 *     </>
 *   );
 * }
 */
export function useSearchUsers(query) {
  return useQuery({
    queryKey: messageKeys.userSearch(query),
    queryFn: () => searchUsersForMessages(query),

    // Only search if query is long enough
    enabled: query?.length >= 2,

    // Cache search results briefly
    staleTime: STALE_TIMES.USER_SEARCH,

    // Transform response
    select: (data) => data?.users || [],
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Find the index of a conversation by user ID
 *
 * @param {Array} conversations - Array of conversation objects
 * @param {number} userId - The user ID to search for
 * @returns {number} Index of the conversation, or -1 if not found
 */
function findConversationIndex(conversations, userId) {
  if (!conversations) return -1;
  return conversations.findIndex((conv) => conv.otherUser.id === userId);
}

/**
 * Check if a conversation exists in the conversations list
 *
 * @param {Array} conversations - Array of conversation objects
 * @param {number} userId - The user ID to check for
 * @returns {boolean} True if conversation exists, false otherwise
 */
function conversationExists(conversations, userId) {
  return findConversationIndex(conversations, userId) >= 0;
}

/**
 * Create a lastMessage object
 *
 * @param {string} content - Message content
 * @param {string} timestamp - Message timestamp (defaults to 'Just now')
 * @param {boolean} isSentByCurrentUser - Whether message was sent by current user
 * @returns {object} lastMessage object
 */
function createLastMessageObject(content, timestamp = 'Just now', isSentByCurrentUser = true) {
  return {
    content,
    timestamp,
    isSentByCurrentUser,
  };
}

/**
 * Update a conversation's last message and move it to the top of the list
 *
 * @param {Array} conversations - Array of conversation objects
 * @param {number} recipientId - The user ID of the conversation to update
 * @param {object} lastMessage - The new lastMessage object
 * @returns {Array} New array with updated conversation moved to top
 */
function updateConversationAndMoveToTop(conversations, recipientId, lastMessage) {
  const index = findConversationIndex(conversations, recipientId);

  if (index < 0) {
    // Conversation doesn't exist, return original array
    return conversations;
  }

  // Create updated conversation
  const updated = {
    ...conversations[index],
    lastMessage,
  };

  // Move to top: remove from current position and add to beginning
  return [
    updated,
    ...conversations.filter((_, i) => i !== index),
  ];
}

/**
 * Add a new conversation to the top of the conversations list
 *
 * Creates the conversations data structure with the new conversation at the top.
 * Handles both cases: when there are no previous conversations and when there are.
 *
 * @param {object} newConversation - The new conversation object to add
 * @param {Array} previousConversations - Optional array of existing conversations
 * @returns {object} The conversations data structure
 */
function addConversationToTop(newConversation, previousConversations = []) {
  return {
    success: true,
    conversations: [newConversation, ...previousConversations],
  };
}

/**
 * Mark conversation as read in cache
 *
 * Called when user opens a conversation to clear unread indicator.
 *
 * @param {QueryClient} queryClient - The query client
 * @param {number} userId - The other user's ID
 */
export function markConversationRead(queryClient, userId) {
  queryClient.setQueryData(messageKeys.conversations(), (oldData) => {
    if (!oldData?.conversations) return oldData;

    return {
      ...oldData,
      conversations: oldData.conversations.map((conv) => {
        if (conv.otherUser.id === userId) {
          return { ...conv, hasUnread: false };
        }
        return conv;
      }),
    };
  });
}

// =============================================================================
// Unread Conversations Tracking
// =============================================================================

/**
 * useUnreadCount Hook
 *
 * Tracks a list of conversation user IDs that have unread messages.
 * Designed to be used in the NavBar (always mounted) so the unread
 * badge updates in real time regardless of which page the user is on.
 *
 * How it works:
 * - Seeded from the conversations cache (conversations with hasUnread: true)
 * - WebSocket `new_message` events add the sender's ID to the list
 * - clearUnreadConversation() removes an ID when the user opens that chat
 * - Badge shows when the list is non-empty
 *
 * The list is stored in the React Query cache under messageKeys.unreadCount()
 * with staleTime: Infinity so it's fully managed via setQueryData — no
 * polling or server round-trips needed to clear the badge.
 *
 * @returns {number} The number of conversations with unread messages
 *
 * @example
 * function NavBar() {
 *   const unreadCount = useUnreadCount();
 *   return unreadCount > 0 ? <UnreadDot /> : null;
 * }
 */
export function useUnreadCount() {
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // WebSocket: Add sender to unread set when a new message arrives
  // ---------------------------------------------------------------------------
  useSocketEvent('new_message', useCallback((data) => {
    const senderId = data.conversation?.sender_id || data.message?.sender_id;
    if (!senderId) return;

    queryClient.setQueryData(messageKeys.unreadCount(), (old = []) => {
      if (old.includes(senderId)) return old;
      return [...old, senderId];
    });
  }, [queryClient]));

  // ---------------------------------------------------------------------------
  // Query: Subscribe to the unread IDs list in cache
  // ---------------------------------------------------------------------------
  const { data: unreadIds = [] } = useQuery({
    queryKey: messageKeys.unreadCount(),
    queryFn: () => {
      // Fallback: derive from conversations cache if available
      const convData = queryClient.getQueryData(messageKeys.conversations());
      if (!convData?.conversations) return [];
      return convData.conversations
        .filter((c) => c.hasUnread)
        .map((c) => c.otherUser.id);
    },

    // Fully managed via setQueryData — never auto-refetch
    staleTime: Infinity,
    gcTime: GC_TIMES.CONVERSATIONS,
  });

  return unreadIds.length;
}

/**
 * Remove a conversation from the unread list
 *
 * Call this when the user opens a conversation to clear its unread state
 * from the NavBar badge. If the list becomes empty, the badge disappears.
 *
 * @param {QueryClient} queryClient - The query client
 * @param {number} userId - The other user's ID in the conversation
 */
export function clearUnreadConversation(queryClient, userId) {
  queryClient.setQueryData(messageKeys.unreadCount(), (old = []) => {
    return old.filter((id) => id !== userId);
  });
}

// =============================================================================
// Prefetch Utilities
// =============================================================================

/**
 * Prefetch conversations list
 *
 * Call this to preload the conversations list into cache before the user
 * navigates to the MessagesPage. Data will be instantly available.
 *
 * @param {QueryClient} queryClient - The query client instance
 *
 * @example
 * // Prefetch conversations at app startup
 * prefetchConversations(queryClient);
 */
export function prefetchConversations(queryClient) {
  return queryClient.prefetchQuery({
    queryKey: messageKeys.conversations(),
    queryFn: async () => {
      const data = await getConversations();
      seedRecentConversationCache(queryClient, data);
      return data;
    },
    staleTime: STALE_TIMES.CONVERSATIONS,
  });
}

/**
 * Prefetch a specific conversation
 *
 * Call this to preload messages for a specific user before opening
 * that conversation. Useful when user hovers over a conversation item.
 *
 * @param {QueryClient} queryClient - The query client instance
 * @param {number|string} userId - The other user's ID
 *
 * @example
 * // Prefetch conversation on hover
 * onMouseEnter={() => prefetchConversation(queryClient, otherUserId)}
 */
export function prefetchConversation(queryClient, userId) {
  if (!userId) return;

  return queryClient.prefetchQuery({
    queryKey: messageKeys.conversation(userId),
    queryFn: () => getConversation(userId),
    staleTime: STALE_TIMES.CONVERSATION,
  });
}

/**
 * Seed the unread conversations list from the conversations cache
 *
 * Call this AFTER conversations have been prefetched so the NavBar badge
 * renders immediately. Reads the conversations cache and extracts IDs
 * of conversations with hasUnread: true.
 *
 * @param {QueryClient} queryClient - The query client instance
 */
export function seedUnreadConversations(queryClient) {
  const convData = queryClient.getQueryData(messageKeys.conversations());
  if (!convData?.conversations) return;

  const unreadIds = convData.conversations
    .filter((c) => c.hasUnread)
    .map((c) => c.otherUser.id);

  queryClient.setQueryData(messageKeys.unreadCount(), unreadIds);
}
