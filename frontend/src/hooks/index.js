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
 * - useCreateUniversity() - Create university mutation (site admin only)
 * - useRemoveMember() - Remove member mutation (admin only)
 * - useUpdateMemberRole() - Update member role mutation (admin only)
 * - useUpdateUniversity() - Update university details mutation
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
 * - useInfiniteOpportunities(params) - Get opportunities with infinite scroll pagination
 * - useOpportunities(params) - Get opportunities with filters (backward compatible)
 * - useCreateOpportunity() - Create mutation
 * - useBookmarkOpportunity() - Bookmark mutation
 * - useDeleteOpportunity() - Delete mutation
 * - prefetchOpportunities() - Prefetch opportunities list
 * - prefetchInfiniteOpportunities() - Prefetch infinite opportunities query
 *
 * Messages:
 * - useConversations() - Get conversations with real-time updates
 * - useConversation(userId) - Get conversation with user
 * - useSendMessage() - Send message mutation
 * - useSearchUsers(query) - Search users
 * - useUnreadCount() - Unread message count with real-time updates (NavBar badge)
 * - clearUnreadConversation() - Remove a conversation from the unread list
 * - prefetchConversations() - Prefetch conversations list
 * - prefetchConversation() - Prefetch single conversation
 * - seedUnreadConversations() - Seed unread IDs from conversations cache
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
  useMemberAttendance,
  useCreateUniversity,
  useRemoveMember,
  useUpdateMemberRole,
  useUpdateUniversity,
  useUploadUniversityLogo,
  useUploadUniversityBanner,
  useDeleteUniversityLogo,
  useDeleteUniversityBanner,
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
  useUpdateEvent,
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
  useUpdateNote,
  useLikeNote,
  useBookmarkNote,
  useDeleteNote,
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useLikeComment,
  useNoteLikers,
  noteKeys,
  prefetchNotes,
  prefetchInfiniteNotes,
  invalidateNoteCachesFromNotificationSocketPayload,
} from './useNotes';

// =============================================================================
// Opportunities Hooks
// =============================================================================
export {
  useInfiniteOpportunities,
  useOpportunities,
  useCreateOpportunity,
  useBookmarkOpportunity,
  useDeleteOpportunity,
  opportunityKeys,
  prefetchOpportunities,
  prefetchInfiniteOpportunities,
} from './useOpportunities';

// =============================================================================
// Messages Hooks
// =============================================================================
export {
  useConversations,
  useConversation,
  useSendMessage,
  useSearchUsers,
  useUnreadCount,
  messageKeys,
  markConversationRead,
  clearUnreadConversation,
  prefetchConversations,
  prefetchConversation,
  seedUnreadConversations,
} from './useMessages';

// =============================================================================
// User Hooks
// =============================================================================
export {
  useUser,
  useUpdateProfile,
  useUploadProfilePicture,
  useDeleteProfilePicture,
  useUploadProfileBanner,
  useDeleteProfileBanner,
  useCreateEducation,
  useUpdateEducation,
  useDeleteEducation,
  useCreateExperience,
  useUpdateExperience,
  useDeleteExperience,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
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
// Attendance Hooks
// =============================================================================
export {
  useAttendanceEvent,
  useSubmitAttendance,
  useEventAttendance,
  attendanceKeys,
} from './useAttendance';

// =============================================================================
// Speakers Hooks
// =============================================================================
export {
  useSpeakers,
  useCreateSpeaker,
  useUpdateSpeaker,
  useDeleteSpeaker,
  speakerKeys,
} from './useSpeakers';

// =============================================================================
// Notifications Hooks
// =============================================================================
export {
  useNotifications,
  useAllNotifications,
  useUnreadNotificationCount,
  useMarkAllNotificationsRead,
  notificationKeys,
} from './useNotifications';

// =============================================================================
// Resume Hooks
// =============================================================================
export {
  useResume,
  useUploadResume,
  useDeleteResume,
  useStartResumeParse,
  useResumeParseSocket,
  resumeKeys,
} from './useResume';

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
  useDelayedLoading,
  useInfiniteScroll,
  useModal,
  useBeforeUnload,
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
// Image Upload Hook
// =============================================================================
export { default as useImageUpload } from './useImageUpload';

// =============================================================================
// Form Hooks
// =============================================================================
export { useForm } from './useForm';

// =============================================================================
// Auth Form Hooks
// =============================================================================
export { default as useRegisterForm } from './useRegisterForm';
export { default as useLoginForm } from './useLoginForm';

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
  createInfiniteQueryCacheUpdater,
  createInfiniteQueryCacheRemover,
} from './factories/feedItemHooks';
