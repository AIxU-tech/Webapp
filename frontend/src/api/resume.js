/**
 * Resume API Module
 *
 * Handles resume upload confirmation, retrieval, and deletion.
 * File upload to GCS is handled by the existing requestUploadUrl flow.
 */

import { api } from './client';

/**
 * Confirm a resume upload after the file has been uploaded to GCS.
 * Replaces any existing resume for the current user.
 *
 * @param {Object} params
 * @param {string} params.gcsPath - GCS path returned from requestUploadUrl
 * @param {string} params.filename - Original filename
 * @param {string} params.contentType - MIME type
 * @param {number} params.sizeBytes - File size in bytes
 * @returns {Promise<Object>} Response with resume metadata
 */
export async function confirmResumeUpload({ gcsPath, filename, contentType, sizeBytes }) {
  return api.post('/profile/resume', { gcsPath, filename, contentType, sizeBytes });
}

/**
 * Get a user's resume metadata and signed download URL.
 *
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Response with resume object (or null)
 */
export async function getUserResume(userId) {
  return api.get(`/users/${userId}/resume`);
}

/**
 * Delete the current user's resume.
 *
 * @returns {Promise<Object>} Response with success status
 */
export async function deleteResume() {
  return api.delete('/profile/resume');
}
