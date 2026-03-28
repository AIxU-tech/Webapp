/**
 * Attendance Hooks
 *
 * React Query hooks for event attendance tracking via QR code check-in.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEventByAttendanceToken,
  submitAttendance,
  getEventAttendance,
} from '../api/attendance';

export const attendanceKeys = {
  all: ['attendance'],
  event: (token) => [...attendanceKeys.all, 'event', token],
  records: (eventId) => [...attendanceKeys.all, 'records', eventId],
};

export function useAttendanceEvent(token) {
  return useQuery({
    queryKey: attendanceKeys.event(token),
    queryFn: () => getEventByAttendanceToken(token),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });
}

export function useSubmitAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ token, data }) => submitAttendance(token, data),
    onSuccess: (result, { token }) => {
      queryClient.setQueryData(attendanceKeys.event(token), (old) => ({
        ...old,
        alreadyCheckedIn: true,
      }));
      // Invalidate only the attendance records for this event (token cache unchanged)
      const eventId = result.eventId ?? result.attendance?.eventId;
      if (eventId) {
        queryClient.invalidateQueries({ queryKey: attendanceKeys.records(eventId) });
      }
    },
  });
}

export function useEventAttendance(eventId) {
  return useQuery({
    queryKey: attendanceKeys.records(eventId),
    queryFn: () => getEventAttendance(eventId),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
