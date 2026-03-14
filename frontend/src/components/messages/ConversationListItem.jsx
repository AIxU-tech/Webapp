import { Link } from 'react-router-dom';
import { Avatar } from '../ui';

export default function ConversationListItem({ conversation, isActive, onClick, onHover }) {
  const { otherUser, lastMessage, hasUnread } = conversation;

  return (
    <div
      onClick={onClick}
      onMouseEnter={onHover}
      className={`
        flex items-center gap-3 px-3 py-3 mx-2 my-0.5 rounded-lg cursor-pointer transition-all duration-150
        ${isActive
          ? 'bg-gradient-to-r from-primary/15 to-primary/5'
          : 'hover:bg-muted/50'}
      `}
    >
      <Link
        to={`/users/${otherUser.id}`}
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0"
      >
        <Avatar user={otherUser} size="md" name={otherUser.name} />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm truncate ${
            hasUnread ? 'font-bold' : 'font-medium'
          } text-foreground`}>
            {otherUser.name}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            <span className="text-xs text-muted-foreground">
              {lastMessage?.timestamp}
            </span>
            {hasUnread && (
              <div className="w-2 h-2 bg-primary rounded-full" />
            )}
          </div>
        </div>
        <p className={`text-sm truncate mt-0.5 ${
          hasUnread ? 'text-foreground' : 'text-muted-foreground'
        }`}>
          {lastMessage?.content}
        </p>
      </div>
    </div>
  );
}
