/**
 * RequestCard Component
 *
 * Displays a university request with details, notes input, and approve/reject buttons.
 */

import { useState } from 'react';
import { CheckIcon, XIcon } from './icons';
import { Card, Badge, Tag, TagGroup, SecondaryButton } from './ui';
import ConfirmationModal from './ConfirmationModal';
import { getTimeAgo } from '../utils';

function DetailRow({ label, children, mono = false }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className={`text-foreground ${mono ? 'font-mono' : ''}`}>
        {children}
      </span>
    </div>
  );
}

export default function RequestCard({ request, onApprove, onReject, isProcessing }) {
  const [notes, setNotes] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null });

  const handleConfirm = () => {
    if (confirmModal.action === 'approve') {
      onApprove(request.id, notes);
    } else {
      onReject(request.id, notes);
    }
    setNotes('');
  };

  return (
    <>
      <Card className="rounded-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">
                {request.universityName}
              </h3>
              <Badge variant="warning" size="sm">Pending</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {request.universityLocation}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {getTimeAgo(request.createdAt)}
          </span>
        </div>

        {/* Request Details */}
        <div className="space-y-3 text-sm mb-4">
          <DetailRow label="Email Domain" mono>@{request.emailDomain}.edu</DetailRow>
          <DetailRow label="Club Name">{request.clubName}</DetailRow>
          <div>
            <span className="text-muted-foreground">Description:</span>
            <p className="text-foreground mt-1">{request.clubDescription}</p>
          </div>
          {request.clubTags?.length > 0 && (
            <TagGroup className="gap-1.5">
              {request.clubTags.map((tag, i) => (
                <Tag key={i} variant="secondary" size="xs">{tag}</Tag>
              ))}
            </TagGroup>
          )}
          <DetailRow label="Requester">
            {request.requesterFullName} ({request.requesterEmail})
          </DetailRow>
        </div>

        {/* Notes Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1">
            Admin Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes for approval or rejection..."
            rows={2}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <SecondaryButton
            variant="success"
            icon={<CheckIcon className="h-5 w-5" />}
            onClick={() => setConfirmModal({ isOpen: true, action: 'approve' })}
            disabled={isProcessing}
            className="flex-1"
          >
            Approve
          </SecondaryButton>
          <SecondaryButton
            variant="danger"
            icon={<XIcon className="h-5 w-5" />}
            onClick={() => setConfirmModal({ isOpen: true, action: 'reject' })}
            disabled={isProcessing}
            className="flex-1"
          >
            Reject
          </SecondaryButton>
        </div>
      </Card>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, action: null })}
        onConfirm={handleConfirm}
        title={confirmModal.action === 'approve' ? 'Approve Request' : 'Reject Request'}
        message={confirmModal.action === 'approve'
          ? `Approve ${request.universityName}? The university will be created and the requester will be notified.`
          : `Reject ${request.universityName}? The requester will be notified.`}
        confirmText={confirmModal.action === 'approve' ? 'Approve' : 'Reject'}
        variant={confirmModal.action === 'approve' ? 'info' : 'danger'}
      />
    </>
  );
}
