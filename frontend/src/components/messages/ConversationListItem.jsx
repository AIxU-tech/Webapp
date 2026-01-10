/**
 * ConversationListItem Component
 *
 * Displays a single conversation in the messages inbox list.
 * Shows the other user's avatar, name, university, last message preview,
 * timestamp, and unread indicator.
 *
 * @component
 *
 * @example
 * <ConversationListItem
 *   conversation={conversation}
 *   onClick={() => openConversation(conversation)}
 * />
 */

import { Avatar } from '../ui';

/**
 * @typedef {Object} Conversation
 * @property {Object} otherUser - The other participant in the conversation
 * @property {number} otherUser.id - User ID
 * @property {string} otherUser.name - User's display name
 * @property {string} otherUser.avatar - User's avatar URL
 * @property {string} [otherUser.university] - User's university name
 * @property {Object} [lastMessage] - The most recent message
 * @property {string} lastMessage.content - Message content
 * @property {string} lastMessage.timestamp - Formatted timestamp
 * @property {boolean} lastMessage.isSentByCurrentUser - Whether current user sent this
 * @property {boolean} hasUnread - Whether there are unread messages
 */

export default function ConversationListItem({ conversation, onClick }) {
  const { otherUser, lastMessage, hasUnread } = conversation;

  return (
    <div
      onClick={onClick}
      className={`
        bg-card border rounded-lg p-4 shadow-card
        hover:shadow-lg transition-all duration-200 cursor-pointer
        ${hasUnread ? 'border-l-4 border-l-primary border-border' : 'border-border'}
      `}
    >
      <div className="flex items-start space-x-4">
        {/* User Avatar */}
        <Avatar src={otherUser.avatar} name={otherUser.name} size="lg" />

        {/* Conversation Details */}
        <div className="flex-1 min-w-0">
          {/* Header: Name and Timestamp */}
          <div className="flex items-center justify-between mb-1">
            <h3
              className={`font-semibold text-foreground ${hasUnread ? 'font-bold' : ''}`}
            >
              {otherUser.name}
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">
                {lastMessage?.timestamp}
              </span>
              {hasUnread && (
                <div className="w-2 h-2 bg-primary rounded-full" />
              )}
            </div>
          </div>

          {/* University */}
          <p className="text-sm text-muted-foreground mb-1">
            {otherUser.university}
          </p>

          {/* Last Message Preview */}
          <p
            className={`
              text-sm text-muted-foreground line-clamp-1
              ${hasUnread ? 'font-medium text-foreground' : ''}
            `}
          >
            {lastMessage?.isSentByCurrentUser && (
              <span className="text-muted-foreground">You: </span>
            )}
            {lastMessage?.content}
          </p>
        </div>
      </div>
    </div>
  );
}
