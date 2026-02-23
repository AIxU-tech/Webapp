import ConversationListItem from './ConversationListItem';
import UserSearchBar from './UserSearchBar';
import { EmptyState } from '../ui';
import { MessageCircleIcon } from '../icons';

export default function ConversationSidebar({
  conversations,
  activeUserId,
  onSelectConversation,
  onStartNewConversation,
  disableScroll = false,
  onMouseEnter,
  onMouseLeave,
  className = '',
}) {
  return (
    <div
      className={`w-full md:w-80 flex-shrink-0 flex flex-col gradient-mesh border-r border-border h-full ${className}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <UserSearchBar onStartNewConversation={onStartNewConversation} />

      <div className={`flex-1 ${disableScroll ? 'overflow-hidden' : 'overflow-y-auto'} py-1`}>
        {conversations.length === 0 ? (
          <EmptyState
            icon={<MessageCircleIcon className="h-12 w-12" />}
            title="No conversations yet"
            description="Search for a user above to start messaging"
          />
        ) : (
          conversations.map((conversation) => (
            <ConversationListItem
              key={conversation.otherUser.id}
              conversation={conversation}
              isActive={conversation.otherUser.id === activeUserId}
              onClick={() => onSelectConversation(conversation.otherUser.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
