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
 * - Profile picture upload with cropping (own profile only)
 *
 * University Affiliation:
 * Users are automatically enrolled in a university based on their .edu email
 * domain during registration. The profile page displays the user's university
 * but does not allow changing it manually. University affiliation is read-only.
 *
 * @component
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../api/auth';
import { updateProfile, uploadProfilePicture, deleteProfilePicture } from '../api/users';
import { useUser, userKeys } from '../hooks';
import { useQueryClient } from '@tanstack/react-query';
import ConfirmationModal from '../components/ConfirmationModal';

/**
 * SVG Icon Components
 *
 * Custom icons used throughout the profile page.
 * Using inline SVG for better performance and styling control.
 */

const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const LogOutIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const XIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CameraIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const UploadIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const FileTextIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const MessageCircleIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const HeartIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const ActivityIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export default function ProfilePage() {
  /**
   * Component State
   *
   * Manages user data, loading states, modal visibility, and form data.
   */
  const { userId } = useParams(); // Get userId from URL params if viewing another user
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser, setUser: setCurrentUser, logoutUser } = useAuth();

  // Determine if viewing own profile
  const isOwnProfile = !userId || (currentUser && currentUser.id === parseInt(userId));

  // ---------------------------------------------------------------------------
  // Data Fetching with React Query
  // ---------------------------------------------------------------------------
  // Use the useUser hook to leverage caching and prefetching.
  // For own profile, use currentUser.id; for others, use userId from URL.
  const targetUserId = isOwnProfile ? currentUser?.id : parseInt(userId);

  const {
    data: fetchedUser,
    isLoading: loading,
    error: fetchError,
  } = useUser(targetUserId);

  // User data from the hook (no need for local updates - cache handles it)
  const user = fetchedUser || null;
  const error = fetchError?.message || null;

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({});

  // Image cropping states
  const [selectedFile, setSelectedFile] = useState(null);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [imageState, setImageState] = useState({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
  });

  // Refs
  const fileInputRef = useRef(null);
  const cropImageRef = useRef(null);
  const cropContainerRef = useRef(null);

  // Track if form has been initialized to prevent resetting on background refetch
  const [formInitialized, setFormInitialized] = useState(false);

  /**
   * Initialize Form Data
   *
   * Sets up form data when the edit modal opens.
   * Only runs once per modal open to prevent losing unsaved changes
   * if a background refetch occurs while the user is editing.
   *
   * Note: University affiliation is not editable - it's determined by
   * the user's email domain at registration time.
   */
  useEffect(() => {
    // Only initialize when modal opens and we have user data
    // Reset formInitialized when modal closes so it re-initializes next time
    if (!showEditModal) {
      setFormInitialized(false);
      return;
    }

    // Don't re-initialize if already done for this modal session
    if (formInitialized) {
      return;
    }

    if (user && isOwnProfile) {
      // Initialize form data - university is read-only (not included)
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        location: user.location || '',
        avatar_url: user.avatar_url || '',
        about_section: user.about_section || '',
        skills: user.skills?.join(', ') || '',
        interests: user.interests?.join(', ') || '',
      });

      setFormInitialized(true);
    }
  }, [showEditModal, user, isOwnProfile, formInitialized]);

  /**
   * Handle Edit Profile
   *
   * Opens the edit profile modal.
   */
  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  /**
   * Handle Profile Update
   *
   * Submits profile changes to the API and updates local state.
   */
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    try {
      // Convert comma-separated strings to arrays for skills and interests
      const updates = {
        ...formData,
        skills: formData.skills ? formData.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
        interests: formData.interests ? formData.interests.split(',').map((i) => i.trim()).filter(Boolean) : [],
      };

      const response = await updateProfile(updates);

      // Update user data - invalidate cache to trigger refetch
      if (response.user) {
        // Invalidate the user query to refetch fresh data
        queryClient.invalidateQueries({ queryKey: userKeys.all });

        // Also update AuthContext for navbar, etc.
        if (isOwnProfile) {
          setCurrentUser({ ...currentUser, ...response.user });
        }
      }

      setShowEditModal(false);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile. Please try again.');
    }
  };

  /**
   * Handle Logout Confirmation
   *
   * Called when user confirms logout in the modal.
   * Logs out the user and redirects to home page.
   */
  const handleLogoutConfirm = async () => {
    try {
      // Call backend logout API to clear Flask session
      await logout();
      // Clear user state in React context
      logoutUser();
      // Redirect to home page
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
      // Even if API call fails, clear local state and redirect
      logoutUser();
      navigate('/');
    }
  };

  /**
   * Handle Profile Picture Upload
   *
   * Opens file picker for profile picture upload.
   */
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Handle File Selection
   *
   * Processes selected image file and opens crop modal.
   */
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      e.target.value = '';
      return;
    }

    // Validate file type
    if (!file.type.match('image.*')) {
      alert('Please select an image file');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);

    // Read file and show crop modal
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropImageSrc(event.target.result);
      setShowCropModal(true);

      // Reset image state
      setImageState({
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        isDragging: false,
        startX: 0,
        startY: 0,
      });
    };
    reader.readAsDataURL(file);
  };

  /**
   * Initialize Crop Image
   *
   * Sets up initial scale for crop image when it loads.
   */
  useEffect(() => {
    if (!showCropModal || !cropImageRef.current) return;

    const img = cropImageRef.current;
    const handleImageLoad = () => {
      const containerSize = 300;
      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;

      // Scale so the smaller dimension fills the container
      const scaleX = containerSize / imgWidth;
      const scaleY = containerSize / imgHeight;
      const initialScale = Math.max(scaleX, scaleY);

      setImageState((prev) => ({ ...prev, scale: initialScale }));
    };

    img.addEventListener('load', handleImageLoad);
    return () => img.removeEventListener('load', handleImageLoad);
  }, [showCropModal, cropImageSrc]);

  /**
   * Handle Mouse/Touch Drag
   *
   * Allows user to pan the image within the crop circle.
   */
  const handleMouseDown = (e) => {
    e.preventDefault();
    setImageState((prev) => ({
      ...prev,
      isDragging: true,
      startX: e.clientX - prev.offsetX,
      startY: e.clientY - prev.offsetY,
    }));
  };

  const handleMouseMove = (e) => {
    if (!imageState.isDragging) return;
    e.preventDefault();
    setImageState((prev) => ({
      ...prev,
      offsetX: e.clientX - prev.startX,
      offsetY: e.clientY - prev.startY,
    }));
  };

  const handleMouseUp = () => {
    setImageState((prev) => ({ ...prev, isDragging: false }));
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setImageState((prev) => ({
      ...prev,
      isDragging: true,
      startX: touch.clientX - prev.offsetX,
      startY: touch.clientY - prev.offsetY,
    }));
  };

  const handleTouchMove = (e) => {
    if (!imageState.isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    setImageState((prev) => ({
      ...prev,
      offsetX: touch.clientX - prev.startX,
      offsetY: touch.clientY - prev.startY,
    }));
  };

  const handleTouchEnd = () => {
    setImageState((prev) => ({ ...prev, isDragging: false }));
  };

  /**
   * Handle Wheel Zoom
   *
   * Allows user to zoom in/out using mouse wheel.
   */
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    setImageState((prev) => ({
      ...prev,
      scale: Math.max(0.5, Math.min(5, prev.scale + delta)),
    }));
  };

  /**
   * Get Image Transform Style
   *
   * Calculates CSS transform for the crop image based on current state.
   */
  const getImageTransform = () => {
    if (!cropImageRef.current) return {};

    const img = cropImageRef.current;
    const renderedWidth = img.naturalWidth * imageState.scale;
    const renderedHeight = img.naturalHeight * imageState.scale;

    const left = 150 - renderedWidth / 2 + imageState.offsetX;
    const top = 150 - renderedHeight / 2 + imageState.offsetY;

    return {
      width: `${renderedWidth}px`,
      height: `${renderedHeight}px`,
      left: `${left}px`,
      top: `${top}px`,
      position: 'absolute',
      cursor: imageState.isDragging ? 'grabbing' : 'move',
      userSelect: 'none',
      WebkitUserDrag: 'none',
    };
  };

  /**
   * Handle Crop Confirm
   *
   * Crops the image based on current position/zoom and uploads to server.
   */
  const handleCropConfirm = async () => {
    if (!cropImageRef.current || !selectedFile) return;

    try {
      // Create canvas to crop the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const outputSize = 400;
      const containerSize = 300;

      canvas.width = outputSize;
      canvas.height = outputSize;

      const img = cropImageRef.current;
      const renderedWidth = img.naturalWidth * imageState.scale;
      const renderedHeight = img.naturalHeight * imageState.scale;

      const imageLeft = 150 - renderedWidth / 2 + imageState.offsetX;
      const imageTop = 150 - renderedHeight / 2 + imageState.offsetY;

      const visibleLeft = 0 - imageLeft;
      const visibleTop = 0 - imageTop;

      const sourceX = visibleLeft / imageState.scale;
      const sourceY = visibleTop / imageState.scale;
      const sourceWidth = containerSize / imageState.scale;
      const sourceHeight = containerSize / imageState.scale;

      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputSize, outputSize);

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        try {
          const response = await uploadProfilePicture(blob);

          // Update user's profile picture URL - invalidate cache to refetch
          if (response.profile_picture_url) {
            // Invalidate user cache to show new picture
            queryClient.invalidateQueries({ queryKey: userKeys.all });

            // Update AuthContext for navbar avatar
            if (isOwnProfile && currentUser) {
              setCurrentUser({ ...currentUser, profile_picture_url: response.profile_picture_url });
            }
          }

          setShowCropModal(false);
          setSelectedFile(null);
          setCropImageSrc('');
          if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
          console.error('Error uploading picture:', err);
          alert('Failed to upload profile picture');
        }
      }, 'image/jpeg', 0.9);
    } catch (err) {
      console.error('Error processing image:', err);
      alert('Error processing image');
    }
  };

  /**
   * Handle Delete Profile Picture
   *
   * Removes current profile picture and reverts to default avatar.
   */
  const handleDeletePicture = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) return;

    try {
      const response = await deleteProfilePicture();
      if (response.profile_picture_url) {
        // Invalidate user cache to refetch without picture
        queryClient.invalidateQueries({ queryKey: userKeys.all });

        // Update AuthContext for navbar avatar
        if (isOwnProfile && currentUser) {
          setCurrentUser({ ...currentUser, profile_picture_url: response.profile_picture_url });
        }
      }
    } catch (err) {
      console.error('Error deleting picture:', err);
      alert('Failed to delete profile picture');
    }
  };

  /**
   * Render Loading State
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  /**
   * Render Error State
   */
  if (error || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'User not found'}</p>
          <Link to="/community" className="text-academic-blue hover:underline">
            Return to Community
          </Link>
        </div>
      </div>
    );
  }

  /**
   * Main Render
   */
  return (
    <div className="min-h-screen bg-background">
      {/* Profile Header */}
      <section className="bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <img
                src={user.profile_picture_url || user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                alt={`Avatar of ${user.full_name}`}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
              />
            </div>

            {/* User Info */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-3xl font-bold mb-1 leading-tight">{user.full_name}</h1>
              <p className="text-lg opacity-90 mb-1">{user.university || 'No university'}</p>
              <p className="text-sm opacity-75 mb-3">Joined {user.joined_formatted}</p>

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
                <button
                  type="button"
                  onClick={handleEditProfile}
                  className="flex items-center bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm"
                >
                  <EditIcon />
                  <span className="ml-2">Edit Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="flex items-center bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm"
                >
                  <LogOutIcon />
                  <span className="ml-2">Log out</span>
                </button>
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
            <div className="bg-card border border-border rounded-lg p-6 shadow-card">
              <h2 className="text-xl font-semibold text-foreground mb-4">About</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {user.about_section || 'No bio provided.'}
              </p>
            </div>

            {/* Skills */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-card">
              <h2 className="text-xl font-semibold text-foreground mb-4">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {user.skills && user.skills.length > 0 ? (
                  user.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-muted text-foreground px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No skills listed.</p>
                )}
              </div>
            </div>

            {/* Interests */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-card">
              <h2 className="text-xl font-semibold text-foreground mb-4">Interests</h2>
              <div className="flex flex-wrap gap-2">
                {user.interests && user.interests.length > 0 ? (
                  user.interests.map((interest, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {interest}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No interests listed.</p>
                )}
              </div>
            </div>
          </aside>

          {/* Right Column - Activity */}
          <section className="lg:col-span-2">
            <div className="bg-card border border-border rounded-lg p-6 shadow-card">
              <h2 className="text-xl font-semibold text-foreground mb-6">Recent Activity</h2>

              {user.recent_activity && user.recent_activity.length > 0 ? (
                <div className="space-y-4">
                  {user.recent_activity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-4 p-4 bg-muted/30 rounded-lg">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        {activity.type === 'post' && (
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <FileTextIcon />
                          </div>
                        )}
                        {activity.type === 'comment' && (
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <MessageCircleIcon />
                          </div>
                        )}
                        {activity.type === 'like' && (
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <HeartIcon />
                          </div>
                        )}
                        {activity.type === 'join' && (
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <ActivityIcon />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between mb-1 gap-2">
                          <p className="text-sm text-muted-foreground flex-1">
                            {activity.type === 'post' && 'Created a post'}
                            {activity.type === 'comment' && 'Commented on'}
                            {activity.type === 'like' && 'Liked'}
                            {activity.type === 'join' && 'Activity'}
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {activity.time}
                          </span>
                        </div>

                        {activity.type === 'post' && (
                          <>
                            <h3 className="font-semibold text-foreground mb-1 truncate">
                              {activity.title}
                            </h3>
                            <div className="flex items-center text-sm text-muted-foreground gap-1">
                              <HeartIcon />
                              <span>{activity.likes} likes</span>
                            </div>
                          </>
                        )}
                        {activity.type === 'comment' && (
                          <>
                            <p className="text-foreground mb-1">{activity.content}</p>
                            <p className="text-sm text-muted-foreground">on "{activity.post}"</p>
                          </>
                        )}
                        {activity.type === 'like' && (
                          <p className="text-foreground">"{activity.post}"</p>
                        )}
                        {activity.type === 'join' && (
                          <p className="text-foreground">{activity.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity to show.</p>
              )}

              {/* View All Activity */}
              <div className="mt-6 text-center">
                <Link
                  to="/community"
                  className="inline-flex items-center bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
                >
                  View All Activity
                </Link>
              </div>
            </div>
          </section>
        </div>

      </main>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}
        >
          <div className="bg-card border border-border rounded-xl shadow-card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Edit Profile</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-accent rounded-md"
              >
                <XIcon />
              </button>
            </div>

            {/* Profile Picture Section */}
            <div className="mb-6 p-4 bg-muted/30 rounded-lg">
              <h4 className="text-md font-semibold text-foreground mb-3">Profile Picture</h4>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <img
                    src={user.profile_picture_url || user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                    alt="Profile picture"
                    className="w-24 h-24 rounded-full border-2 border-border object-cover"
                  />
                  <div
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={handleUploadClick}
                  >
                    <CameraIcon />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium mb-1">Upload a new photo</p>
                  <p className="text-xs text-muted-foreground mb-3">JPG, PNG or GIF. Max size 5MB.</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleUploadClick}
                      className="px-4 py-2 bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white rounded-lg text-sm hover:shadow-lg transition-all duration-200 inline-flex items-center"
                    >
                      <UploadIcon />
                      <span className="ml-2">Choose File</span>
                    </button>
                    {user.profile_picture_url && (
                      <button
                        type="button"
                        onClick={handleDeletePicture}
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg text-sm hover:shadow-lg transition-all duration-200 inline-flex items-center"
                      >
                        <TrashIcon />
                        <span className="ml-2">Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Profile Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">First name</label>
                  <input
                    type="text"
                    value={formData.first_name || ''}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Last name</label>
                  <input
                    type="text"
                    value={formData.last_name || ''}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-md"
                  />
                </div>
              </div>
              {/*
                University Display (Read-only)

                University affiliation is determined by the user's .edu email
                domain at registration. It cannot be changed manually.
              */}
              <div>
                <label className="block text-sm text-muted-foreground mb-1">University</label>
                <div className="w-full px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                  {user?.university || 'No university affiliated'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  University is determined by your .edu email domain and cannot be changed.
                </p>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Avatar URL (fallback)</label>
                <input
                  type="text"
                  value={formData.avatar_url || ''}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">About</label>
                <textarea
                  rows="4"
                  value={formData.about_section || ''}
                  onChange={(e) => setFormData({ ...formData, about_section: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={formData.skills || ''}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  Interests (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.interests || ''}
                  onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-input bg-background rounded-md hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white rounded-md hover:shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Crop Modal */}
      {showCropModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowCropModal(false)}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="bg-card border border-border rounded-xl shadow-card w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Position Your Photo</h3>
              <button
                type="button"
                onClick={() => setShowCropModal(false)}
                className="p-2 hover:bg-accent rounded-md"
              >
                <XIcon />
              </button>
            </div>

            <div className="mb-4">
              <div
                className="relative flex items-center justify-center bg-muted/50"
                style={{ height: '350px', width: '100%', margin: '0 auto' }}
              >
                <div
                  ref={cropContainerRef}
                  style={{
                    position: 'relative',
                    width: '300px',
                    height: '300px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '4px solid #e5e7eb',
                    background: '#fff',
                  }}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  onWheel={handleWheel}
                >
                  <img
                    ref={cropImageRef}
                    src={cropImageSrc}
                    alt="Image to crop"
                    style={getImageTransform()}
                  />
                </div>
              </div>
            </div>

            <div className="mb-4 text-sm text-muted-foreground text-center">
              Drag to move • Scroll to zoom
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCropModal(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                className="flex-1 px-4 py-2 bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white rounded-lg hover:shadow-lg transition-colors inline-flex items-center justify-center"
              >
                <CheckIcon />
                <span className="ml-2">Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
