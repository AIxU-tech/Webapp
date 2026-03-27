/**
 * BannerUploadModal Component
 *
 * Modal for uploading banner images. Handles file selection,
 * validation, cropping, and upload with optimistic preview.
 *
 * @param {boolean} isOpen - Whether modal is open
 * @param {function} onClose - Callback to close modal
 * @param {function} onUpload - Callback with { blob, previewUrl } for optimistic update
 * @param {boolean} isUploading - Whether upload is in progress
 * @param {string} title - Modal title
 */

import { useState, useRef } from 'react';
import { BaseModal } from '../modals';
import { GradientButton, SecondaryButton, ResetButton } from '../buttons';
import { validateImageFile, cropImageToBanner, BANNER_CONFIG } from '../../../utils/image';
import { CameraIcon } from '../../icons';

export default function BannerUploadModal({
  isOpen,
  onClose,
  onUpload,
  onReset,
  hasExistingImage = false,
  isUploading = false,
  isResetting = false,
  title = 'Update Banner Image',
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  // Reset all state when modal closes
  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    setIsProcessing(false);
    onClose();
  };

  // Handle file selection
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle upload with optimistic preview
  const handleUpload = async () => {
    if (!selectedFile) return;

    setError(null);
    setIsProcessing(true);

    try {
      // Crop image to banner dimensions
      const croppedBlob = await cropImageToBanner(selectedFile);

      // Create a preview URL from the cropped blob for optimistic update
      const previewUrl = URL.createObjectURL(croppedBlob);

      // Close modal immediately for optimistic UX
      handleClose();

      // Call parent upload handler with blob and preview URL
      // Parent can show previewUrl immediately while upload happens
      await onUpload({ blob: croppedBlob, previewUrl });
    } catch (err) {
      setError(err.message || 'Failed to process image');
      setIsProcessing(false);
    }
  };

  const isLoading = isUploading || isProcessing;

  const handleReset = () => {
    handleClose();
    onReset?.();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="lg"
    >
      <div className="p-6 space-y-6">
        {/* Preview Area */}
        <div
          className="relative w-full h-40 bg-muted rounded-lg overflow-hidden flex items-center justify-center cursor-pointer border-2 border-dashed border-border hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {preview ? (
            <img
              src={preview}
              alt="Banner preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <CameraIcon className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">Click to select an image</p>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={BANNER_CONFIG.acceptedTypes}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Info text */}
        <p className="text-xs text-muted-foreground">
          Images will be automatically cropped to fit the banner area (5:1 aspect ratio)
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Reset button - left side */}
          {hasExistingImage && onReset && (
            <ResetButton
              onClick={handleReset}
              disabled={isLoading}
              loading={isResetting}
              title="Reset to default"
            >
              Reset
            </ResetButton>
          )}
          <div className="flex-1" />
          <SecondaryButton
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </SecondaryButton>
          <GradientButton
            onClick={handleUpload}
            disabled={!selectedFile || isLoading}
            loading={isLoading}
            loadingText="Processing..."
          >
            Upload Banner
          </GradientButton>
        </div>
      </div>
    </BaseModal>
  );
}
