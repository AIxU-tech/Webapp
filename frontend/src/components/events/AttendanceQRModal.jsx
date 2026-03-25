/**
 * AttendanceQRModal Component
 *
 * Displays a QR code for event attendance check-in.
 * Fetches the attendance token when the modal opens via GET request.
 * Backend validates permissions (executive+ or site admin) before returning the token.
 */

import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { BaseModal, GradientButton, SecondaryButton } from '../ui';
import { CopyIcon, DownloadIcon, CheckIcon, SpinnerIcon } from '../icons';
import { useClipboard, useEventAttendanceToken } from '../../hooks';

export default function AttendanceQRModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
}) {
  const qrContainerRef = useRef(null);
  const { copy, isCopied } = useClipboard();

  const {
    data,
    isLoading,
    isError,
    error,
  } = useEventAttendanceToken(eventId, isOpen);

  const token = data?.token;
  const attendanceUrl = token
    ? `${window.location.origin}/app/attend/${token}`
    : null;

  const handleCopyLink = () => {
    if (attendanceUrl) {
      copy(attendanceUrl);
    }
  };

  const handleDownloadQR = () => {
    const container = qrContainerRef.current;
    if (!container) return;

    const canvas = container.querySelector('canvas');
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${eventTitle || 'event'}-attendance-qr.png`;
    link.href = dataUrl;
    link.click();
  };

  const getErrorMessage = () => {
    if (!isError || !error) return null;
    if (error?.status === 403) {
      return 'You do not have permission to view the attendance QR code for this event.';
    }
    if (error?.status === 404) {
      return 'Event not found.';
    }
    return error?.message || 'Failed to load attendance QR code. Please try again.';
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Attendance QR Code"
      size="sm"
    >
      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <span className="text-primary"><SpinnerIcon size="xl" /></span>
            <p className="text-sm text-muted-foreground">Loading QR code...</p>
          </div>
        ) : isError ? (
          <p className="text-center text-muted-foreground">
            {getErrorMessage()}
          </p>
        ) : attendanceUrl ? (
          <>
            {/* QR Code */}
            <div
              ref={qrContainerRef}
              className="flex justify-center p-4 bg-white rounded-lg"
            >
              <QRCodeCanvas
                value={attendanceUrl}
                size={256}
                level="M"
                includeMargin
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <GradientButton
                icon={isCopied ? <CheckIcon size="sm" /> : <CopyIcon size="sm" />}
                onClick={handleCopyLink}
                size="sm"
                className="flex-1"
              >
                {isCopied ? 'Copied!' : 'Copy Link'}
              </GradientButton>

              <SecondaryButton
                icon={<DownloadIcon size="sm" />}
                onClick={handleDownloadQR}
                size="sm"
                className="flex-1"
              >
                Download QR Code
              </SecondaryButton>
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground">
            No attendance token available for this event.
          </p>
        )}
      </div>
    </BaseModal>
  );
}
