// frontend/src/api/client.js
/**
 * Base API Client
 *
 * Provides a centralized fetch wrapper for all API calls to the Flask backend.
 * Handles:
 * - Authentication via cookies (Flask-Login)
 * - JSON serialization/deserialization
 * - Error handling and status codes
 * - Automatic inclusion of credentials for cross-origin requests
 */

// Base URL for all API calls - Flask backend serves APIs at /api/*
const API_BASE = '/api';

/**
 * Custom error class for API errors
 * Includes HTTP status code and error message from server
 */
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Main API request function
 *
 * @param {string} endpoint - API endpoint path (e.g., '/users/123')
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<any>} - Parsed JSON response
 * @throws {ApiError} - On HTTP errors or network failures
 *
 * @example
 * const user = await apiRequest('/user/profile');
 *
 * @example
 * const newNote = await apiRequest('/notes/create', {
 *   method: 'POST',
 *   body: { title: 'My Note', content: 'Note content' }
 * });
 */
export async function apiRequest(endpoint, options = {}) {
  // Build full URL
  const url = `${API_BASE}${endpoint}`;

  // Prepare request body if provided
  // Automatically stringify objects to JSON
  const body = options.body
    ? JSON.stringify(options.body)
    : undefined;

  try {
    // Make the request
    const response = await fetch(url, {
      // Include credentials (cookies) for Flask-Login session
      credentials: 'include',

      // Set headers
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },

      // Spread other options (method, etc.)
      ...options,

      // Override body with stringified version
      body,
    });

    // Parse response body (always expect JSON from our Flask APIs)
    let data;
    try {
      data = await response.json();
    } catch (e) {
      // If response isn't JSON, create empty object
      data = {};
    }

    // Check if request was successful
    if (!response.ok) {
      // Extract error message from response or use default
      const message = data.error || data.message || `HTTP ${response.status} error`;

      throw new ApiError(
        message,
        response.status,
        data
      );
    }

    return data;

  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Network errors or other fetch failures
    throw new ApiError(
      error.message || 'Network request failed',
      0,
      null
    );
  }
}

/**
 * Convenience methods for common HTTP verbs
 */

export const api = {
  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<any>}
   */
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @returns {Promise<any>}
   */
  post: (endpoint, body) => apiRequest(endpoint, {
    method: 'POST',
    body,
  }),

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @returns {Promise<any>}
   */
  put: (endpoint, body) => apiRequest(endpoint, {
    method: 'PUT',
    body,
  }),

  /**
   * PATCH request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @returns {Promise<any>}
   */
  patch: (endpoint, body) => apiRequest(endpoint, {
    method: 'PATCH',
    body,
  }),

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<any>}
   */
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
};
