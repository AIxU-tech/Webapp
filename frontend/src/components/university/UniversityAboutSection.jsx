/**
 * UniversityAboutSection
 *
 * Displays the university/club description with inline editing capability.
 * Adapted from the profile AboutSection with same edit behaviors.
 *
 * Edit behavior (optimistic auto-save model):
 * - Enter: saves changes and exits edit mode immediately
 * - Shift+Enter: creates a new line (normal textarea behavior)
 * - Click outside: saves changes and exits edit mode immediately
 * - ESC with changes: shows save/discard modal
 * - ESC without changes: exits edit mode
 * - Browser close/refresh with changes: shows native browser warning
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, IconButton, Alert } from '../ui';
import EmptyState from '../ui/EmptyState';
import { EditIcon } from '../icons';
import UnsavedChangesModal from '../UnsavedChangesModal';
import { useBeforeUnload, useClickOutside, useEscapeKey } from '../../hooks';

export default function UniversityAboutSection({
  description,
  canEdit,
  onSave,
}) {
  // Core editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(description || '');
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [error, setError] = useState(null);

  // Refs for DOM elements
  const textareaRef = useRef(null);
  const containerRef = useRef(null);

  // Determine if user has made changes
  const hasUnsavedChanges = isEditing && editValue !== (description || '');

  // Show browser warning on close/refresh with unsaved changes
  useBeforeUnload(hasUnsavedChanges);

  // Auto-focus textarea and place cursor at end when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);

  // Clear error when user starts editing again
  useEffect(() => {
    if (isEditing) {
      setError(null);
    }
  }, [isEditing]);

  // Save changes and exit edit mode (optimistic - exits immediately)
  const saveAndExit = useCallback(async () => {
    if (!onSave) return;

    if (editValue !== (description || '')) {
      const valueToSave = editValue;

      // Optimistic: exit immediately
      setIsEditing(false);

      try {
        await onSave(valueToSave);
      } catch (err) {
        // Revert: re-enter edit mode with the failed value
        console.error('Failed to save:', err);
        setEditValue(valueToSave);
        setIsEditing(true);
        setError('Failed to save changes. Please try again.');
      }
    } else {
      // No changes, just exit
      setIsEditing(false);
    }
  }, [editValue, description, onSave]);

  // Exit without saving (discard changes)
  const discardAndExit = useCallback(() => {
    setEditValue(description || '');
    setIsEditing(false);
    setShowDiscardModal(false);
  }, [description]);

  // Cancel the modal and stay in edit mode
  const cancelModal = useCallback(() => {
    setShowDiscardModal(false);
  }, []);

  // Save from modal (optimistic)
  const saveFromModal = useCallback(async () => {
    if (!onSave) return;

    const valueToSave = editValue;

    // Optimistic: close modal and exit edit mode immediately
    setShowDiscardModal(false);
    setIsEditing(false);

    try {
      await onSave(valueToSave);
    } catch (err) {
      // Revert: re-enter edit mode with the failed value
      console.error('Failed to save:', err);
      setEditValue(valueToSave);
      setIsEditing(true);
      setError('Failed to save changes. Please try again.');
    }
  }, [editValue, onSave]);

  // Click outside handler - auto-save
  useClickOutside(containerRef, saveAndExit, isEditing);

  // Handle ESC key
  const handleEscapeKey = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowDiscardModal(true);
    } else {
      setIsEditing(false);
    }
  }, [hasUnsavedChanges]);

  useEscapeKey(isEditing, handleEscapeKey);

  // Keyboard handlers
  const handleKeyDown = useCallback((e) => {
    // Enter (without Shift) saves and exits
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveAndExit();
    }
  }, [saveAndExit]);

  // Enter edit mode
  const handleStartEdit = useCallback(() => {
    setEditValue(description || '');
    setIsEditing(true);
  }, [description]);

  const hasContent = description && description.trim().length > 0;

  // Edit button - only shown when canEdit and not editing
  const editAction = canEdit && !isEditing && (
    <IconButton
      icon={EditIcon}
      onClick={handleStartEdit}
      variant="ghost"
      size="sm"
      label="Edit description"
    />
  );

  return (
    <>
      <Card padding="md">
        {/* Header with title and edit action */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-foreground">About</h3>
          {editAction}
        </div>

        {/* Error message if save failed */}
        {error && (
          <Alert
            variant="error"
            dismissible
            onDismiss={() => setError(null)}
            className="mb-4"
          >
            {error}
          </Alert>
        )}

        {isEditing ? (
          // Edit mode - textarea auto-saves on Enter or click outside
          <div ref={containerRef}>
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell others about your club..."
              rows={5}
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                         text-foreground placeholder-muted-foreground text-sm leading-relaxed
                         resize-none transition-all"
            />
            {/* Hint text for save behavior */}
            <p className="text-xs text-muted-foreground mt-2">
              Press <kbd className="px-1.5 py-0.5 bg-muted-foreground/10 rounded text-[10px] font-mono">Enter</kbd> to save
              {' · '}
              <kbd className="px-1.5 py-0.5 bg-muted-foreground/10 rounded text-[10px] font-mono">Esc</kbd> to cancel
            </p>
          </div>
        ) : hasContent ? (
          // Display mode - show the description text
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        ) : (
          // Empty state
          <EmptyState
            title={canEdit ? 'Add a description' : 'No description available'}
            description={
              canEdit
                ? 'Tell others about your club and what you do'
                : 'This club hasn\'t added a description yet.'
            }
            className="py-8"
          />
        )}
      </Card>

      {/* Modal shown only when ESC pressed with changes */}
      <UnsavedChangesModal
        isOpen={showDiscardModal}
        onSave={saveFromModal}
        onDiscard={discardAndExit}
        onCancel={cancelModal}
      />
    </>
  );
}
