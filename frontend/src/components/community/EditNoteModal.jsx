/**
 * EditNoteModal Component
 *
 * Modal for editing existing community notes with title, content, tags, and visibility settings.
 *
 * Features:
 * - Pre-populated form fields with existing note data
 * - Title and content inputs with validation
 * - Multi-tag selection
 * - University-only visibility toggle (when user has a university)
 * - Character count display
 * - Loading state during submission
 *
 * @component
 */

import { useState, useEffect } from 'react';
import { BaseModal, TagSelector, GradientButton, Alert } from '../ui';
import { ClockIcon } from '../icons';

/**
 * Available tags for notes
 */
const EDIT_TAGS = [
  'NLP',
  'Deep Learning',
  'MLOps',
  'Computer Vision',
  'Ethics',
  'Research',
  'Tutorial',
  'Best Practices'
];

/**
 * EditNoteModal Props
 * @typedef {Object} EditNoteModalProps
 * @property {boolean} isOpen - Whether the modal is open
 * @property {Function} onClose - Callback when modal is closed
 * @property {Function} onUpdate - Callback when note is updated, receives {title, content, tags, universityOnly}
 * @property {boolean} isUpdating - Whether the note is currently being updated
 * @property {Object} note - The note object to edit
 * @property {string|null} userUniversity - User's university name (null if no university)
 * @property {string|null} error - Error message from failed update attempt
 */

export default function EditNoteModal({
  isOpen,
  onClose,
  onUpdate,
  isUpdating = false,
  note = null,
  userUniversity = null,
  error = null,
}) {
  // Form state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [universityOnly, setUniversityOnly] = useState(false);
  const [validationError, setValidationError] = useState(null);

  /**
   * Populate form when note changes or modal opens
   */
  useEffect(() => {
    if (note && isOpen) {
      setNoteTitle(note.title || '');
      setNoteContent(note.content || '');
      setSelectedTags(note.tags || []);
      setUniversityOnly(note.universityOnly || false);
      setValidationError(null);
    }
  }, [note, isOpen]);

  /**
   * Reset form to initial state
   */
  function resetForm() {
    setNoteTitle('');
    setNoteContent('');
    setSelectedTags([]);
    setUniversityOnly(false);
    setValidationError(null);
  }

  /**
   * Handle modal close
   * Resets form and calls parent onClose callback
   */
  function handleClose() {
    resetForm();
    onClose();
  }

  /**
   * Handle form submission
   * Validates inputs and calls onUpdate callback with form data
   */
  function handleSubmit(e) {
    e.preventDefault();
    setValidationError(null);

    // Validate required fields
    if (!noteTitle.trim() || !noteContent.trim()) {
      setValidationError('Please fill in both title and content');
      return;
    }

    // Call parent onUpdate with note data
    onUpdate({
      title: noteTitle.trim(),
      content: noteContent.trim(),
      tags: selectedTags,
      universityOnly,
    });
  }

  // Calculate character count
  const charCount = noteTitle.length + noteContent.length;

  // Don't render if no note is provided
  if (!note) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit note"
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="p-6">
        {/* Title Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Title *
          </label>
          <input
            type="text"
            placeholder="Title"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            required
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Content Textarea */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Content *
          </label>
          <textarea
            placeholder="What do you want to talk about?"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            required
            rows={6}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Tags Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Tags
          </label>
          <TagSelector
            tags={EDIT_TAGS}
            selected={selectedTags}
            onChange={setSelectedTags}
            multiple
          />
        </div>

        {/* University Only Toggle - Only show if user has a university */}
        {userUniversity && (
          <div className="mb-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={universityOnly}
                onChange={(e) => setUniversityOnly(e.target.checked)}
                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
              />
              <span className="ml-2 text-sm text-foreground">
                Only visible to members of my university
              </span>
            </label>
          </div>
        )}

        {/* Error Display */}
        {(error || validationError) && (
          <div className="mb-4">
            <Alert variant="error">
              {error || validationError}
            </Alert>
          </div>
        )}

        {/* Submit Button Row */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          {/* Character Count */}
          <div className="text-sm text-muted-foreground flex items-center">
            <ClockIcon />
            <span className="ml-1">{charCount} characters</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <GradientButton
              type="submit"
              size="sm"
              loading={isUpdating}
              loadingText="Saving..."
            >
              Save Changes
            </GradientButton>
          </div>
        </div>
      </form>
    </BaseModal>
  );
}

