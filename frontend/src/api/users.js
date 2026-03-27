// frontend/src/api/users.js
/**
 * Users API Module
 *
 * Handles all user profile-related API calls:
 * - Get user profile
 * - Update profile
 * - Upload profile picture
 * - Delete profile picture
 * - Delete account
 * - Follow/unfollow users
 * - Search users
 */

import { api } from './client';

/**
 * Get user by ID
 *
 * @param {number} id - User ID
 * @returns {Promise<object>} User profile object
 * @throws {ApiError} If user not found (404)
 *
 * @example
 * const user = await getUser(123);
 * console.log(user.email, user.university);
 */
export async function getUser(id) {
  return api.get(`/users/${id}`);
}

/**
 * Get current user's statistics
 *
 * Returns post count, follower count, etc.
 *
 * @returns {Promise<object>} User stats object
 * @throws {ApiError} If not authenticated
 */
export async function getUserStats() {
  return api.get('/profile/stats');
}

/**
 * Update current user's profile
 *
 * Note: University is auto-determined by email domain and cannot be changed.
 *
 * @param {object} updates - Profile fields to update
 * @param {string} updates.first_name - First name
 * @param {string} updates.last_name - Last name
 * @param {string} updates.about_section - Bio/about section
 * @param {string} updates.location - Location
 * @param {Array<string>} updates.skills - Skills list
 * @returns {Promise<object>} Updated user object
 * @throws {ApiError} If not authenticated or validation fails
 *
 * @example
 * await updateProfile({
 *   about_section: 'AI researcher passionate about NLP',
 *   skills: ['Python', 'TensorFlow', 'PyTorch']
 * });
 */
export async function updateProfile(updates) {
  return api.patch('/profile', updates);
}

/**
 * Upload profile picture
 *
 * Supports both file upload and base64 camera capture.
 * Images are automatically compressed and cropped to square.
 *
 * @param {File|Blob} file - Image file or blob to upload
 * @returns {Promise<object>} Response with new avatar URL
 * @throws {ApiError} If not authenticated or file is invalid
 *
 * @example
 * const fileInput = document.querySelector('input[type="file"]');
 * const file = fileInput.files[0];
 * await uploadProfilePicture(file);
 */
export async function uploadProfilePicture(file) {
  // For file uploads, we need to use FormData instead of JSON
  const formData = new FormData();
  formData.append('profile_picture', file);

  const response = await fetch('/api/profile/picture', {
    method: 'PUT',
    credentials: 'include',
    body: formData,
    // Don't set Content-Type - browser will set it with boundary for multipart/form-data
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Upload failed');
  }

  return response.json();
}

/**
 * Delete profile picture
 *
 * Resets avatar to default.
 *
 * @returns {Promise<object>} Response with success status
 * @throws {ApiError} If not authenticated
 */
export async function deleteProfilePicture() {
  return api.delete('/profile/picture');
}

/**
 * Delete user account
 *
 * Permanently deletes current user's account and all associated data.
 * This includes:
 * - Profile information
 * - All posts and notes
 * - University membership
 * - All messages
 *
 * @returns {Promise<object>} Response with success status
 * @throws {ApiError} If not authenticated
 *
 * @example
 * await deleteAccount();
 */
export async function deleteAccount() {
  return api.delete('/account');
}

/**
 * Search for users
 *
 * Used for finding users to message or connect with.
 *
 * @param {string} query - Search query (name or email)
 * @returns {Promise<Array>} Array of matching user objects
 *
 * @example
 * const users = await searchUsers('john');
 * users.forEach(user => console.log(user.email, user.full_name));
 */
export async function searchUsers(query) {
  return api.get(`/users/search?q=${encodeURIComponent(query)}`);
}

/**
 * Follow or unfollow a user
 *
 * Toggles follow status.
 *
 * @param {number} userId - User ID to follow/unfollow
 * @returns {Promise<object>} Response with new follow status
 * @throws {ApiError} If not authenticated
 *
 * @example
 * const result = await toggleFollowUser(123);
 * console.log(result.following); // true or false
 */
export async function toggleFollowUser(userId) {
  return api.post(`/users/${userId}/follow`);
}

/**
 * Upload profile banner image
 *
 * Images are automatically center-cropped to 5:1 aspect ratio
 * and compressed to 1500x300.
 *
 * @param {File|Blob} file - Image file or blob to upload
 * @returns {Promise<object>} Response with hasBanner status
 * @throws {ApiError} If not authenticated or file is invalid
 *
 * @example
 * const croppedBlob = await cropImageToBanner(file);
 * await uploadProfileBanner(croppedBlob);
 */
export async function uploadProfileBanner(file) {
  const formData = new FormData();
  const filename = file.name || 'banner.jpg';
  formData.append('banner', file, filename);

  const response = await fetch('/api/profile/banner', {
    method: 'PUT',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Upload failed');
  }

  return response.json();
}

/**
 * Delete profile banner
 *
 * Resets banner to default.
 *
 * @returns {Promise<object>} Response with success status
 * @throws {ApiError} If not authenticated
 */
export async function deleteProfileBanner() {
  return api.delete('/profile/banner');
}

// =============================================================================
// Profile Sections (Education, Experience, Projects)
// =============================================================================

export async function createEducation(data) {
  return api.post('/profile/education', data);
}

export async function updateEducation(id, data) {
  return api.put(`/profile/education/${id}`, data);
}

export async function deleteEducation(id) {
  return api.delete(`/profile/education/${id}`);
}

export async function createExperience(data) {
  return api.post('/profile/experience', data);
}

export async function updateExperience(id, data) {
  return api.put(`/profile/experience/${id}`, data);
}

export async function deleteExperience(id) {
  return api.delete(`/profile/experience/${id}`);
}

export async function createProject(data) {
  return api.post('/profile/projects', data);
}

export async function updateProject(id, data) {
  return api.put(`/profile/projects/${id}`, data);
}

export async function deleteProject(id) {
  return api.delete(`/profile/projects/${id}`);
}
