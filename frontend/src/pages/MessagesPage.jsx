import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  useConversations,
  usePageTitle,
  markConversationRead,
} from '../hooks';
import { LoadingState, ErrorState } from '../components/ui';
import { ArrowLeftIcon } from '../components/icons';
import {
  ConversationSidebar,
  ConversationPanel,
} from '../components/messages';

export default function MessagesPage() {
  usePageTitle('Messages');

  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const {
    data: conversationsData,
    isLoading,
    error,
  } = useConversations();

  const conversations = conversationsData?.conversations || [];

  const [activeUserId, setActiveUserId] = useState(null);
  const [isNewConversation, setIsNewConversation] = useState(false);
  const [recipientUser, setRecipientUser] = useState(null);
  const [hoverArea, setHoverArea] = useState(null);

  // Handle startWith URL param
  useEffect(() => {
    const startWithUserId = searchParams.get('startWith');
    if (startWithUserId && isAuthenticated) {
      setActiveUserId(parseInt(startWithUserId, 10));
      setIsNewConversation(false);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, isAuthenticated]);

  // Auto-select first conversation on load
  useEffect(() => {
    if (!activeUserId && conversations.length > 0 && !isNewConversation) {
      setActiveUserId(conversations[0].otherUser.id);
      markConversationRead(queryClient, conversations[0].otherUser.id);
    }
  }, [conversations, activeUserId, isNewConversation, queryClient]);

  const handleSelectConversation = useCallback((userId) => {
    setActiveUserId(userId);
    setIsNewConversation(false);
    setRecipientUser(null);
    markConversationRead(queryClient, userId);
  }, [queryClient]);

  const handleStartNewConversation = useCallback((user) => {
    setActiveUserId(user.id);
    setIsNewConversation(true);
    setRecipientUser(user);
    markConversationRead(queryClient, user.id);
  }, [queryClient]);

  const handleConversationCreated = useCallback(() => {
    setIsNewConversation(false);
    setRecipientUser(null);
  }, []);

  // Mobile: back to sidebar
  const handleBack = useCallback(() => {
    setActiveUserId(null);
    setIsNewConversation(false);
    setRecipientUser(null);
  }, []);

  if (isLoading && conversations.length === 0) {
    return <LoadingState fullPage text="Loading messages..." size="lg" />;
  }

  if (error && conversations.length === 0) {
    return (
      <ErrorState
        fullPage
        message="Failed to load conversations"
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar - hidden on mobile when conversation active */}
      <div className={`${activeUserId ? 'hidden md:flex' : 'flex'} w-full md:w-auto`}>
        <ConversationSidebar
          conversations={conversations}
          activeUserId={activeUserId}
          onSelectConversation={handleSelectConversation}
          onStartNewConversation={handleStartNewConversation}
          disableScroll={hoverArea === 'conversation'}
          onMouseEnter={() => setHoverArea('sidebar')}
          onMouseLeave={() => setHoverArea(null)}
        />
      </div>

      {/* Conversation panel - hidden on mobile when no conversation */}
      <div className={`${activeUserId ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {/* Mobile back button */}
        {activeUserId && (
          <button
            type="button"
            onClick={handleBack}
            className="md:hidden flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground border-b border-border"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </button>
        )}
        <ConversationPanel
          userId={activeUserId}
          recipientUser={recipientUser}
          isNewConversation={isNewConversation}
          onConversationCreated={handleConversationCreated}
          onThreadMouseEnter={() => setHoverArea('conversation')}
          onThreadMouseLeave={() => setHoverArea(null)}
        />
      </div>

    </div>
  );
}
