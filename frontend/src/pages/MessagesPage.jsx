/**
 * MessagesPage Component
 *
 * A comprehensive messaging interface for the AIxU platform with real-time
 * WebSocket updates. This page demonstrates the power of the caching system:
 *
 * - Cached conversations: Data persists between page visits
 * - Real-time updates: New messages appear instantly via WebSocket
 * - Optimistic UI: Sent messages appear immediately
 * - No loading spinners: Cached data shown instantly on return visits
 *
 * Features:
 * - Inbox view with list of all conversations
 * - Real-time search filtering of conversations
 * - Conversation modal for viewing and replying to messages
 * - New message modal with user search for starting new conversations
 * - Unread message indicators
 * - Responsive design for mobile and desktop
 *
 * @component
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  useConversations,
  useConversation,
  useSendMessage,
  useSearchUsers,
  markConversationRead,
} from '../hooks';
import { useQueryClient } from '@tanstack/react-query';

// ============================================================================
// SVG Icon Components
// ============================================================================

const SearchIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const XIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SendIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const MessageCircleIcon = () => (
  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const LoaderIcon = () => (
  <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// ============================================================================
// Main MessagesPage Component
// ============================================================================

export default function MessagesPage() {
  // ---------------------------------------------------------------------------
  // Hooks and Context
  // ---------------------------------------------------------------------------

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated } = useAuth();
  // ---------------------------------------------------------------------------
  // Data Fetching with React Query
  // ---------------------------------------------------------------------------
  // These hooks handle caching, loading states, and real-time updates

  const {
    data: conversationsData,
    isLoading: conversationsLoading,
    error: conversationsError,
  } = useConversations();

  // Extract conversations array from response
  const conversations = conversationsData?.conversations || [];

  // ---------------------------------------------------------------------------
  // Local UI State
  // ---------------------------------------------------------------------------

  // Search state for filtering conversations
  const [searchQuery, setSearchQuery] = useState('');

  // Conversation modal state
  const [activeConversationUserId, setActiveConversationUserId] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  // New message modal state
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [recipientSearchQuery, setRecipientSearchQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [newMessageContent, setNewMessageContent] = useState('');

  // ---------------------------------------------------------------------------
  // Active Conversation Query
  // ---------------------------------------------------------------------------
  // Only fetches when a conversation is opened

  const {
    data: conversationData,
    isLoading: conversationLoading,
  } = useConversation(activeConversationUserId);

  const conversationMessages = conversationData?.messages || [];
  const conversationUser = conversationData?.user;

  // ---------------------------------------------------------------------------
  // User Search Query (for new message modal)
  // ---------------------------------------------------------------------------

  const { data: searchResults, isFetching: searchingRecipients } = useSearchUsers(
    selectedRecipient ? '' : recipientSearchQuery // Don't search if recipient selected
  );

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const sendMessageMutation = useSendMessage();

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------

  const messagesEndRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Authentication Check
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // ---------------------------------------------------------------------------
  // Scroll to Bottom on New Messages
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (messagesEndRef.current && conversationMessages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationMessages]);

  // ---------------------------------------------------------------------------
  // Conversation Modal Functions
  // ---------------------------------------------------------------------------

  const openConversation = useCallback((conversation) => {
    setActiveConversationUserId(conversation.otherUser.id);
    document.body.style.overflow = 'hidden';

    // Mark conversation as read in cache immediately
    markConversationRead(queryClient, conversation.otherUser.id);
  }, [queryClient]);

  const closeConversationModal = useCallback(() => {
    setActiveConversationUserId(null);
    setReplyContent('');
    document.body.style.overflow = '';
  }, []);

  const handleSendReply = async (e) => {
    e.preventDefault();

    const content = replyContent.trim();
    if (!content || !activeConversationUserId) return;

    // Clear input immediately for better UX
    setReplyContent('');

    // Send via mutation (optimistic update handles UI)
    sendMessageMutation.mutate({
      recipientId: activeConversationUserId,
      content,
    });
  };

  // ---------------------------------------------------------------------------
  // New Message Modal Functions
  // ---------------------------------------------------------------------------

  const openNewMessageModal = useCallback(() => {
    setShowNewMessageModal(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeNewMessageModal = useCallback(() => {
    setShowNewMessageModal(false);
    setRecipientSearchQuery('');
    setSelectedRecipient(null);
    setNewMessageContent('');
    document.body.style.overflow = '';
  }, []);

  const selectRecipient = useCallback((user) => {
    setSelectedRecipient(user);
    setRecipientSearchQuery(user.name);
  }, []);

  const clearRecipient = useCallback(() => {
    setSelectedRecipient(null);
    setRecipientSearchQuery('');
  }, []);

  const handleSendNewMessage = async (e) => {
    e.preventDefault();

    const content = newMessageContent.trim();
    if (!content || !selectedRecipient) {
      alert('Please select a recipient and enter a message');
      return;
    }

    // Send via mutation
    sendMessageMutation.mutate(
      { recipientId: selectedRecipient.id, content },
      {
        onSuccess: () => {
          // Close modal and reset state
          closeNewMessageModal();
        },
        onError: (error) => {
          alert('Failed to send message: ' + error.message);
        },
      }
    );
  };

  // ---------------------------------------------------------------------------
  // Filter Conversations by Search
  // ---------------------------------------------------------------------------

  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;

    const searchLower = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      const userName = conv.otherUser.name.toLowerCase();
      const messageContent = conv.lastMessage?.content?.toLowerCase() || '';
      return userName.includes(searchLower) || messageContent.includes(searchLower);
    });
  }, [conversations, searchQuery]);

  // ---------------------------------------------------------------------------
  // Keyboard Event Handlers
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showNewMessageModal) {
          closeNewMessageModal();
        } else if (activeConversationUserId) {
          closeConversationModal();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showNewMessageModal, activeConversationUserId, closeNewMessageModal, closeConversationModal]);

  // ---------------------------------------------------------------------------
  // Render: Initial Loading State
  // ---------------------------------------------------------------------------
  // Only show loading on first load (no cached data)

  if (conversationsLoading && conversations.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Error State
  // ---------------------------------------------------------------------------

  if (conversationsError && conversations.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load conversations</p>
          <button
            onClick={() => window.location.reload()}
            className="text-academic-blue hover:underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Main Component
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Messages</h1>
              <p className="text-muted-foreground text-lg">
                Connect with AI enthusiasts and researchers from universities worldwide
              </p>
            </div>

          </div>
        </div>

        {/* Messages Container */}
        <div className="max-w-4xl mx-auto">
          {/* Search Bar and New Message Button */}
          <div className="mb-6 flex gap-4">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>

            <button
              onClick={openNewMessageModal}
              className="bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 whitespace-nowrap flex items-center"
            >
              <PlusIcon />
              <span className="ml-2">New Message</span>
            </button>
          </div>

          {/* Conversations List */}
          <div className="space-y-3">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.otherUser.id}
                onClick={() => openConversation(conversation)}
                className={`bg-card border rounded-lg p-4 shadow-card hover:shadow-lg transition-all duration-200 cursor-pointer ${
                  conversation.hasUnread
                    ? 'border-l-4 border-l-primary border-border'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className="relative flex-shrink-0">
                    <img
                      src={conversation.otherUser.avatar}
                      alt={conversation.otherUser.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-semibold text-foreground ${conversation.hasUnread ? 'font-bold' : ''}`}>
                        {conversation.otherUser.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">
                          {conversation.lastMessage?.timestamp}
                        </span>
                        {conversation.hasUnread && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-1">
                      {conversation.otherUser.university}
                    </p>

                    <p className={`text-sm text-muted-foreground line-clamp-1 ${
                      conversation.hasUnread ? 'font-medium text-foreground' : ''
                    }`}>
                      {conversation.lastMessage?.isSentByCurrentUser && (
                        <span className="text-muted-foreground">You: </span>
                      )}
                      {conversation.lastMessage?.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredConversations.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="text-muted-foreground">
                  <MessageCircleIcon />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Start connecting with AI enthusiasts from universities worldwide'}
              </p>
              {!searchQuery && (
                <button
                  onClick={openNewMessageModal}
                  className="bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 inline-flex items-center"
                >
                  <PlusIcon />
                  <span className="ml-2">Send Your First Message</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* Conversation Modal */}
      {/* ================================================================= */}
      {activeConversationUserId && (
        <div
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-[2px]"
          onClick={(e) => e.target === e.currentTarget && closeConversationModal()}
        >
          <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-3xl mx-4 h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
              <div className="flex items-center space-x-3">
                {conversationUser && (
                  <>
                    <img
                      src={conversationUser.avatar}
                      alt={conversationUser.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {conversationUser.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {conversationUser.university}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={closeConversationModal}
                className="text-muted-foreground hover:text-foreground transition-colors p-2"
              >
                <XIcon />
              </button>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversationLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">Loading messages...</div>
                </div>
              ) : conversationMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">No messages yet. Start the conversation!</div>
                </div>
              ) : (
                <>
                  {conversationMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isSentByCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`rounded-lg px-4 py-2 max-w-[70%] ${
                          message.isSentByCurrentUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <span
                          className={`text-xs mt-1 block ${
                            message.isSentByCurrentUser
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {message.timestamp}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Reply Form */}
            <div className="p-4 border-t border-border flex-shrink-0">
              <form onSubmit={handleSendReply} className="flex gap-2">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your message..."
                  rows="2"
                  className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!replyContent.trim() || sendMessageMutation.isPending}
                  className="bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200 self-end disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendMessageMutation.isPending ? <LoaderIcon /> : <SendIcon />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* New Message Modal */}
      {/* ================================================================= */}
      {showNewMessageModal && (
        <div
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-[2px]"
          onClick={(e) => e.target === e.currentTarget && closeNewMessageModal()}
        >
          <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-xl font-semibold text-foreground">New Message</h3>
              <button
                onClick={closeNewMessageModal}
                className="text-muted-foreground hover:text-foreground transition-colors p-2"
              >
                <XIcon />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <form onSubmit={handleSendNewMessage}>
                {/* Recipient Search */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-foreground mb-2">To:</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      <SearchIcon />
                    </div>
                    <input
                      type="text"
                      value={recipientSearchQuery}
                      onChange={(e) => {
                        setRecipientSearchQuery(e.target.value);
                        if (selectedRecipient) {
                          setSelectedRecipient(null);
                        }
                      }}
                      placeholder="Search for a user..."
                      className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={selectedRecipient !== null}
                    />
                  </div>

                  {/* Search Results */}
                  {searchResults && searchResults.length > 0 && !selectedRecipient && (
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => selectRecipient(user)}
                          className="flex items-center space-x-3 p-2 bg-card border border-border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                        >
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <div className="text-sm font-medium text-foreground">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.university}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchingRecipients && (
                    <p className="text-sm text-muted-foreground mt-2">Searching...</p>
                  )}

                  {recipientSearchQuery.length >= 2 && !searchingRecipients && searchResults?.length === 0 && !selectedRecipient && (
                    <p className="text-sm text-muted-foreground mt-2 p-2">No users found</p>
                  )}

                  {/* Selected Recipient */}
                  {selectedRecipient && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2 bg-muted px-3 py-2 rounded-lg">
                        <img
                          src={selectedRecipient.avatar}
                          alt={selectedRecipient.name}
                          className="w-8 h-8 rounded-full"
                        />
                        <span className="text-sm text-foreground">{selectedRecipient.name}</span>
                        <button
                          type="button"
                          onClick={clearRecipient}
                          className="ml-auto text-muted-foreground hover:text-foreground"
                        >
                          <XIcon />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Content */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-foreground mb-2">Message:</label>
                  <textarea
                    value={newMessageContent}
                    onChange={(e) => setNewMessageContent(e.target.value)}
                    placeholder="Write your message..."
                    rows="6"
                    required
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!selectedRecipient || !newMessageContent.trim() || sendMessageMutation.isPending}
                    className="bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendMessageMutation.isPending ? (
                      <>
                        <LoaderIcon />
                        <span className="ml-2">Sending...</span>
                      </>
                    ) : (
                      <>
                        <SendIcon />
                        <span className="ml-2">Send Message</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
