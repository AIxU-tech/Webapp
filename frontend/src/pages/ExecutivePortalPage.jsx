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

import { useParams, useNavigate } from 'react-router-dom';
import {
  useUniversity,
  useMemberAttendance,
  useRemoveMember,
  useUpdateMemberRole,
  usePageTitle,
} from '../hooks';
import { SecondaryButton, BaseModal, ConfirmationModal } from '../components/ui';
import { MemberDetailView, MemberTableView, ExecutivePortalSkeleton } from '../components/executive';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

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
            role: 2, // PRESIDENT
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

  const closeConfirmModal = () => setConfirmModal((c) => ({ ...c, isOpen: false }));
  const closeErrorModal = () => setErrorModal((e) => ({ ...e, isOpen: false }));

  if (isLoading || !university) {
    return <ExecutivePortalSkeleton />;
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

  if (userId && selectedMember) {
    return (
      <>
        <MemberDetailView
          member={selectedMember}
          universityId={universityId}
          permissions={permissions}
          canManageAny={canManageAny}
          isCurrentUser={selectedMember.id === currentUserId}
          events={events}
          isLoading={attendanceLoading}
          openPopoverId={openPopoverId}
          onPopoverToggle={(id) => setOpenPopoverId((prev) => (prev === id ? null : id))}
          onClosePopover={() => setOpenPopoverId(null)}
          onRoleChange={handleRoleChange}
          onRemove={handleRemove}
          onMakePresident={handleMakePresident}
        />
        <ConfirmationModal {...confirmModal} onClose={closeConfirmModal} />
        <BaseModal
          isOpen={errorModal.isOpen}
          onClose={closeErrorModal}
          title={errorModal.title}
          size="sm"
        >
          <div className="p-6">
            <p className="text-muted-foreground mb-6">{errorModal.message}</p>
            <SecondaryButton variant="primary" onClick={closeErrorModal}>
              OK
            </SecondaryButton>
          </div>
        </BaseModal>
      </>
    );
  }

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

  return (
    <>
      <MemberTableView
        university={university}
        universityId={universityId}
        members={members}
        permissions={permissions}
        currentUserId={currentUserId}
        openPopoverId={openPopoverId}
        onPopoverToggle={(id) => setOpenPopoverId((prev) => (prev === id ? null : id))}
        onClosePopover={() => setOpenPopoverId(null)}
        onRoleChange={handleRoleChange}
        onRemove={handleRemove}
        onMakePresident={handleMakePresident}
      />
      <ConfirmationModal {...confirmModal} onClose={closeConfirmModal} />
      <BaseModal
        isOpen={errorModal.isOpen}
        onClose={closeErrorModal}
        title={errorModal.title}
        size="sm"
      >
        <div className="p-6">
          <p className="text-muted-foreground mb-6">{errorModal.message}</p>
          <SecondaryButton variant="primary" onClick={closeErrorModal}>
            OK
          </SecondaryButton>
        </div>
      </BaseModal>
    </>
  );
}
