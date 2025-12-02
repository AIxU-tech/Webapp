/**
 * UniversityDetailPage Component
 *
 * Displays detailed information about a specific university AI club.
 * Shows university statistics, description, members list, and admin controls.
 *
 * Auto-Enrollment System:
 * Users are automatically enrolled in a university based on their .edu email
 * domain during registration. Manual joining is not supported. To become a
 * member of a university, users must register with an email from that
 * university's domain (e.g., @uoregon.edu for University of Oregon).
 *
 * Features:
 * - University overview (name, location, description, stats)
 * - Members list with profile links
 * - Admin controls (remove members, delete university)
 * - Information about how to join via registration
 *
 * @component
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUniversity, deleteUniversity, removeMember } from '../api/universities';

/**
 * ErrorModal Component
 *
 * Modal dialog for displaying errors instead of showing a full error page.
 * Provides a better UX by allowing users to dismiss and go back easily.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {string} props.title - Modal title
 * @param {string} props.message - Error message to display
 * @param {Function} props.onClose - Callback when modal is closed
 */
function ErrorModal({ isOpen, title, message, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-hover max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
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
        <p className="text-muted-foreground mb-6">{message}</p>
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

/**
 * InfoIcon Component
 *
 * Blue info circle icon for informational callouts.
 */
const InfoIcon = () => (
  <svg className="h-5 w-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function UniversityDetailPage() {
  /**
   * Route Parameters and Navigation
   */
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  /**
   * Component State
   *
   * - university: Full university data including members
   * - loading: Whether initial data is still loading
   * - errorModal: Object containing error modal state
   * - actionLoading: Whether a button action is in progress
   */
  const [university, setUniversity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [actionLoading, setActionLoading] = useState(false);

  /**
   * Fetch University Data
   *
   * Loads university details from API when component mounts.
   */
  useEffect(() => {
    async function fetchUniversity() {
      try {
        setLoading(true);
        const data = await getUniversity(id);
        setUniversity(data);
      } catch (err) {
        console.error('Error fetching university:', err);
        setErrorModal({
          isOpen: true,
          title: 'University Not Found',
          message: err.message || 'This university could not be found.',
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
   */
  useEffect(() => {
    if (university) {
      document.title = `${university.name} - AIxU`;
    }
  }, [university]);

  /**
   * Handle Error Modal Close
   */
  const handleErrorModalClose = () => {
    setErrorModal({ isOpen: false, title: '', message: '' });
    navigate('/universities');
  };

  /**
   * Handle Delete University
   *
   * Deletes the university. Only available to admin or super admin.
   */
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this university? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      await deleteUniversity(id);
      navigate('/universities');
    } catch (error) {
      console.error('Error deleting university:', error);
      setErrorModal({
        isOpen: true,
        title: 'Delete Failed',
        message: error.message || 'Failed to delete university.',
      });
      setActionLoading(false);
    }
  };

  /**
   * Handle Remove Member
   *
   * Removes a member from the university. Only available to admin.
   *
   * @param {number} userId - ID of user to remove
   * @param {string} userName - Name of user (for confirmation)
   */
  const handleRemoveMember = async (userId, userName) => {
    if (!window.confirm(`Remove ${userName} from the university?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await removeMember(id, userId);

      // Refresh university data
      const updatedData = await getUniversity(id);
      setUniversity(updatedData);

      alert('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
      setErrorModal({
        isOpen: true,
        title: 'Remove Failed',
        message: error.message || 'Failed to remove member.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Derived State
   *
   * Calculate permissions from user and university data.
   */
  const isAdmin = isAuthenticated && university && (
    university.adminId === user?.id || user?.permission_level >= 2
  );

  const isMember = isAuthenticated && university?.members?.some(
    (member) => member.id === user?.id
  );

  const tags = Array.isArray(university?.tags) ? university.tags : [];

  /**
   * Render Loading State
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
   * Main Render
   */
  return (
    <>
      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={handleErrorModalClose}
      />

      {university && (
        <div className="container mx-auto px-4 py-10">
          {/* Page Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {university.name}
              </h1>
              <p className="text-muted-foreground">{university.location}</p>
            </div>

            {/* Admin Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              {/* Edit Button - Admin only */}
              {isAdmin && (
                <Link to={`/universities/${id}/edit`}>
                  <button className="bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-4 py-2 rounded-md hover:shadow-lg transition-all">
                    Edit University
                  </button>
                </Link>
              )}

              {/* Delete Button - Admin only */}
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

          {/*
            Auto-Enrollment Information Card

            Explains how to join this university - via email domain at registration.
          */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <InfoIcon />
              <div>
                <h3 className="font-semibold text-blue-800 mb-1">
                  How to Join This University
                </h3>
                <p className="text-sm text-blue-700">
                  Members are automatically enrolled when they register with a{' '}
                  <strong>@{university.emailDomain || '[university]'}.edu</strong> email address.
                  {!isAuthenticated && (
                    <span>
                      {' '}
                      <Link to="/register" className="underline font-medium">
                        Register now
                      </Link>{' '}
                      with your university email to join.
                    </span>
                  )}
                  {isAuthenticated && !isMember && (
                    <span>
                      {' '}Your account is associated with a different university.
                    </span>
                  )}
                  {isMember && (
                    <span>
                      {' '}You are a member of this university.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Main Content - Two Column Layout */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="md:col-span-2 space-y-6">
              {/* About Section */}
              <div className="bg-card border border-border rounded-lg p-6 shadow-card">
                <h2 className="text-xl font-semibold text-foreground mb-2">About</h2>
                <p className="text-sm text-muted-foreground">
                  {university.description || 'No description available.'}
                </p>

                {/* Tags */}
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

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {university.memberCount || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Members</div>
                </div>

                <div className="bg-card border border-border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {university.recentPosts || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Posts</div>
                </div>

                <div className="bg-card border border-border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {university.upcomingEvents || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Events</div>
                </div>
              </div>
            </div>

            {/* Right Column - Members Sidebar */}
            <aside>
              <div className="bg-card border border-border rounded-lg p-6 shadow-card">
                <h3 className="text-lg font-semibold text-foreground mb-4">Members</h3>

                {university.members && university.members.length > 0 ? (
                  <div className="space-y-3">
                    {university.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 justify-between"
                      >
                        {/* Member Info - Links to profile */}
                        <Link
                          to={`/users/${member.id}`}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <img
                            src={member.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face'}
                            alt={`${member.name}'s avatar`}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face';
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-foreground hover:underline truncate">
                              {member.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {member.location || 'Location not set'}
                            </div>
                          </div>
                        </Link>

                        {/* Remove Button - Admin only, not for self */}
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
                  <p className="text-sm text-muted-foreground">
                    No members yet. Be the first to join by registering with your university email!
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
