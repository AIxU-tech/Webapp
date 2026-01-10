/**
 * NewMessageModal Component
 *
 * Modal for composing and sending a new message to a user.
 * Includes user search functionality to find recipients.
 *
 * Features:
 * - User search with debounced input
 * - Selected recipient display with removal option
 * - Message composition textarea
 * - Loading states for search and send operations
 *
 * @component
 *
 * @example
 * <NewMessageModal
 *   isOpen={showNewMessageModal}
 *   onClose={() => setShowNewMessageModal(false)}
 *   onSuccess={() => {
 *     // Handle successful send (e.g., show toast)
 *   }}
 * />
 */

import { useState, useCallback } from 'react';
import { BaseModal, GradientButton, UserListItem, Avatar } from '../ui';
import { SearchIcon, XIcon, SendIcon } from '../icons';
import { useSearchUsers, useSendMessage } from '../../hooks';

export default function NewMessageModal({ isOpen, onClose, onSuccess }) {
  // ---------------------------------------------------------------------------
  // Local State
  // ---------------------------------------------------------------------------
  const [recipientSearchQuery, setRecipientSearchQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [messageContent, setMessageContent] = useState('');

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------
  // Only search when no recipient is selected
  const { data: searchResults, isFetching: isSearching } = useSearchUsers(
    selectedRecipient ? '' : recipientSearchQuery
  );

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const sendMessageMutation = useSendMessage();

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Select a user as the message recipient
   */
  const handleSelectRecipient = useCallback((user) => {
    setSelectedRecipient(user);
    setRecipientSearchQuery(user.name);
  }, []);

  /**
   * Clear the selected recipient
   */
  const handleClearRecipient = useCallback(() => {
    setSelectedRecipient(null);
    setRecipientSearchQuery('');
  }, []);

  /**
   * Handle search input changes
   */
  const handleSearchChange = useCallback((e) => {
    setRecipientSearchQuery(e.target.value);
    // Clear selection if user starts typing again
    if (selectedRecipient) {
      setSelectedRecipient(null);
    }
  }, [selectedRecipient]);

  /**
   * Reset modal state
   */
  const resetState = useCallback(() => {
    setRecipientSearchQuery('');
    setSelectedRecipient(null);
    setMessageContent('');
  }, []);

  /**
   * Handle modal close with state reset
   */
  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const content = messageContent.trim();
    if (!content || !selectedRecipient) {
      return;
    }

    sendMessageMutation.mutate(
      { recipientId: selectedRecipient.id, content },
      {
        onSuccess: () => {
          handleClose();
          onSuccess?.();
        },
        onError: (error) => {
          alert('Failed to send message: ' + error.message);
        },
      }
    );
  };

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------
  const canSubmit = selectedRecipient && messageContent.trim() && !sendMessageMutation.isPending;
  const showSearchResults = searchResults?.length > 0 && !selectedRecipient;
  const showNoResults = recipientSearchQuery.length >= 2 &&
    !isSearching &&
    searchResults?.length === 0 &&
    !selectedRecipient;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Message"
      size="2xl"
    >
      <div className="p-6">
        <form onSubmit={handleSubmit}>
          {/* Recipient Search Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              To:
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                <SearchIcon />
              </div>
              <input
                type="text"
                value={recipientSearchQuery}
                onChange={handleSearchChange}
                placeholder="Search for a user..."
                disabled={selectedRecipient !== null}
                className="
                  w-full pl-10 pr-4 py-2
                  bg-background border border-border rounded-lg
                  text-foreground placeholder-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              />
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {searchResults.map((user) => (
                  <UserListItem
                    key={user.id}
                    user={{
                      id: user.id,
                      first_name: user.name?.split(' ')[0] || user.name,
                      last_name: user.name?.split(' ').slice(1).join(' ') || '',
                      profile_picture_url: user.avatar,
                    }}
                    subtitle={user.university || 'No university'}
                    onClick={() => handleSelectRecipient(user)}
                    avatarSize="md"
                    className="border border-border"
                  />
                ))}
              </div>
            )}

            {/* Loading State */}
            {isSearching && (
              <p className="text-sm text-muted-foreground mt-2">Searching...</p>
            )}

            {/* No Results */}
            {showNoResults && (
              <p className="text-sm text-muted-foreground mt-2 p-2">
                No users found
              </p>
            )}

            {/* Selected Recipient Chip */}
            {selectedRecipient && (
              <div className="mt-2">
                <div className="flex items-center space-x-2 bg-muted px-3 py-2 rounded-lg">
                  <Avatar src={selectedRecipient.avatar} name={selectedRecipient.name} size="sm" />
                  <span className="text-sm text-foreground">
                    {selectedRecipient.name}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearRecipient}
                    className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Remove recipient"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Message Content */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Message:
            </label>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Write your message..."
              rows="6"
              required
              className="
                w-full px-4 py-3
                bg-background border border-border rounded-lg
                text-foreground placeholder-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-primary
                resize-none
              "
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <GradientButton
              type="submit"
              disabled={!canSubmit}
              loading={sendMessageMutation.isPending}
              loadingText="Sending..."
              icon={<SendIcon />}
            >
              Send Message
            </GradientButton>
          </div>
        </form>
      </div>
    </BaseModal>
  );
}
