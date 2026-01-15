/**
 * EditUniversityIdentityModal Component
 *
 * Modal for editing university identity: logo, club name, and website URL.
 * University name is displayed but not editable (set during creation).
 *
 * @component
 */

import { useState, useEffect } from 'react';
import { BaseModal, GradientButton, SecondaryButton, Alert } from '../ui';
import UniversityLogoSection from './UniversityLogoSection';
import SocialLinksInput from '../SocialLinksInput';

export default function EditUniversityIdentityModal({
  isOpen,
  onClose,
  university,
  onSave,
  onUploadLogo,
  onDelete,
  isLoading = false,
  isUploadingLogo = false,
  isDeleting = false,
  isAdmin = false,
}) {
  // Form state
  const [clubName, setClubName] = useState('');
  const [socialLinks, setSocialLinks] = useState([]);
  const [error, setError] = useState(null);
  const [logoError, setLogoError] = useState(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && university) {
      setClubName(university.clubName || '');
      setSocialLinks(university.socialLinks || []);
      setError(null);
      setLogoError(null);
    }
  }, [isOpen, university]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      await onSave({
        clubName: clubName.trim(),
        socialLinks: socialLinks,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save changes');
    }
  };

  const handleLogoUpload = async (blob) => {
    setLogoError(null);
    try {
      await onUploadLogo(blob);
    } catch (err) {
      setLogoError(err.message || 'Failed to upload logo');
    }
  };

  const handleLogoError = (message) => {
    setLogoError(message);
  };

  if (!university) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Club Identity"
      size="lg"
    >
      <div className="p-6">
        {/* Logo Upload Section */}
        <UniversityLogoSection
          university={university}
          onUpload={handleLogoUpload}
          onError={handleLogoError}
          isUploading={isUploadingLogo}
        />

        {logoError && (
          <Alert
            variant="error"
            dismissible
            onDismiss={() => setLogoError(null)}
            className="mb-4"
          >
            {logoError}
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert
              variant="error"
              dismissible
              onDismiss={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* University Name (read-only) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              University Name
            </label>
            <input
              type="text"
              value={university.name}
              disabled
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">
              University name cannot be changed
            </p>
          </div>

          {/* Club Name */}
          <div>
            <label
              htmlFor="clubName"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Club Name
            </label>
            <input
              id="clubName"
              type="text"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="e.g., AI Club, Machine Learning Society"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                         text-foreground placeholder-muted-foreground"
            />
          </div>

          {/* Social Links */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Social Links
            </label>
            <SocialLinksInput
              value={socialLinks}
              onChange={setSocialLinks}
              disabled={isLoading}
              universityLogoUrl={university?.hasLogo ? `/university/${university.id}/logo` : null}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <SecondaryButton
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </SecondaryButton>
            <GradientButton
              type="submit"
              loading={isLoading}
              loadingText="Saving..."
            >
              Save Changes
            </GradientButton>
          </div>
        </form>

        {/* Danger Zone - Admin only */}
        {isAdmin && (
          <div className="mt-6 pt-6 border-t border-border">
            <SecondaryButton
              variant="danger"
              onClick={onDelete}
              loading={isDeleting}
              loadingText="Deleting..."
            >
              Delete University
            </SecondaryButton>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
