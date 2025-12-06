/**
 * University Requests API Module
 *
 * Handles API calls for the university request flow:
 * - Start request (send verification code)
 * - Verify email code
 * - Resend verification code
 * - Submit university details
 */

import { api } from './client';

/**
 * Start the university request flow.
 * Sends a verification code to the user's .edu email.
 *
 * @param {object} data - Request data
 * @param {string} data.email - User's .edu email
 * @param {string} data.firstName - User's first name
 * @param {string} data.lastName - User's last name
 * @returns {Promise<object>} Response with email and emailDomain
 */
export async function startUniversityRequest(data) {
  return api.post('/university-requests/start', data);
}

/**
 * Verify the email code for university request.
 *
 * @param {string} code - 6-digit verification code
 * @returns {Promise<object>} Response with verified user info
 */
export async function verifyUniversityRequest(code) {
  return api.post('/university-requests/verify', { code });
}

/**
 * Resend verification code for university request.
 *
 * @returns {Promise<object>} Response with remainingTime
 */
export async function resendUniversityRequestCode() {
  return api.post('/university-requests/resend-code');
}

/**
 * Submit university details after email verification.
 *
 * @param {object} data - University details
 * @param {string} data.universityName - Full university name
 * @param {string} data.universityLocation - University location
 * @param {string} data.clubName - AI club name
 * @param {string} data.clubDescription - Club description
 * @param {string[]} [data.clubTags] - Optional topic tags
 * @returns {Promise<object>} Response with requestId
 */
export async function submitUniversityRequest(data) {
  return api.post('/university-requests/submit', data);
}

// =============================================================================
// Admin API Functions
// =============================================================================

/**
 * Get all pending university requests (admin only).
 *
 * Retrieves the queue of university requests awaiting admin review.
 * Sorted by creation date (oldest first).
 *
 * @returns {Promise<object>} Response with requests array
 */
export async function getPendingRequests() {
  return api.get('/university-requests/admin/pending');
}

/**
 * Approve a university request (admin only).
 *
 * Creates the university and notifies the requester.
 *
 * @param {number} requestId - ID of the request to approve
 * @param {string} [notes] - Optional admin notes
 * @returns {Promise<object>} Response with created university details
 */
export async function approveRequest(requestId, notes = '') {
  return api.post(`/university-requests/admin/${requestId}/approve`, { notes });
}

/**
 * Reject a university request (admin only).
 *
 * Marks the request as rejected with optional explanation.
 *
 * @param {number} requestId - ID of the request to reject
 * @param {string} [notes] - Optional rejection reason
 * @returns {Promise<object>} Response confirming rejection
 */
export async function rejectRequest(requestId, notes = '') {
  return api.post(`/university-requests/admin/${requestId}/reject`, { notes });
}
