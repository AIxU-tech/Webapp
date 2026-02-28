/**
 * ResumeSection
 *
 * Profile section for uploading, viewing, and deleting a resume.
 * Only the profile owner can upload/delete; authenticated visitors
 * can view and download.
 *
 * Upload flow:
 *   1. User selects a file (PDF, DOC, DOCX, ≤5 MB)
 *   2. File is uploaded to GCS via signed URL (reuses existing upload infra)
 *   3. Backend is notified to persist metadata (replaces any existing resume)
 */

import { useState, useRef, useCallback } from 'react';
import ProfileSection from './ProfileSection';
import { EmptyState, Alert, ConfirmationModal, IconButton } from '../../ui';
import { FileTextIcon, UploadIcon, TrashIcon } from '../../icons';
import { useAuthModal } from '../../../contexts/AuthModalContext';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx';
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export default function ResumeSection({
  resume,
  isOwnProfile,
  isAuthenticated,
  isLoading,
  onUpload,
  onDelete,
  uploadProgress,
  isUploading,
  isDeleting,
}) {
  const fileInputRef = useRef(null);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openAuthModal } = useAuthModal();

  const handleFileSelect = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input so re-selecting the same file triggers onChange
      e.target.value = '';

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Please upload a PDF or Word document.');
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        setError('File size must be under 5 MB.');
        return;
      }

      setError(null);
      onUpload(file);
    },
    [onUpload]
  );

  const handleDelete = useCallback(() => {
    setShowDeleteModal(false);
    setError(null);
    onDelete();
  }, [onDelete]);

  const action = isOwnProfile && (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={handleFileSelect}
      />
      <IconButton
        icon={UploadIcon}
        onClick={() => fileInputRef.current?.click()}
        variant="ghost"
        size="sm"
        label={resume ? 'Replace resume' : 'Upload resume'}
        disabled={isUploading}
      />
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

        {isUploading && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
              <span>Uploading...</span>
              {uploadProgress != null && <span>{uploadProgress}%</span>}
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress ?? 0}%` }}
              />
            </div>
          </div>
        )}

        {!isAuthenticated && !isOwnProfile ? (
          <div className="flex flex-col items-center py-8 text-center">
            <FileTextIcon className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Sign in to view this user's resume
            </p>
            <button
              onClick={() => openAuthModal('login')}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              Log in
            </button>
          </div>
        ) : resume ? (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileTextIcon className="h-5 w-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {resume.filename}
              </p>
              <p className="text-xs text-muted-foreground">
                {resume.sizeFormatted}
                {resume.createdAt &&
                  ` · Uploaded ${new Date(resume.createdAt).toLocaleDateString()}`}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {resume.downloadUrl && (
                <a
                  href={resume.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary
                             bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
                >
                  View
                </a>
              )}
              {isOwnProfile && (
                <IconButton
                  icon={TrashIcon}
                  onClick={() => setShowDeleteModal(true)}
                  variant="ghost"
                  size="sm"
                  label="Delete resume"
                  disabled={isDeleting}
                  className="text-muted-foreground hover:text-destructive"
                />
              )}
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <EmptyState
            title={isOwnProfile ? 'Upload your resume' : 'No resume uploaded'}
            description={
              isOwnProfile
                ? 'Share your resume with recruiters and other members. PDF or Word, up to 5 MB.'
                : "This user hasn't uploaded a resume yet."
            }
            className="py-8"
          />
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
