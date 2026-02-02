/**
 * Uploads API Module
 *
 * Handles file upload operations for note attachments using signed URLs.
 *
 * Simplified flow (no staging area):
 * 1. Request upload URL with sessionId
 * 2. Upload directly to GCS at uploads/{user_id}/{uuid}_{filename}
 * 3. Confirm upload - creates attachment record with note_id=NULL
 * 4. When note is created, note_id is set via backend UPDATE
 */

import { api } from './client';

/**
 * Request a signed URL for uploading a file.
 *
 * Files are uploaded to a permanent location. The sessionId groups
 * uploads together so they can be associated with a note later.
 *
 * @param {Object} params - Upload parameters
 * @param {string} params.sessionId - Client-generated session ID for grouping uploads
 * @param {string} params.filename - Original filename
 * @param {string} params.contentType - MIME type
 * @param {number} params.sizeBytes - File size in bytes
 * @returns {Promise<Object>} Response with uploadUrl, gcsPath, expiresIn
 */
export async function requestUploadUrl({ sessionId, filename, contentType, sizeBytes }) {
  return api.post('/uploads/request-url', {
    sessionId,
    filename,
    contentType,
    sizeBytes,
  });
}

/**
 * Confirm that a file was uploaded.
 *
 * Creates an attachment record with note_id=NULL. The note_id will be
 * set when the note is created.
 *
 * @param {Object} params - Confirmation parameters
 * @param {string} params.sessionId - Same session ID used in request-url
 * @param {string} params.gcsPath - GCS path from requestUploadUrl
 * @param {string} params.filename - Original filename
 * @param {string} params.contentType - MIME type
 * @param {number} params.sizeBytes - File size in bytes
 * @returns {Promise<Object>} Response with success status and attachmentId
 */
export async function confirmUpload({ sessionId, gcsPath, filename, contentType, sizeBytes }) {
  return api.post('/uploads/confirm', {
    sessionId,
    gcsPath,
    filename,
    contentType,
    sizeBytes,
  });
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
 * Upload multiple files for a session (upload-first flow).
 * Fails fast: if any file fails, the whole operation rejects.
 *
 * @param {Object} params - Upload parameters
 * @param {string} params.sessionId - Client-generated session ID (e.g. crypto.randomUUID())
 * @param {File[]} params.files - Array of files to upload
 * @param {Function} [params.onFileProgress] - Per-file progress callback (fileIndex, percent)
 * @returns {Promise<void>} Resolves when all files are uploaded; rejects on first failure
 */
export async function uploadMultipleFiles({ sessionId, files, onFileProgress }) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Step 1: Request signed URL
    const urlResponse = await requestUploadUrl({
      sessionId,
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

    // Step 3: Confirm upload
    const confirmResponse = await confirmUpload({
      sessionId,
      gcsPath: urlResponse.gcsPath,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    });

    if (!confirmResponse.success) {
      throw new Error(confirmResponse.error || 'Failed to confirm upload');
    }
  }
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
 * Get all pending uploads for a session
 *
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object>} Response with attachments array
 */
export async function getSessionUploads(sessionId) {
  return api.get(`/uploads/session/${sessionId}`);
}

/**
 * Delete all pending uploads for a session
 *
 * Useful when the user cancels creating a note - cleans up orphaned uploads.
 *
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object>} Response with success status and deleted count
 */
export async function deleteSessionUploads(sessionId) {
  return api.delete(`/uploads/session/${sessionId}`);
}
