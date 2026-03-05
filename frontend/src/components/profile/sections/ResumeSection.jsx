/**
 * ResumeSection
 *
 * Profile section for uploading, viewing, and deleting a resume.
 * Only the profile owner can upload/delete; authenticated visitors
 * can view and download.
 *
 * Upload flow:
 *   1. User selects or drags a file (PDF, DOC, DOCX, ≤5 MB)
 *   2. Optimistic update shows file immediately
 *   3. File is uploaded to GCS via signed URL
 *   4. Backend is notified to persist metadata
 */

import { useState, useRef, useCallback } from 'react';
import ProfileSection from './ProfileSection';
import { Alert, ConfirmationModal, IconButton } from '../../ui';
import { FileTextIcon, UploadIcon, TrashIcon } from '../../icons';
import { useAuthModal } from '../../../contexts/AuthModalContext';

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

export default function ResumeSection({
  resume,
  isOwnProfile,
  isAuthenticated,
  isLoading,
  onUpload,
  onDelete,
  isDeleting,
}) {
  const fileInputRef = useRef(null);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { openAuthModal } = useAuthModal();

  const handleFile = useCallback(
    (file) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      onUpload(file);
    },
    [onUpload]
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

  const handleDelete = useCallback(() => {
    setShowDeleteModal(false);
    setError(null);
    onDelete();
  }, [onDelete]);

  // Hidden file input (shared by empty state and replace action)
  const fileInput = isOwnProfile && (
    <input
      ref={fileInputRef}
      type="file"
      accept={ACCEPTED_EXTENSIONS}
      className="hidden"
      onChange={handleFileSelect}
    />
  );

  // Replace button in section header (only when resume exists)
  const action = isOwnProfile && resume && (
    <>
      {fileInput}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
      >
        Replace
      </button>
    </>
  );

  return (
    <>
      <ProfileSection title="Resume" action={action}>
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

        {!isAuthenticated && !isOwnProfile ? (
          /* Unauthenticated visitor */
          <div className="flex flex-col items-center py-8 text-center">
            <FileTextIcon className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Sign in to view this user&apos;s resume
            </p>
            <button
              onClick={() => openAuthModal('login')}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              Log in
            </button>
          </div>
        ) : resume ? (
          /* Resume exists — clickable card */
          <a
            href={resume.downloadUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors"
            onClick={(e) => {
              if (!resume.downloadUrl || resume.isOptimistic) e.preventDefault();
            }}
          >
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center relative">
              <FileTextIcon className="h-5 w-5 text-primary" />
              {resume.isOptimistic && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {resume.filename}
              </p>
              <p className="text-xs text-muted-foreground">
                {resume.sizeFormatted}
                {resume.createdAt &&
                  ` · Uploaded ${new Date(resume.createdAt).toLocaleDateString()}`}
              </p>
            </div>

            {isOwnProfile && (
              <IconButton
                icon={TrashIcon}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDeleteModal(true);
                }}
                variant="ghost"
                size="sm"
                label="Delete resume"
                disabled={isDeleting}
                className="text-muted-foreground hover:text-destructive"
              />
            )}
          </a>
        ) : isLoading ? (
          /* Loading */
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isOwnProfile ? (
          /* Empty state — clickable drop zone */
          <>
            {fileInput}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                flex flex-col items-center justify-center py-8 cursor-pointer
                border-2 border-dashed rounded-lg transition-colors
                ${isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
                }
              `}
            >
              <UploadIcon className="h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground">Upload your resume</p>
              <p className="text-xs text-muted-foreground mt-1">PDF or Word, up to 5 MB</p>
            </div>
          </>
        ) : (
          /* Non-owner, no resume */
          <div className="flex flex-col items-center py-8 text-center">
            <FileTextIcon className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              This user hasn&apos;t uploaded a resume yet.
            </p>
          </div>
        )}
      </ProfileSection>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Resume"
        message="Are you sure you want to delete your resume? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
