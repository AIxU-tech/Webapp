/**
 * CreateSpeakerModal Component
 *
 * Modal for creating and editing guest speaker contacts.
 * Pass a `speaker` prop to enter edit mode (pre-fills form with existing data).
 */

import { useState, useEffect } from 'react';
import { BaseModal, GradientButton, SecondaryButton, Alert } from '../ui';
import { useCreateSpeaker, useUpdateSpeaker } from '../../hooks';
import { isValidUrl } from '../../utils/socialLinks';

export default function CreateSpeakerModal({ isOpen, onClose, speaker = null, userUniversities = [] }) {
  const isEditMode = !!speaker;

  // Form state
  const [universityId, setUniversityId] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Inline field errors (contact, linkedinUrl) + server error
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');

  // Mutations
  const createMutation = useCreateSpeaker();
  const updateMutation = useUpdateSpeaker();
  const activeMutation = isEditMode ? updateMutation : createMutation;

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
        setUniversityId(speaker.universityId || '');
      } else {
        setName('');
        setPosition('');
        setOrganization('');
        setEmail('');
        setPhone('');
        setLinkedinUrl('');
        setNotes('');
        setUniversityId(userUniversities.length === 1 ? userUniversities[0].id : '');
      }
      setFieldErrors({});
      setServerError('');
    }
  }, [isOpen, speaker, userUniversities]);

  const handleClose = () => {
    setFieldErrors({});
    setServerError('');
    onClose();
  };

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setServerError('');
    const errors = {};

    // At least one contact field
    if (!email.trim() && !phone.trim() && !linkedinUrl.trim()) {
      errors.contact = 'At least one contact method (email, phone, or LinkedIn) is required';
    }

    // LinkedIn URL validation using the platform's isValidUrl utility
    if (linkedinUrl.trim()) {
      let url = linkedinUrl.trim();
      if (!url.match(/^https?:\/\//i)) url = 'https://' + url;
      const validation = isValidUrl(url);
      if (!validation.valid) {
        errors.linkedinUrl = validation.error;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    // Auto-prepend https:// to LinkedIn URL if needed
    let processedLinkedinUrl = linkedinUrl.trim() || undefined;
    if (processedLinkedinUrl && !processedLinkedinUrl.match(/^https?:\/\//i)) {
      processedLinkedinUrl = 'https://' + processedLinkedinUrl;
    }

    const speakerData = {
      name: name.trim(),
      position: position.trim(),
      organization: organization.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      linkedinUrl: processedLinkedinUrl,
      notes: notes.trim() || undefined,
    };

    // Add university for create mode
    if (!isEditMode) {
      const selectedUniId = universityId || (userUniversities.length === 1 ? userUniversities[0].id : null);
      if (selectedUniId) {
        speakerData.universityId = Number(selectedUniId);
      }
    }

    if (isEditMode) {
      updateMutation.mutate(
        { speakerId: speaker.id, speakerData },
        {
          onSuccess: handleClose,
          onError: (err) => setServerError(err.message || 'Failed to update speaker'),
        }
      );
    } else {
      createMutation.mutate(speakerData, {
        onSuccess: handleClose,
        onError: (err) => setServerError(err.message || 'Failed to create speaker'),
      });
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Edit Speaker' : 'Add Speaker'}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="p-6">
        {/* Server error (from API) */}
        {serverError && (
          <div className="mb-4">
            <Alert variant="error">{serverError}</Alert>
          </div>
        )}

        {/* University Selector (only for create mode with multiple universities) */}
        {!isEditMode && userUniversities.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              University <span className="text-red-500">*</span>
            </label>
            <select
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="">Select university...</option>
              {userUniversities.map((uni) => (
                <option key={uni.id} value={uni.id}>
                  {uni.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
              onChange={(e) => { setEmail(e.target.value); clearFieldError('contact'); }}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
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
              onChange={(e) => { setPhone(e.target.value); clearFieldError('contact'); }}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* LinkedIn URL */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            LinkedIn URL
          </label>
          <input
            type="text"
            placeholder="https://linkedin.com/in/username"
            value={linkedinUrl}
            onChange={(e) => { setLinkedinUrl(e.target.value); clearFieldError('linkedinUrl'); clearFieldError('contact'); }}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {fieldErrors.linkedinUrl && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.linkedinUrl}</p>
          )}
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Additional Notes
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
  );
}
