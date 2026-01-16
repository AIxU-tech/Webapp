/**
 * UnsavedChangesModal
 *
 * A confirmation modal for handling unsaved changes when user presses ESC
 * or attempts to navigate away with pending edits.
 *
 * Follows the ConfirmationModal pattern with three actions:
 * - Save: Save changes and exit
 * - Discard: Discard changes and exit
 * - Cancel (X/ESC/backdrop): Return to editing
 *
 * @component
 *
 * @example
 * <UnsavedChangesModal
 *   isOpen={showModal}
 *   onSave={handleSave}
 *   onDiscard={handleDiscard}
 *   onCancel={() => setShowModal(false)}
 * />
 */

import { AlertTriangleIcon } from './icons';
import { CloseButton } from './ui';
import { useEscapeKey, useScrollLock } from '../hooks';

export default function UnsavedChangesModal({
  isOpen = false,
  onSave,
  onDiscard,
  onCancel,
}) {
  // ESC on the modal returns to editing
  useEscapeKey(isOpen, onCancel);
  useScrollLock(isOpen);

  // Click outside modal returns to editing
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-changes-title"
      aria-describedby="unsaved-changes-description"
    >
      {/* Modal Container */}
      <div className="bg-card border border-border rounded-xl shadow-card w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            {/* Warning Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangleIcon className="h-5 w-5 text-amber-600" />
            </div>

            {/* Title */}
            <h3
              id="unsaved-changes-title"
              className="text-lg font-semibold text-foreground pt-1"
            >
              Unsaved changes
            </h3>
          </div>

          {/* Close Button */}
          <CloseButton
            onClick={onCancel}
            ariaLabel="Return to editing"
            className="-mt-1 -mr-1"
          />
        </div>

        {/* Message */}
        <p
          id="unsaved-changes-description"
          className="text-sm text-muted-foreground mb-6"
        >
          You have unsaved changes. Would you like to save them before leaving?
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          {/* Discard Button */}
          <button
            type="button"
            onClick={onDiscard}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground
                       border border-border bg-background rounded-lg hover:bg-accent
                       transition-colors font-medium"
          >
            Discard
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={onSave}
            className="px-4 py-2 text-sm rounded-lg transition-colors font-medium
                       bg-amber-600 hover:bg-amber-700 text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
