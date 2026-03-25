/**
 * ActivityItem Component
 *
 * Renders a single activity item in the user's activity feed.
 * Supports different activity types with appropriate icons and content formatting.
 *
 * Activity Types:
 * - post: User created a post (shows title and likes)
 * - comment: User commented on a post (shows content and post reference)
 * - like: User liked a post (shows post title)
 * - join: User joined/activity event (shows content)
 *
 * @component
 *
 * @example
 * <ActivityItem activity={{
 *   type: 'post',
 *   title: 'My First Post',
 *   likes: 42,
 *   time: '2 hours ago'
 * }} />
 */

import {
  FileTextIcon,
  MessageCircleIcon,
  HeartIcon,
  ActivityIcon,
} from '../icons';

/**
 * Configuration for each activity type
 * Maps type to icon component and background color
 */
const ACTIVITY_CONFIG = {
  post: {
    Icon: FileTextIcon,
    bgColor: 'bg-blue-100',
    label: 'Created a post',
  },
  comment: {
    Icon: MessageCircleIcon,
    bgColor: 'bg-purple-100',
    label: 'Commented on',
  },
  like: {
    Icon: HeartIcon,
    bgColor: 'bg-green-100',
    label: 'Liked',
  },
  join: {
    Icon: ActivityIcon,
    bgColor: 'bg-gray-100',
    label: 'Activity',
  },
};

/**
 * Renders the activity-specific content based on type
 */
function ActivityContent({ activity }) {
  switch (activity.type) {
    case 'post':
      return (
        <>
          <h3 className="font-semibold text-foreground mb-1 truncate">
            {activity.title}
          </h3>
          <div className="flex items-center text-sm text-muted-foreground gap-1">
            <HeartIcon size="sm" />
            <span>{activity.likes} likes</span>
          </div>
        </>
      );

    case 'comment':
      return (
        <>
          <p className="text-foreground mb-1">{activity.content}</p>
          <p className="text-sm text-muted-foreground">
            on "{activity.post}"
          </p>
        </>
      );

    case 'like':
      return (
        <p className="text-foreground">"{activity.post}"</p>
      );

    case 'join':
      return (
        <p className="text-foreground">{activity.content}</p>
      );

    default:
      return null;
  }
}

export default function ActivityItem({ activity }) {
  // Get configuration for this activity type, with fallback
  const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.join;
  const { Icon, bgColor, label } = config;

  return (
    <div className="flex items-start space-x-4 p-4 bg-muted/30 rounded-lg">
      {/* Activity Type Icon */}
      <div className="flex-shrink-0">
        <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center`}>
          <Icon size="md" />
        </div>
      </div>

      {/* Activity Content */}
      <div className="flex-1 min-w-0">
        {/* Header with label and timestamp */}
        <div className="flex flex-wrap items-center justify-between mb-1 gap-2">
          <p className="text-sm text-muted-foreground flex-1">
            {label}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {activity.time}
          </span>
        </div>

        {/* Type-specific content */}
        <ActivityContent activity={activity} />
      </div>
    </div>
  );
}
