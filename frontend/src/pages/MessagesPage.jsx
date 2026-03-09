import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useMessageTarget } from '../contexts/MessageTargetContext';
import {
  useConversations,
  usePageTitle,
  markConversationRead,
  clearUnreadConversation,
} from '../hooks';
import { LoadingState, ErrorState } from '../components/ui';
import { ArrowLeftIcon } from '../components/icons';
import {
  ConversationSidebar,
  ConversationPanel,
} from '../components/messages';

export default function MessagesPage() {
  usePageTitle('Messages');

  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { getTargetUserId, clearTarget } = useMessageTarget();

  const {
    data: conversationsData,
    isLoading,
    error,
  } = useConversations();

  const conversations = conversationsData?.conversations || [];

  // Check for target user on mount - use a function to read the ref value
  const getInitialState = () => {
    const targetId = getTargetUserId();
    if (targetId && isAuthenticated) {
      clearTarget(); // Clear immediately after reading
      return { activeUserId: targetId, shouldAutoFocus: true };
    }
    return { activeUserId: null, shouldAutoFocus: false };
  };

  const initialState = getInitialState();
  const [activeUserId, setActiveUserId] = useState(initialState.activeUserId);
  const [isNewConversation, setIsNewConversation] = useState(false);
  const [recipientUser, setRecipientUser] = useState(null);
  const [hoverArea, setHoverArea] = useState(null);
  const [shouldAutoFocus, setShouldAutoFocus] = useState(initialState.shouldAutoFocus);

  // Also check on every render in case we navigated while already on the page
  useEffect(() => {
    const targetId = getTargetUserId();
    if (targetId && isAuthenticated) {
      setActiveUserId(targetId);
      setIsNewConversation(false);
      setShouldAutoFocus(true);
      clearTarget();
    }
  });

  // Reset auto-focus after it's been consumed
  const handleAutoFocusConsumed = useCallback(() => {
    setShouldAutoFocus(false);
  }, []);

  // Tracks whether the user tapped Back to return to the conversation list.
  // Prevents auto-select from immediately overriding their navigation.
  const userNavigatedBack = useRef(false);

  // Auto-select first conversation when available.
  // CSS handles which panel is visible at each breakpoint.
  useEffect(() => {
    if (!activeUserId && conversations.length > 0 && !isNewConversation && !userNavigatedBack.current) {
      setActiveUserId(conversations[0].otherUser.id);
      markConversationRead(queryClient, conversations[0].otherUser.id);
      clearUnreadConversation(queryClient, conversations[0].otherUser.id);
    }
  }, [conversations, activeUserId, isNewConversation, queryClient]);

  const handleSelectConversation = useCallback((userId) => {
    userNavigatedBack.current = false;
    setActiveUserId(userId);
    setIsNewConversation(false);
    setRecipientUser(null);
    markConversationRead(queryClient, userId);
    clearUnreadConversation(queryClient, userId);
  }, [queryClient]);

  const handleStartNewConversation = useCallback((user) => {
    setActiveUserId(user.id);
    setIsNewConversation(true);
    setRecipientUser(user);
    markConversationRead(queryClient, user.id);
    clearUnreadConversation(queryClient, user.id);
  }, [queryClient]);

  const handleConversationCreated = useCallback(() => {
    setIsNewConversation(false);
    setRecipientUser(null);
  }, []);

  const handleBack = useCallback(() => {
    userNavigatedBack.current = true;
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
    <div className="fixed inset-x-0 top-16 bottom-16 xl:bottom-0 flex items-start justify-center xl:px-2 xl:py-2">
      <div className="w-full h-full bg-card xl:border xl:border-border xl:rounded-2xl overflow-hidden xl:shadow-card flex">
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
            autoFocusInput={shouldAutoFocus}
            onAutoFocusConsumed={handleAutoFocusConsumed}
          />
        </div>
      </div>
    </div>
  );
}
