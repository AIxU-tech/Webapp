/**
 * NoteAttachments Component
 * 
 * Displays file attachments for a note with:
 * - Image gallery/preview for image files
 * - Download links for non-image files
 * - File type icons
 * 
 * @component
 */

import { useState, useEffect, useCallback } from 'react';
import { FileTypeIcon } from '../ui/forms/FileUpload';

/**
 * NoteAttachments Props
 * @typedef {Object} NoteAttachmentsProps
 * @property {Array} attachments - Array of attachment objects with downloadUrl, filename, contentType, etc.
 */

export default function NoteAttachments({ attachments }) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  // Separate images from other files
  const images = attachments.filter(a => a.isImage);
  const files = attachments.filter(a => !a.isImage);

  return (
    <div className="mt-4 space-y-3">
      {/* Image Gallery */}
      {images.length > 0 && (
        <ImageGallery images={images} />
      )}

      {/* File List */}
      {files.length > 0 && (
        <FileList files={files} />
      )}
    </div>
  );
}

/**
 * ImageGallery - Displays images in a compact grid (256px tall) with lightbox for full-size view
 */
function ImageGallery({ images }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const isSingleImage = images.length === 1;

  const handlePrev = useCallback(() => {
    setSelectedIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const handleNext = useCallback(() => {
    setSelectedIndex((i) => (i < images.length - 1 ? i + 1 : i));
  }, [images.length]);

  const handleClose = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  return (
    <>
      <div
        className={`grid gap-2 ${isSingleImage ? 'grid-cols-1 max-w-2xl' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}
      >
        {images.map((image, index) => (
          <button
            key={image.id}
            onClick={() => setSelectedIndex(index)}
            className="relative w-full h-64 bg-muted rounded-lg overflow-hidden hover:opacity-90 transition-opacity cursor-pointer group"
          >
            <img
              src={image.downloadUrl}
              alt={image.filename}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Filename overlay on hover */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-xs truncate">{image.filename}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <ImageLightbox
          image={images[selectedIndex]}
          onClose={handleClose}
          onPrev={selectedIndex > 0 ? handlePrev : null}
          onNext={selectedIndex < images.length - 1 ? handleNext : null}
        />
      )}
    </>
  );
}

/**
 * ImageLightbox - Full-screen image viewer with keyboard navigation
 *
 * @param {Object} props
 * @param {Object} props.image - Current image object with downloadUrl, filename
 * @param {Function} props.onClose - Callback to close lightbox
 * @param {Function|null} props.onPrev - Callback for previous image (null if at start)
 * @param {Function|null} props.onNext - Callback for next image (null if at end)
 */
function ImageLightbox({ image, onClose, onPrev, onNext }) {
  // Keyboard navigation: ESC to close, arrows to navigate
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (onPrev) onPrev();
          break;
        case 'ArrowRight':
          if (onNext) onNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
        aria-label="Close"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Previous button */}
      {onPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          aria-label="Previous image"
        >
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Next button */}
      {onNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          aria-label="Next image"
        >
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Image */}
      <img
        src={image.downloadUrl}
        alt={image.filename}
        className="max-w-full max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Download link */}
      <a
        href={image.downloadUrl}
        download={image.filename}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download
      </a>
    </div>
  );
}

/**
 * FileList - Displays non-image files as download links
 */
function FileList({ files }) {
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((file) => (
        <a
          key={file.id}
          href={file.downloadUrl}
          download={file.filename}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors group"
        >
          <FileTypeIcon filename={file.filename} className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate max-w-[200px]">{file.filename}</p>
            <p className="text-xs text-muted-foreground">{file.sizeFormatted}</p>
          </div>
          <svg
            className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </a>
      ))}
    </div>
  );
}
