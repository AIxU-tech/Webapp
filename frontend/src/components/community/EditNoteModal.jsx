/**
 * EditNoteModal Component
 *
 * Modal for editing existing community notes with title, content, tags, visibility settings,
 * and attachment management.
 *
 * Features:
 * - Pre-populated form fields with existing note data
 * - Title and content inputs with validation
 * - Multi-tag selection
 * - University-only visibility toggle (when user has a university)
 * - View existing attachments with delete option
 * - Add new attachments
 * - Character count display
 * - Loading state during submission
 *
 * @component
 */

import { useState, useEffect } from 'react';
import { BaseModal, TagSelector, GradientButton, Alert, FileUpload } from '../ui';
import { FileTypeIcon } from '../ui/forms/FileUpload';
import { ClockIcon } from '../icons';
import { deleteAttachment } from '../../api/uploads';

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
 * @property {Function} onUpdate - Callback when note is updated, receives {title, content, tags, universityOnly, newFiles}
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

  // Attachment state
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [deletingAttachment, setDeletingAttachment] = useState(null);

  // Calculate how many more files can be added
  const remainingSlots = 5 - existingAttachments.length;

  /**
   * Populate form when note changes or modal opens
   */
  useEffect(() => {
    if (note && isOpen) {
      setNoteTitle(note.title || '');
      setNoteContent(note.content || '');
      setSelectedTags(note.tags || []);
      setUniversityOnly(note.universityOnly || false);
      setExistingAttachments(note.attachments || []);
      setNewFiles([]);
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
    setExistingAttachments([]);
    setNewFiles([]);
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
   * Handle deleting an existing attachment
   */
  async function handleDeleteAttachment(attachment) {
    setDeletingAttachment(attachment.id);
    try {
      await deleteAttachment(attachment.id);
      setExistingAttachments(prev => prev.filter(a => a.id !== attachment.id));
    } catch (err) {
      console.error('Failed to delete attachment:', err);
      setValidationError('Failed to delete attachment. Please try again.');
    } finally {
      setDeletingAttachment(null);
    }
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

    // Call parent onUpdate with note data including new files
    onUpdate({
      title: noteTitle.trim(),
      content: noteContent.trim(),
      tags: selectedTags,
      universityOnly,
      newFiles,
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

        {/* Existing Attachments */}
        {existingAttachments.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Current Attachments
            </label>
            <div className="space-y-2">
              {existingAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                >
                  {/* Preview/Icon */}
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-background rounded overflow-hidden">
                    {attachment.isImage && attachment.downloadUrl ? (
                      <img
                        src={attachment.downloadUrl}
                        alt={attachment.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileTypeIcon filename={attachment.filename} className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{attachment.filename}</p>
                    <p className="text-xs text-muted-foreground">{attachment.sizeFormatted}</p>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteAttachment(attachment)}
                    disabled={deletingAttachment === attachment.id}
                    className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                    aria-label={`Remove ${attachment.filename}`}
                  >
                    {deletingAttachment === attachment.id ? (
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Attachments */}
        {remainingSlots > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Add Attachments
            </label>
            <FileUpload
              files={newFiles}
              onChange={setNewFiles}
              maxFiles={remainingSlots}
              disabled={isUpdating}
            />
          </div>
        )}

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
          <div className="text-sm text-muted-foreground flex items-center gap-4">
            <span className="flex items-center">
              <ClockIcon />
              <span className="ml-1">{charCount} characters</span>
            </span>
            {(existingAttachments.length + newFiles.length) > 0 && (
              <span>
                {existingAttachments.length + newFiles.length} file{(existingAttachments.length + newFiles.length) !== 1 ? 's' : ''}
              </span>
            )}
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
