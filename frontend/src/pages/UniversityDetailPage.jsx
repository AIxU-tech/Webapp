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
 * - Members list with profile links and role badges
 * - Admin controls (remove members, change roles, delete university)
 * - Information about how to join via registration
 *
 * @component
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { deleteUniversity } from '../api/universities';

// Hooks
import {
  useUniversity,
  useRemoveMember,
  useUpdateMemberRole,
  usePageTitle,
} from '../hooks';

// UI Components
import {
  BaseModal,
  LoadingState,
  Tag,
  TagGroup,
  Tooltip,
  SecondaryButton,
  StatCard,
} from '../components/ui';
import ConfirmationModal from '../components/ConfirmationModal';
import RoleBadge, { ROLES } from '../components/RoleBadge';
import MemberActionsPopover from '../components/MemberActionsPopover';

// Icons
import { InfoIcon, EditIcon } from '../components/icons';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * MemberListItem Component
 *
 * Renders a single member row with avatar, name, location, role badge,
 * and optional management actions.
 */
function MemberListItem({
  member,
  canManage,
  isPopoverOpen,
  onTogglePopover,
  permissions,
  onRoleChange,
  onRemove,
  onMakePresident,
  isActionLoading,
}) {
  // Default avatar fallback
  const avatarUrl = member.avatar ||
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face';

  return (
    <div className="flex items-center gap-3 justify-between">
      {/* Member Info - Links to profile */}
      <Link
        to={`/users/${member.id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <img
          src={avatarUrl}
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
      {canManage && (
        <div className="relative flex-shrink-0">
          <button
            onClick={onTogglePopover}
            disabled={isActionLoading}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Manage ${member.name}`}
          >
            <EditIcon className="h-4 w-4" />
          </button>

          <MemberActionsPopover
            isOpen={isPopoverOpen}
            onClose={() => onTogglePopover()}
            member={member}
            permissions={permissions}
            onRoleChange={onRoleChange}
            onRemove={onRemove}
            onMakePresident={onMakePresident}
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function UniversityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // ---------------------------------------------------------------------------
  // Data Fetching with React Query
  // ---------------------------------------------------------------------------

  const {
    data: university,
    isLoading,
    error: fetchError,
    refetch,
  } = useUniversity(id);

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const removeMemberMutation = useRemoveMember();
  const updateRoleMutation = useUpdateMemberRole();

  // ---------------------------------------------------------------------------
  // Local State
  // ---------------------------------------------------------------------------

  // Delete university loading state (using local state since no dedicated hook)
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Popover state - tracks which member's popover is open
  const [activePopoverMemberId, setActivePopoverMemberId] = useState(null);

  // Error modal state
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: '',
    message: '',
  });

  // Confirmation modal state for destructive actions
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    onConfirm: () => {},
  });

  // ---------------------------------------------------------------------------
  // Page Title
  // ---------------------------------------------------------------------------

  usePageTitle(university?.name);

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------

  // Use permissions from API response
  const permissions = university?.permissions || {};
  const { isSiteAdmin, canManageMembers, canManageExecutives } = permissions;

  // Admin check for Edit/Delete university buttons (site admin only)
  const isAdmin = isAuthenticated && (
    isSiteAdmin || user?.permissionLevel >= 1
  );

  // Extract and validate tags
  const tags = Array.isArray(university?.tags) ? university.tags : [];

  // Sort members: President first, then Executives, then Members
  const sortedMembers = [...(university?.members || [])].sort((a, b) => {
    const roleA = a.role ?? 0;
    const roleB = b.role ?? 0;
    return roleB - roleA;
  });

  // Check if any mutation is in progress
  const memberActionLoading = removeMemberMutation.isPending || updateRoleMutation.isPending;

  // ---------------------------------------------------------------------------
  // Permission Helpers
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle error modal close - navigates back to universities list
   */
  const handleErrorModalClose = () => {
    setErrorModal({ isOpen: false, title: '', message: '' });
    navigate('/universities');
  };

  /**
   * Handle university deletion
   * Site admin only - deletes the entire university
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
   * Handle role change for a member
   * Instant action - no confirmation needed for promotions/demotions
   */
  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateRoleMutation.mutateAsync({
        universityId: id,
        userId,
        role: newRole,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      setErrorModal({
        isOpen: true,
        title: 'Update Failed',
        message: error.message || 'Failed to update role.',
      });
    }
  };

  /**
   * Handle making a member the president
   * Shows confirmation modal before transferring presidency
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
          await updateRoleMutation.mutateAsync({
            universityId: id,
            userId,
            role: ROLES.PRESIDENT,
          });
        } catch (error) {
          console.error('Error transferring presidency:', error);
          setErrorModal({
            isOpen: true,
            title: 'Transfer Failed',
            message: error.message || 'Failed to transfer presidency.',
          });
        }
      },
    });
  };

  /**
   * Handle removing a member from the club
   * Shows confirmation modal before removal
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
          await removeMemberMutation.mutateAsync({
            universityId: id,
            userId,
          });
        } catch (error) {
          console.error('Error removing member:', error);
          setErrorModal({
            isOpen: true,
            title: 'Remove Failed',
            message: error.message || 'Failed to remove member.',
          });
        }
      },
    });
  };

  // ---------------------------------------------------------------------------
  // Render: Loading State
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <LoadingState text="Loading university..." />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Error State
  // ---------------------------------------------------------------------------

  if (fetchError && !university) {
    return (
      <>
        <BaseModal
          isOpen={true}
          onClose={handleErrorModalClose}
          title="University Not Found"
          size="sm"
        >
          <div className="p-6">
            <p className="text-muted-foreground mb-6">
              {fetchError.message || 'This university could not be found.'}
            </p>
            <div className="flex justify-end">
              <SecondaryButton variant="primary" onClick={handleErrorModalClose}>
                Go Back to Universities
              </SecondaryButton>
            </div>
          </div>
        </BaseModal>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Main Content
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Error Modal for action failures */}
      <BaseModal
        isOpen={errorModal.isOpen}
        onClose={handleErrorModalClose}
        title={errorModal.title}
        size="sm"
      >
        <div className="p-6">
          <p className="text-muted-foreground mb-6">{errorModal.message}</p>
          <div className="flex justify-end">
            <SecondaryButton variant="primary" onClick={handleErrorModalClose}>
              Go Back to Universities
            </SecondaryButton>
          </div>
        </div>
      </BaseModal>

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
          <header className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {university.name}
              </h1>
              <p className="text-muted-foreground">{university.location}</p>
            </div>

            {/* Admin Action Buttons */}
            {isAdmin && (
              <div className="flex gap-2 flex-wrap">
                <SecondaryButton
                  variant="danger"
                  onClick={handleDelete}
                  loading={deleteLoading}
                  loadingText="Deleting..."
                >
                  Delete
                </SecondaryButton>
              </div>
            )}
          </header>

          {/* Main Content - Two Column Layout */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="md:col-span-2 space-y-6">
              {/* About Section */}
              <section className="bg-card border border-border rounded-lg p-6 shadow-card">
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  About
                </h2>
                <p className="text-sm text-muted-foreground">
                  {university.description || 'No description available.'}
                </p>

                {/* Tags */}
                {tags.length > 0 && (
                  <TagGroup className="mt-4">
                    {tags.map((tag, index) => (
                      <Tag key={index} variant="secondary" size="sm">
                        {tag}
                      </Tag>
                    ))}
                  </TagGroup>
                )}
              </section>

              {/* Statistics */}
              <section className="grid grid-cols-3 gap-4">
                <StatCard
                  value={university.memberCount || 0}
                  label="Members"
                />
                <StatCard
                  value={university.recentPosts || 0}
                  label="Posts"
                />
                <StatCard
                  value={university.upcomingEvents || 0}
                  label="Events"
                />
              </section>
            </div>

            {/* Right Column - Members Sidebar */}
            <aside>
              <div className="bg-card border border-border rounded-lg p-6 shadow-card">
                {/* Section Header with Tooltip */}
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Members
                  </h3>
                  <Tooltip content={`Auto-enrolled via @${university.emailDomain || 'university'}.edu email`}>
                    <InfoIcon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                  </Tooltip>
                </div>

                {/* Members List */}
                {sortedMembers.length > 0 ? (
                  <div className="space-y-3">
                    {sortedMembers.map((member) => (
                      <MemberListItem
                        key={member.id}
                        member={member}
                        canManage={canManageMember(member)}
                        isPopoverOpen={activePopoverMemberId === member.id}
                        onTogglePopover={() =>
                          setActivePopoverMemberId(
                            activePopoverMemberId === member.id ? null : member.id
                          )
                        }
                        permissions={permissions}
                        onRoleChange={handleRoleChange}
                        onRemove={handleRemoveMember}
                        onMakePresident={handleMakePresident}
                        isActionLoading={memberActionLoading}
                      />
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
