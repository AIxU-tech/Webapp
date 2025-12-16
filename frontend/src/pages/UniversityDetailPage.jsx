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
import { getUniversity, deleteUniversity, removeMember, updateMemberRole } from '../api/universities';
import RoleBadge, { ROLES } from '../components/RoleBadge';
import MemberActionsPopover from '../components/MemberActionsPopover';
import ConfirmationModal from '../components/ConfirmationModal';

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
 * Tooltip Component
 *
 * A reusable tooltip that appears on hover. Uses CSS-only approach for
 * better performance and accessibility.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The trigger element
 * @param {string} props.content - Tooltip text content
 */
function Tooltip({ children, content }) {
  return (
    <div className="relative inline-flex group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}

/**
 * InfoIcon Component
 *
 * Small info circle icon for tooltips.
 */
const InfoIcon = () => (
  <svg className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

/**
 * EditIcon Component
 *
 * Pencil icon for member actions popover trigger.
 */
const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
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
   * - deleteLoading: Whether university delete is in progress
   * - memberActionLoading: Whether a member action (role change/remove) is in progress
   */
  const [university, setUniversity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [memberActionLoading, setMemberActionLoading] = useState(false);

  // Popover state - tracks which member's popover is open
  const [activePopoverMemberId, setActivePopoverMemberId] = useState(null);

  // Confirmation modal state for destructive actions
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    onConfirm: () => {},
  });

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
      setDeleteLoading(true);
      await deleteUniversity(id);
      navigate('/universities');
    } catch (error) {
      console.error('Error deleting university:', error);
      setErrorModal({
        isOpen: true,
        title: 'Delete Failed',
        message: error.message || 'Failed to delete university.',
      });
      setDeleteLoading(false);
    }
  };

  /**
   * Handle Role Change
   *
   * Changes a member's role (Member/Executive). Instant action.
   *
   * @param {number} userId - ID of user to update
   * @param {number} newRole - New role value
   */
  const handleRoleChange = async (userId, newRole) => {
    try {
      setMemberActionLoading(true);
      await updateMemberRole(id, userId, newRole);

      // Refresh university data
      const updatedData = await getUniversity(id);
      setUniversity(updatedData);
    } catch (error) {
      console.error('Error updating role:', error);
      setErrorModal({
        isOpen: true,
        title: 'Update Failed',
        message: error.message || 'Failed to update role.',
      });
    } finally {
      setMemberActionLoading(false);
    }
  };

  /**
   * Handle Make President
   *
   * Shows confirmation modal before transferring presidency.
   *
   * @param {number} userId - ID of user to make president
   */
  const handleMakePresident = (userId) => {
    const member = university?.members?.find((m) => m.id === userId);
    setConfirmModal({
      isOpen: true,
      title: 'Transfer Presidency',
      message: `Make ${member?.name || 'this member'} the club president? The current president will be demoted to Executive.`,
      variant: 'warning',
      onConfirm: async () => {
        try {
          setMemberActionLoading(true);
          await updateMemberRole(id, userId, ROLES.PRESIDENT);

          // Refresh university data
          const updatedData = await getUniversity(id);
          setUniversity(updatedData);
        } catch (error) {
          console.error('Error transferring presidency:', error);
          setErrorModal({
            isOpen: true,
            title: 'Transfer Failed',
            message: error.message || 'Failed to transfer presidency.',
          });
        } finally {
          setMemberActionLoading(false);
        }
      },
    });
  };

  /**
   * Handle Remove Member
   *
   * Shows confirmation modal before removing a member.
   *
   * @param {number} userId - ID of user to remove
   */
  const handleRemoveMember = (userId) => {
    const member = university?.members?.find((m) => m.id === userId);
    setConfirmModal({
      isOpen: true,
      title: 'Remove Member',
      message: `Remove ${member?.name || 'this member'} from the club? They can re-join by registering with their university email.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          setMemberActionLoading(true);
          await removeMember(id, userId);

          // Refresh university data
          const updatedData = await getUniversity(id);
          setUniversity(updatedData);
        } catch (error) {
          console.error('Error removing member:', error);
          setErrorModal({
            isOpen: true,
            title: 'Remove Failed',
            message: error.message || 'Failed to remove member.',
          });
        } finally {
          setMemberActionLoading(false);
        }
      },
    });
  };

  /**
   * Derived State
   *
   * Use permissions from API response.
   */
  const permissions = university?.permissions || {};
  const { isSiteAdmin, canManageMembers, canManageExecutives } = permissions;

  // Legacy isAdmin for Edit/Delete university buttons (site admin only)
  // Note: API returns 'permissionLevel' (camelCase)
  const isAdmin = isAuthenticated && (
    isSiteAdmin || user?.permissionLevel >= 1
  );

  const tags = Array.isArray(university?.tags) ? university.tags : [];

  // Sort members: President first, then Executives, then Members
  const sortedMembers = [...(university?.members || [])].sort((a, b) => {
    const roleA = a.role ?? 0;
    const roleB = b.role ?? 0;
    return roleB - roleA; // Higher role first
  });

  /**
   * Check if current user can manage a specific member
   *
   * Rules:
   * - Cannot manage yourself
   * - Need canManageMembers or canManageExecutives permission
   * - Cannot manage the president unless you're site admin
   */
  const canManageMember = (member) => {
    if (!isAuthenticated) return false;
    if (member.id === user?.id) return false;
    if (member.role === ROLES.PRESIDENT && !isSiteAdmin) return false;
    return canManageMembers || canManageExecutives;
  };

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

      {/* Confirmation Modal for destructive actions */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText="Confirm"
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
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
              {/* Delete Button - Admin only */}
              {isAdmin && (
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              )}
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
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Members</h3>
                  <Tooltip content={`Auto-enrolled via @${university.emailDomain || 'university'}.edu email`}>
                    <InfoIcon />
                  </Tooltip>
                </div>

                {sortedMembers.length > 0 ? (
                  <div className="space-y-3">
                    {sortedMembers.map((member) => (
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
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-foreground hover:underline truncate">
                                {member.name}
                              </span>
                              <RoleBadge role={member.role} size="xs" />
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {member.location || 'Location not set'}
                            </div>
                          </div>
                        </Link>

                        {/* Edit Button - Opens actions popover */}
                        {canManageMember(member) && (
                          <div className="relative flex-shrink-0">
                            <button
                              onClick={() => setActivePopoverMemberId(
                                activePopoverMemberId === member.id ? null : member.id
                              )}
                              disabled={memberActionLoading}
                              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label={`Manage ${member.name}`}
                            >
                              <EditIcon />
                            </button>

                            <MemberActionsPopover
                              isOpen={activePopoverMemberId === member.id}
                              onClose={() => setActivePopoverMemberId(null)}
                              member={member}
                              permissions={permissions}
                              onRoleChange={handleRoleChange}
                              onRemove={handleRemoveMember}
                              onMakePresident={handleMakePresident}
                            />
                          </div>
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
