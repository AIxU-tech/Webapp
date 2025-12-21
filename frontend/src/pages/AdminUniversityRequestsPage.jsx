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
import {
  CheckIcon,
  XIcon,
  ChevronDownIcon,
  BuildingIcon,
} from '../components/icons';
import {
  EmptyState,
  LoadingState,
  ErrorState,
  Badge,
  SecondaryButton,
} from '../components/ui';
import { getTimeAgo } from '../utils';

// =============================================================================
// Constants
// =============================================================================

/** Permission level required to access this page (matches backend ADMIN level) */
const ADMIN_PERMISSION_LEVEL = 1;

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * DetailRow Component
 *
 * Renders a label-value pair for displaying request details.
 * Keeps the details section DRY and consistent.
 *
 * @param {Object} props - Component props
 * @param {string} props.label - The field label
 * @param {React.ReactNode} props.children - The field value
 * @param {boolean} [props.mono] - Whether to use monospace font for value
 */
function DetailRow({ label, children, mono = false }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className={`text-foreground ${mono ? 'font-mono' : ''}`}>
        {children}
      </span>
    </div>
  );
}

/**
 * DetailSection Component
 *
 * Groups related details with a section header.
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Section title
 * @param {React.ReactNode} props.children - Section content
 */
function DetailSection({ title, children }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-foreground mb-2">{title}</h4>
      {children}
    </div>
  );
}

/**
 * ActionConfirmation Component
 *
 * Displays the confirmation UI when approve/reject is initiated.
 * Includes notes input and confirm/cancel buttons.
 *
 * @param {Object} props - Component props
 * @param {string} props.actionType - 'approve' or 'reject'
 * @param {string} props.notes - Current notes value
 * @param {Function} props.onNotesChange - Notes change handler
 * @param {Function} props.onConfirm - Confirm action handler
 * @param {Function} props.onCancel - Cancel action handler
 * @param {boolean} props.isProcessing - Whether action is in progress
 */
function ActionConfirmation({
  actionType,
  notes,
  onNotesChange,
  onConfirm,
  onCancel,
  isProcessing,
}) {
  const isApprove = actionType === 'approve';

  return (
    <div className="space-y-3">
      {/* Confirmation message */}
      <p className="text-sm text-foreground">
        {isApprove
          ? 'Are you sure you want to approve this request? The university will be created and the requester will be notified.'
          : 'Are you sure you want to reject this request? The requester will be notified.'}
      </p>

      {/* Notes input */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Notes {isApprove ? '(optional)' : '(recommended)'}
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={
            isApprove
              ? 'Any notes about the approval...'
              : 'Reason for rejection...'
          }
          rows={2}
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <SecondaryButton
          variant={isApprove ? 'success' : 'danger'}
          icon={isApprove ? <CheckIcon className="h-5 w-5" /> : <XIcon className="h-5 w-5" />}
          loading={isProcessing}
          onClick={onConfirm}
          className="flex-1"
        >
          {isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
        </SecondaryButton>
        <SecondaryButton
          variant="default"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </SecondaryButton>
      </div>
    </div>
  );
}

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject' | null

  /** Handle action confirmation */
  const handleConfirmAction = () => {
    if (actionType === 'approve') {
      onApprove(request.id, notes);
    } else if (actionType === 'reject') {
      onReject(request.id, notes);
    }
    setActionType(null);
    setNotes('');
  };

  /** Cancel action and reset state */
  const handleCancelAction = () => {
    setActionType(null);
    setNotes('');
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Card Header - Always visible, clickable to expand */}
      <button
        type="button"
        className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div className="flex items-start justify-between gap-4">
          {/* University Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {request.universityName}
              </h3>
              <Badge variant="warning" size="sm">Pending</Badge>
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
              {getTimeAgo(request.createdAt)}
            </span>
            <ChevronDownIcon expanded={isExpanded} />
          </div>
        </div>
      </button>

      {/* Expanded Details Section */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Request Details */}
          <div className="p-4 space-y-4">
            {/* University Section */}
            <DetailSection title="University Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <DetailRow label="Name">{request.universityName}</DetailRow>
                <DetailRow label="Location">{request.universityLocation}</DetailRow>
                <DetailRow label="Email Domain" mono>
                  @{request.emailDomain}.edu
                </DetailRow>
              </div>
            </DetailSection>

            {/* Club Section */}
            <DetailSection title="AI Club Details">
              <div className="space-y-2 text-sm">
                <DetailRow label="Club Name">{request.clubName}</DetailRow>
                <div>
                  <span className="text-muted-foreground">Description: </span>
                  <p className="text-foreground mt-1 whitespace-pre-wrap">
                    {request.clubDescription}
                  </p>
                </div>
                {request.clubTags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {request.clubTags.map((tag, index) => (
                      <Badge key={index} variant="secondary" size="xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </DetailSection>

            {/* Requester Section */}
            <DetailSection title="Requester Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <DetailRow label="Name">{request.requesterFullName}</DetailRow>
                <DetailRow label="Email">{request.requesterEmail}</DetailRow>
              </div>
            </DetailSection>
          </div>

          {/* Action Buttons or Confirmation */}
          <div className="p-4 bg-muted/30 border-t border-border">
            {actionType ? (
              <ActionConfirmation
                actionType={actionType}
                notes={notes}
                onNotesChange={setNotes}
                onConfirm={handleConfirmAction}
                onCancel={handleCancelAction}
                isProcessing={isProcessing}
              />
            ) : (
              <div className="flex gap-2">
                <SecondaryButton
                  variant="success"
                  icon={<CheckIcon className="h-5 w-5" />}
                  onClick={() => setActionType('approve')}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  Approve
                </SecondaryButton>
                <SecondaryButton
                  variant="danger"
                  icon={<XIcon className="h-5 w-5" />}
                  onClick={() => setActionType('reject')}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  Reject
                </SecondaryButton>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
