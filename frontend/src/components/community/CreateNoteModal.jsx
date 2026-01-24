/**
 * CreateNoteModal Component
 *
 * Modal for creating new community notes with title, content, tags, and visibility settings.
 *
 * Features:
 * - Title and content inputs with validation
 * - Multi-tag selection
 * - University-only visibility toggle (when user has a university)
 * - Character count display
 * - Loading state during submission
 *
 * @component
 */

import { useState } from 'react';
import { BaseModal, TagSelector, GradientButton, Alert } from '../ui';
import { ClockIcon } from '../icons';

/**
 * Available tags for creating notes
 */
const CREATE_TAGS = [
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
 * CreateNoteModal Props
 * @typedef {Object} CreateNoteModalProps
 * @property {boolean} isOpen - Whether the modal is open
 * @property {Function} onClose - Callback when modal is closed
 * @property {Function} onCreate - Callback when note is created, receives {title, content, tags, universityOnly}
 * @property {boolean} isCreating - Whether the note is currently being created
 * @property {string|null} userUniversity - User's university name (null if no university)
 * @property {string|null} error - Error message from failed creation attempt
 */

export default function CreateNoteModal({
  isOpen,
  onClose,
  onCreate,
  isCreating = false,
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
   * Validates inputs and calls onCreate callback with form data
   */
  function handleSubmit(e) {
    e.preventDefault();
    setValidationError(null);

    // Validate required fields
    if (!noteTitle.trim() || !noteContent.trim()) {
      setValidationError('Please fill in both title and content');
      return;
    }

    // Call parent onCreate with note data
    onCreate({
      title: noteTitle.trim(),
      content: noteContent.trim(),
      tags: selectedTags,
      universityOnly,
    });
  }

  // Calculate character count
  const charCount = noteTitle.length + noteContent.length;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Creating a note"
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
            tags={CREATE_TAGS}
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

          {/* Submit Button */}
          <GradientButton
            type="submit"
            size="sm"
            loading={isCreating}
            loadingText="Posting..."
          >
            Post
          </GradientButton>
        </div>
      </form>
    </BaseModal>
  );
}
