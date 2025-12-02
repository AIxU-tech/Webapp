/**
 * Universities API Module
 *
 * Handles all university-related API calls:
 * - List universities
 * - Get university details
 * - Create university (admin only)
 * - Update university (admin only)
 * - Delete university (admin only)
 * - Remove member (admin only)
 *
 * Auto-Enrollment System:
 * Users are automatically enrolled in a university based on their .edu email
 * domain during registration. Manual joining is not supported - the join and
 * leave functions have been removed. See api/auth.js for registration flow.
 */

import { api } from './client';

/**
 * Get all universities
 *
 * Returns list of all universities with basic info.
 * Each university includes emailDomain for display purposes.
 *
 * Note: Flask endpoint is /api/universities/list
 * The api client adds /api prefix automatically.
 *
 * @returns {Promise<Array>} Array of university objects
 *
 * @example
 * const universities = await getUniversities();
 * universities.forEach(uni => console.log(uni.name, uni.emailDomain));
 */
export async function getUniversities() {
  const data = await api.get('/universities/list');
  // Return just the universities array for easier use
  return data.universities || [];
}

/**
 * Get single university by ID
 *
 * Returns full university details including members list.
 *
 * @param {number} id - University ID
 * @returns {Promise<object>} University object with full details
 * @throws {ApiError} If university not found (404)
 *
 * @example
 * const university = await getUniversity(1);
 * console.log(university.name, university.memberCount);
 */
export async function getUniversity(id) {
  return api.get(`/universities/${id}`);
}

/**
 * Create a new university
 *
 * Requires authentication. User becomes the admin of created university.
 * The admin's email domain is used to determine which users can be
 * auto-enrolled in this university.
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

// NOTE: joinUniversity and leaveUniversity functions have been removed.
// Users are now automatically enrolled in a university based on their
// .edu email domain during registration. See the registration flow in
// api/auth.js for details.

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
 * Removes a user from the university's member list.
 * Note: This does NOT prevent them from re-enrolling if they
 * register again with the same .edu email.
 *
 * @param {number} universityId - University ID
 * @param {number} userId - User ID to remove
 * @returns {Promise<object>} Response with success status
 * @throws {ApiError} If not admin or not authenticated (403)
 */
export async function removeMember(universityId, userId) {
  return api.post(`/universities/${universityId}/remove_member/${userId}`);
}
