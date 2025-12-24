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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  useConversations,
  usePageTitle,
  markConversationRead,
} from '../hooks';
import { LoadingState, ErrorState, EmptyState, GradientButton } from '../components/ui';
import { SearchIcon, PlusIcon, MessageCircleIcon } from '../components/icons';
import {
  ConversationListItem,
  ConversationModal,
  NewMessageModal,
} from '../components/messages';

// =============================================================================
// Main MessagesPage Component
// =============================================================================

export default function MessagesPage() {
  // ---------------------------------------------------------------------------
  // Page Title
  // ---------------------------------------------------------------------------
  usePageTitle('Messages');

  // ---------------------------------------------------------------------------
  // Hooks and Context
  // ---------------------------------------------------------------------------
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // ---------------------------------------------------------------------------
  // Data Fetching with React Query
  // ---------------------------------------------------------------------------
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

  // Modal states
  const [activeConversationUserId, setActiveConversationUserId] = useState(null);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);

  // ---------------------------------------------------------------------------
  // Authentication Check
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // ---------------------------------------------------------------------------
  // Conversation Modal Functions
  // ---------------------------------------------------------------------------
  const openConversation = useCallback((conversation) => {
    setActiveConversationUserId(conversation.otherUser.id);
    // Mark conversation as read in cache immediately
    markConversationRead(queryClient, conversation.otherUser.id);
  }, [queryClient]);

  const closeConversationModal = useCallback(() => {
    setActiveConversationUserId(null);
  }, []);

  // ---------------------------------------------------------------------------
  // New Message Modal Functions
  // ---------------------------------------------------------------------------
  const openNewMessageModal = useCallback(() => {
    setShowNewMessageModal(true);
  }, []);

  const closeNewMessageModal = useCallback(() => {
    setShowNewMessageModal(false);
  }, []);

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
  // Render: Loading State
  // ---------------------------------------------------------------------------
  if (conversationsLoading && conversations.length === 0) {
    return <LoadingState fullPage text="Loading messages..." size="lg" />;
  }

  // ---------------------------------------------------------------------------
  // Render: Error State
  // ---------------------------------------------------------------------------
  if (conversationsError && conversations.length === 0) {
    return (
      <ErrorState
        fullPage
        message="Failed to load conversations"
        onRetry={() => window.location.reload()}
      />
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Messages</h1>
          <p className="text-muted-foreground text-lg">
            Connect with AI enthusiasts and researchers from universities worldwide
          </p>
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
                className="
                  w-full pl-10 pr-4 py-3
                  border border-input bg-background rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                "
              />
            </div>

            <GradientButton onClick={openNewMessageModal} icon={<PlusIcon />}>
              New Message
            </GradientButton>
          </div>

          {/* Conversations List */}
          <div className="space-y-3">
            {filteredConversations.map((conversation) => (
              <ConversationListItem
                key={conversation.otherUser.id}
                conversation={conversation}
                onClick={() => openConversation(conversation)}
              />
            ))}
          </div>

          {/* Empty State */}
          {filteredConversations.length === 0 && (
            <EmptyState
              icon={<MessageCircleIcon className="h-8 w-8" />}
              title={searchQuery ? 'No conversations found' : 'No conversations yet'}
              description={
                searchQuery
                  ? 'Try adjusting your search query'
                  : 'Start connecting with AI enthusiasts from universities worldwide'
              }
              action={
                !searchQuery
                  ? {
                      label: 'Send Your First Message',
                      icon: <PlusIcon />,
                      onClick: openNewMessageModal,
                    }
                  : undefined
              }
            />
          )}
        </div>
      </div>

      {/* Conversation Modal */}
      <ConversationModal
        userId={activeConversationUserId}
        isOpen={!!activeConversationUserId}
        onClose={closeConversationModal}
      />

      {/* New Message Modal */}
      <NewMessageModal
        isOpen={showNewMessageModal}
        onClose={closeNewMessageModal}
      />
    </div>
  );
}
