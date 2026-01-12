/**
 * Opportunities API Module
 * Handles all opportunities board API calls.
 */

import { api } from './client';

/**
 * Get all opportunities with optional filtering and pagination.
 * @param {object} params - Query parameters (search, location, paid, myUniversity, tags, tag, page, page_size)
 * @returns {Promise<Array|Object>} Array of opportunities (non-paginated) or object with opportunities and pagination
 * 
 * @example
 * // Non-paginated (backward compatible)
 * const opportunities = await fetchOpportunities();
 * const searchResults = await fetchOpportunities({ search: 'AI' });
 * 
 * // Paginated
 * const page1 = await fetchOpportunities({ page: 1, page_size: 20 });
 * // Returns: { opportunities: [...], pagination: { page: 1, pageSize: 20, total: 150, hasMore: true } }
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
