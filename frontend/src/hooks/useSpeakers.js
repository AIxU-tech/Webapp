/**
 * Speakers Hooks Module
 *
 * React Query hooks for fetching and managing guest speaker contacts.
 * Provides optimistic updates for create, update, and delete operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSpeakers,
  createSpeaker,
  updateSpeaker,
  deleteSpeaker,
} from '../api/speakers';
import { STALE_TIMES, GC_TIMES } from '../config/cache';

// =============================================================================
// Query Keys
// =============================================================================

export const speakerKeys = {
  all: ['speakers'],
  list: () => [...speakerKeys.all, 'list'],
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * useSpeakers Hook
 *
 * Fetches all speakers and the user's executive universities.
 * Returns { speakers, userUniversities }.
 */
export function useSpeakers() {
  return useQuery({
    queryKey: speakerKeys.list(),
    queryFn: fetchSpeakers,
    staleTime: STALE_TIMES.SPEAKERS,
    gcTime: GC_TIMES.SPEAKERS,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * useCreateSpeaker Hook
 *
 * Optimistically adds the new speaker to the cached list.
 */
export function useCreateSpeaker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSpeaker,

    onMutate: async (newSpeakerData) => {
      await queryClient.cancelQueries({ queryKey: speakerKeys.list() });

      const previousData = queryClient.getQueryData(speakerKeys.list());

      queryClient.setQueryData(speakerKeys.list(), (old) => {
        if (!old) return old;
        const optimisticSpeaker = {
          id: `temp-${Date.now()}`,
          ...newSpeakerData,
          linkedinUrl: newSpeakerData.linkedinUrl || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isOptimistic: true,
        };
        return {
          ...old,
          speakers: [optimisticSpeaker, ...(old.speakers || [])],
        };
      });

      return { previousData };
    },

    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(speakerKeys.list(), context.previousData);
      }
    },

    onSuccess: (serverSpeaker) => {
      queryClient.setQueryData(speakerKeys.list(), (old) => {
        if (!old) return old;
        return {
          ...old,
          speakers: old.speakers.map((s) =>
            s.isOptimistic ? serverSpeaker : s
          ),
        };
      });
    },
  });
}

/**
 * useUpdateSpeaker Hook
 *
 * Optimistically updates the speaker in the cached list.
 */
export function useUpdateSpeaker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ speakerId, speakerData }) => updateSpeaker(speakerId, speakerData),

    onMutate: async ({ speakerId, speakerData }) => {
      await queryClient.cancelQueries({ queryKey: speakerKeys.list() });

      const previousData = queryClient.getQueryData(speakerKeys.list());

      queryClient.setQueryData(speakerKeys.list(), (old) => {
        if (!old) return old;
        return {
          ...old,
          speakers: old.speakers.map((s) => {
            if (s.id !== speakerId) return s;
            return {
              ...s,
              ...speakerData,
              linkedinUrl: speakerData.linkedinUrl || s.linkedinUrl,
              // Strip GCS-internal fields from cache; keep display-relevant fields
              imageGcsPath: undefined,
              imageContentType: undefined,
              imageSizeBytes: undefined,
              imageFilename: speakerData.imageGcsPath === null ? null : (speakerData.imageFilename || s.imageFilename),
              imageUrl: speakerData.imageGcsPath === null ? null : s.imageUrl,
            };
          }),
        };
      });

      return { previousData };
    },

    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(speakerKeys.list(), context.previousData);
      }
    },

    onSuccess: (serverSpeaker) => {
      queryClient.setQueryData(speakerKeys.list(), (old) => {
        if (!old) return old;
        return {
          ...old,
          speakers: old.speakers.map((s) =>
            s.id === serverSpeaker.id ? serverSpeaker : s
          ),
        };
      });
    },
  });
}

/**
 * useDeleteSpeaker Hook
 *
 * Optimistically removes the speaker from the cached list.
 */
export function useDeleteSpeaker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSpeaker,

    onMutate: async (speakerId) => {
      await queryClient.cancelQueries({ queryKey: speakerKeys.list() });

      const previousData = queryClient.getQueryData(speakerKeys.list());

      queryClient.setQueryData(speakerKeys.list(), (old) => {
        if (!old) return old;
        return {
          ...old,
          speakers: old.speakers.filter((s) => s.id !== speakerId),
        };
      });

      return { previousData };
    },

    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(speakerKeys.list(), context.previousData);
      }
    },
  });
}
