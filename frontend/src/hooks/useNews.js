/**
 * AI News & Research Papers Hooks Module
 *
 * Provides React Query hooks for fetching AI news stories and research papers.
 * Content is fetched from Claude's web search and cached aggressively since
 * updates are infrequent (admin-triggered refreshes only).
 *
 * Available Hooks:
 * - useAIContent(): Get both news stories and research papers (recommended)
 * - useNews(): Get only news stories
 * - usePapers(): Get only research papers
 * - useRefreshAIContent(): Mutation to trigger content refresh
 * - useStoryChatMutation(): Send chat messages about stories
 * - usePaperChatMutation(): Send chat messages about papers
 *
 * Caching Strategy:
 * - 5 minute staleTime (content updates infrequently)
 * - Background refetch on window focus
 * - Shared cache across components
 *
 * @module hooks/useNews
 *
 * @example
 * // Basic usage
 * const { data, isLoading, error } = useAIContent();
 * const { stories, papers } = data || {};
 *
 * @example
 * // Chat with a story
 * const chatMutation = useStoryChatMutation({
 *   onSuccess: (data) => setMessages(prev => [...prev, data])
 * });
 * chatMutation.mutate({ storyId: 1, message: "What does this mean?" });
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAIContent,
  fetchNews,
  fetchPapers,
  refreshAIContent,
  chatAboutStory,
  chatAboutPaper,
  getChatHistory,
  clearChatHistory
} from '../api/news';


// =============================================================================
// Query Keys
// =============================================================================

/**
 * Query key factory for news-related queries.
 *
 * Creates consistent, hierarchical query keys for React Query caching.
 * This enables targeted cache invalidation and efficient data sharing.
 *
 * @example
 * // Invalidate all news data
 * queryClient.invalidateQueries({ queryKey: newsKeys.all });
 *
 * // Invalidate just the combined content query
 * queryClient.invalidateQueries({ queryKey: newsKeys.content() });
 */
export const newsKeys = {
  // Base key for all news-related queries
  all: ['news'],

  // Key for combined stories + papers
  content: () => [...newsKeys.all, 'content'],

  // Key for stories only
  stories: () => [...newsKeys.all, 'stories'],

  // Key for papers only
  papers: () => [...newsKeys.all, 'papers'],
};


// =============================================================================
// Cache Configuration
// =============================================================================

// AI content updates infrequently (admin-triggered refresh)
// Use aggressive caching to minimize API calls
const AI_CONTENT_STALE_TIME = 5 * 60 * 1000; // 5 minutes


// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch and cache both AI news stories and research papers.
 *
 * This is the recommended hook for the News page as it combines
 * both data types in a single API call for optimal performance.
 * The data is cached for 5 minutes since updates are infrequent.
 *
 * @returns {Object} React Query result object
 * @property {Object} data - Response data when successful
 * @property {Array} data.stories - Array of news story objects
 * @property {Array} data.papers - Array of research paper objects
 * @property {number} data.storiesCount - Number of stories
 * @property {number} data.papersCount - Number of papers
 * @property {string} data.batchId - Batch identifier
 * @property {boolean} isLoading - True during initial fetch
 * @property {boolean} isFetching - True during any fetch (including background)
 * @property {Error} error - Error object if fetch failed
 *
 * @example
 * function NewsPage() {
 *   const { data, isLoading, error } = useAIContent();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   const { stories, papers } = data;
 *   return (
 *     <>
 *       {stories.map(story => <NewsCard key={story.id} story={story} />)}
 *       {papers.map(paper => <PaperCard key={paper.id} paper={paper} />)}
 *     </>
 *   );
 * }
 */
export function useAIContent() {
  return useQuery({
    queryKey: newsKeys.content(),
    queryFn: fetchAIContent,

    // AI content is updated infrequently - cache aggressively
    staleTime: AI_CONTENT_STALE_TIME,

    // Keep data on error to show stale content
    placeholderData: (previousData) => previousData,
  });
}


/**
 * Fetch only AI news stories (without research papers).
 *
 * Use this hook if you only need stories. For most cases,
 * useAIContent() is preferred as it fetches both in one call.
 *
 * @returns {Object} React Query result with stories array
 * @property {Object} data - Response with stories array
 * @property {boolean} isLoading - Loading state
 * @property {Error} error - Error if fetch failed
 *
 * @example
 * const { data } = useNews();
 * const stories = data?.stories || [];
 */
export function useNews() {
  return useQuery({
    queryKey: newsKeys.stories(),
    queryFn: fetchNews,
    staleTime: AI_CONTENT_STALE_TIME,
    placeholderData: (previousData) => previousData,
  });
}


/**
 * Fetch only research papers (without news stories).
 *
 * Use this hook if you only need papers. For most cases,
 * useAIContent() is preferred as it fetches both in one call.
 *
 * @returns {Object} React Query result with papers array
 * @property {Object} data - Response with papers array
 * @property {boolean} isLoading - Loading state
 * @property {Error} error - Error if fetch failed
 *
 * @example
 * const { data } = usePapers();
 * const papers = data?.papers || [];
 */
export function usePapers() {
  return useQuery({
    queryKey: newsKeys.papers(),
    queryFn: fetchPapers,
    staleTime: AI_CONTENT_STALE_TIME,
    placeholderData: (previousData) => previousData,
  });
}


// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Mutation hook for refreshing AI content (admin only).
 *
 * Triggers Claude's web search to fetch the latest news and papers.
 * The operation takes 30-60 seconds. On success, automatically
 * invalidates the cache to refetch fresh data.
 *
 * Access control:
 * - If no content exists, anyone can trigger (initial load)
 * - If content exists, only admins can trigger
 *
 * @returns {Object} React Query mutation result
 * @property {Function} mutate - Trigger the refresh
 * @property {Function} mutateAsync - Trigger and return Promise
 * @property {boolean} isPending - True while refreshing
 * @property {Error} error - Error if refresh failed
 *
 * @example
 * function RefreshButton() {
 *   const refreshMutation = useRefreshAIContent();
 *
 *   return (
 *     <button
 *       onClick={() => refreshMutation.mutate()}
 *       disabled={refreshMutation.isPending}
 *     >
 *       {refreshMutation.isPending ? 'Refreshing...' : 'Refresh Content'}
 *     </button>
 *   );
 * }
 */
export function useRefreshAIContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: refreshAIContent,

    // On success, invalidate all news queries to refetch fresh data
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: newsKeys.all });
    },
  });
}


// =============================================================================
// Chat Hooks
// =============================================================================

/**
 * Mutation hook for sending chat messages about a news story.
 *
 * Handles the API call and provides loading/error states. The response
 * includes Claude's answer and a session ID for conversation continuity.
 *
 * @param {Object} [options] - Configuration options
 * @param {Function} [options.onSuccess] - Called when message sent successfully
 * @param {Function} [options.onError] - Called when an error occurs
 *
 * @returns {Object} React Query mutation result
 * @property {Function} mutate - Send message: mutate({ storyId, message, sessionId })
 * @property {Function} mutateAsync - Send and return Promise
 * @property {boolean} isPending - True while sending
 * @property {Error} error - Error if message failed
 *
 * @example
 * function StoryChat({ storyId }) {
 *   const [messages, setMessages] = useState([]);
 *   const [sessionId, setSessionId] = useState(null);
 *
 *   const chatMutation = useStoryChatMutation({
 *     onSuccess: (data) => {
 *       setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
 *       setSessionId(data.sessionId);
 *     },
 *     onError: (error) => {
 *       console.error('Chat failed:', error);
 *     }
 *   });
 *
 *   const handleSend = (message) => {
 *     setMessages(prev => [...prev, { role: 'user', content: message }]);
 *     chatMutation.mutate({ storyId, message, sessionId });
 *   };
 *
 *   return <ChatUI messages={messages} onSend={handleSend} loading={chatMutation.isPending} />;
 * }
 */
export function useStoryChatMutation(options = {}) {
  return useMutation({
    mutationFn: ({ storyId, message, sessionId }) =>
      chatAboutStory(storyId, message, sessionId),
    ...options
  });
}


/**
 * Mutation hook for sending chat messages about a research paper.
 *
 * Handles the API call and provides loading/error states. Claude will
 * explain the paper's methodology, findings, and significance in
 * accessible terms.
 *
 * @param {Object} [options] - Configuration options
 * @param {Function} [options.onSuccess] - Called when message sent successfully
 * @param {Function} [options.onError] - Called when an error occurs
 *
 * @returns {Object} React Query mutation result
 * @property {Function} mutate - Send message: mutate({ paperId, message, sessionId })
 * @property {Function} mutateAsync - Send and return Promise
 * @property {boolean} isPending - True while sending
 * @property {Error} error - Error if message failed
 *
 * @example
 * const chatMutation = usePaperChatMutation({
 *   onSuccess: (data) => {
 *     console.log('Response:', data.response);
 *     setSessionId(data.sessionId);
 *   }
 * });
 *
 * chatMutation.mutate({
 *   paperId: 1,
 *   message: "Can you explain the methodology?",
 *   sessionId: currentSessionId
 * });
 */
export function usePaperChatMutation(options = {}) {
  return useMutation({
    mutationFn: ({ paperId, message, sessionId }) =>
      chatAboutPaper(paperId, message, sessionId),
    ...options
  });
}


/**
 * Fetch chat history for a specific session.
 *
 * Only fetches when a valid sessionId is provided. Useful for
 * restoring conversation state when users return to a chat.
 *
 * @param {string|null} sessionId - The session ID to fetch history for
 *
 * @returns {Object} React Query result
 * @property {Object} data - Response with messages array
 * @property {Array} data.messages - Array of chat messages
 * @property {boolean} isLoading - True while fetching
 * @property {Error} error - Error if fetch failed
 *
 * @example
 * function ChatHistory({ sessionId }) {
 *   const { data, isLoading } = useChatHistory(sessionId);
 *
 *   if (isLoading) return <Spinner />;
 *
 *   const messages = data?.messages || [];
 *   return messages.map(msg => <Message key={msg.id} {...msg} />);
 * }
 */
export function useChatHistory(sessionId) {
  return useQuery({
    queryKey: ['chat', 'history', sessionId],
    queryFn: () => getChatHistory(sessionId),
    enabled: !!sessionId, // Only fetch if sessionId exists
    staleTime: 0, // Always fetch fresh data for chat
  });
}


/**
 * Mutation hook for clearing chat history for a session.
 *
 * Deletes all messages in a conversation, allowing users to
 * start fresh without prior context.
 *
 * @param {Object} [options] - Configuration options
 * @param {Function} [options.onSuccess] - Called when history is cleared
 *
 * @returns {Object} React Query mutation result
 * @property {Function} mutate - Clear history: mutate(sessionId)
 * @property {boolean} isPending - True while clearing
 *
 * @example
 * const clearMutation = useClearChatMutation({
 *   onSuccess: () => setMessages([])
 * });
 *
 * <button onClick={() => clearMutation.mutate(sessionId)}>
 *   Clear History
 * </button>
 */
export function useClearChatMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId) => clearChatHistory(sessionId),
    onSuccess: (data, sessionId) => {
      // Invalidate the chat history query for this session
      queryClient.invalidateQueries({ queryKey: ['chat', 'history', sessionId] });
      options.onSuccess?.(data, sessionId);
    },
    ...options
  });
}


// =============================================================================
// Prefetch Utilities
// =============================================================================

/**
 * Prefetch AI content data into the cache.
 *
 * Call this to preload AI content before the user navigates to the
 * News page. Data will be instantly available when the page loads,
 * eliminating loading states.
 *
 * @param {QueryClient} queryClient - The React Query client instance
 * @returns {Promise<void>} Resolves when prefetch is complete
 *
 * @example
 * // In a parent component or on hover
 * function NavLink() {
 *   const queryClient = useQueryClient();
 *
 *   const handleHover = () => {
 *     prefetchAIContent(queryClient);
 *   };
 *
 *   return <Link to="/news" onMouseEnter={handleHover}>News</Link>;
 * }
 */
export function prefetchAIContent(queryClient) {
  return queryClient.prefetchQuery({
    queryKey: newsKeys.content(),
    queryFn: fetchAIContent,
    staleTime: AI_CONTENT_STALE_TIME,
  });
}
