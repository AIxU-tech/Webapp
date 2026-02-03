/**
 * Uploads API Module
 *
 * Handles file upload operations for note attachments using signed URLs.
 *
 * Simplified flow:
 * 1. Request signed upload URL for each file
 * 2. Upload directly to GCS
 * 3. Return attachment metadata to include with note creation
 */

import { api } from './client';

/**
 * Request a signed URL for uploading a file to GCS.
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
 * @param {Object} params - Upload parameters
 * @param {File[]} params.files - Array of files to upload
 * @param {Function} [params.onFileProgress] - Per-file progress callback (fileIndex, percent)
 * @returns {Promise<Array>} Array of attachment metadata objects to send with note creation
 */
export async function uploadMultipleFiles({ files, onFileProgress }) {
  const attachments = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Step 1: Request signed URL
    const urlResponse = await requestUploadUrl({
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    });

    if (!urlResponse.success) {
      throw new Error(urlResponse.error || 'Failed to get upload URL');
    }

    // Step 2: Upload to GCS
    await uploadToGCS(
      urlResponse.uploadUrl,
      file,
      onFileProgress ? (percent) => onFileProgress(i, percent) : undefined
    );

    // Step 3: Collect attachment metadata
    attachments.push({
      gcsPath: urlResponse.gcsPath,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    });
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
