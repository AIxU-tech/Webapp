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

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useMessageTarget } from '../contexts/MessageTargetContext';
import { logout } from '../api/auth';
import { clearResumeParseStatus } from '../api/resume';
import {
  useUser,
  usePageTitle,
  useUpdateProfile,
  useUploadProfilePicture,
  useDeleteProfilePicture,
  useUploadProfileBanner,
  useDeleteProfileBanner,
  useCreateEducation,
  useUpdateEducation,
  useDeleteEducation,
  useCreateExperience,
  useUpdateExperience,
  useDeleteExperience,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useResume,
  useUploadResume,
  useDeleteResume,
  useStartResumeParse,
  useResumeParseStatus,
  resumeKeys,
  useUniversity,
} from '../hooks';

// UI Components
import {
  Alert,
  Toast,
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
  ExperienceSection,
  EducationSection,
  ProjectsSection,
  ResumeSection,
  ProfilePageSkeleton,
  ResumeParsingBanner,
} from '../components/profile';

export default function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, setUser: setCurrentUser, logoutUser, isAuthenticated } = useAuth();
  const { setTargetUserId } = useMessageTarget();
  const queryClient = useQueryClient();

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

  // Fetch only the user's university instead of the full list
  const { data: userUniversity = null } = useUniversity(user?.university_id);

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const updateProfileMutation = useUpdateProfile();
  const uploadPictureMutation = useUploadProfilePicture();
  const deletePictureMutation = useDeleteProfilePicture();
  const uploadBannerMutation = useUploadProfileBanner();
  const deleteBannerMutation = useDeleteProfileBanner();

  const createEducationMutation = useCreateEducation();
  const updateEducationMutation = useUpdateEducation();
  const deleteEducationMutation = useDeleteEducation();
  const createExperienceMutation = useCreateExperience();
  const updateExperienceMutation = useUpdateExperience();
  const deleteExperienceMutation = useDeleteExperience();
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const { data: resume, isLoading: isResumeLoading } = useResume(isAuthenticated ? targetUserId : null);
  const uploadResumeMutation = useUploadResume(targetUserId);
  const deleteResumeMutation = useDeleteResume();
  const startParseMutation = useStartResumeParse();
  const { data: parseStatusData } = useResumeParseStatus(isOwnProfile && isAuthenticated);

  // Show success toast when resume parsing completes
  const prevParseStatus = useRef(parseStatusData?.status);
  useEffect(() => {
    if (prevParseStatus.current === 'parsing' && parseStatusData?.status === 'complete') {
      setFeedback({ type: 'success', message: 'Resume parsed successfully! Your profile has been updated.' });
    }
    prevParseStatus.current = parseStatusData?.status;
  }, [parseStatusData?.status]);

  // ---------------------------------------------------------------------------
  // Modal States
  // ---------------------------------------------------------------------------

  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState(null);
  const [showAutoFillPrompt, setShowAutoFillPrompt] = useState(false);

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
   * Handle profile picture deletion (reset to default)
   */
  const handleDeletePicture = async () => {
    try {
      const response = await deletePictureMutation.mutateAsync();
      if (isOwnProfile && currentUser) {
        setCurrentUser({ ...currentUser, profile_picture_url: response.profile_picture_url || null });
      }
      setFeedback({ type: 'success', message: 'Profile picture removed' });
    } catch (err) {
      console.error('Error deleting picture:', err);
      setFeedback({ type: 'error', message: 'Failed to remove profile picture' });
    }
  };

  /**
   * Handle banner deletion (reset to default)
   */
  const handleDeleteBanner = async () => {
    setBannerPreviewUrl(null);
    try {
      await deleteBannerMutation.mutateAsync();
      setFeedback({ type: 'success', message: 'Banner removed' });
    } catch (err) {
      console.error('Error deleting banner:', err);
      setFeedback({ type: 'error', message: 'Failed to remove banner' });
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
      // Success - clear preview (cache has the new GCS URL from onSuccess)
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

  const handleMessage = () => {
    setTargetUserId(user?.id);
    navigate('/messages');
  };

  const handleResumeUpload = (file) => {
    uploadResumeMutation.mutate(
      { file },
      {
        onSuccess: () => {
          setFeedback({ type: 'success', message: 'Resume uploaded successfully' });
          // Prompt user to auto-fill profile from resume
          setShowAutoFillPrompt(true);
        },
        onError: (err) => {
          setFeedback({ type: 'error', message: err.message || 'Failed to upload resume' });
        },
      }
    );
  };

  const handleAutoFillConfirm = () => {
    setShowAutoFillPrompt(false);
    startParseMutation.mutate();
  };

  const handleResumeDelete = () => {
    deleteResumeMutation.mutate(undefined, {
      onSuccess: () => setFeedback({ type: 'success', message: 'Resume deleted' }),
      onError: (err) => setFeedback({ type: 'error', message: err.message || 'Failed to delete resume' }),
    });
  };

  /**
   * Shared error handler for profile section mutations
   */
  const handleMutationError = (err) => {
    setFeedback({ type: 'error', message: err.message || 'Something went wrong' });
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
    return <ProfilePageSkeleton />;
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
      {/* Feedback toast — bottom-left, auto-dismiss */}
      <Toast
        message={feedback.message}
        isVisible={!!feedback.message}
        onDismiss={dismissFeedback}
        variant={feedback.type || 'success'}
        position="left"
        duration={3000}
      />

      {/* Two-column layout from the start: Main content + Sidebar */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_340px] gap-8">
          {/* Main Column */}
          <div className="space-y-6">
            {/* Profile Header card is part of main column */}
            <ProfileHeader
              user={user}
              universityLocation={userUniversity?.location}
              universityBannerUrl={userUniversity?.bannerUrl}
              isOwnProfile={isOwnProfile}
              onEditProfile={openEditModal}
              onLogout={() => setShowLogoutModal(true)}
              onMessage={handleMessage}
              onEditBanner={() => setShowBannerModal(true)}
              bannerPreviewUrl={bannerPreviewUrl}
            />

            <AboutSection
              aboutText={user.about_section}
              isOwnProfile={isOwnProfile}
              onSave={handleSaveAbout}
            />

            <ExperienceSection
              experiences={user.experience || []}
              isOwnProfile={isOwnProfile}
              onCreate={(data) => createExperienceMutation.mutate(data, { onError: handleMutationError })}
              onUpdate={(data) => updateExperienceMutation.mutate(data, { onError: handleMutationError })}
              onDelete={(id) => deleteExperienceMutation.mutate(id, { onError: handleMutationError })}
            />

            <EducationSection
              education={user.education || []}
              isOwnProfile={isOwnProfile}
              onCreate={(data) => createEducationMutation.mutate(data, { onError: handleMutationError })}
              onUpdate={(data) => updateEducationMutation.mutate(data, { onError: handleMutationError })}
              onDelete={(id) => deleteEducationMutation.mutate(id, { onError: handleMutationError })}
            />

            <ProjectsSection
              projects={user.projects || []}
              isOwnProfile={isOwnProfile}
              onCreate={(data) => createProjectMutation.mutate(data, { onError: handleMutationError })}
              onUpdate={(data) => updateProjectMutation.mutate(data, { onError: handleMutationError })}
              onDelete={(id) => deleteProjectMutation.mutate(id, { onError: handleMutationError })}
            />

            {/* Resume parsing status banner — shown directly above resume section */}
            {isOwnProfile && parseStatusData?.status && parseStatusData.status !== 'complete' && (
              <ResumeParsingBanner
                status={parseStatusData.status}
                error={parseStatusData.error}
                onDismiss={() => {
                  clearResumeParseStatus().catch(() => {});
                  queryClient.setQueryData(resumeKeys.parseStatus, { status: null });
                }}
              />
            )}

            <ResumeSection
              resume={resume}
              isOwnProfile={isOwnProfile}
              isAuthenticated={isAuthenticated}
              isLoading={isResumeLoading}
              onUpload={handleResumeUpload}
              onDelete={handleResumeDelete}
              isDeleting={deleteResumeMutation.isPending}
            />
          </div>

          {/* Sidebar (fixed 340px width) */}
          <div>
            <ProfileSidebar
              user={user}
              university={userUniversity}
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
        onSave={(response) => {
          // Update AuthContext for navbar
          if (response.user && isOwnProfile) {
            setCurrentUser({ ...currentUser, ...response.user });
          }
          setFeedback({ type: 'success', message: 'Profile updated successfully!' });
        }}
        onUploadPicture={handleUploadPicture}
        onDeletePicture={handleDeletePicture}
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
        onReset={handleDeleteBanner}
        hasExistingImage={!!user?.hasBanner}
        isUploading={uploadBannerMutation.isPending}
        isResetting={deleteBannerMutation.isPending}
        title="Update Profile Banner"
      />

      {/* Auto-fill profile from resume prompt */}
      <ConfirmationModal
        isOpen={showAutoFillPrompt}
        onClose={() => setShowAutoFillPrompt(false)}
        onConfirm={handleAutoFillConfirm}
        title="Auto-Fill Profile"
        message="Would you like to use AI to extract your education, experience, projects, skills, and more from your resume?"
        confirmText="Auto-Fill"
        cancelText="No Thanks"
        variant="info"
      />

    </div>
  );
}
