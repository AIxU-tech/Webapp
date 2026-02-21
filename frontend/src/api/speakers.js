/**
 * Speakers API Module
 *
 * Handles all speaker-related API calls.
 * Speakers are guest speaker contacts shared across university AI clubs.
 */

import { api } from './client';

/**
 * Fetch all speakers and user's executive universities
 * @returns {Promise<{speakers: Array, userUniversities: Array}>}
 */
export async function fetchSpeakers() {
  return api.get('/speakers');
}

/**
 * Create a new speaker
 * @param {object} data - Speaker data
 * @returns {Promise<object>} Created speaker
 */
export async function createSpeaker(data) {
  return api.post('/speakers', data);
}

/**
 * Update an existing speaker
 * @param {number} id - Speaker ID
 * @param {object} data - Updated speaker data
 * @returns {Promise<object>} Updated speaker
 */
export async function updateSpeaker(id, data) {
  return api.put(`/speakers/${id}`, data);
}

/**
 * Delete a speaker
 * @param {number} id - Speaker ID
 * @returns {Promise<object>} Success response
 */
export async function deleteSpeaker(id) {
  return api.delete(`/speakers/${id}`);
}
