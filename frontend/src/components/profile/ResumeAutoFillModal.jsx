/**
 * ResumeAutoFillModal
 *
 * Shown to new users after signup on the community page.
 * Prompts them to upload a resume to auto-fill their profile.
 *
 * Features:
 * - Drag-and-drop file upload (PDF/Word, max 5 MB)
 * - Uploads to GCS, confirms with backend, triggers parsing
 * - Dismisses immediately after upload starts
 * - Skip button to dismiss without uploading
 */

import { useState, useRef, useCallback } from 'react';
import { BaseModal } from '../ui';
import { UploadIcon, FileTextIcon } from '../icons';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx';
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function validateFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Please upload a PDF or Word document.';
  }
  if (file.size > MAX_SIZE_BYTES) {
    return 'File size must be under 5 MB.';
  }
  return null;
}

export default function ResumeAutoFillModal({ isOpen, onClose, onUpload }) {
  const fileInputRef = useRef(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      onUpload(file);
      onClose();
    },
    [onUpload, onClose]
  );

  const handleFileSelect = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';
      handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Auto-Fill Your Profile"
      size="md"
    >
      <div className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload your resume and we&apos;ll use AI to automatically fill in your
          education, experience, projects, skills, and more
        </p>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            flex flex-col items-center justify-center py-10 cursor-pointer
            border-2 border-dashed rounded-lg transition-colors
            ${isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
            }
          `}
        >
          <UploadIcon className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground">
            Drag your resume here or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF or Word, up to 5 MB
          </p>
        </div>

        {/* Skip button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Skip for now
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
