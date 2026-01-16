/**
 * ProfilePictureSection Component
 *
 * Handles profile picture display and upload with automatic center-cropping.
 * When a user uploads an image, it's automatically cropped to a square from
 * the center to prevent distortion in the circular avatar display.
 *
 * @component
 *
 * @param {Object} props
 * @param {Object} props.user - User object with profile picture info
 * @param {Function} props.onUpload - Callback when image is ready to upload (receives blob)
 * @param {Function} [props.onError] - Callback for validation/processing errors (receives message)
 * @param {boolean} [props.isUploading=false] - Whether upload is in progress
 *
 * @example
 * <ProfilePictureSection
 *   user={user}
 *   onUpload={handleUpload}
 *   onError={handleError}
 *   isUploading={isUploading}
 * />
 */

import { useRef, useState } from 'react';
import { CameraIcon, UploadIcon } from '../icons';
import { GradientButton, Avatar } from '../ui';
import { IMAGE_CONFIG, cropImageToSquare, validateImageFile } from '../../utils';

export default function ProfilePictureSection({
  user,
  onUpload,
  onError,
  isUploading = false,
}) {
  const fileInputRef = useRef(null);

  // Key to force file input remount after each upload attempt
  const [inputKey, setInputKey] = useState(0);

  /**
   * Trigger file input click
   */
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Handle file selection, validate, crop, and upload
   */
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      onError?.(validation.error);
      setInputKey((k) => k + 1);
      return;
    }

    try {
      // Auto-crop to square and upload
      const croppedBlob = await cropImageToSquare(file);
      await onUpload(croppedBlob);
    } catch (error) {
      console.error('Error processing image:', error);
      onError?.('Failed to process image. Please try again.');
    } finally {
      // Always reset input to allow selecting the same file again
      setInputKey((k) => k + 1);
    }
  };

  return (
    <div className="mb-6 p-4 bg-muted/30 rounded-lg">
      <h4 className="text-md font-semibold text-foreground mb-3">
        Profile Picture
      </h4>

      <div className="flex items-center gap-4">
        {/* Avatar with hover overlay */}
        <div className="relative group">
          <Avatar
            user={user}
            size="xl"
            className="border-2 border-border"
          />
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={isUploading}
            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            aria-label="Change profile picture"
          >
            <CameraIcon className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Upload controls */}
        <div className="flex-1">
          <p className="text-sm text-foreground font-medium mb-1">
            Upload a new photo
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            JPG, PNG or GIF. Max size 5MB. Image will be cropped to square.
          </p>

          <GradientButton
            size="sm"
            icon={<UploadIcon />}
            onClick={handleUploadClick}
            loading={isUploading}
            loadingText="Uploading..."
          >
            Choose File
          </GradientButton>
        </div>
      </div>

      {/* Hidden file input - key forces remount to reset state */}
      <input
        key={inputKey}
        ref={fileInputRef}
        type="file"
        accept={IMAGE_CONFIG.acceptedTypes}
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}
