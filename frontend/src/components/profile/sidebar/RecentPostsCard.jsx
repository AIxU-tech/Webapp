/**
 * RecentPostsCard
 *
 * Displays the user's recent posts with truncated titles,
 * engagement metrics (likes + comments), and relative timestamps.
 */

import { Link } from 'react-router-dom';
import { Card, EmptyState } from '../../ui';
import { HeartIcon, MessageCircleIcon, FileTextIcon } from '../../icons';

// Single post item with likes and comments
function PostItem({ post }) {
  return (
    <div className="py-3 border-b border-border last:border-b-0 group cursor-pointer">
      <p className="text-sm font-medium text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
        {post.title}
      </p>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
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

export default function RecentPostsCard({ activities = [], userId }) {
  // Filter to only show posts from activities
  const posts = activities.filter((a) => a.type === 'post');
  const hasPosts = posts.length > 0;

  return (
    <Card padding="md" hover={false}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Recent Posts</h3>
        {hasPosts && (
          <Link
            to={`/community?user=${userId}`}
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        )}
      </div>

      {hasPosts ? (
        <div className="divide-y divide-border">
          {posts.slice(0, 4).map((post, index) => (
            <PostItem key={index} post={post} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FileTextIcon className="h-8 w-8" />}
          title="No posts yet"
          className="py-6"
        />
      )}
    </Card>
  );
}
