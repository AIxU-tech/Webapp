/**
 * Resume Hooks Module
 *
 * React Query hooks for managing user resume uploads.
 *
 * Available Hooks:
 * - useResume(userId) - Fetch a user's resume metadata + download URL
 * - useUploadResume() - Upload and confirm a new resume (replaces existing)
 * - useDeleteResume() - Delete the current user's resume
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STALE_TIMES, GC_TIMES } from '../config/cache';
import { getUserResume, confirmResumeUpload, deleteResume } from '../api/resume';
import { requestUploadUrl } from '../api/uploads';
import { uploadToGCS } from '../api/uploads';
import { userKeys } from './useUsers';

export const resumeKeys = {
  all: ['resumes'],
  detail: (userId) => [...resumeKeys.all, 'detail', userId],
};

/**
 * Fetch a user's resume metadata and signed download URL.
 * Only enabled when userId is provided (authenticated users only).
 */
export function useResume(userId) {
  return useQuery({
    queryKey: resumeKeys.detail(userId),
    queryFn: () => getUserResume(userId),
    enabled: !!userId,
    staleTime: STALE_TIMES.USERS,
    gcTime: GC_TIMES.USERS,
    select: (data) => data?.resume ?? null,
  });
}

/**
 * Upload a resume file to GCS via signed URL, then confirm the upload
 * with the backend. Handles the full flow:
 *   1. Request signed upload URL
 *   2. Upload file directly to GCS
 *   3. Confirm upload with backend (creates/replaces DB record)
 *
 * @returns {object} React Query mutation with mutate({ file, onProgress? })
 */
export function useUploadResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, onProgress }) => {
      const urlResponse = await requestUploadUrl({
        filename: file.name,
        contentType: file.type || 'application/pdf',
        sizeBytes: file.size,
      });

      if (!urlResponse.success) {
        throw new Error(urlResponse.error || 'Failed to get upload URL');
      }

      const { uploadUrl, gcsPath } = urlResponse;

      await uploadToGCS(uploadUrl, file, onProgress);

      const confirmResponse = await confirmResumeUpload({
        gcsPath,
        filename: file.name,
        contentType: file.type || 'application/pdf',
        sizeBytes: file.size,
      });

      if (!confirmResponse.success) {
        throw new Error(confirmResponse.error || 'Failed to confirm upload');
      }

      return confirmResponse.resume;
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: resumeKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

/**
 * Delete the current user's resume.
 */
export function useDeleteResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteResume,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resumeKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
