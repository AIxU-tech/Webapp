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
import { useEffect, useCallback } from 'react';
import {
  getConversations,
  getConversation,
  sendMessage,
  searchUsersForMessages,
} from '../api/messages';
import { useSocket, useSocketEvent } from '../contexts/SocketContext';
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
};

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
      const existingIndex = oldConversations.conversations.findIndex(
        (conv) => conv.otherUser.id === senderId
      );

      let newConversations;

      if (existingIndex >= 0) {
        // Existing conversation: Update and move to top
        const existing = oldConversations.conversations[existingIndex];
        const updated = {
          ...existing,
          lastMessage: {
            content: data.message.content,
            timestamp: data.message.timestamp || 'Just now',
            isSentByCurrentUser: false,
          },
          hasUnread: true,
        };

        // Remove from current position and add to top
        newConversations = [
          updated,
          ...oldConversations.conversations.filter((_, i) => i !== existingIndex),
        ];
      } else {
        // New conversation: Add to top
        const newConversation = {
          otherUser: {
            id: senderId,
            name: data.conversation?.sender_name || 'Unknown',
            avatar: data.conversation?.sender_avatar || '/static/default-avatar.png',
            university: data.conversation?.sender_university || 'University',
          },
          lastMessage: {
            content: data.message.content,
            timestamp: data.message.timestamp || 'Just now',
            isSentByCurrentUser: false,
          },
          hasUnread: true,
        };

        newConversations = [newConversation, ...oldConversations.conversations];
      }

      return {
        ...oldConversations,
        conversations: newConversations,
      };
    });

    // Also update the specific conversation cache if it exists
    if (data.message.sender_id) {
      queryClient.setQueryData(
        messageKeys.conversation(data.message.sender_id),
        (oldConversation) => {
          if (!oldConversation?.messages) return oldConversation;

          return {
            ...oldConversation,
            messages: [...oldConversation.messages, data.message],
          };
        }
      );
    }
  }, [queryClient]));

  // ---------------------------------------------------------------------------
  // Query Configuration
  // ---------------------------------------------------------------------------

  return useQuery({
    queryKey: messageKeys.conversations(),
    queryFn: getConversations,

    // WebSocket handles real-time updates, so staleTime is just a safety net
    // for reconnection scenarios or multi-device sync
    staleTime: STALE_TIMES.CONVERSATIONS,

    // Keep conversations in cache for quick access
    gcTime: GC_TIMES.CONVERSATIONS,
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

    // When conversation opens, mark as read (handled by API)
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
    onMutate: async ({ recipientId, content }) => {
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

      // Update conversations list
      queryClient.setQueryData(messageKeys.conversations(), (oldData) => {
        if (!oldData?.conversations) return oldData;

        return {
          ...oldData,
          conversations: oldData.conversations.map((conv) => {
            if (conv.otherUser.id === recipientId) {
              return {
                ...conv,
                lastMessage: {
                  content,
                  timestamp: 'Just now',
                  isSentByCurrentUser: true,
                },
              };
            }
            return conv;
          }),
        };
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
    onSuccess: (result, { recipientId }, context) => {
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
    queryFn: getConversations,
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
