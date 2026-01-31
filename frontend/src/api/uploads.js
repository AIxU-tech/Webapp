/**
 * Uploads API Module
 * 
 * Handles file upload operations for note attachments using signed URLs.
 * 
 * Upload flow:
 * 1. Request a signed URL from backend
 * 2. Upload file directly to GCS using the signed URL
 * 3. Confirm upload completion to backend
 */

import { api } from './client';

/**
 * Request a signed URL for uploading a file
 * 
 * @param {Object} params - Upload parameters
 * @param {number} params.noteId - ID of the note to attach to
 * @param {string} params.filename - Original filename
 * @param {string} params.contentType - MIME type of the file
 * @param {number} params.sizeBytes - File size in bytes
 * @returns {Promise<Object>} Response with uploadUrl, gcsPath, expiresIn
 */
export async function requestUploadUrl({ noteId, filename, contentType, sizeBytes }) {
  return api.post('/uploads/request-url', {
    noteId,
    filename,
    contentType,
    sizeBytes,
  });
}

/**
 * Confirm that a file was uploaded successfully
 * 
 * @param {Object} params - Confirmation parameters
 * @param {number} params.noteId - ID of the note
 * @param {string} params.gcsPath - GCS path from requestUploadUrl
 * @param {string} params.filename - Original filename
 * @param {string} params.contentType - MIME type
 * @param {number} params.sizeBytes - File size in bytes
 * @returns {Promise<Object>} Response with attachment object
 */
export async function confirmUpload({ noteId, gcsPath, filename, contentType, sizeBytes }) {
  return api.post('/uploads/confirm', {
    noteId,
    gcsPath,
    filename,
    contentType,
    sizeBytes,
  });
}

/**
 * Delete an attachment from a note
 * 
 * @param {number} attachmentId - ID of the attachment to delete
 * @returns {Promise<Object>} Response with success status
 */
export async function deleteAttachment(attachmentId) {
  return api.delete(`/uploads/attachments/${attachmentId}`);
}

/**
 * Get all attachments for a note
 * 
 * @param {number} noteId - ID of the note
 * @returns {Promise<Object>} Response with attachments array
 */
export async function getAttachments(noteId) {
  return api.get(`/notes/${noteId}/attachments`);
}

/**
 * Upload a file to GCS using a signed URL
 * 
 * This bypasses the API client since we're uploading directly to GCS.
 * 
 * @param {string} uploadUrl - Signed URL from requestUploadUrl
 * @param {File} file - File object to upload
 * @param {Function} [onProgress] - Progress callback (0-100)
 * @returns {Promise<void>} Resolves when upload is complete
 * @throws {Error} If upload fails
 */
export async function uploadToGCS(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type);

    // Track upload progress
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
 * Complete upload flow: request URL, upload to GCS, confirm with backend
 * 
 * Convenience function that handles the full 3-step upload process.
 * 
 * @param {Object} params - Upload parameters
 * @param {number} params.noteId - ID of the note to attach to
 * @param {File} params.file - File object to upload
 * @param {Function} [params.onProgress] - Progress callback (0-100)
 * @returns {Promise<Object>} The created attachment object
 * @throws {Error} If any step fails
 */
export async function uploadAttachment({ noteId, file, onProgress }) {
  // Step 1: Request signed URL
  const urlResponse = await requestUploadUrl({
    noteId,
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  });

  if (!urlResponse.success) {
    throw new Error(urlResponse.error || 'Failed to get upload URL');
  }

  // Step 2: Upload to GCS
  await uploadToGCS(urlResponse.uploadUrl, file, onProgress);

  // Step 3: Confirm upload with backend
  const confirmResponse = await confirmUpload({
    noteId,
    gcsPath: urlResponse.gcsPath,
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  });

  if (!confirmResponse.success) {
    throw new Error(confirmResponse.error || 'Failed to confirm upload');
  }

  return confirmResponse.attachment;
}

/**
 * Upload multiple files for a note
 * 
 * @param {Object} params - Upload parameters
 * @param {number} params.noteId - ID of the note
 * @param {File[]} params.files - Array of files to upload
 * @param {Function} [params.onFileProgress] - Per-file progress callback (fileIndex, percent)
 * @param {Function} [params.onFileComplete] - Called when each file completes (fileIndex, attachment)
 * @returns {Promise<Object[]>} Array of created attachment objects
 */
export async function uploadMultipleAttachments({ noteId, files, onFileProgress, onFileComplete }) {
  const attachments = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    const attachment = await uploadAttachment({
      noteId,
      file,
      onProgress: onFileProgress ? (percent) => onFileProgress(i, percent) : undefined,
    });

    attachments.push(attachment);

    if (onFileComplete) {
      onFileComplete(i, attachment);
    }
  }

  return attachments;
}
