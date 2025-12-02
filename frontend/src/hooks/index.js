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
 * - prefetchUniversities() - Prefetch universities list
 *
 * Notes/Community:
 * - useNotes(params) - Get notes with filters
 * - useCreateNote() - Create mutation
 * - useLikeNote() - Like/unlike mutation
 * - useBookmarkNote() - Bookmark mutation
 * - useDeleteNote() - Delete mutation
 * - prefetchNotes() - Prefetch notes list
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
 * Usage:
 *   import { useUniversities, useNotes, useConversations } from '../hooks';
 */

// =============================================================================
// University Hooks
// =============================================================================
export {
  useUniversities,
  useUniversity,
  useRemoveMember,
  universityKeys,
  prefetchUniversities,
} from './useUniversities';

// =============================================================================
// Notes/Community Hooks
// =============================================================================
export {
  useNotes,
  useCreateNote,
  useLikeNote,
  useBookmarkNote,
  useDeleteNote,
  noteKeys,
  prefetchNotes,
} from './useNotes';

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
