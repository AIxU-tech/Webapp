/**
 * EditUniversityIdentityModal Component
 *
 * Modal for editing university identity: logo, club name, and social links.
 * Includes unsaved changes detection with confirmation dialog.
 *
 * @component
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { BaseModal, GradientButton, SecondaryButton, Alert } from '../ui';
import UniversityLogoSection from './UniversityLogoSection';
import SocialLinksInput from '../SocialLinksInput';
import UnsavedChangesModal from '../UnsavedChangesModal';

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

  // Track initial values for unsaved changes detection
  const [initialClubName, setInitialClubName] = useState('');
  const [initialSocialLinks, setInitialSocialLinks] = useState([]);

  // Unsaved changes modal state
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && university) {
      const name = university.clubName || '';
      const links = university.socialLinks || [];
      setClubName(name);
      setSocialLinks(links);
      setInitialClubName(name);
      setInitialSocialLinks(links);
      setError(null);
      setLogoError(null);
      setShowUnsavedModal(false);
    }
  }, [isOpen, university]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (clubName !== initialClubName) return true;
    if (JSON.stringify(socialLinks) !== JSON.stringify(initialSocialLinks)) return true;
    return false;
  }, [clubName, socialLinks, initialClubName, initialSocialLinks]);

  // Handle close with unsaved changes check
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
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

  // Unsaved changes modal handlers
  const handleSaveAndClose = async () => {
    setShowUnsavedModal(false);
    await handleSubmit();
  };

  const handleDiscardAndClose = () => {
    setShowUnsavedModal(false);
    onClose();
  };

  const handleCancelClose = () => {
    setShowUnsavedModal(false);
  };

  if (!university) return null;

  return (
    <>
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Club Page"
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
          <div className="flex justify-end pt-4">
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

    {/* Unsaved Changes Confirmation */}
    <UnsavedChangesModal
      isOpen={showUnsavedModal}
      onSave={handleSaveAndClose}
      onDiscard={handleDiscardAndClose}
      onCancel={handleCancelClose}
    />
    </>
  );
}
