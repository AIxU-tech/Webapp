/**
 * FeedCard Component
 * Shared card layout for feed items (notes, opportunities).
 * Provides consistent header, content area, tags, and actions.
 */

import { Link } from 'react-router-dom';
import Tag, { TagGroup } from './Tag';
import { BookmarkIcon, TrashIcon } from '../icons';

export default function FeedCard({
  item,
  onDelete,
  onBookmark,
  canDelete = false,
  isBookmarked = false,
  headerBadges = null,
  tags = [],
  getTagVariant = () => 'default',
  primaryActions = null,
  children,
}) {
  return (
    <article className="bg-card border border-border rounded-lg p-6 shadow-card hover:shadow-hover transition-all duration-200">
      {/* Header - Author info, timestamp, optional badges, delete button */}
      <div className="flex items-center justify-between mb-4">
        <Link to={`/users/${item.author.id}`} className="flex items-center space-x-3 group">
          {/* Author Avatar */}
          <img
            src={item.author.avatar}
            alt={item.author.name}
            className="w-10 h-10 rounded-full flex-shrink-0"
          />

          {/* Author Info */}
          <div>
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {item.author.name}
            </span>
            <p className="text-sm text-muted-foreground">{item.author.university}</p>
          </div>
        </Link>

        {/* Right side: optional badges, timestamp, delete */}
        <div className="flex items-center space-x-2">
          {headerBadges}
          <span className="text-sm text-muted-foreground">{item.timeAgo}</span>
          {canDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className="text-muted-foreground hover:text-red-500 transition-colors p-1"
              title="Delete"
              aria-label="Delete"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>

      {/* Content Area - passed as children */}
      {children}

      {/* Tags */}
      {tags.length > 0 && (
        <TagGroup className="mb-4">
          {tags.map(tag => (
            <Tag key={tag} variant={getTagVariant(tag)} size="sm">{tag}</Tag>
          ))}
        </TagGroup>
      )}

      {/* Actions Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        {/* Primary Actions (left side) */}
        <div className="flex items-center space-x-2">
          {primaryActions}
        </div>

        {/* Bookmark Button (right side) */}
        <button
          onClick={() => onBookmark(item.id)}
          className={`p-2 rounded-lg transition-all duration-200 ${
            isBookmarked
              ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <BookmarkIcon filled={isBookmarked} />
        </button>
      </div>
    </article>
  );
}
