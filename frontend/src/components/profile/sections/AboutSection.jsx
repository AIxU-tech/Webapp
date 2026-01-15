/**
 * AboutSection
 *
 * Displays the user's bio/about section with inline editing capability.
 *
 * Edit behavior (optimistic auto-save model):
 * - Enter: saves changes and exits edit mode immediately
 * - Shift+Enter: creates a new line (normal textarea behavior)
 * - Click outside: saves changes and exits edit mode immediately
 * - ESC with changes: shows save/discard modal
 * - ESC without changes: exits edit mode
 * - Cmd+Z: native browser undo within textarea
 * - Browser close/refresh with changes: shows native browser warning
 *
 * Uses optimistic updates - exits immediately on save, reverts if save fails.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import ProfileSection from './ProfileSection';
import EmptyState from '../../ui/EmptyState';
import { IconButton, Alert } from '../../ui';
import { EditIcon } from '../../icons';
import UnsavedChangesModal from '../../UnsavedChangesModal';
import { useBeforeUnload, useClickOutside, useEscapeKey } from '../../../hooks';

export default function AboutSection({
  aboutText,
  isOwnProfile,
  onSave,
}) {
  // Core editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(aboutText || '');
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [error, setError] = useState(null);

  // Refs for DOM elements
  const textareaRef = useRef(null);
  const containerRef = useRef(null);

  // Determine if user has made changes
  const hasUnsavedChanges = isEditing && editValue !== (aboutText || '');

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

  // ─────────────────────────────────────────────────────────────────────────────
  // Save and Exit Handlers (Optimistic Updates)
  // ─────────────────────────────────────────────────────────────────────────────

  // Save changes and exit edit mode (optimistic - exits immediately)
  const saveAndExit = useCallback(async () => {
    if (!onSave) return;

    // Only save if there are actual changes
    if (editValue !== (aboutText || '')) {
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
  }, [editValue, aboutText, onSave]);

  // Exit without saving (discard changes)
  const discardAndExit = useCallback(() => {
    setEditValue(aboutText || '');
    setIsEditing(false);
    setShowDiscardModal(false);
  }, [aboutText]);

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

  // ─────────────────────────────────────────────────────────────────────────────
  // Click Outside Handler - Auto-save when clicking outside the edit area
  // ─────────────────────────────────────────────────────────────────────────────

  useClickOutside(containerRef, saveAndExit, isEditing);

  // Handle ESC key at document level (works even if textarea loses focus)
  const handleEscapeKey = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowDiscardModal(true);
    } else {
      setIsEditing(false);
    }
  }, [hasUnsavedChanges]);

  useEscapeKey(isEditing, handleEscapeKey);

  // ─────────────────────────────────────────────────────────────────────────────
  // Keyboard Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e) => {
    // Enter (without Shift) saves and exits
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveAndExit();
    }
    // Shift+Enter, Cmd+Z, etc. are handled natively by the textarea
    // ESC is handled at document level via useEscapeKey
  }, [saveAndExit]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Enter Edit Mode
  // ─────────────────────────────────────────────────────────────────────────────

  const handleStartEdit = useCallback(() => {
    setEditValue(aboutText || '');
    setIsEditing(true);
  }, [aboutText]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  const hasContent = aboutText && aboutText.trim().length > 0;

  // Edit button - only shown on own profile when not editing
  const editAction = isOwnProfile && !isEditing && (
    <IconButton
      icon={EditIcon}
      onClick={handleStartEdit}
      variant="ghost"
      size="sm"
      label="Edit about"
    />
  );

  return (
    <>
      <ProfileSection title="About" action={editAction}>
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
              placeholder="Tell others about yourself..."
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
          // Display mode - show the about text
          <p className="text-sm text-foreground/70 whitespace-pre-wrap leading-relaxed">
            {aboutText}
          </p>
        ) : (
          // Empty state
          <EmptyState
            title={isOwnProfile ? 'Share your story' : 'No bio yet'}
            description={
              isOwnProfile
                ? 'Tell others about yourself and your AI journey'
                : 'This user hasn\'t added a bio yet.'
            }
            className="py-8"
          />
        )}
      </ProfileSection>

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
