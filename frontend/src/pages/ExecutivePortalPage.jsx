/**
 * ExecutivePortalPage
 *
 * Executive portal for club executives to manage members.
 * - Dashboard: List of members with roles and events attended count
 * - Member detail: Individual member's attendance history and role management
 *
 * Routes:
 * - /executive/:universityId - Member dashboard
 * - /executive/:universityId/members/:userId - Member detail
 */

import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  useUniversity,
  useMemberAttendance,
  useRemoveMember,
  useUpdateMemberRole,
  usePageTitle,
} from '../hooks';
import {
  Card,
  EmptyState,
  Avatar,
  IconButton,
  MemberActionsPopover,
  SecondaryButton,
} from '../components/ui';
import { UsersIcon, PencilIcon, ArrowLeftIcon, ClockIcon } from '../components/icons';
import RoleBadge from '../components/university/RoleBadge';
import { UniversityPageSkeleton } from '../components/university';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { BaseModal, ConfirmationModal } from '../components/ui';

export default function ExecutivePortalPage() {
  const { universityId, userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  const { data: university, isLoading, error } = useUniversity(universityId);
  const { data: attendanceData, isLoading: attendanceLoading } = useMemberAttendance(
    universityId,
    userId
  );
  const removeMemberMutation = useRemoveMember();
  const updateRoleMutation = useUpdateMemberRole();

  const [openPopoverId, setOpenPopoverId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    onConfirm: () => {},
  });
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: '',
    message: '',
  });

  usePageTitle(
    university?.name
      ? userId
        ? `Member Details – ${university.name}`
        : `Executive Portal – ${university.name}`
      : 'Executive Portal'
  );

  const members = university?.members ?? [];
  const permissions = university?.permissions ?? {};
  const { canManageMembers, canManageExecutives, isSiteAdmin } = permissions;
  const canManageAny = canManageMembers || canManageExecutives || isSiteAdmin;

  const selectedMember = userId ? members.find((m) => String(m.id) === String(userId)) : null;
  const events = attendanceData?.events ?? [];

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await updateRoleMutation.mutateAsync({
        universityId,
        userId: memberId,
        role: newRole,
      });
      setOpenPopoverId(null);
    } catch (err) {
      setErrorModal({
        isOpen: true,
        title: 'Role Update Failed',
        message: err.message || 'Failed to update member role.',
      });
    }
  };

  const handleRemove = (memberId) => {
    const member = members.find((m) => m.id === memberId);
    setConfirmModal({
      isOpen: true,
      title: 'Remove Member',
      message: `Are you sure you want to remove ${member?.name || 'this member'} from the club? They can rejoin if they still have a valid university email.`,
      variant: 'warning',
      onConfirm: async () => {
        try {
          await removeMemberMutation.mutateAsync({ universityId, userId: memberId });
          setConfirmModal((c) => ({ ...c, isOpen: false }));
          if (userId && String(memberId) === String(userId)) {
            navigate(`/executive/${universityId}`);
          }
          setOpenPopoverId(null);
        } catch (err) {
          setErrorModal({
            isOpen: true,
            title: 'Removal Failed',
            message: err.message || 'Failed to remove member.',
          });
        }
      },
    });
  };

  const handleMakePresident = (memberId) => {
    const member = members.find((m) => m.id === memberId);
    setConfirmModal({
      isOpen: true,
      title: 'Transfer Presidency',
      message: `Are you sure you want to make ${member?.name || 'this member'} the new President? You will be demoted to Executive.`,
      variant: 'warning',
      onConfirm: async () => {
        try {
          await updateRoleMutation.mutateAsync({
            universityId,
            userId: memberId,
            role: 2,
          });
          setConfirmModal((c) => ({ ...c, isOpen: false }));
          setOpenPopoverId(null);
        } catch (err) {
          setErrorModal({
            isOpen: true,
            title: 'Transfer Failed',
            message: err.message || 'Failed to transfer presidency.',
          });
        }
      },
    });
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (isLoading || !university) {
    return <UniversityPageSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">{error.message || 'Failed to load university.'}</p>
        <SecondaryButton className="mt-4" variant="primary" onClick={() => navigate(-1)}>
          Go Back
        </SecondaryButton>
      </div>
    );
  }

  // Member detail view
  if (userId && selectedMember) {
    const isCurrentUser = selectedMember.id === currentUserId;
    const showEditButton = canManageAny && !isCurrentUser;

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <SecondaryButton
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/executive/${universityId}`)}
            className="mb-6 -ml-2"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Members
          </SecondaryButton>

          <Card padding="lg" className="mb-6">
            <div className="flex items-start gap-4">
              <Avatar user={selectedMember} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-semibold text-foreground truncate">
                    {selectedMember.name}
                  </h1>
                  <RoleBadge role={selectedMember.role} size="sm" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedMember.location || 'Location not set'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedMember.eventsAttendedCount ?? 0} event
                  {(selectedMember.eventsAttendedCount ?? 0) !== 1 ? 's' : ''} attended
                </p>
                {showEditButton && (
                  <div className="relative mt-4">
                    <IconButton
                      icon={PencilIcon}
                      onClick={() =>
                        setOpenPopoverId(openPopoverId === selectedMember.id ? null : selectedMember.id)
                      }
                      label={`Manage ${selectedMember.name}`}
                      size="sm"
                      variant="subtle"
                    />
                    <MemberActionsPopover
                      isOpen={openPopoverId === selectedMember.id}
                      onClose={() => setOpenPopoverId(null)}
                      member={selectedMember}
                      permissions={permissions}
                      onRoleChange={handleRoleChange}
                      onRemove={handleRemove}
                      onMakePresident={handleMakePresident}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="font-semibold text-foreground mb-4">Event Attendance History</h2>
            {attendanceLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : events.length === 0 ? (
              <EmptyState
                icon={<ClockIcon className="h-12 w-12" />}
                title="No events attended"
                description="This member has not checked in to any events yet."
              />
            ) : (
              <ul className="space-y-3">
                {events.map((evt) => (
                  <li
                    key={evt.eventId}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="font-medium text-foreground">{evt.eventTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        Event: {formatDateTime(evt.eventStartTime)}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Checked in: {formatDateTime(evt.checkedInAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <ConfirmationModal
          {...confirmModal}
          onClose={() => setConfirmModal((c) => ({ ...c, isOpen: false }))}
        />
        <BaseModal
          isOpen={errorModal.isOpen}
          onClose={() => setErrorModal((e) => ({ ...e, isOpen: false }))}
          title={errorModal.title}
          size="sm"
        >
          <div className="p-6">
            <p className="text-muted-foreground mb-6">{errorModal.message}</p>
            <SecondaryButton
              variant="primary"
              onClick={() => setErrorModal((e) => ({ ...e, isOpen: false }))}
            >
              OK
            </SecondaryButton>
          </div>
        </BaseModal>
      </div>
    );
  }

  // Member not found when userId is present
  if (userId && !selectedMember) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Member not found.</p>
        <SecondaryButton
          className="mt-4"
          variant="primary"
          onClick={() => navigate(`/executive/${universityId}`)}
        >
          Back to Members
        </SecondaryButton>
      </div>
    );
  }

  // Member list view (dashboard)
  const sortedMembers = [...members].sort((a, b) => (b.role ?? 0) - (a.role ?? 0));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Executive Portal – {university.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage members and view attendance
            </p>
          </div>
          <Link to={`/universities/${universityId}`}>
            <SecondaryButton variant="ghost" size="sm">
              View University Page
            </SecondaryButton>
          </Link>
        </div>

        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">
              All Members ({sortedMembers.length})
            </h2>
          </div>

          {sortedMembers.length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="h-12 w-12" />}
              title="No members yet"
              description="Be the first to join by registering with your university email!"
            />
          ) : (
            <div className="space-y-2">
              {sortedMembers.map((member) => {
                const isCurrentUser = member.id === currentUserId;
                const showEditButton = canManageAny && !isCurrentUser;

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Link
                      to={`/executive/${universityId}/members/${member.id}`}
                      className="flex-shrink-0"
                    >
                      <Avatar user={member} size="md" />
                    </Link>

                    <Link
                      to={`/executive/${universityId}/members/${member.id}`}
                      className="flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {member.name}
                        </span>
                        <RoleBadge role={member.role} size="xs" />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.location || 'Location not set'} ·{' '}
                        {member.eventsAttendedCount ?? 0} events attended
                      </p>
                    </Link>

                    {showEditButton && (
                      <div
                        className="relative flex-shrink-0"
                        onClick={(e) => e.preventDefault()}
                      >
                        <IconButton
                          icon={PencilIcon}
                          onClick={(e) => {
                            e.preventDefault();
                            setOpenPopoverId(openPopoverId === member.id ? null : member.id);
                          }}
                          label={`Manage ${member.name}`}
                          size="sm"
                          variant="subtle"
                        />
                        <MemberActionsPopover
                          isOpen={openPopoverId === member.id}
                          onClose={() => setOpenPopoverId(null)}
                          member={member}
                          permissions={permissions}
                          onRoleChange={handleRoleChange}
                          onRemove={handleRemove}
                          onMakePresident={handleMakePresident}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <ConfirmationModal
        {...confirmModal}
        onClose={() => setConfirmModal((c) => ({ ...c, isOpen: false }))}
      />
      <BaseModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal((e) => ({ ...e, isOpen: false }))}
        title={errorModal.title}
        size="sm"
      >
        <div className="p-6">
          <p className="text-muted-foreground mb-6">{errorModal.message}</p>
          <SecondaryButton
            variant="primary"
            onClick={() => setErrorModal((e) => ({ ...e, isOpen: false }))}
          >
            OK
          </SecondaryButton>
        </div>
      </BaseModal>
    </div>
  );
}
