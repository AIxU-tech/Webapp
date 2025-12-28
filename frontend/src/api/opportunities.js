/**
 * Opportunities API Module
 * Handles all opportunities board API calls.
 */

import { api } from './client';

/**
 * Get all opportunities with optional filtering.
 * @param {object} params - Query parameters (search, location, paid, myUniversity, tags)
 */
export async function fetchOpportunities(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = queryString ? `/opportunities?${queryString}` : '/opportunities';
  return api.get(endpoint);
}

/**
 * Create a new opportunity posting.
 * @param {object} opportunityData - { title, description, compensation?, universityOnly?, tags? }
 */
export async function createOpportunity(opportunityData) {
  return api.post('/opportunities', opportunityData);
}

/**
 * Toggle bookmark status for an opportunity.
 * @param {number} id - Opportunity ID
 */
export async function toggleBookmarkOpportunity(id) {
  return api.post(`/opportunities/${id}/bookmark`);
}

/**
 * Delete an opportunity (author or admin only).
 * @param {number} id - Opportunity ID
 */
export async function deleteOpportunity(id) {
  return api.delete(`/opportunities/${id}`);
}
