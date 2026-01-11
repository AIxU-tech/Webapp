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

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { deleteUniversity } from '../api/universities';

// Hooks
import { useUniversity, usePageTitle } from '../hooks';

// UI Components
import { BaseModal, LoadingState, SecondaryButton } from '../components/ui';
import ConfirmationModal from '../components/ConfirmationModal';

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
  LeadershipCard,
  UpcomingEventsCard,
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

  // ---------------------------------------------------------------------------
  // Local State
  // ---------------------------------------------------------------------------

  const [activeTab, setActiveTab] = useState('about');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Error modal state
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: '',
    message: '',
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
  const { isSiteAdmin, canManageMembers } = permissions;

  // Admin check for delete button
  const isAdmin = isAuthenticated && (isSiteAdmin || user?.permissionLevel >= 1);

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
    setErrorModal({ isOpen: false, title: '', message: '' });
    navigate('/universities');
  };

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

  // Navigate to Members tab when View All is clicked
  const handleViewAllMembers = () => {
    setActiveTab('members');
  };

  // Navigate to Events tab when View All is clicked
  const handleViewAllEvents = () => {
    setActiveTab('events');
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
          />
        );
      case 'events':
        return (
          <UniversityEventsTab
            universityId={id}
            canCreateEvent={canCreateEvent}
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
        return <UniversityMembersTab members={sortedMembers} />;
      case 'about':
        return <UniversityAboutTab university={university} />;
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

      {university && (
        <div className="min-h-screen bg-background">
          {/* Hero Banner */}
          <UniversityHeroBanner />

          {/* Identity Bar */}
          <UniversityIdentityBar
            university={university}
            isAdmin={isAdmin}
            onDelete={handleDelete}
            deleteLoading={deleteLoading}
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
