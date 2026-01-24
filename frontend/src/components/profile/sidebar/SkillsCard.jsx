/**
 * SkillsCard
 *
 * Displays user skills with full inline editing capability.
 * Users can type a skill and press Enter to add it, click X to remove.
 *
 * Edit behavior (matches AboutSection pattern):
 * - Enter: adds typed skill to list (if input has value) or saves changes (if empty)
 * - Click outside: saves changes and exits edit mode
 * - ESC with changes: shows save/discard modal
 * - ESC without changes: exits edit mode
 * - Browser close with changes: shows native browser warning
 *
 * Uses optimistic updates - exits immediately on save, reverts if save fails.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, EmptyState, IconButton, Alert, UnsavedChangesModal } from '../../ui';
import { CodeIcon, EditIcon, XIcon } from '../../icons';
import { useBeforeUnload, useClickOutside, useEscapeKey } from '../../../hooks';

// ─────────────────────────────────────────────────────────────────────────────
// Validation Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_SKILLS = 15;
const MAX_SKILL_LENGTH = 30;
// Allow letters, numbers, spaces, hyphens, plus, dots, hash (e.g., "C++", "Node.js", "C#")
const VALID_SKILL_PATTERN = /^[a-zA-Z0-9\s\-+.#]+$/;

export default function SkillsCard({ skills = [], isOwnProfile, onSave }) {
  // ─────────────────────────────────────────────────────────────────────────────
  // Core State
  // ─────────────────────────────────────────────────────────────────────────────

  const [isEditing, setIsEditing] = useState(false);
  const [editSkills, setEditSkills] = useState([]); // Local copy during editing
  const [inputValue, setInputValue] = useState('');
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [error, setError] = useState(null); // API error
  const [validationError, setValidationError] = useState(null); // Input validation

  // ─────────────────────────────────────────────────────────────────────────────
  // Refs
  // ─────────────────────────────────────────────────────────────────────────────

  const containerRef = useRef(null); // For click outside detection
  const inputRef = useRef(null); // For auto-focus

  // ─────────────────────────────────────────────────────────────────────────────
  // Derived State
  // ─────────────────────────────────────────────────────────────────────────────

  const hasSkills = skills && skills.length > 0;

  // Check if skills have changed from original (for unsaved changes detection)
  const hasUnsavedChanges =
    isEditing && JSON.stringify(editSkills) !== JSON.stringify(skills || []);

  // Show browser warning on close/refresh with unsaved changes
  useBeforeUnload(hasUnsavedChanges);

  // ─────────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────────

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Clear API error when user starts editing again
  useEffect(() => {
    if (isEditing) {
      setError(null);
    }
  }, [isEditing]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Enter Edit Mode
  // ─────────────────────────────────────────────────────────────────────────────

  const handleStartEdit = useCallback(() => {
    // Copy current skills to local state for editing
    setEditSkills([...(skills || [])]);
    setInputValue('');
    setIsEditing(true);
    setError(null);
    setValidationError(null);
  }, [skills]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Add Skill (with validation)
  // ─────────────────────────────────────────────────────────────────────────────

  const addSkill = useCallback(
    (skillText) => {
      const trimmed = skillText.trim();

      // Empty check
      if (!trimmed) return false;

      // Length validation
      if (trimmed.length > MAX_SKILL_LENGTH) {
        setValidationError(`Skills must be ${MAX_SKILL_LENGTH} characters or less`);
        return false;
      }

      // Character validation
      if (!VALID_SKILL_PATTERN.test(trimmed)) {
        setValidationError(
          'Skills can only contain letters, numbers, spaces, and .-+#'
        );
        return false;
      }

      // Duplicate check (case-insensitive)
      const isDuplicate = editSkills.some(
        (s) => s.toLowerCase() === trimmed.toLowerCase()
      );
      if (isDuplicate) {
        setValidationError('This skill is already added');
        return false;
      }

      // Max skills check
      if (editSkills.length >= MAX_SKILLS) {
        setValidationError(`Maximum ${MAX_SKILLS} skills allowed`);
        return false;
      }

      // Add the skill
      setEditSkills((prev) => [...prev, trimmed]);
      setValidationError(null);
      return true;
    },
    [editSkills]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Remove Skill
  // ─────────────────────────────────────────────────────────────────────────────

  const removeSkill = useCallback((skillToRemove) => {
    setEditSkills((prev) => prev.filter((s) => s !== skillToRemove));
    setValidationError(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Save and Exit (Optimistic Updates)
  // ─────────────────────────────────────────────────────────────────────────────

  const saveAndExit = useCallback(async () => {
    if (!onSave) return;

    // Only save if there are actual changes
    if (hasUnsavedChanges) {
      const skillsToSave = [...editSkills];

      // Optimistic: exit immediately
      setIsEditing(false);
      setInputValue('');

      try {
        await onSave(skillsToSave);
      } catch (err) {
        // Revert: re-enter edit mode with the failed value
        console.error('Failed to save skills:', err);
        setEditSkills(skillsToSave);
        setIsEditing(true);
        setError('Failed to save skills. Please try again.');
      }
    } else {
      // No changes, just exit
      setIsEditing(false);
      setInputValue('');
    }
  }, [editSkills, hasUnsavedChanges, onSave]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Discard and Exit
  // ─────────────────────────────────────────────────────────────────────────────

  const discardAndExit = useCallback(() => {
    setEditSkills([...(skills || [])]);
    setIsEditing(false);
    setInputValue('');
    setShowDiscardModal(false);
    setValidationError(null);
  }, [skills]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Modal Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const cancelModal = useCallback(() => {
    setShowDiscardModal(false);
  }, []);

  const saveFromModal = useCallback(async () => {
    if (!onSave) return;

    const skillsToSave = [...editSkills];

    // Optimistic: close modal and exit edit mode immediately
    setShowDiscardModal(false);
    setIsEditing(false);
    setInputValue('');

    try {
      await onSave(skillsToSave);
    } catch (err) {
      // Revert: re-enter edit mode with the failed value
      console.error('Failed to save skills:', err);
      setEditSkills(skillsToSave);
      setIsEditing(true);
      setError('Failed to save skills. Please try again.');
    }
  }, [editSkills, onSave]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Click Outside Handler - Auto-save when clicking outside the edit area
  // ─────────────────────────────────────────────────────────────────────────────

  useClickOutside(containerRef, saveAndExit, isEditing);

  // ─────────────────────────────────────────────────────────────────────────────
  // ESC Key Handler
  // ─────────────────────────────────────────────────────────────────────────────

  const handleEscapeKey = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowDiscardModal(true);
    } else {
      setIsEditing(false);
      setInputValue('');
    }
  }, [hasUnsavedChanges]);

  useEscapeKey(isEditing, handleEscapeKey);

  // ─────────────────────────────────────────────────────────────────────────────
  // Keyboard Handler for Input
  // ─────────────────────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();

        if (inputValue.trim()) {
          // Add the skill and clear input
          if (addSkill(inputValue)) {
            setInputValue('');
          }
        } else {
          // Empty input + Enter = save and exit
          saveAndExit();
        }
      }
      // ESC is handled at document level via useEscapeKey
    },
    [inputValue, addSkill, saveAndExit]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Card padding="md" hover={false}>
        {/* Header with title and edit button */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Skills</h3>
          {isOwnProfile && !isEditing && (
            <IconButton
              icon={EditIcon}
              onClick={handleStartEdit}
              variant="ghost"
              size="sm"
              label="Edit skills"
            />
          )}
        </div>

        {/* Error alert if save failed */}
        {error && (
          <Alert
            variant="error"
            dismissible
            onDismiss={() => setError(null)}
            className="mb-3"
          >
            {error}
          </Alert>
        )}

        {isEditing ? (
          /* ═══════════════════════════════════════════════════════════════════
           * EDIT MODE
           * ═══════════════════════════════════════════════════════════════════ */
          <div ref={containerRef}>
            {/* Skills list with remove buttons */}
            {editSkills.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {editSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm
                               bg-gradient-to-r from-primary/10 to-accent/10
                               text-foreground rounded-full"
                  >
                    {skill}
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="p-0.5 rounded-full hover:bg-foreground/10
                                 transition-colors"
                      aria-label={`Remove ${skill}`}
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input for adding new skills */}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setValidationError(null); // Clear error on input change
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a skill and press Enter..."
              maxLength={MAX_SKILL_LENGTH}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-ring
                         focus:border-transparent text-sm placeholder-muted-foreground
                         transition-all"
            />

            {/* Validation error display */}
            {validationError && (
              <p className="text-xs text-red-500 mt-1.5">{validationError}</p>
            )}

            {/* Skills count */}
            <p className="text-xs text-muted-foreground mt-1">
              {editSkills.length}/{MAX_SKILLS} skills
            </p>
          </div>
        ) : hasSkills ? (
          /* ═══════════════════════════════════════════════════════════════════
           * DISPLAY MODE - Has Skills
           * ═══════════════════════════════════════════════════════════════════ */
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1.5 text-sm bg-gradient-to-r from-primary/10
                           to-accent/10 text-foreground rounded-full
                           hover:from-primary/20 hover:to-accent/20 transition-colors"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════════
           * DISPLAY MODE - Empty State
           * ═══════════════════════════════════════════════════════════════════ */
          <EmptyState
            icon={<CodeIcon className="h-8 w-8" />}
            title={isOwnProfile ? 'Add your skills' : 'No skills listed'}
            description={
              isOwnProfile ? 'Showcase your technical abilities.' : undefined
            }
            className="py-6"
          />
        )}
      </Card>

      {/* Unsaved changes modal - shown when ESC pressed with changes */}
      <UnsavedChangesModal
        isOpen={showDiscardModal}
        onSave={saveFromModal}
        onDiscard={discardAndExit}
        onCancel={cancelModal}
      />
    </>
  );
}
