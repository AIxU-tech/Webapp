/**
 * ActivityCard
 *
 * Unified activity component with tabs for Posts and Comments.
 * Shows recent items for each category, clickable to navigate to the post.
 * Uses a sliding pill indicator matching the UniversityNavTabs style.
 */

import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../ui';
import {
  FileTextIcon,
  MessageCircleIcon,
  HeartIcon,
} from '../../icons';

// Tab configuration
const TABS = [
  { id: 'posts', label: 'Posts', icon: FileTextIcon },
  { id: 'comments', label: 'Comments', icon: MessageCircleIcon },
];

// Post item component
function PostItem({ post }) {
  return (
    <Link to={`/notes/${post.id}`} className="block py-3 border-b border-border last:border-b-0 group">
      <p className="text-sm font-medium text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
        {post.title}
      </p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <HeartIcon size="xs" />
          {post.likes ?? 0}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircleIcon size="xs" />
          {post.comments ?? 0}
        </span>
        <span>{post.time}</span>
      </div>
    </Link>
  );
}

// Comment item component
function CommentItem({ comment }) {
  return (
    <Link to={`/notes/${comment.noteId}`} state={{ highlightCommentId: comment.id }} className="block py-3 border-b border-border last:border-b-0 group">
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
    </Link>
  );
}

// Empty state for each tab
function TabEmptyState({ tabId, isOwnProfile }) {
  const configs = {
    posts: {
      icon: <FileTextIcon size="lg" />,
      title: isOwnProfile ? 'No posts yet' : 'No posts yet',
      description: isOwnProfile ? 'Share your first post with the community' : null,
    },
    comments: {
      icon: <MessageCircleIcon size="lg" />,
      title: isOwnProfile ? 'No comments yet' : 'No comments yet',
      description: isOwnProfile ? 'Join the conversation on posts' : null,
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
  activities = [],
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

      default:
        return null;
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
                flex items-center justify-center cursor-pointer
                ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
              `}
            >
              <Icon size="sm" />
            </button>
          );
        })}
      </nav>

      {/* Tab content */}
      <div className="min-h-[120px]">
        {renderContent()}
      </div>
    </Card>
  );
}
