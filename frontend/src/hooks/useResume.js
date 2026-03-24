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

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STALE_TIMES, GC_TIMES } from '../config/cache';
import {
  getUserResume,
  confirmResumeUpload,
  deleteResume,
  startResumeParse,
  getResumeParseStatus,
  clearResumeParseStatus,
} from '../api/resume';
import { requestUploadUrl, uploadToGCS } from '../api/uploads';
import { userKeys } from './useUsers';

export const resumeKeys = {
  all: ['resumes'],
  detail: (userId) => [...resumeKeys.all, 'detail', userId],
  parseStatus: ['resumes', 'parse-status'],
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

/**
 * Start AI-powered resume parsing.
 * Triggers background parsing that auto-fills profile data.
 */
export function useStartResumeParse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startResumeParse,

    // Optimistically show the parsing banner immediately
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: resumeKeys.parseStatus });
      const previous = queryClient.getQueryData(resumeKeys.parseStatus);
      queryClient.setQueryData(resumeKeys.parseStatus, { status: 'parsing' });
      return { previous };
    },

    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(resumeKeys.parseStatus, context.previous);
      }
    },

    onSuccess: () => {
      // Start polling for status
      queryClient.invalidateQueries({ queryKey: resumeKeys.parseStatus });
    },
  });
}

/**
 * Poll for resume parsing status.
 * Automatically polls every 2s while status is 'parsing'.
 * When 'complete', invalidates user data so the profile refreshes.
 *
 * @param {boolean} enabled - Whether polling should be active
 */
export function useResumeParseStatus(enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: resumeKeys.parseStatus,
    queryFn: getResumeParseStatus,
    enabled,
    // Poll every 2s while parsing, stop when done
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === 'parsing' ? 2000 : false;
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Handle completion side effects outside queryFn to avoid
  // re-triggering on window focus or component remounts
  useEffect(() => {
    if (query.data?.status === 'complete') {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      clearResumeParseStatus().catch(() => {});
    }
  }, [query.data?.status, queryClient]);

  return query;
}
