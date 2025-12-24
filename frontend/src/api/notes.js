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
