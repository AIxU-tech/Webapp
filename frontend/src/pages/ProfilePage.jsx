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
  useForm,
} from '../hooks';

// UI Components
import {
  Alert,
  BaseModal,
  LoadingState,
  ErrorState,
  GradientButton,
  SecondaryButton,
} from '../components/ui';
import ConfirmationModal from '../components/ConfirmationModal';
import FormInput from '../components/FormInput';

// Profile Components
import {
  ProfileHeader,
  ProfilePictureSection,
  AboutSection,
  ProjectsSection,
  ExperienceSection,
  ResearchSection,
  ProfileSidebar,
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

  // ---------------------------------------------------------------------------
  // Modal States
  // ---------------------------------------------------------------------------

  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ---------------------------------------------------------------------------
  // Feedback State (for success/error notifications)
  // ---------------------------------------------------------------------------

  const [feedback, setFeedback] = useState({ type: null, message: '' });

  // Set page title
  usePageTitle(user ? (isOwnProfile ? 'Profile' : user.full_name) : 'Profile');

  // ---------------------------------------------------------------------------
  // Form State (using useForm hook)
  // ---------------------------------------------------------------------------

  /**
   * Get initial form values from user object
   */
  const getInitialFormValues = (userData) => ({
    first_name: userData?.first_name || '',
    last_name: userData?.last_name || '',
    location: userData?.location || '',
    about_section: userData?.about_section || '',
    skills: userData?.skills?.join(', ') || '',
    interests: userData?.interests?.join(', ') || '',
  });

  const {
    formData,
    setFormData,
    error: formError,
    handleChange,
    handleSubmit: handleFormSubmit,
  } = useForm({
    initialValues: getInitialFormValues(user),
    onSubmit: async (data) => {
      const updates = {
        ...data,
        skills: data.skills
          ? data.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        interests: data.interests
          ? data.interests.split(',').map((i) => i.trim()).filter(Boolean)
          : [],
      };

      const response = await updateProfileMutation.mutateAsync(updates);

      // Update AuthContext for navbar
      if (response.user && isOwnProfile) {
        setCurrentUser({ ...currentUser, ...response.user });
      }

      setShowEditModal(false);
      setFeedback({ type: 'success', message: 'Profile updated successfully!' });
    },
    defaultErrorMessage: 'Failed to update profile. Please try again.',
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Open edit modal and reset form data to current user values
   */
  const openEditModal = () => {
    setFormData(getInitialFormValues(user));
    setShowEditModal(true);
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
   * Navigate to messages with user
   */
  const handleMessage = () => {
    navigate(`/messages?user=${user?.id}`);
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
            />
            <AboutSection
              aboutText={user.about_section}
              isOwnProfile={isOwnProfile}
            />
            <ProjectsSection
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
            />
          </div>

          {/* Sidebar (fixed 340px width) */}
          <div>
            <ProfileSidebar
              user={user}
              isOwnProfile={isOwnProfile}
              onEditSkills={openEditModal}
            />
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      <BaseModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Profile"
        size="2xl"
      >
        <div className="p-6">
          {/* Profile Picture Section */}
          <ProfilePictureSection
            user={user}
            onUpload={handleUploadPicture}
            onError={handlePictureError}
            isUploading={uploadPictureMutation.isPending}
          />

          {/* Profile Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Form Error Display */}
            {formError && (
              <Alert variant="error" className="mb-2">
                {formError}
              </Alert>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  First name
                </label>
                <FormInput
                  name="first_name"
                  value={formData.first_name || ''}
                  onChange={handleChange}
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  Last name
                </label>
                <FormInput
                  name="last_name"
                  value={formData.last_name || ''}
                  onChange={handleChange}
                  placeholder="Last name"
                />
              </div>
            </div>

            {/* University (Read-only) */}
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                University
              </label>
              <div className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground">
                {user?.university || 'No university affiliated'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                University is determined by your .edu email domain and cannot be changed.
              </p>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Location
              </label>
              <FormInput
                name="location"
                value={formData.location || ''}
                onChange={handleChange}
                placeholder="City, Country"
              />
            </div>

            {/* About */}
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                About
              </label>
              <textarea
                name="about_section"
                rows="4"
                value={formData.about_section || ''}
                onChange={handleChange}
                placeholder="Tell us about yourself..."
                className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder-muted-foreground"
              />
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Skills (comma-separated)
              </label>
              <FormInput
                name="skills"
                value={formData.skills || ''}
                onChange={handleChange}
                placeholder="Python, Machine Learning, Data Analysis"
              />
            </div>

            {/* Interests */}
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Interests (comma-separated)
              </label>
              <FormInput
                name="interests"
                value={formData.interests || ''}
                onChange={handleChange}
                placeholder="NLP, Computer Vision, Robotics"
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <SecondaryButton
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </SecondaryButton>
              <GradientButton
                type="submit"
                loading={updateProfileMutation.isPending}
                loadingText="Saving..."
              >
                Save Changes
              </GradientButton>
            </div>
          </form>
        </div>
      </BaseModal>

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
    </div>
  );
}
