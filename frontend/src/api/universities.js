// frontend/src/api/universities.js
/**
 * Universities API Module
 *
 * Handles all university-related API calls:
 * - List universities
 * - Get university details
 * - Create university
 * - Join/leave university
 * - Update university (admin only)
 * - Delete university (admin only)
 * - Like/unlike university
 */

import { api } from './client';

/**
 * Get all universities
 *
 * Note: Flask endpoint is /api/universities/list
 * The api client adds /api prefix automatically
 *
 * @returns {Promise<object>} Object with universities array
 * @property {Array} universities - Array of university objects
 *
 * @example
 * const data = await getUniversities();
 * data.universities.forEach(uni => console.log(uni.name));
 */
export async function getUniversities() {
  const data = await api.get('/universities/list');
  // Return just the universities array for easier use
  return data.universities || [];
}

/**
 * Get single university by ID
 *
 * @param {number} id - University ID
 * @returns {Promise<object>} University object with full details
 * @throws {ApiError} If university not found (404)
 *
 * @example
 * const university = await getUniversity(1);
 * console.log(university.name, university.member_count);
 */
export async function getUniversity(id) {
  return api.get(`/universities/${id}`);
}

/**
 * Create a new university
 *
 * Requires authentication. User becomes the admin of created university.
 *
 * @param {object} universityData - University data
 * @param {string} universityData.name - University name
 * @param {string} universityData.location - University location
 * @param {string} universityData.clubName - AI club name
 * @param {string} universityData.description - Description
 * @param {Array<string>} universityData.tags - Tags/topics
 * @returns {Promise<object>} Created university object
 * @throws {ApiError} If user is not authenticated or validation fails
 *
 * @example
 * const newUni = await createUniversity({
 *   name: 'MIT',
 *   location: 'Cambridge, MA',
 *   clubName: 'MIT AI Club',
 *   description: 'AI research and learning at MIT',
 *   tags: ['machine-learning', 'research', 'robotics']
 * });
 */
export async function createUniversity(universityData) {
  return api.post('/universities/new', universityData);
}

/**
 * Join a university
 *
 * Adds current user to university's member list.
 *
 * @param {number} id - University ID
 * @returns {Promise<object>} Response with success status
 * @throws {ApiError} If already a member or not authenticated
 *
 * @example
 * await joinUniversity(1);
 */
export async function joinUniversity(id) {
  return api.post(`/universities/${id}/join`);
}

/**
 * Leave a university
 *
 * Removes current user from university's member list.
 *
 * @param {number} id - University ID
 * @returns {Promise<object>} Response with success status
 * @throws {ApiError} If not a member or not authenticated
 *
 * @example
 * await leaveUniversity(1);
 */
export async function leaveUniversity(id) {
  return api.post(`/universities/${id}/leave`);
}

/**
 * Update university details (admin only)
 *
 * Only the university admin can update details.
 *
 * @param {number} id - University ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated university object
 * @throws {ApiError} If not admin or not authenticated (403)
 *
 * @example
 * await updateUniversity(1, {
 *   description: 'Updated description',
 *   tags: ['ai', 'ml', 'nlp']
 * });
 */
export async function updateUniversity(id, updates) {
  return api.post(`/universities/${id}/edit`, updates);
}

/**
 * Delete university (admin only)
 *
 * Only the university admin can delete.
 *
 * @param {number} id - University ID
 * @returns {Promise<object>} Response with success status
 * @throws {ApiError} If not admin or not authenticated (403)
 *
 * @example
 * await deleteUniversity(1);
 */
export async function deleteUniversity(id) {
  return api.post(`/universities/${id}/delete`);
}

/**
 * Remove a member from university (admin only)
 *
 * @param {number} universityId - University ID
 * @param {number} userId - User ID to remove
 * @returns {Promise<object>} Response with success status
 * @throws {ApiError} If not admin or not authenticated (403)
 */
export async function removeMember(universityId, userId) {
  return api.post(`/universities/${universityId}/remove_member/${userId}`);
}
