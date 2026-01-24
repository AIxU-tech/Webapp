/**
 * ProfilePage Component
 *
 * Displays user profile with comprehensive information and editing capabilities.
 * This page serves two modes:
 * 1. View own profile (/profile) - Shows edit buttons and account management
 * 2. View other user's profile (/users/:id) - Read-only view
 *
 * Features:
 * - Profile header with banner, avatar, stats
 * - About section with bio
 * - Featured projects, experience, and research sections (empty states for now)
 * - Sidebar with activity stats, recent posts, university, and skills
 * - Edit profile modal (own profile only)
 * - Profile picture upload with auto-cropping (own profile only)
 *
 * @component
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../api/auth';
import {
  useUser,
  usePageTitle,
  useUpdateProfile,
  useUploadProfilePicture,
  useUploadProfileBanner,
} from '../hooks';
import { ConversationModal } from '../components/messages';

// UI Components
import {
  Alert,
  LoadingState,
  ErrorState,
  BannerUploadModal,
  ConfirmationModal,
} from '../components/ui';

// Profile Components
import {
  ProfileHeader,
  AboutSection,
  ProfileSidebar,
  EditProfileModal,
} from '../components/profile';

export default function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, setUser: setCurrentUser, logoutUser } = useAuth();

  // Determine if viewing own profile
  const isOwnProfile = !userId || (currentUser && currentUser.id === parseInt(userId));
  const targetUserId = isOwnProfile ? currentUser?.id : parseInt(userId);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------

  const {
    data: user,
    isLoading,
    error: fetchError,
  } = useUser(targetUserId);

  const error = fetchError?.message || null;

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const updateProfileMutation = useUpdateProfile();
  const uploadPictureMutation = useUploadProfilePicture();
  const uploadBannerMutation = useUploadProfileBanner();

  // ---------------------------------------------------------------------------
  // Modal States
  // ---------------------------------------------------------------------------

  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState(null);
  const [bannerKey, setBannerKey] = useState(Date.now());

  // ---------------------------------------------------------------------------
  // Feedback State (for success/error notifications)
  // ---------------------------------------------------------------------------

  const [feedback, setFeedback] = useState({ type: null, message: '' });

  // Set page title
  usePageTitle(user ? (isOwnProfile ? 'Profile' : user.full_name) : 'Profile');

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Open edit modal
   */
  const openEditModal = () => {
    setShowEditModal(true);
  };

  /**
   * Handle inline save of the About section
   * Updates only the about_section field without opening the full modal
   * Uses optimistic updates - assumes success immediately, shows error if fails
   */
  const handleSaveAbout = async (aboutText) => {
    const response = await updateProfileMutation.mutateAsync({
      about_section: aboutText,
    });

    // Update AuthContext if needed
    if (response.user && isOwnProfile) {
      setCurrentUser({ ...currentUser, ...response.user });
    }
  };

  /**
   * Handle inline save of skills from SkillsCard
   * Updates only the skills field - editing is done inline in the component
   */
  const handleSaveSkills = async (skillsArray) => {
    const response = await updateProfileMutation.mutateAsync({
      skills: skillsArray,
    });

    // Update AuthContext if needed
    if (response.user && isOwnProfile) {
      setCurrentUser({ ...currentUser, ...response.user });
    }
  };

  /**
   * Handle profile picture upload
   */
  const handleUploadPicture = async (blob) => {
    try {
      const response = await uploadPictureMutation.mutateAsync(blob);

      // Update AuthContext for navbar avatar
      if (response.profile_picture_url && isOwnProfile && currentUser) {
        setCurrentUser({ ...currentUser, profile_picture_url: response.profile_picture_url });
      }
    } catch (err) {
      console.error('Error uploading picture:', err);
      setFeedback({ type: 'error', message: 'Failed to upload profile picture' });
    }
  };

  /**
   * Handle profile picture upload errors from ProfilePictureSection
   */
  const handlePictureError = (message) => {
    setFeedback({ type: 'error', message });
  };

  /**
   * Handle banner upload with optimistic preview
   * Receives { blob, previewUrl } from BannerUploadModal
   */
  const handleUploadBanner = async ({ blob, previewUrl }) => {
    // Show optimistic preview immediately
    setBannerPreviewUrl(previewUrl);

    try {
      await uploadBannerMutation.mutateAsync(blob);
      // Success - bust browser cache and clear preview
      setBannerKey(Date.now());
      setBannerPreviewUrl(null);
    } catch (err) {
      console.error('Error uploading banner:', err);
      // Revert optimistic preview on error
      setBannerPreviewUrl(null);
      setFeedback({ type: 'error', message: 'Failed to upload banner' });
    }
  };

  /**
   * Handle logout confirmation
   */
  const handleLogoutConfirm = async () => {
    try {
      await logout();
      logoutUser();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
      logoutUser();
      navigate('/');
    }
  };

  /**
   * Open message modal to chat with user
   */
  const handleMessage = () => {
    setShowMessageModal(true);
  };

  /**
   * Dismiss feedback notification
   */
  const dismissFeedback = () => {
    setFeedback({ type: null, message: '' });
  };

  // ---------------------------------------------------------------------------
  // Render States
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return <LoadingState fullPage text="Loading profile..." />;
  }

  if (error || !user) {
    return (
      <ErrorState
        fullPage
        message={error || 'User not found'}
        backLink={{ to: '/community', label: 'Return to Community' }}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Main Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen gradient-mesh">
      {/* Feedback notification */}
      {feedback.message && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <Alert
            variant={feedback.type}
            dismissible
            onDismiss={dismissFeedback}
          >
            {feedback.message}
          </Alert>
        </div>
      )}

      {/* Two-column layout from the start: Main content + Sidebar */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_340px] gap-8">
          {/* Main Column */}
          <div className="space-y-6">
            {/* Profile Header card is part of main column */}
            <ProfileHeader
              user={user}
              isOwnProfile={isOwnProfile}
              onEditProfile={openEditModal}
              onLogout={() => setShowLogoutModal(true)}
              onMessage={handleMessage}
              onEditBanner={() => setShowBannerModal(true)}
              bannerPreviewUrl={bannerPreviewUrl}
              bannerKey={bannerKey}
            />

            <AboutSection
              aboutText={user.about_section}
              isOwnProfile={isOwnProfile}
              onSave={handleSaveAbout}
            />

            {/* TODO: Add projects, experience, and research sections */}
            {/* <ProjectsSection
              projects={[]}
              isOwnProfile={isOwnProfile}
            />
            <ExperienceSection
              experiences={[]}
              isOwnProfile={isOwnProfile}
            />
            <ResearchSection
              publications={[]}
              isOwnProfile={isOwnProfile}
            /> */}
          </div>

          {/* Sidebar (fixed 340px width) */}
          <div>
            <ProfileSidebar
              user={user}
              isOwnProfile={isOwnProfile}
              onSaveSkills={handleSaveSkills}
            />
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      <EditProfileModal
        user={user}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        updateProfileMutation={updateProfileMutation}
        uploadPictureMutation={uploadPictureMutation}
        onSave={(response) => {
          // Update AuthContext for navbar
          if (response.user && isOwnProfile) {
            setCurrentUser({ ...currentUser, ...response.user });
          }
          setFeedback({ type: 'success', message: 'Profile updated successfully!' });
        }}
        onUploadPicture={handleUploadPicture}
        onPictureError={handlePictureError}
      />

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
        title="Log Out"
        message="Are you sure you want to log out? You'll need to sign in again to access your account."
        confirmText="Log Out"
        cancelText="Stay Logged In"
        variant="warning"
      />

      {/* Banner Upload Modal */}
      <BannerUploadModal
        isOpen={showBannerModal}
        onClose={() => setShowBannerModal(false)}
        onUpload={handleUploadBanner}
        isUploading={uploadBannerMutation.isPending}
        title="Update Profile Banner"
      />

      {/* Message Modal - for messaging other users */}
      {!isOwnProfile && (
        <ConversationModal
          userId={user?.id}
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
        />
      )}
    </div>
  );
}
