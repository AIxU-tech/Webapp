/**
 * NoteFormModal Component
 *
 * Shared modal form for creating and editing community notes.
 * Determines mode based on whether a `note` prop is provided.
 *
 * Features:
 * - Title and content inputs with validation
 * - Multi-tag selection
 * - University-only visibility toggle
 * - File attachments via FileUpload or drag-and-drop onto the textarea
 * - Existing attachment management (edit mode)
 * - Character count display
 *
 * @component
 */

import { useState, useEffect, useCallback } from 'react';
import { BaseModal, TagSelector, GradientButton, Alert, FileUpload } from '../ui';
import { FileTypeIcon, validateFile } from '../ui/forms/FileUpload';
import { ClockIcon } from '../icons';

const NOTE_TAGS = [
  'NLP',
  'Deep Learning',
  'MLOps',
  'Computer Vision',
  'Ethics',
  'Research',
  'Tutorial',
  'Best Practices',
];

const MAX_FILES = 5;

export default function NoteFormModal({
  isOpen,
  onClose,
  onSubmit,
  note = null,
  userUniversity = null,
  error = null,
}) {
  const isEditMode = note !== null;

  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [universityOnly, setUniversityOnly] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const [newFiles, setNewFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [attachmentIdsToRemove, setAttachmentIdsToRemove] = useState([]);
  const [isTextareaDragOver, setIsTextareaDragOver] = useState(false);

  const displayedExisting = existingAttachments.filter(
    (a) => !attachmentIdsToRemove.includes(a.id),
  );
  const maxNewFiles = MAX_FILES - displayedExisting.length;
  const totalAttachments = displayedExisting.length + newFiles.length;
  const contentRequired = totalAttachments === 0;
  const charCount = noteTitle.length + noteContent.length;

  useEffect(() => {
    if (!isOpen) {
      setNoteTitle('');
      setNoteContent('');
      setSelectedTags([]);
      setUniversityOnly(false);
      setValidationError(null);
      setNewFiles([]);
      setExistingAttachments([]);
      setAttachmentIdsToRemove([]);
      setIsTextareaDragOver(false);
      return;
    }

    if (note) {
      setNoteTitle(note.title || '');
      setNoteContent(note.content || '');
      setSelectedTags(note.tags || []);
      setUniversityOnly(note.universityOnly || false);
      setExistingAttachments(note.attachments || []);
      setNewFiles([]);
      setAttachmentIdsToRemove([]);
      setValidationError(null);
    }
  }, [isOpen, note]);

  // ------------------------------------------------------------------
  // Drag-and-drop onto textarea
  // ------------------------------------------------------------------

  const addFiles = useCallback(
    (incoming) => {
      setValidationError(null);
      const arr = Array.from(incoming);

      if (newFiles.length + arr.length > maxNewFiles) {
        setValidationError(`Maximum ${MAX_FILES} files allowed total`);
        return;
      }

      const valid = [];
      for (const file of arr) {
        const result = validateFile(file);
        if (!result.valid) {
          setValidationError(result.error);
          return;
        }
        valid.push(file);
      }

      const names = new Set(newFiles.map((f) => f.name));
      const unique = valid.filter((f) => !names.has(f.name));

      if (unique.length < valid.length) {
        setValidationError('Some files were skipped (duplicate names)');
      }

      setNewFiles([...newFiles, ...unique]);
    },
    [newFiles, maxNewFiles],
  );

  const handleTextareaDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTextareaDragOver(true);
  }, []);

  const handleTextareaDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsTextareaDragOver(false);
    }
  }, []);

  const handleTextareaDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsTextareaDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  // ------------------------------------------------------------------
  // Submission
  // ------------------------------------------------------------------

  function handleSubmit(e) {
    e.preventDefault();
    setValidationError(null);

    if (!noteTitle.trim()) {
      setValidationError('Please fill in the title');
      return;
    }

    if (!noteContent.trim() && totalAttachments === 0) {
      setValidationError('Please add content or attach files');
      return;
    }

    const payload = {
      title: noteTitle.trim(),
      content: noteContent.trim(),
      tags: selectedTags,
      universityOnly,
    };

    if (isEditMode) {
      payload.newFiles = newFiles;
      payload.attachmentIdsToRemove = attachmentIdsToRemove;
    } else {
      payload.files = newFiles;
    }

    onSubmit(payload);
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit note' : 'New note'}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="p-6">
        {/* Title */}
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

        {/* Content with drag-and-drop zone */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Content {contentRequired && '*'}
          </label>
          <div
            className="relative"
            onDragOver={handleTextareaDragOver}
            onDragLeave={handleTextareaDragLeave}
            onDrop={handleTextareaDrop}
          >
            <textarea
              placeholder="What do you want to talk about?"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={6}
              className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-colors ${
                isTextareaDragOver ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            />
            {isTextareaDragOver && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none">
                <span className="text-sm font-medium text-primary bg-background/80 px-3 py-1.5 rounded-full shadow-sm">
                  Drop files to attach
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Existing Attachments (edit mode) */}
        {displayedExisting.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Current Attachments
            </label>
            <div className="space-y-2">
              {displayedExisting.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                >
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-background rounded overflow-hidden">
                    {attachment.isImage && attachment.downloadUrl ? (
                      <img
                        src={attachment.downloadUrl}
                        alt={attachment.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileTypeIcon
                        filename={attachment.filename}
                        className="w-5 h-5 text-muted-foreground"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {attachment.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {attachment.sizeFormatted}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachmentIdsToRemove((prev) => [...prev, attachment.id])
                    }
                    className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                    aria-label={`Remove ${attachment.filename}`}
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File Upload */}
        {maxNewFiles > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              {isEditMode && displayedExisting.length > 0
                ? 'Add Attachments'
                : 'Attachments'}
            </label>
            <FileUpload
              files={newFiles}
              onChange={setNewFiles}
              maxFiles={maxNewFiles}
            />
          </div>
        )}

        {/* Tags */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Tags
          </label>
          <TagSelector
            tags={NOTE_TAGS}
            selected={selectedTags}
            onChange={setSelectedTags}
            multiple
          />
        </div>

        {/* University Only Toggle */}
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
            <Alert variant="error">{error || validationError}</Alert>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground flex items-center gap-4">
            <span className="flex items-center">
              <ClockIcon />
              <span className="ml-1">{charCount} characters</span>
            </span>
            {totalAttachments > 0 && (
              <span>
                {totalAttachments} file{totalAttachments !== 1 ? 's' : ''} attached
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isEditMode && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            <GradientButton type="submit" size="sm">
              {isEditMode ? 'Save Changes' : 'Post'}
            </GradientButton>
          </div>
        </div>
      </form>
    </BaseModal>
  );
}
