/**
 * UniversityLogoSection Component
 *
 * Handles university logo display and upload with automatic center-cropping.
 * Adapted from ProfilePictureSection with university-specific styling.
 *
 * @component
 */

import { useRef, useState } from 'react';
import { CameraIcon, UploadIcon, UniversitiesIcon } from '../icons';
import { GradientButton } from '../ui';
import { getUniversityLogoUrl } from '../../api/universities';
import { IMAGE_CONFIG, cropImageToSquare, validateImageFile } from '../../utils';

export default function UniversityLogoSection({
  university,
  onUpload,
  onError,
  isUploading = false,
}) {
  const fileInputRef = useRef(null);
  const [inputKey, setInputKey] = useState(0);
  const [cacheKey, setCacheKey] = useState(Date.now());

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

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
      const croppedBlob = await cropImageToSquare(file);
      await onUpload(croppedBlob);
      // Bust browser cache for the logo image
      setCacheKey(Date.now());
    } catch (error) {
      console.error('Error processing image:', error);
      onError?.('Failed to process image. Please try again.');
    } finally {
      setInputKey((k) => k + 1);
    }
  };

  return (
    <div className="mb-6 p-4 bg-muted/30 rounded-lg">
      <h4 className="text-md font-semibold text-foreground mb-3">
        Club Logo
      </h4>

      <div className="flex items-center gap-4">
        {/* Logo with hover overlay */}
        <div className="relative group">
          {university.hasLogo ? (
            <img
              src={getUniversityLogoUrl(university.id, cacheKey)}
              alt={`${university.clubName} logo`}
              className="w-20 h-20 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-20 h-20 rounded-full border-2 border-border bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] flex items-center justify-center">
              <UniversitiesIcon className="h-10 w-10 text-white" />
            </div>
          )}
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={isUploading}
            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            aria-label="Change club logo"
          >
            <CameraIcon className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Upload controls */}
        <div className="flex-1">
          <p className="text-sm text-foreground font-medium mb-1">
            Upload a club logo
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

      {/* Hidden file input */}
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
