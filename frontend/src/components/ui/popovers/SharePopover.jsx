/**
 * SharePopover Component
 *
 * Popover menu for sharing notes/posts. Displays the shareable URL
 * and provides a copy button. Designed to be easily extended with
 * social sharing buttons in the future.
 *
 * @component
 *
 * @example
 * <SharePopover
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   noteId={note.id}
 *   onCopySuccess={() => setShowToast(true)}
 * />
 */

import { useRef, useEffect, useState } from 'react';
import { useClickOutside, useEscapeKey, useClipboard } from '../../../hooks';
import { CopyIcon, CheckIcon } from '../../icons';

export default function SharePopover({
  isOpen,
  onClose,
  noteId,
  onCopySuccess,
}) {
  const popoverRef = useRef(null);
  const { copy, isCopied } = useClipboard();
  const [url, setUrl] = useState('');

  // Close on click outside
  useClickOutside(popoverRef, onClose, isOpen);

  // Close on escape key
  useEscapeKey(isOpen, onClose);

  // Generate URL when popover opens
  useEffect(() => {
    if (isOpen && noteId) {
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/app/notes/${noteId}`;
      setUrl(shareUrl);
    }
  }, [isOpen, noteId]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    await copy(url);
    if (onCopySuccess) {
      onCopySuccess();
    }
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/20 z-40 sm:hidden" aria-hidden="true" />
    <div
      ref={popoverRef}
      className="fixed left-3 right-3 top-1/2 -translate-y-1/2 sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-1 sm:translate-y-0 z-50 sm:min-w-[320px] bg-card border border-border rounded-lg shadow-lg p-4 animate-in fade-in zoom-in-95 duration-100"
      role="dialog"
      aria-labelledby="share-popover-title"
    >
      {/* Header */}
      <div className="mb-3">
        <h3 id="share-popover-title" className="text-sm font-semibold text-foreground">
          Share this note
        </h3>
      </div>

      {/* URL Display */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Link
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={url}
            readOnly
            className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            onClick={(e) => e.target.select()}
          />
          <button
            onClick={handleCopy}
            className={`flex items-center justify-center w-9 h-9 rounded-md transition-colors cursor-pointer ${isCopied
              ? 'bg-green-500/10 text-green-600'
              : 'bg-accent text-foreground hover:bg-accent/80'
              }`}
            aria-label={isCopied ? 'Copied!' : 'Copy link'}
            title={isCopied ? 'Copied!' : 'Copy link'}
          >
            {isCopied ? (
              <CheckIcon className="h-4 w-4" />
            ) : (
              <CopyIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Placeholder for future social sharing buttons */}
      {/* <div className="pt-3 border-t border-border">
        <div className="text-xs text-muted-foreground mb-2">Share to:</div>
        <div className="flex gap-2">
          Social buttons will go here
        </div>
      </div> */}
    </div>
    </>
  );
}

