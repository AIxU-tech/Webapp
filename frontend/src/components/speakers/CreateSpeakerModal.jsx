/**
 * CreateSpeakerModal Component
 *
 * Modal for creating and editing guest speaker contacts.
 * Pass a `speaker` prop to enter edit mode (pre-fills form with existing data).
 * Uses the shared ImageUploadZone for photo upload and UnsavedChangesModal for dirty-close protection.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { BaseModal, GradientButton, SecondaryButton, Alert, ToggleTag, TagGroup, UnsavedChangesModal } from '../ui';
import { TrashIcon } from '../icons';
import { useCreateSpeaker, useUpdateSpeaker, useBeforeUnload } from '../../hooks';
import { isValidUrl } from '../../utils/socialLinks';
import { validateEmailFormat, validatePhoneFormat, formatUSPhone } from '../../utils';
import { SPEAKER_TAGS } from '../../constants/speakerTags';
import { requestImageUploadUrl, uploadToGCS } from '../../api/uploads';
import { ImageUploadZone } from '../ui/images';
import SpeakerImage from './SpeakerImage';

/**
 * Normalize a LinkedIn input to a full URL.
 * Accepts formats like:
 *   - https://linkedin.com/in/username
 *   - linkedin.com/in/username
 *   - www.linkedin.com/in/username
 *   - in/username
 *   - username (assumed /in/ profile)
 */
function normalizeLinkedInUrl(raw) {
  const s = raw.trim();
  if (!s) return '';

  // Already a full URL
  if (/^https?:\/\//i.test(s)) return s;

  // Has domain (linkedin.com/...)
  if (/^(www\.)?linkedin\.com\//i.test(s)) return 'https://' + s;

  // Starts with "in/" path
  if (/^in\//i.test(s)) return 'https://linkedin.com/' + s;

  // Bare username — assume /in/ profile
  if (/^[\w.-]+$/.test(s)) return 'https://linkedin.com/in/' + s;

  // Fallback: prepend https://
  return 'https://' + s;
}

export default function CreateSpeakerModal({ isOpen, onClose, speaker = null }) {
  const isEditMode = !!speaker;
  const formRef = useRef(null);

  // Form state
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState([]);

  // Image state
  // imageData: { gcsPath, filename, contentType, sizeBytes } | null (removed) | undefined (no change)
  const [imageData, setImageData] = useState(undefined);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Unsaved changes state
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Inline field errors (contact, email, phone, linkedinUrl) + server error
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');

  // Mutations
  const createMutation = useCreateSpeaker();
  const updateMutation = useUpdateSpeaker();
  const activeMutation = isEditMode ? updateMutation : createMutation;

  // Initial values snapshot for dirty detection
  const initialValues = useMemo(() => {
    if (!isOpen) return null;
    if (speaker) {
      return {
        name: speaker.name || '',
        position: speaker.position || '',
        organization: speaker.organization || '',
        email: speaker.email || '',
        phone: speaker.phone || '',
        linkedinUrl: speaker.linkedinUrl || '',
        notes: speaker.notes || '',
        tags: JSON.stringify(Array.isArray(speaker.tags) ? speaker.tags : []),
        imageData: undefined,
      };
    }
    return {
      name: '', position: '', organization: '', email: '', phone: '',
      linkedinUrl: '', notes: '', tags: '[]', imageData: undefined,
    };
  }, [isOpen, speaker]);

  // Compute dirty state
  const hasUnsavedChanges = useMemo(() => {
    if (!initialValues || !isOpen) return false;
    return (
      name !== initialValues.name ||
      position !== initialValues.position ||
      organization !== initialValues.organization ||
      email !== initialValues.email ||
      phone !== initialValues.phone ||
      linkedinUrl !== initialValues.linkedinUrl ||
      notes !== initialValues.notes ||
      JSON.stringify(tags) !== initialValues.tags ||
      imageData !== undefined
    );
  }, [initialValues, isOpen, name, position, organization, email, phone, linkedinUrl, notes, tags, imageData]);

  // Warn on browser tab close with unsaved changes
  useBeforeUnload(hasUnsavedChanges);

  // Pre-fill form when editing or reset when opening
  useEffect(() => {
    if (isOpen) {
      if (speaker) {
        setName(speaker.name || '');
        setPosition(speaker.position || '');
        setOrganization(speaker.organization || '');
        setEmail(speaker.email || '');
        setPhone(speaker.phone || '');
        setLinkedinUrl(speaker.linkedinUrl || '');
        setNotes(speaker.notes || '');
        setTags(Array.isArray(speaker.tags) ? speaker.tags : []);
        setCurrentImageUrl(speaker.imageUrl || null);
        setImageData(undefined);
      } else {
        setName('');
        setPosition('');
        setOrganization('');
        setEmail('');
        setPhone('');
        setLinkedinUrl('');
        setNotes('');
        setTags([]);
        setCurrentImageUrl(null);
        setImageData(undefined);
      }
      setPreviewUrl(null);
      setFieldErrors({});
      setServerError('');
      setShowUnsavedModal(false);
    }
  }, [isOpen, speaker]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
      return;
    }
    resetAndClose();
  };

  const resetAndClose = () => {
    setFieldErrors({});
    setServerError('');
    setShowUnsavedModal(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onClose();
  };

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const toggleTag = (tagId) => {
    setTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  // Inline blur validation for email
  const handleEmailBlur = () => {
    if (email.trim()) {
      const result = validateEmailFormat(email);
      if (!result.valid) {
        setFieldErrors((prev) => ({ ...prev, email: result.error }));
      }
    }
  };

  // Inline blur validation for phone
  const handlePhoneBlur = () => {
    if (phone.trim()) {
      const result = validatePhoneFormat(phone);
      if (!result.valid) {
        setFieldErrors((prev) => ({ ...prev, phone: result.error }));
      }
    }
  };

  // Inline blur validation for LinkedIn
  const handleLinkedinBlur = () => {
    if (linkedinUrl.trim()) {
      const normalized = normalizeLinkedInUrl(linkedinUrl);
      const result = isValidUrl(normalized);
      if (!result.valid) {
        setFieldErrors((prev) => ({ ...prev, linkedinUrl: result.error }));
      }
    }
  };

  // ImageUploadZone callback — receives a cropped blob, uploads to GCS
  const handleFileSelect = async (croppedBlob) => {
    // Create local preview
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const blobUrl = URL.createObjectURL(croppedBlob);
    setPreviewUrl(blobUrl);

    setUploading(true);
    setServerError('');

    try {
      const filename = `speaker-photo.${croppedBlob.type === 'image/png' ? 'png' : 'jpg'}`;
      const urlResponse = await requestImageUploadUrl({
        imageType: 'speaker',
        filename,
        contentType: croppedBlob.type,
        sizeBytes: croppedBlob.size,
      });

      if (!urlResponse.uploadUrl || !urlResponse.gcsPath) {
        throw new Error('Failed to get upload URL');
      }

      await uploadToGCS(urlResponse.uploadUrl, croppedBlob);

      setImageData({
        gcsPath: urlResponse.gcsPath,
        filename,
        contentType: croppedBlob.type,
        sizeBytes: croppedBlob.size,
      });
    } catch (err) {
      URL.revokeObjectURL(blobUrl);
      setPreviewUrl(null);
      setServerError(err.message || 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setImageData(null);
    setCurrentImageUrl(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setServerError('');
    const errors = {};

    // At least one contact field
    if (!email.trim() && !phone.trim() && !linkedinUrl.trim()) {
      errors.contact = 'At least one contact method (email, phone, or LinkedIn) is required';
    }

    // Email and phone format validation (when provided)
    if (email.trim()) {
      const emailValidation = validateEmailFormat(email);
      if (!emailValidation.valid) errors.email = emailValidation.error;
    }
    if (phone.trim()) {
      const phoneValidation = validatePhoneFormat(phone);
      if (!phoneValidation.valid) errors.phone = phoneValidation.error;
    }

    // LinkedIn URL validation
    if (linkedinUrl.trim()) {
      const normalized = normalizeLinkedInUrl(linkedinUrl);
      const validation = isValidUrl(normalized);
      if (!validation.valid) {
        errors.linkedinUrl = validation.error;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    // Normalize LinkedIn URL for submission
    const processedLinkedinUrl = linkedinUrl.trim() ? normalizeLinkedInUrl(linkedinUrl) : undefined;

    const speakerData = {
      name: name.trim(),
      position: position.trim(),
      organization: organization.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      linkedinUrl: processedLinkedinUrl,
      notes: notes.trim() || undefined,
      tags,
    };

    // Include image fields
    if (imageData === null) {
      // Explicit removal
      speakerData.imageGcsPath = null;
      speakerData.imageFilename = null;
      speakerData.imageContentType = null;
      speakerData.imageSizeBytes = null;
    } else if (imageData) {
      // New image
      speakerData.imageGcsPath = imageData.gcsPath;
      speakerData.imageFilename = imageData.filename;
      speakerData.imageContentType = imageData.contentType;
      speakerData.imageSizeBytes = imageData.sizeBytes;
    }

    const onSuccess = () => {
      setShowUnsavedModal(false);
      resetAndClose();
    };

    if (isEditMode) {
      updateMutation.mutate(
        { speakerId: speaker.id, speakerData },
        {
          onSuccess,
          onError: (err) => setServerError(err.message || 'Failed to update speaker'),
        }
      );
    } else {
      createMutation.mutate(speakerData, {
        onSuccess,
        onError: (err) => setServerError(err.message || 'Failed to create speaker'),
      });
    }
  };

  // Determine which image URL to show in the preview
  const displayImageUrl = previewUrl || (imageData === null ? null : currentImageUrl);

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={handleClose}
        title={isEditMode ? 'Edit Speaker' : 'Add Speaker'}
        size="2xl"
      >
        <form ref={formRef} onSubmit={handleSubmit} className="p-6">
          {/* Server error (from API) */}
          {serverError && (
            <div className="mb-4">
              <Alert variant="error">{serverError}</Alert>
            </div>
          )}

          {/* Speaker Image Upload (shared ImageUploadZone) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Speaker Photo <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </label>
            <ImageUploadZone
              preview={
                <SpeakerImage
                  imageUrl={displayImageUrl}
                  name={name || 'Speaker'}
                  size="lg"
                />
              }
              onFileSelect={handleFileSelect}
              onError={(msg) => setServerError(msg)}
              label={uploading ? 'Uploading...' : 'Drag photo here or click to browse'}
              sublabel="JPG, PNG or GIF. Max 5MB"
              className="mb-0"
            />
            {/* Remove button */}
            {displayImageUrl && !uploading && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors cursor-pointer mt-2"
              >
                <TrashIcon className="h-3 w-3" />
                Remove image
              </button>
            )}
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Dr. Sarah Chen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={150}
              required
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Position */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Position / Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Professor of Machine Learning"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              maxLength={200}
              required
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Organization */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Organization
            </label>
            <input
              type="text"
              placeholder="e.g., OpenAI"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              maxLength={200}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Contact error - displayed above all contact fields */}
          {fieldErrors.contact && (
            <p className="text-xs text-red-500 mb-2">{fieldErrors.contact}</p>
          )}

          {/* Contact fields in a grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                placeholder="speaker@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearFieldError('contact'); clearFieldError('email'); }}
                onBlur={handleEmailBlur}
                className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${fieldErrors.email ? 'border-red-500' : 'border-border'}`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Phone
              </label>
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => { setPhone(formatUSPhone(e.target.value)); clearFieldError('contact'); clearFieldError('phone'); }}
                onBlur={handlePhoneBlur}
                className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${fieldErrors.phone ? 'border-red-500' : 'border-border'}`}
              />
              {fieldErrors.phone && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>
              )}
            </div>
          </div>

          {/* LinkedIn URL */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              LinkedIn URL
            </label>
            <input
              type="text"
              placeholder="linkedin.com/in/username or just username"
              value={linkedinUrl}
              onChange={(e) => { setLinkedinUrl(e.target.value); clearFieldError('linkedinUrl'); clearFieldError('contact'); }}
              onBlur={handleLinkedinBlur}
              className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${fieldErrors.linkedinUrl ? 'border-red-500' : 'border-border'}`}
            />
            {fieldErrors.linkedinUrl && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.linkedinUrl}</p>
            )}
          </div>

          {/* Description (formerly "Additional Notes") */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <textarea
              placeholder="e.g., Excellent for technical audiences. Prefers 1hr format with Q&A."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {notes.length}/500
            </p>
          </div>

          {/* Speaker tags (optional, below description) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-1">
              Speaker tags <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </label>
            <TagGroup>
              {SPEAKER_TAGS.map((tag) => (
                <ToggleTag
                  key={tag.id}
                  selected={tags.includes(tag.id)}
                  onClick={() => toggleTag(tag.id)}
                  size="sm"
                >
                  {tag.label}
                </ToggleTag>
              ))}
            </TagGroup>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <SecondaryButton
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={activeMutation.isPending}
            >
              Cancel
            </SecondaryButton>
            <GradientButton
              type="submit"
              loading={activeMutation.isPending}
              loadingText={isEditMode ? 'Saving...' : 'Adding...'}
            >
              {isEditMode ? 'Save Changes' : 'Add Speaker'}
            </GradientButton>
          </div>
        </form>
      </BaseModal>

      {/* Unsaved changes prompt */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onSave={() => {
          setShowUnsavedModal(false);
          formRef.current?.requestSubmit();
        }}
        onDiscard={resetAndClose}
        onCancel={() => setShowUnsavedModal(false)}
      />
    </>
  );
}
