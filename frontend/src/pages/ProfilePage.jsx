/**
 * ProfilePage Component
 *
 * Displays user profile with comprehensive information and editing capabilities.
 * This page serves two modes:
 * 1. View own profile (/profile) - Shows edit buttons and account management
 * 2. View other user's profile (/users/:id) - Read-only view
 *
 * Features:
 * - Profile header with avatar, stats (posts, followers, following)
 * - About section with bio
 * - Skills and Interests display
 * - Recent activity feed
 * - Edit profile modal (own profile only)
 * - Profile picture upload with auto-cropping (own profile only)
 *
 * University Affiliation:
 * Users are automatically enrolled in a university based on their .edu email
 * domain during registration. The profile page displays the user's university
 * but does not allow changing it manually. University affiliation is read-only.
 *
 * @component
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../api/auth';
import {
  useUser,
  usePageTitle,
  useUpdateProfile,
  useUploadProfilePicture,
} from '../hooks';

// UI Components
import {
  BaseModal,
  LoadingState,
  ErrorState,
  GradientButton,
  SecondaryButton,
  Badge,
  EmptyState,
} from '../components/ui';
import ConfirmationModal from '../components/ConfirmationModal';
import FormInput from '../components/FormInput';

// Profile Components
import {
  ProfileCard,
  ActivityItem,
  ProfilePictureSection,
} from '../components/profile';

// Icons
import { EditIcon, LogOutIcon } from '../components/icons';

// Styles
import { GRADIENT_PRIMARY } from '../config/styles';

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
  // Form State
  // ---------------------------------------------------------------------------

  const [formData, setFormData] = useState({});
  const [formInitialized, setFormInitialized] = useState(false);

  // Set page title
  usePageTitle(user ? (isOwnProfile ? 'Profile' : user.full_name) : 'Profile');

  // ---------------------------------------------------------------------------
  // Form Initialization
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Reset form initialization when modal closes
    if (!showEditModal) {
      setFormInitialized(false);
      return;
    }

    // Don't re-initialize if already done
    if (formInitialized || !user || !isOwnProfile) return;

    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      location: user.location || '',
      about_section: user.about_section || '',
      skills: user.skills?.join(', ') || '',
      interests: user.interests?.join(', ') || '',
    });
    setFormInitialized(true);
  }, [showEditModal, user, isOwnProfile, formInitialized]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle profile form submission
   */
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    try {
      const updates = {
        ...formData,
        skills: formData.skills
          ? formData.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        interests: formData.interests
          ? formData.interests.split(',').map((i) => i.trim()).filter(Boolean)
          : [],
      };

      const response = await updateProfileMutation.mutateAsync(updates);

      // Update AuthContext for navbar
      if (response.user && isOwnProfile) {
        setCurrentUser({ ...currentUser, ...response.user });
      }

      setShowEditModal(false);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile. Please try again.');
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
      alert('Failed to upload profile picture');
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
   * Update form field
   */
  const updateField = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
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

  const avatarUrl =
    user.profile_picture_url ||
    user.avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Profile Header */}
      <section className={`${GRADIENT_PRIMARY} text-white`}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <img
                src={avatarUrl}
                alt={`Avatar of ${user.full_name}`}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
              />
            </div>

            {/* User Info */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-3xl font-bold mb-1 leading-tight">
                {user.full_name}
              </h1>
              <p className="text-lg opacity-90 mb-1">
                {user.university || 'No university'}
              </p>
              <p className="text-sm opacity-75 mb-3">
                Joined {user.joined_formatted}
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 text-sm justify-center lg:justify-start">
                <div className="flex items-baseline gap-1">
                  <span className="font-semibold">{user.post_count || 0}</span>
                  <span className="opacity-75">posts</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-semibold">{user.follower_count || 0}</span>
                  <span className="opacity-75">followers</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-semibold">{user.following_count || 0}</span>
                  <span className="opacity-75">following</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isOwnProfile && (
              <div className="flex gap-3 mt-4 lg:mt-0">
                <SecondaryButton
                  variant="ghost"
                  icon={<EditIcon />}
                  onClick={() => setShowEditModal(true)}
                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                >
                  Edit Profile
                </SecondaryButton>
                <SecondaryButton
                  variant="ghost"
                  icon={<LogOutIcon />}
                  onClick={() => setShowLogoutModal(true)}
                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                >
                  Log out
                </SecondaryButton>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Profile Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Bio & Skills */}
          <aside className="lg:col-span-1 space-y-6">
            {/* About */}
            <ProfileCard title="About">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {user.about_section || 'No bio provided.'}
              </p>
            </ProfileCard>

            {/* Skills */}
            <ProfileCard title="Skills">
              {user.skills?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No skills listed.</p>
              )}
            </ProfileCard>

            {/* Interests */}
            <ProfileCard title="Interests">
              {user.interests?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.interests.map((interest, index) => (
                    <Badge key={index} variant="info">
                      {interest}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No interests listed.</p>
              )}
            </ProfileCard>
          </aside>

          {/* Right Column - Activity */}
          <section className="lg:col-span-2">
            <ProfileCard title="Recent Activity">
              {user.recent_activity?.length > 0 ? (
                <div className="space-y-4">
                  {user.recent_activity.map((activity, index) => (
                    <ActivityItem key={index} activity={activity} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No recent activity"
                  description="Activity will appear here once you start posting."
                  className="py-8"
                />
              )}

              {/* View All Activity */}
              <div className="mt-6 text-center">
                <GradientButton as={Link} to="/community">
                  View All Activity
                </GradientButton>
              </div>
            </ProfileCard>
          </section>
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
            isUploading={uploadPictureMutation.isPending}
          />

          {/* Profile Form */}
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  First name
                </label>
                <FormInput
                  value={formData.first_name || ''}
                  onChange={updateField('first_name')}
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  Last name
                </label>
                <FormInput
                  value={formData.last_name || ''}
                  onChange={updateField('last_name')}
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
                value={formData.location || ''}
                onChange={updateField('location')}
                placeholder="City, Country"
              />
            </div>

            {/* About */}
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                About
              </label>
              <textarea
                rows="4"
                value={formData.about_section || ''}
                onChange={updateField('about_section')}
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
                value={formData.skills || ''}
                onChange={updateField('skills')}
                placeholder="Python, Machine Learning, Data Analysis"
              />
            </div>

            {/* Interests */}
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Interests (comma-separated)
              </label>
              <FormInput
                value={formData.interests || ''}
                onChange={updateField('interests')}
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
