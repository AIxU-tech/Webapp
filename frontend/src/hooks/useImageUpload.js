/**
 * useImageUpload Hook
 *
 * Provides a function to upload an image blob to GCS via signed URL.
 * Returns the GCS metadata (gcsPath, filename, contentType, sizeBytes)
 * needed to confirm the upload with the backend.
 *
 * @returns {{ upload: Function, isUploading: boolean }}
 */

import { useState, useCallback } from 'react';
import { requestImageUploadUrl, uploadToGCS } from '../api/uploads';

export default function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Upload an image blob to GCS.
   *
   * @param {string} imageType - Type of image (e.g. 'profile', 'banner', 'university_logo', 'university_banner')
   * @param {Blob} blob - The image blob to upload
   * @param {string|number|null} [entityId] - Optional entity ID (e.g. university ID)
   * @returns {Promise<{ gcsPath: string, filename: string, contentType: string, sizeBytes: number }>}
   */
  const upload = useCallback(async (imageType, blob, entityId = null) => {
    setIsUploading(true);
    try {
      const filename = `${imageType}_${Date.now()}.${blob.type === 'image/png' ? 'png' : 'jpg'}`;
      const contentType = blob.type || 'image/jpeg';
      const sizeBytes = blob.size;

      const response = await requestImageUploadUrl({
        imageType,
        entityId,
        filename,
        contentType,
        sizeBytes,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get upload URL');
      }

      await uploadToGCS(response.uploadUrl, blob);

      return {
        gcsPath: response.gcsPath,
        filename,
        contentType,
        sizeBytes,
      };
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { upload, isUploading };
}
