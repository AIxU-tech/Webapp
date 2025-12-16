// frontend/src/api/auth.js
/**
 * Authentication API Module
 *
 * Handles all authentication-related API calls:
 * - User login
 * - User registration
 * - Email verification
 * - Logout
 * - Current user session check
 */

import { api } from './client';

/**
 * Get current authenticated user's profile
 *
 * Note: The api client automatically adds /api prefix,
 * so we only specify the endpoint path after /api/
 *
 * @returns {Promise<object>} User object with profile data
 * @throws {ApiError} If user is not authenticated (401)
 *
 * @example
 * const user = await getCurrentUser();
 * console.log(user.email, user.full_name);
 */
export async function getCurrentUser() {
  return api.get('/user/profile');
}

/**
 * Login with email and password
 *
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<object>} Response with success status and user data
 * @throws {ApiError} On invalid credentials or server error
 *
 * @example
 * const response = await login('user@example.com', 'password123');
 * console.log(response.user); // User object
 */
export async function login(email, password) {
  return api.post('/auth/login', { email, password });
}

/**
 * Register a new user account
 *
 * Note: Flask backend sends verification email after registration.
 * User needs to verify email before account is fully activated.
 *
 * @param {object} userData - User registration data
 * @param {string} userData.email - Email address
 * @param {string} userData.password - Password
 * @param {string} userData.firstName - First name (optional)
 * @param {string} userData.lastName - Last name (optional)
 * @param {number} userData.university_id - University ID (optional)
 * @returns {Promise<object>} Response with success status and email
 * @throws {ApiError} If email already exists or validation fails
 *
 * @example
 * const response = await register({
 *   email: 'newuser@example.com',
 *   password: 'securepass123',
 *   firstName: 'John',
 *   lastName: 'Doe'
 * });
 * console.log(response.email); // 'newuser@example.com'
 */
export async function register(userData) {
  return api.post('/auth/register', userData);
}

/**
 * Verify email with verification code
 *
 * @param {string} code - 6-digit verification code from email
 * @returns {Promise<object>} Response with success status and user data
 * @throws {ApiError} If code is invalid or expired
 *
 * @example
 * const response = await verifyEmail('123456');
 * console.log(response.message); // "Registration successful!"
 * console.log(response.user); // User object
 */
export async function verifyEmail(code) {
  return api.post('/auth/verify-email', { code });
}

/**
 * Resend verification email
 *
 * @returns {Promise<object>} Response with success status and remaining time
 * @throws {ApiError} On server error
 *
 * @example
 * const response = await resendVerificationCode();
 * console.log(response.message); // "New code sent"
 * console.log(response.remainingTime); // 180
 */
export async function resendVerificationCode() {
  return api.post('/auth/resend-verification');
}

/**
 * Logout current user
 *
 * Clears Flask-Login session cookie
 *
 * @returns {Promise<object>} Response with success status
 *
 * @example
 * await logout();
 */
export async function logout() {
  return api.post('/auth/logout');
}

/**
 * Check if user is authenticated
 *
 * Convenience function that returns true/false instead of throwing error
 *
 * @returns {Promise<boolean>} True if user is logged in
 *
 * @example
 * const isLoggedIn = await checkAuth();
 * if (isLoggedIn) {
 *   // Show authenticated UI
 * }
 */
export async function checkAuth() {
  try {
    await getCurrentUser();
    return true;
  } catch (error) {
    return false;
  }
}


// =============================================================================
// Account Creation from Approved University Request
// =============================================================================

/**
 * Validate an account creation token from a university approval email
 *
 * This endpoint checks if a token is valid and returns the associated
 * request data (name, email, university) so the frontend can display
 * the "complete account" form pre-filled with this information.
 *
 * @param {string} token - The account creation token from the approval email
 * @returns {Promise<object>} Token validation result with user/university data
 * @throws {ApiError} If token is invalid, expired, or already used
 *
 * @example
 * const data = await validateAccountToken('abc123...');
 * console.log(data.firstName, data.email, data.universityName);
 */
export async function validateAccountToken(token) {
  return api.get(`/auth/validate-token?token=${encodeURIComponent(token)}`);
}

/**
 * Complete account creation using a token from university approval email
 *
 * This endpoint creates a user account without requiring email verification,
 * since the email was already verified during the university request process.
 *
 * @param {string} token - The account creation token from the approval email
 * @param {string} password - The user's chosen password
 * @returns {Promise<object>} Response with success status and user data
 * @throws {ApiError} If token is invalid or password is too short
 *
 * @example
 * const response = await completeAccount('abc123...', 'securePassword');
 * console.log(response.user); // User object
 */
export async function completeAccount(token, password) {
  return api.post('/auth/complete-account', { token, password });
}
