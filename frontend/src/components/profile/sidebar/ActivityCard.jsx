/**
 * ActivityCard
 *
 * Unified activity component with tabs for Posts, Comments, and Connections.
 * Shows recent items for each category with an option to view more.
 * Uses a sliding pill indicator matching the UniversityNavTabs style.
 */

import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../ui/Card';
import Avatar from '../../ui/Avatar';
import {
  FileTextIcon,
  MessageCircleIcon,
  UsersIcon,
  HeartIcon,
  ExternalLinkIcon,
} from '../../icons';

// Tab configuration
const TABS = [
  { id: 'posts', label: 'Posts', icon: FileTextIcon },
  { id: 'comments', label: 'Comments', icon: MessageCircleIcon },
  { id: 'connections', label: 'Connections', icon: UsersIcon },
];

// Post item component
function PostItem({ post }) {
  return (
    <div className="py-3 border-b border-border last:border-b-0 group cursor-pointer">
      <p className="text-sm font-medium text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
        {post.title}
      </p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <HeartIcon className="h-3 w-3" />
          {post.likes ?? 0}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircleIcon className="h-3 w-3" />
          {post.comments ?? 0}
        </span>
        <span>{post.time}</span>
      </div>
    </div>
  );
}

// Comment item component
function CommentItem({ comment }) {
  return (
    <div className="py-3 border-b border-border last:border-b-0 group cursor-pointer">
      <p className="text-sm text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
        "{comment.text}"
      </p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>on</span>
        <span className="font-medium text-foreground/80 truncate max-w-[150px]">
          {comment.postTitle}
        </span>
        <span>·</span>
        <span>{comment.time}</span>
      </div>
    </div>
  );
}

// Connection item component
function ConnectionItem({ connection }) {
  return (
    <Link
      to={`/users/${connection.id}`}
      className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0 group"
    >
      <Avatar src={connection.avatarUrl} name={connection.name} size="sm" className="w-9 h-9" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {connection.name}
        </p>
        {connection.university && (
          <p className="text-xs text-muted-foreground truncate">
            {connection.university}
          </p>
        )}
      </div>
      <ExternalLinkIcon className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

// Empty state for each tab
function TabEmptyState({ tabId, isOwnProfile }) {
  const configs = {
    posts: {
      icon: <FileTextIcon className="h-6 w-6" />,
      title: isOwnProfile ? 'No posts yet' : 'No posts yet',
      description: isOwnProfile ? 'Share your first post with the community' : null,
    },
    comments: {
      icon: <MessageCircleIcon className="h-6 w-6" />,
      title: isOwnProfile ? 'No comments yet' : 'No comments yet',
      description: isOwnProfile ? 'Join the conversation on posts' : null,
    },
    connections: {
      icon: <UsersIcon className="h-6 w-6" />,
      title: isOwnProfile ? 'No connections yet' : 'No connections yet',
      description: isOwnProfile ? 'Connect with other AI enthusiasts' : null,
    },
  };

  const config = configs[tabId];

  return (
    <div className="py-6 text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-secondary/50 text-muted-foreground mb-2">
        {config.icon}
      </div>
      <p className="text-sm text-muted-foreground">{config.title}</p>
      {config.description && (
        <p className="text-xs text-muted-foreground/70 mt-0.5">{config.description}</p>
      )}
    </div>
  );
}

export default function ActivityCard({
  userId,
  activities = [],
  connections = [],
  isOwnProfile,
}) {
  const [activeTab, setActiveTab] = useState('posts');
  const tabRefs = useRef({});
  const containerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Update indicator position when active tab changes
  useEffect(() => {
    const activeEl = tabRefs.current[activeTab];
    if (activeEl && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tabRect = activeEl.getBoundingClientRect();

      setIndicatorStyle({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  }, [activeTab]);

  // Filter activities by type
  const posts = activities.filter((a) => a.type === 'post');
  const comments = activities.filter((a) => a.type === 'comment');

  // Get view more link based on active tab
  const getViewMoreLink = () => {
    switch (activeTab) {
      case 'posts':
        return `/community?user=${userId}`;
      case 'comments':
        return `/community?user=${userId}&tab=comments`;
      case 'connections':
        return `/users/${userId}/connections`;
      default:
        return null;
    }
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'posts':
        if (posts.length === 0) {
          return <TabEmptyState tabId="posts" isOwnProfile={isOwnProfile} />;
        }
        return (
          <div>
            {posts.slice(0, 3).map((post) => (
              <PostItem key={post.id || `post-${post.title}`} post={post} />
            ))}
          </div>
        );

      case 'comments':
        if (comments.length === 0) {
          return <TabEmptyState tabId="comments" isOwnProfile={isOwnProfile} />;
        }
        return (
          <div>
            {comments.slice(0, 3).map((comment) => (
              <CommentItem key={comment.id || `comment-${comment.text?.slice(0, 20)}`} comment={comment} />
            ))}
          </div>
        );

      case 'connections':
        if (connections.length === 0) {
          return <TabEmptyState tabId="connections" isOwnProfile={isOwnProfile} />;
        }
        return (
          <div>
            {connections.slice(0, 4).map((connection) => (
              <ConnectionItem key={connection.id} connection={connection} />
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  // Check if current tab has more items to show
  const hasMore = () => {
    switch (activeTab) {
      case 'posts':
        return posts.length > 3;
      case 'comments':
        return comments.length > 3;
      case 'connections':
        return connections.length > 4;
      default:
        return false;
    }
  };

  // Get count for current tab
  const getCount = () => {
    switch (activeTab) {
      case 'posts':
        return posts.length;
      case 'comments':
        return comments.length;
      case 'connections':
        return connections.length;
      default:
        return 0;
    }
  };

  return (
    <Card padding="md" hover={false}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Activity</h3>
      </div>

      {/* Tab navigation with sliding indicator */}
      <nav
        ref={containerRef}
        className="relative flex bg-muted rounded-lg p-1 mb-4"
        role="tablist"
      >
        {/* White sliding pill indicator */}
        <div
          className="absolute inset-y-1 bg-card rounded-md shadow-sm transition-all duration-300 ease-out"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />

        {/* Tab buttons - icon only with tooltips */}
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;

          return (
            <button
              key={id}
              ref={(el) => (tabRefs.current[id] = el)}
              role="tab"
              aria-selected={isActive}
              aria-label={label}
              title={label}
              onClick={() => setActiveTab(id)}
              className={`
                relative z-10 flex-1 py-2 transition-colors rounded-md
                flex items-center justify-center
                ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
              `}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </nav>

      {/* Tab content */}
      <div className="min-h-[120px]">
        {renderContent()}
      </div>

      {/* View more link */}
      {hasMore() && (
        <div className="pt-3 mt-3 border-t border-border">
          <Link
            to={getViewMoreLink()}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View all {activeTab}
            <ExternalLinkIcon className="w-3 h-3" />
          </Link>
        </div>
      )}
    </Card>
  );
}
