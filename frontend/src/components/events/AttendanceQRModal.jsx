/**
 * AttendanceQRModal Component
 *
 * Displays a QR code for event attendance check-in.
 * The attendance token is pre-generated when the event is created,
 * so this modal renders instantly with no loading state.
 */

import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { BaseModal, GradientButton, SecondaryButton } from '../ui';
import { CopyIcon, DownloadIcon, CheckIcon } from '../icons';
import { useClipboard } from '../../hooks';

export default function AttendanceQRModal({
  isOpen,
  onClose,
  eventTitle,
  existingToken,
}) {
  const qrContainerRef = useRef(null);
  const { copy, isCopied } = useClipboard();

  const attendanceUrl = existingToken
    ? `${window.location.origin}/app/attend/${existingToken}`
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

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Attendance QR Code"
      size="sm"
    >
      <div className="p-6 space-y-6">
        {attendanceUrl ? (
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
                icon={isCopied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                onClick={handleCopyLink}
                size="sm"
                className="flex-1"
              >
                {isCopied ? 'Copied!' : 'Copy Link'}
              </GradientButton>

              <SecondaryButton
                icon={<DownloadIcon className="h-4 w-4" />}
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
            No attendance token available for this event. Please try closing and reopening this modal.
          </p>
        )}
      </div>
    </BaseModal>
  );
}
