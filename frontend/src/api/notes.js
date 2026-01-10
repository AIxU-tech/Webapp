// frontend/src/api/notes.js
/**
 * Notes/Community API Module
 *
 * Handles all research notes and community feed API calls:
 * - List notes
 * - Create note
 * - Like/unlike note
 * - Bookmark/unbookmark note
 * - Delete note (author only)
 */

import { api } from './client';

/**
 * Get all research notes
 *
 * Returns notes from all users, sorted by creation date (newest first).
 * Optionally filter by search query, user ID, or university ID.
 * Supports pagination for infinite scroll.
 *
 * @param {object} params - Query parameters
 * @param {string} [params.search] - Search query for title, content, or author name
 * @param {number} [params.user] - Filter by specific user ID
 * @param {number} [params.university_id] - Filter by university ID
 * @param {string} [params.tag] - Filter by tag name (case-insensitive)
 * @param {number} [params.page] - Page number (1-indexed, enables pagination)
 * @param {number} [params.page_size] - Number of items per page (default 20)
 * @returns {Promise<Array|Object>} Array of notes (non-paginated) or object with notes and pagination
 *
 * @example
 * // Non-paginated (backward compatible)
 * const notes = await fetchNotes();
 * const searchResults = await fetchNotes({ search: 'transformers' });
 *
 * // Paginated
 * const page1 = await fetchNotes({ page: 1, page_size: 20 });
 * // Returns: { notes: [...], pagination: { page: 1, pageSize: 20, total: 150, hasMore: true } }
 */
export async function fetchNotes(params = {}) {
  // Filter out null/undefined values
  const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
    if (value != null) {
      acc[key] = value;
    }
    return acc;
  }, {});

  const queryString = new URLSearchParams(cleanParams).toString();
  const endpoint = queryString ? `/notes?${queryString}` : '/notes';
  return api.get(endpoint);
}

/**
 * Get a single note by ID
 *
 * Returns a single note object with author info, likes, bookmarks, etc.
 *
 * @param {number} noteId - Note ID
 * @returns {Promise<object>} Note object
 * @throws {ApiError} If note not found (404) or not authenticated
 *
 * @example
 * const note = await fetchNote(123);
 */
export async function fetchNote(noteId) {
  const response = await api.get(`/notes/${noteId}`);
  // Backend returns { success: true, note: {...} }
  return response.note;
}

/**
 * Get sample notes (deprecated - use fetchNotes instead)
 *
 * @deprecated Use fetchNotes() instead
 * @returns {Promise<Array>} Array of note objects
 */
export async function getNotes() {
  return api.get('/notes');
}

/**
 * Create a new research note
 *
 * Requires authentication.
 *
 * @param {object} noteData - Note data
 * @param {string} noteData.title - Note title
 * @param {string} noteData.content - Note content (markdown supported)
 * @param {Array<string>} noteData.tags - Tags/topics
 * @returns {Promise<object>} Created note object
 * @throws {ApiError} If not authenticated or validation fails
 *
 * @example
 * const newNote = await createNote({
 *   title: 'Understanding Transformers',
 *   content: 'Transformers are a type of neural network architecture...',
 *   tags: ['nlp', 'transformers', 'deep-learning']
 * });
 */
export async function createNote(noteData) {
  return api.post('/notes', noteData);
}

/**
 * Like or unlike a note
 *
 * Toggles like status for current user.
 *
 * @param {number} id - Note ID
 * @returns {Promise<object>} Response with new like status and count
 * @throws {ApiError} If not authenticated
 *
 * @example
 * const result = await toggleLikeNote(1);
 * console.log(result.isLiked); // true or false
 * console.log(result.likes); // total likes
 */
export async function toggleLikeNote(id) {
  return api.post(`/notes/${id}/like`);
}

/**
 * Bookmark or unbookmark a note
 *
 * Toggles bookmark status for current user.
 * Bookmarked notes are saved to user's profile for later reading.
 *
 * @param {number} id - Note ID
 * @returns {Promise<object>} Response with new bookmark status
 * @throws {ApiError} If not authenticated
 *
 * @example
 * const result = await toggleBookmarkNote(1);
 * console.log(result.isBookmarked); // true or false
 */
export async function toggleBookmarkNote(id) {
  return api.post(`/notes/${id}/bookmark`);
}

/**
 * Delete a note (author only)
 *
 * Only the note author or admin can delete.
 *
 * @param {number} id - Note ID
 * @returns {Promise<object>} Response with success status
 * @throws {ApiError} If not author/admin or not authenticated (403)
 *
 * @example
 * await deleteNote(1);
 */
export async function deleteNote(id) {
  return api.delete(`/notes/${id}`);
}

// =============================================================================
// Comment API Functions
// =============================================================================

/**
 * Get all comments for a note
 *
 * Returns comments sorted by creation date (newest first).
 *
 * @param {number} noteId - Note ID
 * @returns {Promise<Array>} Array of comment objects
 *
 * @example
 * const comments = await fetchComments(123);
 */
export async function fetchComments(noteId) {
  return api.get(`/notes/${noteId}/comments`);
}

/**
 * Create a new comment on a note
 *
 * Requires authentication.
 *
 * @param {number} noteId - Note ID
 * @param {string} text - Comment text
 * @param {number} [replyToId] - Optional ID of comment being replied to
 * @returns {Promise<object>} Response with created comment and updated comment count
 * @throws {ApiError} If not authenticated or validation fails
 *
 * @example
 * // Top-level comment
 * const result = await createComment(123, 'Great post!');
 * 
 * // Reply to a comment
 * const reply = await createComment(123, '@John Great point!', 456);
 * console.log(reply.comment.parentId); // The parent comment's ID
 */
export async function createComment(noteId, text, replyToId = null) {
  const payload = { text };
  if (replyToId !== null) {
    payload.replyToId = replyToId;
  }
  return api.post(`/notes/${noteId}/comments`, payload);
}

/**
 * Update a comment (author only)
 *
 * @param {number} noteId - Note ID
 * @param {number} commentId - Comment ID
 * @param {string} text - New comment text
 * @returns {Promise<object>} Response with updated comment
 * @throws {ApiError} If not author or not authenticated (403)
 *
 * @example
 * const result = await updateComment(123, 456, 'Updated text');
 */
export async function updateComment(noteId, commentId, text) {
  return api.put(`/notes/${noteId}/comments/${commentId}`, { text });
}

/**
 * Delete a comment (author only)
 *
 * @param {number} noteId - Note ID
 * @param {number} commentId - Comment ID
 * @returns {Promise<object>} Response with success status and updated comment count
 * @throws {ApiError} If not author or not authenticated (403)
 *
 * @example
 * const result = await deleteComment(123, 456);
 * console.log(result.commentCount); // Updated count on the note
 */
export async function deleteComment(noteId, commentId) {
  return api.delete(`/notes/${noteId}/comments/${commentId}`);
}

/**
 * Like or unlike a comment
 *
 * Toggles like status for current user.
 *
 * @param {number} noteId - Note ID
 * @param {number} commentId - Comment ID
 * @returns {Promise<object>} Response with new like status and count
 * @throws {ApiError} If not authenticated
 *
 * @example
 * const result = await toggleLikeComment(123, 456);
 * console.log(result.isLiked); // true or false
 * console.log(result.likes); // total likes
 */
export async function toggleLikeComment(noteId, commentId) {
  return api.post(`/notes/${noteId}/comments/${commentId}/like`);
}
