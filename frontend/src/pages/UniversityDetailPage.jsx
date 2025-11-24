/**
 * UniversityDetailPage Component
 *
 * Detailed view of a single university AI club.
 * Converted from university_detail.html Jinja template to React.
 *
 * Features:
 * - University information (name, location, description, stats)
 * - Tags display showing university's focus areas
 * - Members list with profile pictures and information
 * - Join button for eligible users (matching email domain)
 * - Admin controls: Edit and Delete buttons
 * - Remove member functionality (admin only)
 * - Responsive two-column layout (stacks on mobile)
 * - Error modal instead of separate error page for better UX
 *
 * Permissions:
 * - All users can view
 * - Authenticated users with matching email domain can join
 * - University admin or super admin can edit/delete/remove members
 *
 * @component
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUniversity, joinUniversity, deleteUniversity, removeMember } from '../api/universities';

/**
 * ErrorModal Component
 *
 * Modal dialog for displaying errors instead of showing a full error page.
 * Provides a better UX by allowing users to dismiss and go back easily
 * without navigating to a separate page.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {string} props.title - Modal title
 * @param {string} props.message - Error message to display
 * @param {Function} props.onClose - Callback when modal is closed
 */
function ErrorModal({ isOpen, title, message, onClose }) {
  // Don't render anything if modal is not open
  if (!isOpen) return null;

  return (
    // Modal overlay - semi-transparent backdrop with blur effect
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Modal container */}
      <div className="bg-card border border-border rounded-lg shadow-hover max-w-md w-full p-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>

          {/* Close button (X icon) */}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body - Error message */}
        <p className="text-muted-foreground mb-6">{message}</p>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            Go Back to Universities
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UniversityDetailPage() {
  const { id } = useParams(); // Get university ID from URL
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  /**
   * Component State
   *
   * - university: Full university data including members
   * - loading: Whether initial data is still loading
   * - errorModal: Object containing error modal state {isOpen, title, message}
   * - actionLoading: Whether a button action (join/delete) is in progress
   */
  const [university, setUniversity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [actionLoading, setActionLoading] = useState(false);

  /**
   * Fetch University Data
   *
   * Loads university details from API when component mounts or ID changes.
   * Shows error modal on failure instead of rendering an error page.
   * This provides better UX as user can dismiss and go back without a full page refresh.
   */
  useEffect(() => {
    async function fetchUniversity() {
      try {
        setLoading(true);

        // Fetch university from API
        const data = await getUniversity(id);
        setUniversity(data);

      } catch (err) {
        console.error('Error fetching university:', err);

        // Show error in modal instead of error page
        setErrorModal({
          isOpen: true,
          title: 'University Not Found',
          message: err.message || 'This university could not be found. It may have been deleted or the link is incorrect.',
        });
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchUniversity();
    }
  }, [id]);

  /**
   * Set Page Title
   *
   * Updates browser tab title with university name when data loads.
   */
  useEffect(() => {
    if (university) {
      document.title = `${university.name} - AIxU`;
    }
  }, [university]);

  /**
   * Handle Error Modal Close
   *
   * Closes error modal and navigates back to universities list.
   * Called when user clicks "Go Back" or the X button.
   */
  const handleErrorModalClose = () => {
    setErrorModal({ isOpen: false, title: '', message: '' });
    navigate('/universities');
  };

  /**
   * Handle Join University
   *
   * Submits join request to backend. User must have matching email domain.
   * Shows error in modal if join fails instead of using alert.
   */
  const handleJoin = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Confirm action with user
    if (!window.confirm('Request to join this university?')) {
      return;
    }

    try {
      setActionLoading(true);
      await joinUniversity(id);

      // Refresh university data to show updated members list
      const updatedData = await getUniversity(id);
      setUniversity(updatedData);

      // Show success message
      alert('Successfully joined the university!');
    } catch (error) {
      console.error('Error joining university:', error);

      // Show error in modal for better UX
      setErrorModal({
        isOpen: true,
        title: 'Unable to Join',
        message: error.message || 'Failed to join university. Please check that your email domain matches the required domain.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Handle Delete University
   *
   * Deletes the university. Only available to admin or super admin.
   * Shows error in modal if delete fails.
   */
  const handleDelete = async () => {
    // Double confirmation for destructive action
    if (!window.confirm('Are you sure you want to delete this university? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      await deleteUniversity(id);

      // Navigate back to universities list on success
      navigate('/universities');
    } catch (error) {
      console.error('Error deleting university:', error);

      // Show error in modal
      setErrorModal({
        isOpen: true,
        title: 'Delete Failed',
        message: error.message || 'Failed to delete university. You may not have permission to perform this action.',
      });

      setActionLoading(false);
    }
  };

  /**
   * Handle Remove Member
   *
   * Removes a member from the university. Only available to admin or super admin.
   * Shows error in modal if removal fails.
   *
   * @param {number} userId - ID of user to remove
   * @param {string} userName - Name of user to remove (for confirmation message)
   */
  const handleRemoveMember = async (userId, userName) => {
    // Confirm removal with user
    if (!window.confirm(`Remove ${userName} from the university?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await removeMember(id, userId);

      // Refresh university data to show updated members list
      const updatedData = await getUniversity(id);
      setUniversity(updatedData);

      alert('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);

      // Show error in modal
      setErrorModal({
        isOpen: true,
        title: 'Remove Failed',
        message: error.message || 'Failed to remove member. You may not have permission to perform this action.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Check if Current User is Admin
   *
   * Returns true if user is the university admin or a super admin (level >= 2).
   */
  const isAdmin = isAuthenticated && university && (
    university.adminId === user?.id || user?.permission_level >= 2
  );

  /**
   * Check if Current User is a Member
   *
   * Returns true if user's ID is in the members list.
   */
  const isMember = isAuthenticated && university?.members?.some(
    (member) => member.id === user?.id
  );

  /**
   * Check if User Can Join
   *
   * User can join if:
   * - They are authenticated
   * - They are not already a member
   * - The university has a required domain (admin has email)
   */
  const canJoin = isAuthenticated && !isMember && university?.requiredDomain;

  /**
   * Parse Tags
   *
   * Ensures tags is always an array for safe rendering.
   */
  const tags = Array.isArray(university?.tags) ? university.tags : [];

  /**
   * Render Loading State
   *
   * Shows centered loading message while fetching data.
   */
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="text-center py-12">
          <div className="text-muted-foreground">Loading university...</div>
        </div>
      </div>
    );
  }

  /**
   * Main Page Render
   *
   * Only renders if university data exists.
   * Errors are shown in modal overlay, not as a separate page.
   */
  return (
    <>
      {/* Error Modal - Shows on top of content when errors occur */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={handleErrorModalClose}
      />

      {/* Main Content - Only renders if university exists */}
      {university && (
        <div className="container mx-auto px-4 py-10">
          {/* Page Header with University Name and Action Buttons */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* University Name and Location */}
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {university.name}
              </h1>
              <p className="text-muted-foreground">{university.location}</p>
            </div>

            {/* Action Buttons - Join, Edit, Delete */}
            <div className="flex gap-2 flex-wrap">
              {/* Join Button - Show if user can join */}
              {canJoin && (
                <button
                  onClick={handleJoin}
                  disabled={actionLoading}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Joining...' : 'Request to Join'}
                </button>
              )}

              {/* Edit Button - Show to admins only */}
              {isAdmin && (
                <Link to={`/universities/${id}/edit`}>
                  <button className="bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-4 py-2 rounded-md hover:shadow-lg transition-all">
                    Edit University
                  </button>
                </Link>
              )}

              {/* Delete Button - Show to admins only */}
              {isAdmin && (
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
          </div>

          {/* Main Content - Two Column Layout */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Left Column - Main Content (2/3 width on desktop) */}
            <div className="md:col-span-2 space-y-6">
              {/* About Section - Description and Tags */}
              <div className="bg-card border border-border rounded-lg p-6 shadow-card">
                <h2 className="text-xl font-semibold text-foreground mb-2">About</h2>
                <p className="text-sm text-muted-foreground">
                  {university.description || 'No description available.'}
                </p>

                {/* Tags - Shows topics/interests of this university */}
                {tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Statistics - Members, Posts, Events */}
              <div className="grid grid-cols-3 gap-4">
                {/* Member Count */}
                <div className="bg-card border border-border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {university.memberCount || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Members</div>
                </div>

                {/* Recent Posts Count */}
                <div className="bg-card border border-border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {university.recentPosts || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Posts</div>
                </div>

                {/* Upcoming Events Count */}
                <div className="bg-card border border-border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {university.upcomingEvents || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Events</div>
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar (1/3 width on desktop) */}
            <aside>
              {/* People/Members Section */}
              <div className="bg-card border border-border rounded-lg p-6 shadow-card">
                <h3 className="text-lg font-semibold text-foreground mb-4">People</h3>

                {/* Members List */}
                {university.members && university.members.length > 0 ? (
                  <div className="space-y-3">
                    {university.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 justify-between"
                      >
                        {/* Member Info - Links to their profile */}
                        <Link
                          to={`/users/${member.id}`}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          {/* Profile Picture */}
                          <img
                            src={member.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face'}
                            alt={`${member.name}'s avatar`}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            onError={(e) => {
                              // Fallback if image fails to load
                              e.target.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face';
                            }}
                          />

                          {/* Member Name and Location */}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-foreground hover:underline truncate">
                              {member.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {member.location || 'Location not set'}
                            </div>
                          </div>
                        </Link>

                        {/* Remove Button - Only show to admin, and not for themselves */}
                        {isAdmin && member.id !== user?.id && (
                          <button
                            onClick={() => handleRemoveMember(member.id, member.name)}
                            disabled={actionLoading}
                            className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                            aria-label={`Remove ${member.name}`}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* No Members Message */
                  <p className="text-sm text-muted-foreground">
                    No affiliated people yet.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}
