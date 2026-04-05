// frontend/src/api/messages.js
/**
 * Messages API Module
 *
 * Handles all messaging-related API calls for the AIxU platform.
 * Provides functions for:
 * - Fetching all conversations (inbox view)
 * - Getting a specific conversation with a user
 * - Sending new messages
 * - Searching for users to message
 *
 * All functions use the centralized API client which handles:
 * - Authentication via cookies (Flask-Login session)
 * - JSON serialization/deserialization
 * - Error handling
 */

import { api } from './client';

/**
 * Get all conversations for the current user
 *
 * Returns a list of conversations sorted by most recent message.
 * Each conversation contains the other user's info and the last message.
 *
 * When the inbox is non-empty, `recentConversation` includes full `user` and
 * `messages` for the most recently active thread (same shape as getConversation),
 * without marking messages read — the client can seed its cache from this.
 *
 * @returns {Promise<object>} Response containing conversations array and optional recentConversation
 * @throws {ApiError} If not authenticated (401)
 *
 * @example
 * const response = await getConversations();
 * response.conversations.forEach(conv => {
 *   console.log(conv.otherUser.name, conv.lastMessage.content);
 * });
 */
export async function getConversations() {
  return api.get('/messages/conversations');
}

/**
 * Get conversation with a specific user
 *
 * Returns all messages between current user and specified user,
 * sorted chronologically (oldest first for proper display).
 * Also marks all unread messages from the other user as read.
 *
 * @param {number} userId - The other user's ID
 * @returns {Promise<object>} Response containing user info and messages array
 * @throws {ApiError} If not authenticated (401) or user not found (404)
 *
 * @example
 * const response = await getConversation(123);
 * console.log(`Chat with ${response.user.name}`);
 * response.messages.forEach(msg => {
 *   const sender = msg.isSentByCurrentUser ? 'You' : response.user.name;
 *   console.log(`${sender}: ${msg.content}`);
 * });
 */
export async function getConversation(userId) {
  return api.get(`/messages/conversation/${userId}`);
}

/**
 * Send a message to a user
 *
 * Creates a new message from the current user to the specified recipient.
 * Works for both new conversations and replies in existing ones.
 *
 * @param {number} recipientId - Recipient's user ID
 * @param {string} content - Message content (plain text)
 * @returns {Promise<object>} Response with success status and created message
 * @throws {ApiError} If not authenticated (401), user not found (404), or invalid data (400)
 *
 * @example
 * // Start a new conversation
 * await sendMessage(123, 'Hi! Want to collaborate on a project?');
 *
 * @example
 * // Reply in existing conversation
 * await sendMessage(existingUserId, 'That sounds great!');
 */
export async function sendMessage(recipientId, content) {
  return api.post('/messages', {
    recipient_id: recipientId,
    content,
  });
}

/**
 * Search for users to message
 *
 * Searches users by name, username, or email.
 * Excludes the current user from results.
 * Used for the "New Message" recipient search.
 *
 * @param {string} query - Search query (minimum 2 characters)
 * @returns {Promise<object>} Response containing users array
 * @throws {ApiError} If not authenticated (401)
 *
 * @example
 * const response = await searchUsers('john');
 * response.users.forEach(user => {
 *   console.log(user.name, user.university);
 * });
 */
export async function searchUsersForMessages(query) {
  return api.get(`/users/search?q=${encodeURIComponent(query)}`);
}

/**
 * Get unread message count for the current user
 *
 * Returns the total number of unread messages across all conversations.
 * Useful for displaying notification badges.
 *
 * @returns {Promise<object>} Response containing unreadCount number
 * @throws {ApiError} If not authenticated (401)
 *
 * @example
 * const response = await getUnreadCount();
 * if (response.unreadCount > 0) {
 *   showNotificationBadge(response.unreadCount);
 * }
 */
export async function getUnreadCount() {
  return api.get('/messages/unread-count');
}
