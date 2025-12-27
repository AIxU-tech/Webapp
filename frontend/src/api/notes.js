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
 * Optionally filter by search query or user ID.
 *
 * Note: This fetches from the backend HTML route which returns rendered notes.
 * For JSON API, notes are embedded in the community page response.
 *
 * @param {object} params - Query parameters
 * @param {string} [params.search] - Search query for title, content, or author name
 * @param {number} [params.user] - Filter by specific user ID
 * @returns {Promise<Array>} Array of note objects
 *
 * @example
 * const notes = await fetchNotes();
 * const searchResults = await fetchNotes({ search: 'transformers' });
 * const userNotes = await fetchNotes({ user: 123 });
 */
export async function fetchNotes(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = queryString ? `/notes?${queryString}` : '/notes';
  return api.get(endpoint);
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
 * @returns {Promise<object>} Response with created comment and updated comment count
 * @throws {ApiError} If not authenticated or validation fails
 *
 * @example
 * const result = await createComment(123, 'Great post!');
 * console.log(result.comment); // The new comment
 * console.log(result.commentCount); // Updated count on the note
 */
export async function createComment(noteId, text) {
  return api.post(`/notes/${noteId}/comments`, { text });
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
