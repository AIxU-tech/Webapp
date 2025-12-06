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
} from '../hooks/useUniversityRequests';

// =============================================================================
// Constants
// =============================================================================

/**
 * Permission level required to access this page.
 * Matches backend ADMIN permission level.
 */
const ADMIN_PERMISSION_LEVEL = 1;

// =============================================================================
// Icon Components
// =============================================================================

/**
 * Checkmark icon for approve action.
 */
const CheckIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

/**
 * X icon for reject action.
 */
const XIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

/**
 * Chevron icon for expandable sections.
 */
const ChevronIcon = ({ expanded }) => (
  <svg
    className={`w-5 h-5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

/**
 * Building/university icon for header.
 */
const BuildingIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);

/**
 * Loading spinner icon.
 */
const SpinnerIcon = () => (
  <svg
    className="animate-spin h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * RequestCard Component
 *
 * Displays a single university request with expandable details.
 * Includes approve/reject actions with optional notes.
 *
 * @param {Object} props - Component props
 * @param {Object} props.request - The university request data
 * @param {Function} props.onApprove - Callback for approve action
 * @param {Function} props.onReject - Callback for reject action
 * @param {boolean} props.isProcessing - Whether an action is in progress
 */
function RequestCard({ request, onApprove, onReject, isProcessing }) {
  // Track expanded state for details section
  const [isExpanded, setIsExpanded] = useState(false);

  // Track notes input for approve/reject
  const [notes, setNotes] = useState('');

  // Track which action modal is open
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject' | null

  /**
   * Format date for display.
   * Shows relative time for recent requests, absolute date for older ones.
   */
  const formatDate = (isoString) => {
    if (!isoString) return 'Unknown';

    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
      }
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  /**
   * Handle action confirmation (approve or reject).
   */
  const handleConfirmAction = () => {
    if (actionType === 'approve') {
      onApprove(request.id, notes);
    } else if (actionType === 'reject') {
      onReject(request.id, notes);
    }
    setActionType(null);
    setNotes('');
  };

  /**
   * Cancel action and reset state.
   */
  const handleCancelAction = () => {
    setActionType(null);
    setNotes('');
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Card Header - Always visible */}
      <div
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          {/* University Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {request.universityName}
              </h3>
              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                Pending
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {request.universityLocation}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Requested by {request.requesterFullName} ({request.requesterEmail})
            </p>
          </div>

          {/* Metadata and Expand Toggle */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-muted-foreground">
              {formatDate(request.createdAt)}
            </span>
            <ChevronIcon expanded={isExpanded} />
          </div>
        </div>
      </div>

      {/* Expanded Details Section */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Request Details */}
          <div className="p-4 space-y-4">
            {/* University Section */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">
                University Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Name: </span>
                  <span className="text-foreground">{request.universityName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Location: </span>
                  <span className="text-foreground">{request.universityLocation}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email Domain: </span>
                  <span className="text-foreground font-mono">@{request.emailDomain}.edu</span>
                </div>
              </div>
            </div>

            {/* Club Section */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">
                AI Club Details
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Club Name: </span>
                  <span className="text-foreground">{request.clubName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Description: </span>
                  <p className="text-foreground mt-1 pl-0 whitespace-pre-wrap">
                    {request.clubDescription}
                  </p>
                </div>
                {request.clubTags && request.clubTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {request.clubTags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Requester Section */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">
                Requester Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Name: </span>
                  <span className="text-foreground">{request.requesterFullName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email: </span>
                  <span className="text-foreground">{request.requesterEmail}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons or Confirmation */}
          <div className="p-4 bg-muted/30 border-t border-border">
            {actionType ? (
              /* Confirmation UI */
              <div className="space-y-3">
                <p className="text-sm text-foreground">
                  {actionType === 'approve'
                    ? 'Are you sure you want to approve this request? The university will be created and the requester will be notified.'
                    : 'Are you sure you want to reject this request? The requester will be notified.'}
                </p>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Notes {actionType === 'reject' ? '(recommended)' : '(optional)'}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      actionType === 'approve'
                        ? 'Any notes about the approval...'
                        : 'Reason for rejection...'
                    }
                    rows={2}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmAction}
                    disabled={isProcessing}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      actionType === 'approve'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {isProcessing ? (
                      <SpinnerIcon />
                    ) : actionType === 'approve' ? (
                      <>
                        <CheckIcon />
                        Confirm Approval
                      </>
                    ) : (
                      <>
                        <XIcon />
                        Confirm Rejection
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelAction}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-muted text-foreground rounded-lg font-medium text-sm hover:bg-muted/80 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Action Buttons */
              <div className="flex gap-2">
                <button
                  onClick={() => setActionType('approve')}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckIcon />
                  Approve
                </button>
                <button
                  onClick={() => setActionType('reject')}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XIcon />
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * EmptyState Component
 *
 * Displayed when there are no pending requests.
 */
function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
        <BuildingIcon />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        No Pending Requests
      </h3>
      <p className="text-muted-foreground max-w-sm mx-auto">
        There are no university requests awaiting review. Check back later.
      </p>
    </div>
  );
}

/**
 * LoadingState Component
 *
 * Displayed while fetching requests.
 */
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <SpinnerIcon />
      <span className="ml-3 text-muted-foreground">Loading requests...</span>
    </div>
  );
}

/**
 * ErrorState Component
 *
 * Displayed when there's an error fetching requests.
 */
function ErrorState({ message, onRetry }) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
        <XIcon />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        Error Loading Requests
      </h3>
      <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
        {message || 'An error occurred while loading university requests.'}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function AdminUniversityRequestsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Fetch pending requests
  const {
    data,
    isLoading,
    error,
    refetch,
  } = usePendingRequests();

  // Mutation hooks for approve/reject actions
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();

  // Track which request is currently being processed
  const [processingId, setProcessingId] = useState(null);

  // Set page title
  useEffect(() => {
    document.title = 'University Requests - Admin - AIxU';
  }, []);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || (user && user.permissionLevel < ADMIN_PERMISSION_LEVEL))) {
      navigate('/community', { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  /**
   * Handle approve action.
   * Calls the approve mutation and updates UI on completion.
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
   * Handle reject action.
   * Calls the reject mutation and updates UI on completion.
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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BuildingIcon />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              University Requests
            </h1>
            {requestCount > 0 && (
              <span className="px-2.5 py-0.5 text-sm font-medium bg-amber-100 text-amber-800 rounded-full">
                {requestCount} pending
              </span>
            )}
          </div>
          <p className="text-muted-foreground">
            Review and process requests from users who want to add their university to AIxU.
          </p>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState
            message={error.message}
            onRetry={() => refetch()}
          />
        ) : requests.length === 0 ? (
          <EmptyState />
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
