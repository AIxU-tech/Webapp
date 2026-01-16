/**
 * ConversationModal Component
 *
 * Modal displaying a conversation thread with a specific user.
 * Includes message history and reply functionality.
 *
 * Features:
 * - Real-time message display
 * - Auto-scroll to latest messages
 * - Reply form with Enter to send
 * - Loading states
 * - Empty state for new conversations
 *
 * @component
 *
 * @example
 * <ConversationModal
 *   userId={activeUserId}
 *   isOpen={!!activeUserId}
 *   onClose={() => setActiveUserId(null)}
 * />
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useModal } from '../../hooks';
import { useConversation, useSendMessage } from '../../hooks';
import { SendIcon } from '../icons';
import { GradientButton, Avatar, CloseButton } from '../ui';

/**
 * MessageBubble - Displays a single message in the conversation
 */
function MessageBubble({ message }) {
  const isSent = message.isSentByCurrentUser;

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          rounded-lg px-4 py-2 max-w-[70%]
          ${isSent
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
          }
        `}
      >
        <p className="text-sm">{message.content}</p>
        <span
          className={`
            text-xs mt-1 block
            ${isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'}
          `}
        >
          {message.timestamp}
        </span>
      </div>
    </div>
  );
}

/**
 * ConversationHeader - User info and close button
 */
function ConversationHeader({ user, onClose }) {
  if (!user) return null;

  return (
    <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
      <div className="flex items-center space-x-3">
        <Avatar user={user} size="md" />
        <div>
          <h3 className="font-semibold text-foreground">{user.name}</h3>
          <p className="text-sm text-muted-foreground">{user.university}</p>
        </div>
      </div>
      <CloseButton
        onClick={onClose}
        ariaLabel="Close conversation"
      />
    </div>
  );
}

/**
 * ReplyForm - Message input and send button
 */
function ReplyForm({ onSubmit, disabled }) {
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    onSubmit(trimmedContent);
    setContent('');
  };

  const handleKeyDown = (e) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4 border-t border-border flex-shrink-0">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          rows="2"
          className="
            flex-1 px-4 py-2
            bg-background border border-border rounded-lg
            text-foreground placeholder-muted-foreground
            focus:outline-none focus:ring-2 focus:ring-primary
            resize-none
          "
        />
        <GradientButton
          type="submit"
          disabled={!content.trim() || disabled}
          className="self-end"
        >
          <SendIcon />
        </GradientButton>
      </form>
    </div>
  );
}

export default function ConversationModal({ userId, isOpen, onClose }) {
  // ---------------------------------------------------------------------------
  // Modal Behavior Hook
  // ---------------------------------------------------------------------------
  // Handles ESC key, scroll lock, and click outside
  const { containerRef } = useModal(isOpen, onClose);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------
  const { data: conversationData, isLoading } = useConversation(userId);
  const messages = conversationData?.messages || [];
  const user = conversationData?.user;

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const sendMessageMutation = useSendMessage();

  // ---------------------------------------------------------------------------
  // Refs for Auto-Scroll
  // ---------------------------------------------------------------------------
  const messagesEndRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Auto-scroll to Bottom on New Messages
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleSendReply = useCallback((content) => {
    if (!userId) return;

    sendMessageMutation.mutate({
      recipientId: userId,
      content,
    });
  }, [userId, sendMessageMutation]);

  /**
   * Handle backdrop click (close when clicking outside modal)
   */
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-[2px]"
      onClick={handleBackdropClick}
    >
      <div
        ref={containerRef}
        className="
          bg-card border border-border rounded-lg shadow-lg
          w-full max-w-3xl mx-4 h-[80vh]
          flex flex-col overflow-hidden
          animate-in fade-in zoom-in-95 duration-200
        "
      >
        {/* Header */}
        <ConversationHeader user={user} onClose={onClose} />

        {/* Messages Thread - flex-1 fills remaining space, overflow-y-auto enables scrolling */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">
                No messages yet. Start the conversation!
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Reply Form */}
        <ReplyForm
          onSubmit={handleSendReply}
          disabled={sendMessageMutation.isPending}
        />
      </div>
    </div>
  );
}
