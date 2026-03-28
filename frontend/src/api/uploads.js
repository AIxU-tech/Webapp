/**
 * Uploads API Module
 *
 * Handles file upload operations for note attachments using signed URLs.
 *
 * Optimized flow:
 * 1. Request all signed upload URLs in a single batch request
 * 2. Upload files directly to GCS in parallel
 * 3. Return attachment metadata to include with note creation
 */

import { api } from './client';

/**
 * Request a signed URL for uploading a single file to GCS.
 *
 * @param {Object} params - Upload parameters
 * @param {string} params.filename - Original filename
 * @param {string} params.contentType - MIME type
 * @param {number} params.sizeBytes - File size in bytes
 * @returns {Promise<Object>} Response with uploadUrl, gcsPath, expiresIn
 */
export async function requestUploadUrl({ filename, contentType, sizeBytes }) {
  return api.post('/uploads/request-url', {
    filename,
    contentType,
    sizeBytes,
  });
}

/**
 * Request signed URLs for uploading multiple files to GCS in a single request.
 *
 * This is more efficient than calling requestUploadUrl multiple times as it
 * reduces HTTP round-trips from N to 1.
 *
 * @param {File[]} files - Array of File objects to upload
 * @returns {Promise<Object>} Response with uploads array containing uploadUrl, gcsPath, expiresIn for each file
 */
/**
 * Request a signed URL for uploading an image to GCS with correct path prefix.
 */
export async function requestImageUploadUrl({ imageType, entityId, filename, contentType, sizeBytes }) {
  return api.post('/uploads/request-image-url', {
    imageType, entityId, filename, contentType, sizeBytes,
  });
}

export async function requestUploadUrls(files) {
  return api.post('/uploads/request-urls', {
    files: files.map((file) => ({
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    })),
  });
}

/**
 * Upload a file to GCS using a signed URL.
 *
 * @param {string} uploadUrl - Signed URL from requestUploadUrl
 * @param {File} file - File object to upload
 * @param {Function} [onProgress] - Progress callback (0-100)
 * @returns {Promise<void>} Resolves when upload is complete
 */
export async function uploadToGCS(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during upload'));
    };

    xhr.send(file);
  });
}

/**
 * Upload multiple files and return their metadata for note creation.
 *
 * Uses batched signed URL requests and parallel uploads for efficiency:
 * - 1 API call to get all signed URLs (instead of N calls)
 * - Parallel uploads to GCS with configurable concurrency
 *
 * @param {Object} params - Upload parameters
 * @param {File[]} params.files - Array of files to upload
 * @param {Function} [params.onFileProgress] - Per-file progress callback (fileIndex, percent)
 * @param {number} [params.maxConcurrent=3] - Maximum concurrent uploads
 * @returns {Promise<Array>} Array of attachment metadata objects to send with note creation
 * @throws {Error} If URL request fails or any upload fails
 */
export async function uploadMultipleFiles({
  files,
  onFileProgress,
  maxConcurrent = 3,
}) {
  if (!files || files.length === 0) {
    return [];
  }

  // Step 1: Request ALL signed URLs in a single batch request
  const urlsResponse = await requestUploadUrls(files);

  if (!urlsResponse.success) {
    throw new Error(urlsResponse.error || 'Failed to get upload URLs');
  }

  const { uploads } = urlsResponse;

  // Validate we received URLs for all files
  if (!uploads || uploads.length !== files.length) {
    throw new Error('Mismatch between requested and received upload URLs');
  }

  // Step 2: Upload files to GCS in parallel with concurrency limit
  const attachments = new Array(files.length);
  const errors = [];

  // Process files in batches to limit concurrent uploads
  for (let batchStart = 0; batchStart < files.length; batchStart += maxConcurrent) {
    const batchEnd = Math.min(batchStart + maxConcurrent, files.length);
    const batchIndices = [];

    for (let i = batchStart; i < batchEnd; i++) {
      batchIndices.push(i);
    }

    const batchPromises = batchIndices.map(async (i) => {
      const file = files[i];
      const uploadInfo = uploads[i];

      try {
        await uploadToGCS(
          uploadInfo.uploadUrl,
          file,
          onFileProgress ? (percent) => onFileProgress(i, percent) : undefined
        );

        // Store attachment metadata at the correct index
        attachments[i] = {
          gcsPath: uploadInfo.gcsPath,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        };
      } catch (error) {
        errors.push({
          index: i,
          filename: file.name,
          error: error.message || 'Upload failed',
        });
      }
    });

    await Promise.all(batchPromises);
  }

  // If any uploads failed, throw an error with details
  if (errors.length > 0) {
    const failedFiles = errors.map((e) => e.filename).join(', ');
    const error = new Error(`Failed to upload ${errors.length} file(s): ${failedFiles}`);
    error.failedUploads = errors;
    error.successfulUploads = attachments.filter(Boolean);
    throw error;
  }

  return attachments;
}

/**
 * Delete an attachment from a note.
 *
 * @param {number} attachmentId - ID of the attachment to delete
 * @returns {Promise<Object>} Response with success status
 */
export async function deleteAttachment(attachmentId) {
  return api.delete(`/uploads/attachments/${attachmentId}`);
}

/**
 * Get all attachments for a note.
 *
 * @param {number} noteId - ID of the note
 * @returns {Promise<Object>} Response with attachments array
 */
export async function getAttachments(noteId) {
  return api.get(`/notes/${noteId}/attachments`);
}
