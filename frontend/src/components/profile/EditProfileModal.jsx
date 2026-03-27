/**
 * EditProfileModal Component
 *
 * Modal for editing user profile information including name, location, social links,
 * and profile picture. Manages its own form state and handles submission.
 *
 * @component
 *
 * @param {Object} user - The user object containing current profile data
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback to close the modal
 * @param {Object} updateProfileMutation - React Query mutation for updating profile
 * @param {Function} onSave - Callback called when save succeeds, receives (response) => void
 * @param {Function} onUploadPicture - Callback for profile picture upload (called on save with blob)
 * @param {Function} onPictureError - Callback for profile picture validation errors
 *
 * @example
 * <EditProfileModal
 *   user={user}
 *   isOpen={showEditModal}
 *   onClose={() => setShowEditModal(false)}
 *   updateProfileMutation={updateProfileMutation}
 *   onSave={(response) => {
 *     // Update AuthContext
 *     setCurrentUser({ ...currentUser, ...response.user });
 *     setFeedback({ type: 'success', message: 'Profile updated!' });
 *   }}
 *   onUploadPicture={handleUploadPicture}
 *   onPictureError={handlePictureError}
 * />
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from '../../hooks';

// UI Components
import { BaseModal, Alert, GradientButton, SecondaryButton, ResetButton, FormInput, SocialLinksInput, ImageUploadZone, Avatar } from '../ui';

/**
 * Get initial form values from user object
 */
const getInitialFormValues = (userData) => ({
  first_name: userData?.first_name || '',
  last_name: userData?.last_name || '',
  headline: userData?.headline || '',
  location: userData?.location || '',
  socialLinks: userData?.socialLinks || [],
});

export default function EditProfileModal({
  user,
  isOpen,
  onClose,
  updateProfileMutation,
  onSave,
  onUploadPicture,
  onDeletePicture,
  onPictureError,
}) {
  const [pendingPictureBlob, setPendingPictureBlob] = useState(null);
  const [picturePreviewUrl, setPicturePreviewUrl] = useState(null);
  const previewUrlRef = useRef(null);

  const handleFileSelect = useCallback((blob) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(blob);
    previewUrlRef.current = url;
    setPendingPictureBlob(blob);
    setPicturePreviewUrl(url);
  }, []);

  const clearPendingPicture = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPendingPictureBlob(null);
    setPicturePreviewUrl(null);
  }, []);

  const {
    formData,
    setFormData,
    error: formError,
    handleChange,
    handleSubmit: handleFormSubmit,
    reset,
    setInitialValues,
  } = useForm({
    initialValues: getInitialFormValues(user),
    onSubmit: async (data) => {
      // Upload pending picture if one was selected
      if (pendingPictureBlob) {
        await onUploadPicture(pendingPictureBlob);
        clearPendingPicture();
      }
      const response = await updateProfileMutation.mutateAsync(data);
      // Call onSave callback to update AuthContext and show feedback
      onSave?.(response);
      onClose();
    },
    defaultErrorMessage: 'Failed to update profile. Please try again.',
  });

  // When modal opens, sync form data and initial values to current user
  useEffect(() => {
    if (isOpen && user) {
      const values = getInitialFormValues(user);
      setFormData(values);
      setInitialValues(values); // Keep reset() in sync with latest user data
    }
  }, [isOpen, user, setFormData, setInitialValues]);

  // Reset form and pending picture on close
  useEffect(() => {
    if (!isOpen) {
      reset();
      clearPendingPicture();
    }
  }, [isOpen, reset, clearPendingPicture]);

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Edit Profile" size="2xl">
      <div className="p-6">
        {/* Profile Picture Section */}
        <ImageUploadZone
          preview={<Avatar user={user} src={picturePreviewUrl} size="xl" />}
          onFileSelect={handleFileSelect}
          onError={onPictureError}
        />

        {/* Reset profile picture button */}
        {user?.profile_picture_url && onDeletePicture && (
          <div className="-mt-4 mb-2">
            <ResetButton onClick={onDeletePicture} title="Reset to default avatar">
              Reset Photo
            </ResetButton>
          </div>
        )}

        {/* Profile Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4 mt-6">
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

          {/* Headline */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Headline
            </label>
            <FormInput
              name="headline"
              value={formData.headline || ''}
              onChange={handleChange}
              placeholder="e.g. CS Student at UCLA"
            />
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

          {/* Social Links */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Social Links
            </label>
            <SocialLinksInput
              value={formData.socialLinks || []}
              onChange={(links) => setFormData({ ...formData, socialLinks: links })}
            />
          </div>

          {/* Note: Skills editing moved to inline SkillsCard component */}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <SecondaryButton variant="outline" onClick={onClose}>
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
  );
}
