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
  return api.get('/profile');
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


// =============================================================================
// Development Auto-Login
// =============================================================================

/**
 * Auto-login as dev user (development only)
 *
 * Calls the dev-login endpoint which logs in as dev@test.edu without
 * requiring credentials. Only works when backend DEV_MODE=true.
 *
 * This enables seamless development without manual login after server restarts.
 *
 * @returns {Promise<object>} Response with success status and user data
 * @throws {ApiError} If dev mode is disabled (403) or dev user not found (404)
 *
 * @example
 * try {
 *   const response = await devLogin();
 *   console.log(response.user); // Dev user object
 * } catch (error) {
 *   // Not in dev mode or dev user missing - expected in production
 * }
 */
export async function devLogin() {
  return api.post('/auth/dev-login');
}


// =============================================================================
// Password Reset
// =============================================================================

/**
 * Request a password reset email
 *
 * Sends a password reset link to the provided email address if an account exists.
 * For security, always returns success even if the email doesn't exist.
 *
 * @param {string} email - User's email address
 * @returns {Promise<object>} Response with success message
 * @throws {ApiError} On server error
 *
 * @example
 * const response = await forgotPassword('user@example.com');
 * console.log(response.message); // "If that email exists, reset link sent"
 */
export async function forgotPassword(email) {
  return api.post('/auth/forgot-password', { email });
}

/**
 * Validate a password reset token
 *
 * Checks if a reset token is valid and not expired before showing the reset form.
 *
 * @param {string} token - The password reset token from the email link
 * @returns {Promise<object>} Response with success message
 * @throws {ApiError} If token is invalid, expired, or already used
 *
 * @example
 * try {
 *   await validateResetToken('abc123...');
 *   // Token is valid, show reset form
 * } catch (error) {
 *   // Token is invalid or expired
 * }
 */
export async function validateResetToken(token) {
  return api.post('/auth/validate-reset-token', { token });
}

/**
 * Reset password using a reset token
 *
 * Updates the user's password using a valid reset token from the email link.
 * The token must be valid, not expired, and not already used.
 *
 * @param {string} token - The password reset token from the email link
 * @param {string} password - The new password
 * @returns {Promise<object>} Response with success message
 * @throws {ApiError} If token is invalid, expired, or password is too short
 *
 * @example
 * const response = await resetPassword('abc123...', 'newSecurePassword');
 * console.log(response.message); // "Password reset successful"
 */
export async function resetPassword(token, password) {
  return api.post('/auth/reset-password', { token, password });
}
