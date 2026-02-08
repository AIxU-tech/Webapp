/**
 * FileUpload Component
 * 
 * Drag-and-drop file upload area with preview support.
 * Used for attaching files to notes.
 * 
 * Features:
 * - Drag and drop support
 * - Click to browse
 * - File type validation
 * - Size validation
 * - Preview for images
 * - Progress indicator during upload
 * 
 * @component
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// File size constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

// Allowed file extensions
const ALLOWED_EXTENSIONS = new Set([
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
  // Documents
  'pdf', 'doc', 'docx', 'odt',
  // Spreadsheets
  'xls', 'xlsx', 'csv',
  // Presentations
  'ppt', 'pptx',
  // Text/Code
  'txt', 'md', 'html', 'css', 'js', 'json', 'xml',
  'py', 'java', 'c', 'cpp', 'h', 'rs', 'go', 'rb', 'ts', 'tsx', 'jsx',
  // Archives
  'zip', 'gz', 'tar',
]);

/**
 * Get file extension from filename
 */
function getExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Validate a single file
 */
function validateFile(file) {
  const ext = getExtension(file.name);

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File type .${ext} is not allowed` };
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `File is too large (${sizeMB} MB). Maximum is 10 MB.` };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get icon for file type
 */
function FileTypeIcon({ filename, className = '' }) {
  const ext = getExtension(filename);
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  const isPdf = ext === 'pdf';
  const isDoc = ['doc', 'docx', 'odt', 'txt', 'md'].includes(ext);
  const isSpreadsheet = ['xls', 'xlsx', 'csv'].includes(ext);
  const isCode = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'rs', 'go', 'rb', 'html', 'css', 'json', 'xml'].includes(ext);
  const isArchive = ['zip', 'gz', 'tar'].includes(ext);

  // Simple SVG icons
  if (isImage) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
  }

  if (isPdf) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M9 15h6" />
        <path d="M9 11h6" />
      </svg>
    );
  }

  if (isCode) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    );
  }

  if (isArchive) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 8v13H3V8" />
        <path d="M1 3h22v5H1z" />
        <path d="M10 12h4" />
      </svg>
    );
  }

  // Default document icon
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

/**
 * FileUpload Props
 * @typedef {Object} FileUploadProps
 * @property {File[]} files - Currently selected files
 * @property {Function} onChange - Called when files change, receives File[]
 * @property {number} [maxFiles=5] - Maximum number of files allowed
 * @property {boolean} [disabled=false] - Disable file selection
 * @property {string} [className] - Additional CSS classes
 */

export default function FileUpload({
  files = [],
  onChange,
  maxFiles = MAX_FILES,
  disabled = false,
  className = '',
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFiles = useCallback((newFiles) => {
    setError(null);

    // Convert FileList to array
    const fileArray = Array.from(newFiles);

    // Check total count
    if (files.length + fileArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate each file
    const validFiles = [];
    for (const file of fileArray) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error);
        return;
      }
      validFiles.push(file);
    }

    // Check for duplicates
    const existingNames = new Set(files.map(f => f.name));
    const uniqueFiles = validFiles.filter(f => !existingNames.has(f.name));

    if (uniqueFiles.length < validFiles.length) {
      setError('Some files were skipped (duplicate names)');
    }

    onChange([...files, ...uniqueFiles]);
  }, [files, maxFiles, onChange]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, [disabled, handleFiles]);

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    onChange(newFiles);
    setError(null);
  };

  const remainingSlots = maxFiles - files.length;

  return (
    <div className={className}>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <svg
          className="w-10 h-10 mx-auto mb-3 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>

        <p className="text-sm text-foreground mb-1">
          {isDragging ? 'Drop files here' : 'Drag files here or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground">
          {remainingSlots > 0
            ? `Up to ${remainingSlots} more file${remainingSlots !== 1 ? 's' : ''} (max 10 MB each)`
            : 'Maximum files reached'
          }
        </p>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, index) => (
            <FilePreview
              key={`${file.name}-${index}`}
              file={file}
              onRemove={() => removeFile(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * FilePreview - Shows a single file with preview and remove button
 */
function FilePreview({ file, onRemove, uploadProgress }) {
  const isImage = file.type.startsWith('image/');
  const [previewUrl, setPreviewUrl] = useState(null);

  // Generate preview URL for images
  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImage]);

  return (
    <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
      {/* Preview/Icon */}
      <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-background rounded overflow-hidden">
        {isImage && previewUrl ? (
          <img
            src={previewUrl}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileTypeIcon filename={file.name} className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>

        {/* Upload progress */}
        {typeof uploadProgress === 'number' && uploadProgress < 100 && (
          <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
          aria-label={`Remove ${file.name}`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Export FilePreview for use in other components
export { FilePreview, FileTypeIcon, formatSize, validateFile };
