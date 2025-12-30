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
 * Note: Flask endpoint is /api/universities
 * The api client adds /api prefix automatically.
 *
 * @returns {Promise<Array>} Array of university objects
 *
 * @example
 * const universities = await getUniversities();
 * universities.forEach(uni => console.log(uni.name, uni.emailDomain));
 */
export async function getUniversities() {
  const data = await api.get('/universities');
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

// NOTE: University creation is handled through the university request flow.
// See universityRequests.js for the request/approval process.

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
  return api.patch(`/universities/${id}`, updates);
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
  return api.delete(`/universities/${id}`);
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
  return api.delete(`/universities/${universityId}/members/${userId}`);
}

// =============================================================================
// Role Management API Functions
// =============================================================================

/**
 * Update a member's role at a university
 *
 * Changes a user's role (Member/Executive/President) at a university.
 * If promoting to President, the current president is demoted to Executive.
 *
 * @param {number} universityId - University ID
 * @param {number} userId - User ID to update
 * @param {number} role - New role (0=Member, 1=Executive, 2=President)
 * @returns {Promise<object>} Response with updated role info
 * @throws {ApiError} If not authorized (403) or invalid role (400)
 */
export async function updateMemberRole(universityId, userId, role) {
  return api.post(`/universities/${universityId}/roles/${userId}`, { role });
}
