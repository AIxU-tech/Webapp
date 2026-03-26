/**
 * UniversityDetailPage Component
 *
 * LinkedIn-inspired university detail page with hero banner, navigation tabs,
 * and two-column content layout.
 *
 * Features:
 * - Compact hero banner with campus image
 * - Floating identity bar with avatar and university name
 * - Tabbed navigation (Posts, Events, Opportunities, Members, About)
 * - Two-column layout: main content + sidebar
 * - Admin controls (delete university)
 *
 * @component
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { deleteUniversity } from '../api/universities';
import { prefetchUniversityData } from '../services/prefetch';

// Hooks
import {
  useUniversity,
  usePageTitle,
  useRemoveMember,
  useUpdateMemberRole,
  useUpdateUniversity,
  useUploadUniversityLogo,
  useUploadUniversityBanner,
} from '../hooks';

// UI Components
import { BaseModal, SecondaryButton, BannerUploadModal, ConfirmationModal } from '../components/ui';

// University Components
import {
  UniversityHeroBanner,
  UniversityIdentityBar,
  UniversityNavTabs,
  UniversityPostsTab,
  UniversityEventsTab,
  UniversityOpportunitiesTab,
  UniversityMembersTab,
  UniversityAboutTab,
  EditUniversityIdentityModal,
  LeadershipCard,
  UpcomingEventsCard,
  UniversityPageSkeleton,
} from '../components/university';

export default function UniversityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------

  const {
    data: university,
    isLoading,
    error: fetchError,
  } = useUniversity(id);

  // Member management mutations
  const removeMemberMutation = useRemoveMember();
  const updateRoleMutation = useUpdateMemberRole();

  // University editing mutations
  const updateUniversityMutation = useUpdateUniversity();
  const uploadLogoMutation = useUploadUniversityLogo();
  const uploadBannerMutation = useUploadUniversityBanner();

  // ---------------------------------------------------------------------------
  // Prefetch All Tab Data on Mount
  // ---------------------------------------------------------------------------
  const queryClient = useQueryClient();
  useEffect(() => {
    if (id) {
      prefetchUniversityData(queryClient, id);
    }
  }, [id, queryClient]);

  // ---------------------------------------------------------------------------
  // Local State
  // ---------------------------------------------------------------------------

  const [activeTab, setActiveTab] = useState('about');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showEditIdentityModal, setShowEditIdentityModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [logoKey, setLogoKey] = useState(Date.now());
  const [bannerKey, setBannerKey] = useState(Date.now());
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState(null);

  // Error modal state
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    navigateOnClose: false,
  });

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    onConfirm: () => { },
  });

  // ---------------------------------------------------------------------------
  // Page Title
  // ---------------------------------------------------------------------------

  usePageTitle(university?.name);

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------

  const permissions = university?.permissions || {};
  const { isSiteAdmin, canManageMembers, canEditUniversity } = permissions;

  // Admin check for delete button
  const isAdmin = isAuthenticated && (isSiteAdmin || user?.permissionLevel >= 1);

  // Can edit university: president or site admin
  const canEdit = isAuthenticated && canEditUniversity;

  // Can create events: executives+ or site admin
  const canCreateEvent = isAuthenticated && (canManageMembers || isSiteAdmin);

  // Get current user ID
  const currentUserId = user?.id;

  // Sort members by role (President > Executive > Member)
  const sortedMembers = [...(university?.members || [])].sort((a, b) => {
    return (b.role ?? 0) - (a.role ?? 0);
  });

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  const handleErrorModalClose = () => {
    const shouldNavigate = errorModal.navigateOnClose;
    setErrorModal({ isOpen: false, title: '', message: '', navigateOnClose: false });
    if (shouldNavigate) {
      navigate('/universities');
    }
  };

  // When university is not found, closing the modal must always navigate (no page to show).
  const handleNotFoundClose = () => {
    navigate('/universities');
  };

  const handleDelete = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete University',
      message: `Are you sure you want to delete ${university?.name || 'this university'}? This will permanently remove the university and all associated data. This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          setDeleteLoading(true);
          setConfirmModal({ ...confirmModal, isOpen: false });
          setShowEditIdentityModal(false);
          await deleteUniversity(id);
          navigate('/universities');
        } catch (error) {
          console.error('Error deleting university:', error);
          setErrorModal({
            isOpen: true,
            title: 'Delete Failed',
            message: error.message || 'Failed to delete university.',
            navigateOnClose: false,
          });
          setDeleteLoading(false);
        }
      },
    });
  };

  // Navigate to Members tab when View All is clicked
  const handleViewAllMembers = () => {
    setActiveTab('members');
  };

  // Navigate to Events tab when View All is clicked
  const handleViewAllEvents = () => {
    setActiveTab('events');
  };

  // Handle member role change
  const handleRoleChange = async (memberId, newRole) => {
    try {
      await updateRoleMutation.mutateAsync({
        universityId: id,
        userId: memberId,
        role: newRole,
      });
    } catch (error) {
      console.error('Failed to update role:', error);
      setErrorModal({
        isOpen: true,
        title: 'Role Update Failed',
        message: error.message || 'Failed to update member role.',
        navigateOnClose: false,
      });
    }
  };

  // Handle member removal
  const handleRemoveMember = (memberId) => {
    const member = sortedMembers.find((m) => m.id === memberId);
    setConfirmModal({
      isOpen: true,
      title: 'Remove Member',
      message: `Are you sure you want to remove ${member?.name || 'this member'} from the club? They can rejoin if they still have a valid university email.`,
      variant: 'warning',
      onConfirm: async () => {
        try {
          await removeMemberMutation.mutateAsync({
            universityId: id,
            userId: memberId,
          });
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error) {
          console.error('Failed to remove member:', error);
          setErrorModal({
            isOpen: true,
            title: 'Removal Failed',
            message: error.message || 'Failed to remove member.',
            navigateOnClose: false,
          });
        }
      },
    });
  };

  // Handle making someone president (transfers presidency)
  const handleMakePresident = (memberId) => {
    const member = sortedMembers.find((m) => m.id === memberId);
    setConfirmModal({
      isOpen: true,
      title: 'Transfer Presidency',
      message: `Are you sure you want to make ${member?.name || 'this member'} the new President? You will be demoted to Executive.`,
      variant: 'warning',
      onConfirm: async () => {
        try {
          // Setting role to 2 (PRESIDENT) will transfer presidency
          await updateRoleMutation.mutateAsync({
            universityId: id,
            userId: memberId,
            role: 2, // PRESIDENT
          });
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error) {
          console.error('Failed to transfer presidency:', error);
          setErrorModal({
            isOpen: true,
            title: 'Transfer Failed',
            message: error.message || 'Failed to transfer presidency.',
            navigateOnClose: false,
          });
        }
      },
    });
  };

  // Handle opening edit identity modal
  const handleOpenEditIdentity = () => {
    setShowEditIdentityModal(true);
  };

  // Handle saving university identity (club name, website URL)
  const handleSaveIdentity = async (updates) => {
    try {
      await updateUniversityMutation.mutateAsync({
        universityId: id,
        updates,
      });
    } catch (error) {
      console.error('Failed to save identity:', error);
      setErrorModal({
        isOpen: true,
        title: 'Save Failed',
        message: error.message || 'Failed to save club identity.',
        navigateOnClose: false,
      });
      throw error; // Re-throw so modal knows save failed
    }
  };

  // Handle uploading university logo
  const handleUploadLogo = async (blob) => {
    try {
      await uploadLogoMutation.mutateAsync({
        universityId: id,
        file: blob,
      });
      // Bust browser cache for the logo image
      setLogoKey(Date.now());
    } catch (error) {
      console.error('Failed to upload logo:', error);
      setErrorModal({
        isOpen: true,
        title: 'Upload Failed',
        message: error.message || 'Failed to upload logo.',
        navigateOnClose: false,
      });
      throw error;
    }
  };

  // Handle saving description (inline edit in About tab)
  const handleSaveDescription = async (description) => {
    try {
      await updateUniversityMutation.mutateAsync({
        universityId: id,
        updates: { description },
      });
    } catch (error) {
      console.error('Failed to save description:', error);
      setErrorModal({
        isOpen: true,
        title: 'Save Failed',
        message: error.message || 'Failed to save description.',
        navigateOnClose: false,
      });
      throw error;
    }
  };

  // Handle uploading university banner with optimistic preview
  const handleUploadBanner = async ({ blob, previewUrl }) => {
    // Show optimistic preview immediately
    setBannerPreviewUrl(previewUrl);

    try {
      await uploadBannerMutation.mutateAsync({
        universityId: id,
        file: blob,
      });
      // Success - bust browser cache and clear preview
      setBannerKey(Date.now());
      setBannerPreviewUrl(null);
    } catch (error) {
      console.error('Failed to upload banner:', error);
      // Revert optimistic preview on error
      setBannerPreviewUrl(null);
      setErrorModal({
        isOpen: true,
        title: 'Upload Failed',
        message: error.message || 'Failed to upload banner.',
        navigateOnClose: false,
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Render: Loading State
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return <UniversityPageSkeleton />;
  }

  // ---------------------------------------------------------------------------
  // Render: Error State
  // ---------------------------------------------------------------------------

  if (fetchError && !university) {
    return (
      <BaseModal
        isOpen={true}
        onClose={handleNotFoundClose}
        title="University Not Found"
        size="sm"
      >
        <div className="p-6">
          <p className="text-muted-foreground mb-6">
            {fetchError.message || 'This university could not be found.'}
          </p>
          <div className="flex justify-end">
            <SecondaryButton variant="primary" onClick={handleNotFoundClose}>
              Go Back to Universities
            </SecondaryButton>
          </div>
        </div>
      </BaseModal>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Tab Content
  // ---------------------------------------------------------------------------

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        return (
          <UniversityPostsTab
            universityId={id}
            currentUserId={currentUserId}
            isAuthenticated={isAuthenticated}
            isAdmin={isAdmin}
          />
        );
      case 'events':
        return (
          <UniversityEventsTab
            universityId={id}
            canCreateEvent={canCreateEvent}
            canManageEvents={canCreateEvent}
            currentUserId={currentUserId}
            isAuthenticated={isAuthenticated}
          />
        );
      case 'opportunities':
        return (
          <UniversityOpportunitiesTab
            universityId={id}
            currentUserId={currentUserId}
            isAuthenticated={isAuthenticated}
            isSiteAdmin={isSiteAdmin}
          />
        );
      case 'members':
        return (
          <UniversityMembersTab
            members={sortedMembers}
            permissions={permissions}
            currentUserId={currentUserId}
            onRoleChange={handleRoleChange}
            onRemove={handleRemoveMember}
            onMakePresident={handleMakePresident}
          />
        );
      case 'about':
        return (
          <UniversityAboutTab
            university={university}
            canEdit={canEdit}
            onSaveDescription={handleSaveDescription}
          />
        );
      default:
        return null;
    }
  };

  // ---------------------------------------------------------------------------
  // Render: Main Content
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Error Modal */}
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText="Confirm"
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
      />

      {/* Edit University Identity Modal */}
      <EditUniversityIdentityModal
        isOpen={showEditIdentityModal}
        onClose={() => setShowEditIdentityModal(false)}
        university={university}
        onSave={handleSaveIdentity}
        onUploadLogo={handleUploadLogo}
        onDelete={handleDelete}
        isLoading={updateUniversityMutation.isPending}
        isUploadingLogo={uploadLogoMutation.isPending}
        isDeleting={deleteLoading}
        isAdmin={isAdmin}
      />

      {/* Banner Upload Modal */}
      <BannerUploadModal
        isOpen={showBannerModal}
        onClose={() => setShowBannerModal(false)}
        onUpload={handleUploadBanner}
        isUploading={uploadBannerMutation.isPending}
        title="Update Club Banner"
      />

      {university && (
        <div className="min-h-screen bg-background">
          {/* Fixed floating "View All Universities" pill */}
          <Link
            to="/universities"
            className="fixed top-[72px] left-4 z-40 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-foreground/80 hover:text-foreground bg-white/90 backdrop-blur-md border border-border/50 shadow-sm hover:shadow-md hover:bg-white transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            All Universities
          </Link>

          {/* Hero Banner */}
          <UniversityHeroBanner
            university={university}
            canEdit={canEdit}
            onEditBanner={() => setShowBannerModal(true)}
            bannerPreviewUrl={bannerPreviewUrl}
            bannerKey={bannerKey}
          />

          {/* Identity Bar */}
          <UniversityIdentityBar
            university={university}
            canEdit={canEdit}
            onEdit={handleOpenEditIdentity}
            canManageMembers={canManageMembers}
            onExecutivePortal={() => navigate(`/executive/${id}`)}
            logoKey={logoKey}
          />

          {/* Navigation Tabs */}
          <UniversityNavTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            className="mt-3"
          />

          {/* Two-Column Content Layout */}
          <div className="container mx-auto px-4 py-8">
            <div className="grid lg:grid-cols-[1fr_350px] gap-8">
              {/* Main Content Column */}
              <main>
                {renderTabContent()}
              </main>

              {/* Sidebar Column */}
              <aside className="space-y-6">
                <LeadershipCard
                  members={sortedMembers}
                  onViewAll={handleViewAllMembers}
                />
                <UpcomingEventsCard
                  universityId={id}
                  onViewAll={handleViewAllEvents}
                />
              </aside>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
