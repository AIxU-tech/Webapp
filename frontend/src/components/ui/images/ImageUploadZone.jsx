/**
 * ImageUploadZone Component
 *
 * Shared drag-and-drop image upload zone with automatic center-cropping.
 * Used by both profile picture and university logo upload flows.
 * Does NOT upload — passes the cropped blob to the parent via onFileSelect.
 */

import { useRef, useState, useCallback } from 'react';
import { CameraIcon } from '../../icons';
import { IMAGE_CONFIG, cropImageToSquare, validateImageFile } from '../../../utils';

export default function ImageUploadZone({
  preview,
  onFileSelect,
  onError,
  label = 'Drag photo here or click to browse',
  sublabel = 'JPG, PNG or GIF. Max 5MB',
  className = '',
}) {
  const fileInputRef = useRef(null);
  const [inputKey, setInputKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const processFile = useCallback(async (file) => {
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      onError?.(validation.error);
      return;
    }

    try {
      const croppedBlob = await cropImageToSquare(file);
      onFileSelect?.(croppedBlob);
    } catch (error) {
      console.error('Error processing image:', error);
      onError?.('Failed to process image. Please try again.');
    }
  }, [onFileSelect, onError]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    await processFile(file);
    setInputKey((k) => k + 1);
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    await processFile(file);
  }, [processFile]);

  return (
    <div
      onClick={handleUploadClick}
      className={`mb-6 p-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors duration-200 ${
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      } ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-4">
        {/* Preview with hover overlay */}
        <div className="relative group">
          {preview}
          <div
            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <span className="text-white"><CameraIcon size="lg" /></span>
          </div>
        </div>

        {/* Upload text */}
        <div className="text-center flex-1">
          <svg
            className="w-8 h-8 mx-auto mb-2 text-muted-foreground"
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
            {isDragging ? 'Drop photo here' : label}
          </p>
          <p className="text-xs text-muted-foreground">
            {sublabel}
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        key={inputKey}
        ref={fileInputRef}
        type="file"
        accept={IMAGE_CONFIG.acceptedTypes}
        onChange={handleFileSelect}
        onClick={(e) => e.stopPropagation()}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}
