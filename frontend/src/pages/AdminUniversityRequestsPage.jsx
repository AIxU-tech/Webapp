/**
 * AdminUniversityRequestsPage Component
 *
 * Admin dashboard for managing pending university requests.
 * Allows admins to view, approve, or reject requests from users
 * who want to add their university to the AIxU platform.
 *
 * Features:
 * - List of pending university requests
 * - Expandable request cards with full details
 * - Approve/Reject actions with optional notes
 * - Real-time updates via React Query
 * - Permission-protected (admin only)
 *
 * @component
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  usePendingRequests,
  useApproveRequest,
  useRejectRequest,
  usePageTitle,
} from '../hooks';
import { BuildingIcon } from '../components/icons';
import {
  EmptyState,
  LoadingState,
  ErrorState,
  Badge,
} from '../components/ui';
import { RequestCard } from '../components/admin';

// =============================================================================
// Constants
// =============================================================================

/** Permission level required to access this page (matches backend ADMIN level) */
const ADMIN_PERMISSION_LEVEL = 1;

// =============================================================================
// Main Component
// =============================================================================

export default function AdminUniversityRequestsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Set page title using shared hook
  usePageTitle('University Requests - Admin');

  // Fetch pending requests
  const { data, isLoading, error, refetch } = usePendingRequests();

  // Mutation hooks for approve/reject actions
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();

  // Track which request is currently being processed
  const [processingId, setProcessingId] = useState(null);

  // Redirect non-admins to community page
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || (user && user.permissionLevel < ADMIN_PERMISSION_LEVEL))) {
      navigate('/community', { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  /**
   * Handle approve action
   * Calls the approve mutation and updates UI on completion
   */
  const handleApprove = async (requestId, notes) => {
    setProcessingId(requestId);
    try {
      await approveMutation.mutateAsync({ requestId, notes });
    } catch (err) {
      console.error('Failed to approve request:', err);
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Handle reject action
   * Calls the reject mutation and updates UI on completion
   */
  const handleReject = async (requestId, notes) => {
    setProcessingId(requestId);
    try {
      await rejectMutation.mutateAsync({ requestId, notes });
    } catch (err) {
      console.error('Failed to reject request:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Show nothing while checking auth
  if (authLoading) {
    return null;
  }

  // Don't render for non-admins (redirect handled in useEffect)
  if (!isAuthenticated || !user || user.permissionLevel < ADMIN_PERMISSION_LEVEL) {
    return null;
  }

  // Extract requests from response
  const requests = data?.requests || [];
  const requestCount = data?.count || requests.length;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BuildingIcon />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              University Requests
            </h1>
            {requestCount > 0 && (
              <Badge variant="warning" size="md">
                {requestCount} pending
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Review and process requests from users who want to add their university to AIxU.
          </p>
        </header>

        {/* Content Area - Loading, Error, Empty, or Request List */}
        {isLoading ? (
          <LoadingState text="Loading requests..." />
        ) : error ? (
          <ErrorState
            message={error.message || 'An error occurred while loading university requests.'}
            onRetry={() => refetch()}
          />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<BuildingIcon className="h-12 w-12" />}
            title="No Pending Requests"
            description="There are no university requests awaiting review. Check back later."
          />
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onReject={handleReject}
                isProcessing={processingId === request.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
