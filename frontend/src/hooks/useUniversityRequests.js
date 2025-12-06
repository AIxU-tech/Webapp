/**
 * University Requests Hooks Module
 *
 * Provides React Query hooks for managing university requests.
 * Used by admins to view, approve, and reject pending university requests.
 *
 * Available Hooks:
 * - usePendingRequests(): Fetch all pending university requests
 * - useApproveRequest(): Mutation to approve a request
 * - useRejectRequest(): Mutation to reject a request
 *
 * @module hooks/useUniversityRequests
 *
 * @example
 * // Fetch pending requests
 * const { data, isLoading } = usePendingRequests();
 * const requests = data?.requests || [];
 *
 * @example
 * // Approve a request
 * const approveMutation = useApproveRequest();
 * approveMutation.mutate({ requestId: 1, notes: 'Looks good!' });
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPendingRequests,
  approveRequest,
  rejectRequest,
} from '../api/universityRequests';


// =============================================================================
// Query Keys
// =============================================================================

/**
 * Query key factory for university request queries.
 *
 * Creates consistent, hierarchical query keys for React Query caching.
 * Enables targeted cache invalidation when requests are approved/rejected.
 *
 * @example
 * // Invalidate all university request data
 * queryClient.invalidateQueries({ queryKey: universityRequestKeys.all });
 */
export const universityRequestKeys = {
  // Base key for all university request queries
  all: ['universityRequests'],

  // Key for pending requests list
  pending: () => [...universityRequestKeys.all, 'pending'],
};


// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch all pending university requests (admin only).
 *
 * Returns the queue of university requests awaiting admin review.
 * Requests are sorted by creation date (oldest first) to ensure
 * fair processing order.
 *
 * @returns {Object} React Query result object
 * @property {Object} data - Response data when successful
 * @property {Array} data.requests - Array of pending request objects
 * @property {number} data.count - Total number of pending requests
 * @property {boolean} isLoading - True during initial fetch
 * @property {boolean} isFetching - True during any fetch
 * @property {Error} error - Error object if fetch failed
 *
 * @example
 * function AdminDashboard() {
 *   const { data, isLoading, error } = usePendingRequests();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   const { requests, count } = data;
 *   return (
 *     <div>
 *       <h2>Pending Requests ({count})</h2>
 *       {requests.map(req => <RequestCard key={req.id} request={req} />)}
 *     </div>
 *   );
 * }
 */
export function usePendingRequests() {
  return useQuery({
    queryKey: universityRequestKeys.pending(),
    queryFn: getPendingRequests,

    // Refetch frequently since other admins may be processing requests
    staleTime: 30 * 1000, // 30 seconds

    // Keep previous data while refetching for smooth UX
    placeholderData: (previousData) => previousData,
  });
}


// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Mutation hook for approving a university request.
 *
 * When approved:
 * 1. Creates the new university in the database
 * 2. Marks the request as approved
 * 3. Invalidates the pending requests cache
 *
 * @param {Object} [options] - Additional mutation options
 * @param {Function} [options.onSuccess] - Called on successful approval
 * @param {Function} [options.onError] - Called if approval fails
 *
 * @returns {Object} React Query mutation result
 * @property {Function} mutate - Approve: mutate({ requestId, notes })
 * @property {Function} mutateAsync - Approve and return Promise
 * @property {boolean} isPending - True while approving
 * @property {Error} error - Error if approval failed
 *
 * @example
 * function ApproveButton({ requestId }) {
 *   const approveMutation = useApproveRequest({
 *     onSuccess: () => toast.success('University approved!'),
 *     onError: (err) => toast.error(err.message),
 *   });
 *
 *   return (
 *     <button
 *       onClick={() => approveMutation.mutate({ requestId, notes: '' })}
 *       disabled={approveMutation.isPending}
 *     >
 *       {approveMutation.isPending ? 'Approving...' : 'Approve'}
 *     </button>
 *   );
 * }
 */
export function useApproveRequest(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, notes }) => approveRequest(requestId, notes),

    onSuccess: (data, variables) => {
      // Remove the approved request from the pending list cache
      queryClient.invalidateQueries({ queryKey: universityRequestKeys.pending() });

      // Also invalidate universities list since a new one was created
      queryClient.invalidateQueries({ queryKey: ['universities'] });

      // Call custom onSuccess if provided
      options.onSuccess?.(data, variables);
    },

    onError: options.onError,
  });
}


/**
 * Mutation hook for rejecting a university request.
 *
 * When rejected:
 * 1. Marks the request as rejected with optional notes
 * 2. Invalidates the pending requests cache
 *
 * The rejection notes can be used to explain why the request
 * was denied, which may be shown to the requester.
 *
 * @param {Object} [options] - Additional mutation options
 * @param {Function} [options.onSuccess] - Called on successful rejection
 * @param {Function} [options.onError] - Called if rejection fails
 *
 * @returns {Object} React Query mutation result
 * @property {Function} mutate - Reject: mutate({ requestId, notes })
 * @property {Function} mutateAsync - Reject and return Promise
 * @property {boolean} isPending - True while rejecting
 * @property {Error} error - Error if rejection failed
 *
 * @example
 * function RejectButton({ requestId }) {
 *   const [reason, setReason] = useState('');
 *   const rejectMutation = useRejectRequest({
 *     onSuccess: () => toast.success('Request rejected'),
 *   });
 *
 *   const handleReject = () => {
 *     rejectMutation.mutate({
 *       requestId,
 *       notes: reason || 'Does not meet requirements',
 *     });
 *   };
 *
 *   return (
 *     <div>
 *       <input
 *         value={reason}
 *         onChange={(e) => setReason(e.target.value)}
 *         placeholder="Rejection reason (optional)"
 *       />
 *       <button onClick={handleReject} disabled={rejectMutation.isPending}>
 *         {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
 *       </button>
 *     </div>
 *   );
 * }
 */
export function useRejectRequest(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, notes }) => rejectRequest(requestId, notes),

    onSuccess: (data, variables) => {
      // Remove the rejected request from the pending list cache
      queryClient.invalidateQueries({ queryKey: universityRequestKeys.pending() });

      // Call custom onSuccess if provided
      options.onSuccess?.(data, variables);
    },

    onError: options.onError,
  });
}
