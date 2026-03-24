/**
 * NoteLikersModal Component
 *
 * Modal that displays a list of users who liked a note.
 * Uses BaseModal for consistent modal behavior and styling.
 * Uses React Query for data fetching with automatic caching.
 *
 * Features:
 * - List of users with avatars and names
 * - Links to user profiles
 * - Loading state while fetching
 * - Empty state when no likes
 * - Error state with retry
 * - Smooth animations
 *
 * @component
 */

import { Link } from 'react-router-dom';
import { BaseModal, Avatar } from '../ui';
import { HeartIcon } from '../icons';
import { useNoteLikers } from '../../hooks';

/**
 * NoteLikersModal Props
 * @typedef {Object} NoteLikersModalProps
 * @property {boolean} isOpen - Whether the modal is open
 * @property {Function} onClose - Callback when modal is closed
 * @property {number} noteId - The note ID to fetch likers for
 * @property {number} totalLikes - Total number of likes (for display in title)
 */

export default function NoteLikersModal({
  isOpen,
  onClose,
  noteId,
  totalLikes = 0,
}) {
  // Use React Query hook - only fetches when modal is open
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useNoteLikers(noteId, { enabled: isOpen });

  const users = data?.users || [];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Liked by ${totalLikes} ${totalLikes === 1 ? 'person' : 'people'}`}
      size="sm"
    >
      <div className="p-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <p className="text-sm text-red-500">
              {error?.message || 'Failed to load likes'}
            </p>
            <button
              onClick={() => refetch()}
              className="text-sm text-primary hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <HeartIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No likes yet</p>
          </div>
        )}

        {/* Users List */}
        {!isLoading && !isError && users.length > 0 && (
          <ul className="space-y-1 max-h-80 overflow-y-auto">
            {users.map((user) => (
              <li key={user.id}>
                <Link
                  to={`/users/${user.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors group"
                >
                  <Avatar user={user} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {user.name}
                    </p>
                    {user.university && (
                      <p className="text-xs text-muted-foreground truncate">
                        {user.university}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BaseModal>
  );
}
