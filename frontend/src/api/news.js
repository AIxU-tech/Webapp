/**
 * AI News & Research Papers API Client
 *
 * Provides functions for interacting with the news API endpoints:
 * - Fetching AI news stories and research papers
 * - Refreshing content via Claude web search
 * - Interactive chat about stories and papers
 *
 * All functions return Promises and handle authentication via cookies.
 *
 * @module api/news
 */

import { api } from './client';


// =============================================================================
// Content Fetching
// =============================================================================

/**
 * Fetch AI news stories from the backend.
 *
 * Retrieves the latest batch of news stories, ordered by insertion order.
 * Results are cached on the server, so repeated calls are fast.
 *
 * @param {number} [limit=10] - Maximum number of stories to fetch (1-20)
 * @returns {Promise<Object>} Response with stories array and metadata
 * @property {Array} stories - Array of story objects
 * @property {number} count - Number of stories returned
 * @property {string} batchId - Identifier for this batch of stories
 *
 * @example
 * const { stories, count } = await fetchNews(5);
 * console.log(`Loaded ${count} stories`);
 */
export async function fetchNews(limit = 10) {
  const response = await api.get(`/news?limit=${limit}`);
  return response;
}


/**
 * Fetch AI research papers from the backend.
 *
 * Retrieves the latest batch of research papers, ordered by insertion order.
 * Results are cached on the server.
 *
 * @param {number} [limit=3] - Maximum number of papers to fetch (1-10)
 * @returns {Promise<Object>} Response with papers array and metadata
 * @property {Array} papers - Array of paper objects
 * @property {number} count - Number of papers returned
 * @property {string} batchId - Identifier for this batch of papers
 *
 * @example
 * const { papers } = await fetchPapers(3);
 * papers.forEach(paper => console.log(paper.title));
 */
export async function fetchPapers(limit = 3) {
  const response = await api.get(`/papers?limit=${limit}`);
  return response;
}


/**
 * Fetch both AI news stories AND research papers in a single request.
 *
 * This is the recommended function for the News page, as it combines
 * both data types in one API call for optimal performance.
 *
 * @param {number} [storiesLimit=3] - Max stories to fetch (1-10)
 * @param {number} [papersLimit=3] - Max papers to fetch (1-10)
 * @returns {Promise<Object>} Response with stories, papers, and metadata
 * @property {Array} stories - Array of story objects
 * @property {Array} papers - Array of paper objects
 * @property {number} storiesCount - Number of stories returned
 * @property {number} papersCount - Number of papers returned
 * @property {string} batchId - Identifier for this batch
 *
 * @example
 * const { stories, papers, storiesCount } = await fetchAIContent(3, 3);
 */
export async function fetchAIContent(storiesLimit = 3, papersLimit = 3) {
  const response = await api.get(
    `/ai-content?stories_limit=${storiesLimit}&papers_limit=${papersLimit}`
  );
  return response;
}


/**
 * Fetch a single news story by its ID.
 *
 * @param {number} storyId - The database ID of the story
 * @returns {Promise<Object>} Response with story object
 * @property {Object} story - The story data
 *
 * @example
 * const { story } = await fetchStory(123);
 * console.log(story.title, story.summary);
 */
export async function fetchStory(storyId) {
  const response = await api.get(`/news/${storyId}`);
  return response;
}


/**
 * Fetch a single research paper by its ID.
 *
 * @param {number} paperId - The database ID of the paper
 * @returns {Promise<Object>} Response with paper object
 * @property {Object} paper - The paper data
 *
 * @example
 * const { paper } = await fetchPaper(456);
 * console.log(paper.title, paper.authors);
 */
export async function fetchPaper(paperId) {
  const response = await api.get(`/papers/${paperId}`);
  return response;
}


// =============================================================================
// Content Refresh (Admin)
// =============================================================================

/**
 * Trigger a refresh of AI news content.
 *
 * This calls Claude's web search to fetch the latest AI news stories
 * and research papers. Access is controlled:
 * - If no content exists (empty database), anyone can trigger
 * - If content exists, only admins can trigger
 *
 * The refresh takes 30-60 seconds as Claude performs multiple web searches.
 *
 * @returns {Promise<Object>} Response with new content and metadata
 * @property {boolean} success - Whether the refresh succeeded
 * @property {string} message - Human-readable result message
 * @property {string} batchId - Identifier for the new batch
 * @property {Array} stories - Newly fetched stories
 * @property {Array} papers - Newly fetched papers
 * @property {number} storiesCount - Number of new stories
 * @property {number} papersCount - Number of new papers
 *
 * @example
 * try {
 *   const result = await refreshAIContent();
 *   console.log(`Fetched ${result.storiesCount} stories`);
 * } catch (error) {
 *   console.error('Refresh failed:', error.message);
 * }
 */
export async function refreshAIContent() {
  const response = await api.post('/news/refresh');
  return response;
}


// =============================================================================
// Chat Functionality
// =============================================================================

/**
 * Send a chat message about a news story and get Claude's response.
 *
 * Users can ask questions about news stories and Claude will respond
 * with context-aware answers based on the story content.
 *
 * @param {number} storyId - The ID of the story to chat about
 * @param {string} message - The user's question or message
 * @param {string} [sessionId] - Optional session ID for conversation continuity
 * @returns {Promise<Object>} Response with Claude's answer
 * @property {string} response - Claude's text response
 * @property {string} sessionId - Session ID for follow-up messages
 * @property {Object} userMessage - The stored user message
 * @property {Object} assistantMessage - The stored assistant message
 *
 * @example
 * const result = await chatAboutStory(123, "What does this mean for AI safety?");
 * console.log(result.response);
 * // Use result.sessionId for follow-up questions
 */
export async function chatAboutStory(storyId, message, sessionId = null) {
  const body = { message };
  if (sessionId) {
    body.sessionId = sessionId;
  }
  const response = await api.post(`/news/${storyId}/chat`, body);
  return response;
}


/**
 * Send a chat message about a research paper and get Claude's response.
 *
 * Users can ask questions about research papers and Claude will explain
 * the methodology, findings, and significance in accessible terms.
 *
 * @param {number} paperId - The ID of the paper to chat about
 * @param {string} message - The user's question or message
 * @param {string} [sessionId] - Optional session ID for conversation continuity
 * @returns {Promise<Object>} Response with Claude's answer
 * @property {string} response - Claude's text response
 * @property {string} sessionId - Session ID for follow-up messages
 * @property {Object} userMessage - The stored user message
 * @property {Object} assistantMessage - The stored assistant message
 *
 * @example
 * const result = await chatAboutPaper(456, "Can you explain the key findings?");
 * console.log(result.response);
 */
export async function chatAboutPaper(paperId, message, sessionId = null) {
  const body = { message };
  if (sessionId) {
    body.sessionId = sessionId;
  }
  const response = await api.post(`/papers/${paperId}/chat`, body);
  return response;
}


/**
 * Get the chat history for a specific session.
 *
 * Retrieves all messages in a conversation, allowing users to
 * see past exchanges and continue discussions.
 *
 * @param {string} sessionId - The UUID session identifier
 * @returns {Promise<Object>} Response with messages array
 * @property {Array} messages - Array of message objects
 * @property {number} count - Number of messages
 * @property {string} sessionId - The session identifier
 *
 * @example
 * const { messages } = await getChatHistory('abc-123-def');
 * messages.forEach(msg => console.log(`${msg.role}: ${msg.content}`));
 */
export async function getChatHistory(sessionId) {
  const response = await api.get(`/chat/${sessionId}/history`);
  return response;
}


/**
 * Clear all messages in a chat session.
 *
 * Deletes the conversation history, allowing users to start fresh
 * without prior context affecting responses.
 *
 * @param {string} sessionId - The UUID session identifier
 * @returns {Promise<Object>} Response with deletion count
 * @property {number} deletedCount - Number of messages deleted
 * @property {string} sessionId - The session identifier
 *
 * @example
 * const { deletedCount } = await clearChatHistory('abc-123-def');
 * console.log(`Cleared ${deletedCount} messages`);
 */
export async function clearChatHistory(sessionId) {
  const response = await api.delete(`/chat/${sessionId}`);
  return response;
}
