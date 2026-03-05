/**
 * Resume Hooks Module
 *
 * React Query hooks for managing user resume uploads.
 *
 * Available Hooks:
 * - useResume(userId) - Fetch a user's resume metadata + download URL
 * - useUploadResume(userId) - Upload and confirm a new resume (optimistic)
 * - useDeleteResume() - Delete the current user's resume
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STALE_TIMES, GC_TIMES } from '../config/cache';
import { getUserResume, confirmResumeUpload, deleteResume } from '../api/resume';
import { requestUploadUrl, uploadToGCS } from '../api/uploads';
import { userKeys } from './useUsers';

export const resumeKeys = {
  all: ['resumes'],
  detail: (userId) => [...resumeKeys.all, 'detail', userId],
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
 * with the backend. Uses optimistic updates to show the file immediately.
 *
 * @param {number} userId - Current user's ID (for optimistic cache key)
 * @returns {object} React Query mutation with mutate({ file })
 */
export function useUploadResume(userId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file }) => {
      const urlResponse = await requestUploadUrl({
        filename: file.name,
        contentType: file.type || 'application/pdf',
        sizeBytes: file.size,
      });

      if (!urlResponse.success) {
        throw new Error(urlResponse.error || 'Failed to get upload URL');
      }

      const { uploadUrl, gcsPath } = urlResponse;

      await uploadToGCS(uploadUrl, file);

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

    onMutate: async ({ file }) => {
      await queryClient.cancelQueries({ queryKey: resumeKeys.detail(userId) });

      const previousData = queryClient.getQueryData(resumeKeys.detail(userId));

      queryClient.setQueryData(resumeKeys.detail(userId), {
        resume: {
          filename: file.name,
          sizeFormatted: formatBytes(file.size),
          contentType: file.type || 'application/pdf',
          sizeBytes: file.size,
          createdAt: new Date().toISOString(),
          isOptimistic: true,
        },
      });

      return { previousData };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(resumeKeys.detail(userId), context.previousData);
      }
    },

    onSettled: () => {
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
