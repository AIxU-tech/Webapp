/**
 * Hooks Index Module
 *
 * Barrel export for all custom React hooks in the application.
 * Import hooks from this file for cleaner imports.
 *
 * Available Hooks by Domain:
 *
 * Universities:
 * - useUniversities() - Get all universities
 * - useUniversity(id) - Get single university
 * - useRemoveMember() - Remove member mutation (admin only)
 * - useUpdateMemberRole() - Update member role mutation (admin only)
 * - prefetchUniversities() - Prefetch universities list
 *
 * Notes/Community:
 * - useInfiniteNotes(params) - Get notes with infinite scroll pagination
 * - useNote(noteId) - Get single note by ID
 * - useCreateNote() - Create mutation
 * - useLikeNote() - Like/unlike mutation
 * - useBookmarkNote() - Bookmark mutation
 * - useDeleteNote() - Delete mutation
 * - prefetchNotes() - Prefetch notes list
 *
 * Opportunities:
 * - useOpportunities(params) - Get opportunities with filters
 * - useCreateOpportunity() - Create mutation
 * - useBookmarkOpportunity() - Bookmark mutation
 * - useDeleteOpportunity() - Delete mutation
 * - prefetchOpportunities() - Prefetch opportunities list
 *
 * Messages:
 * - useConversations() - Get conversations with real-time updates
 * - useConversation(userId) - Get conversation with user
 * - useSendMessage() - Send message mutation
 * - useSearchUsers(query) - Search users
 * - prefetchConversations() - Prefetch conversations list
 * - prefetchConversation() - Prefetch single conversation
 *
 * Users:
 * - useUser(userId) - Get user profile
 * - useUpdateProfile() - Update profile mutation
 * - useUploadProfilePicture() - Upload picture mutation
 * - useDeleteProfilePicture() - Delete picture mutation
 * - prefetchUser() - Prefetch user profile
 *
 * News:
 * - useAIContent() - Get both stories and papers (recommended)
 * - useNews() - Get only news stories
 * - usePapers() - Get only research papers
 * - useRefreshAIContent() - Trigger content refresh (admin)
 * - useStoryChatMutation() - Chat about a news story
 * - usePaperChatMutation() - Chat about a research paper
 * - useChatHistory(sessionId) - Get chat history
 * - useClearChatMutation() - Clear chat session
 * - prefetchAIContent() - Prefetch news content
 *
 * University Requests (Admin):
 * - usePendingRequests() - Get pending university requests
 * - useApproveRequest() - Approve a request mutation
 * - useRejectRequest() - Reject a request mutation
 *
 * Email Verification:
 * - useEmailVerification(config) - Common logic for email verification pages
 *
 * Form Management:
 * - useForm(config) - Form state, validation, and submission handling
 *
 * Usage:
 *   import { useUniversities, useInfiniteNotes, useAIContent } from '../hooks';
 */

// =============================================================================
// University Hooks
// =============================================================================
export {
  useUniversities,
  useUniversity,
  useRemoveMember,
  useUpdateMemberRole,
  useUpdateUniversity,
  universityKeys,
  prefetchUniversities,
} from './useUniversities';

// =============================================================================
// Events Hooks
// =============================================================================
export {
  useUniversityEvents,
  useEvent,
  useCreateEvent,
  useDeleteEvent,
  useToggleRsvp,
  eventKeys,
} from './useEvents';

// =============================================================================
// Notes/Community Hooks
// =============================================================================
export {
  useInfiniteNotes,
  useNote,
  useCreateNote,
  useLikeNote,
  useBookmarkNote,
  useDeleteNote,
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useLikeComment,
  noteKeys,
  prefetchNotes,
} from './useNotes';

// =============================================================================
// Opportunities Hooks
// =============================================================================
export {
  useOpportunities,
  useCreateOpportunity,
  useBookmarkOpportunity,
  useDeleteOpportunity,
  opportunityKeys,
  prefetchOpportunities,
} from './useOpportunities';

// =============================================================================
// Messages Hooks
// =============================================================================
export {
  useConversations,
  useConversation,
  useSendMessage,
  useSearchUsers,
  messageKeys,
  markConversationRead,
  prefetchConversations,
  prefetchConversation,
} from './useMessages';

// =============================================================================
// User Hooks
// =============================================================================
export {
  useUser,
  useUpdateProfile,
  useUploadProfilePicture,
  useDeleteProfilePicture,
  userKeys,
  prefetchUser,
} from './useUsers';

// =============================================================================
// News Hooks
// =============================================================================
export {
  useAIContent,
  useNews,
  usePapers,
  useRefreshAIContent,
  useStoryChatMutation,
  usePaperChatMutation,
  useChatHistory,
  useClearChatMutation,
  newsKeys,
  prefetchAIContent,
} from './useNews';

// =============================================================================
// University Request Hooks (Admin)
// =============================================================================
export {
  usePendingRequests,
  useApproveRequest,
  useRejectRequest,
  universityRequestKeys,
} from './useUniversityRequests';

// =============================================================================
// UI Utility Hooks
// =============================================================================
export {
  useEscapeKey,
  useClickOutside,
  useScrollLock,
  usePageTitle,
  useDebounce,
  useCountdown,
  useInfiniteScroll,
  useModal,
} from './useUI';

// =============================================================================
// Clipboard Hook
// =============================================================================
export { useClipboard } from './useClipboard';

// =============================================================================
// Email Verification Hook
// =============================================================================
export { useEmailVerification } from './useEmailVerification.jsx';

// =============================================================================
// Form Hooks
// =============================================================================
export { useForm } from './useForm';

// =============================================================================
// Feed Page Hooks
// =============================================================================
export { default as useFeedPageState } from './useFeedPageState';

// =============================================================================
// Hook Factories
// =============================================================================
export {
  createFeedItemKeys,
  createListHook,
  createCreateHook,
  createBookmarkHook,
  createDeleteHook,
  createPrefetchFn,
} from './factories/feedItemHooks';
