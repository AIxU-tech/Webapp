import { useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useConversation, useSendMessage } from '../../hooks';
import { Avatar, EmptyState, LoadingState } from '../ui';
import { MessageCircleIcon } from '../icons';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

function ConversationHeader({ user }) {
  if (!user) return null;

  return (
    <div className="flex items-center p-4 gradient-mesh flex-shrink-0 sticky top-0 z-10">
      <Link to={`/users/${user.id}`} className="flex items-center space-x-3 group">
        <Avatar user={user} size="md" />
        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
          {user.name}
        </span>
      </Link>
    </div>
  );
}

export default function ConversationPanel({ userId, recipientUser, isNewConversation, onConversationCreated, onThreadMouseEnter, onThreadMouseLeave }) {
  const { data: conversationData, isLoading } = useConversation(userId);
  const messages = conversationData?.messages || [];
  const user = conversationData?.user || recipientUser;
  const sendMessageMutation = useSendMessage();
  const threadRef = useRef(null);

  useEffect(() => {
    if (threadRef.current && messages.length > 0) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback((content) => {
    if (!userId) return;

    sendMessageMutation.mutate(
      {
        recipientId: userId,
        content,
        recipientUser: isNewConversation ? recipientUser : undefined,
      },
      {
        onSuccess: () => {
          if (isNewConversation && onConversationCreated) {
            onConversationCreated(userId);
          }
        },
      }
    );
  }, [userId, isNewConversation, recipientUser, onConversationCreated, sendMessageMutation]);

  if (!userId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card border-l border-border">
        <EmptyState
          icon={<MessageCircleIcon className="h-12 w-12" />}
          title="No conversations yet"
          description="Search for a user above to start messaging"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col border-l border-border min-w-0 overflow-hidden">
      <ConversationHeader user={user} />

      <div
        ref={threadRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-card"
        onMouseEnter={onThreadMouseEnter}
        onMouseLeave={onThreadMouseLeave}
      >
        {isLoading && !isNewConversation ? (
          <LoadingState text="Loading messages..." />
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
      </div>

      <MessageInput
        onSend={handleSend}
        disabled={sendMessageMutation.isPending}
        autoFocus={isNewConversation}
      />
    </div>
  );
}
