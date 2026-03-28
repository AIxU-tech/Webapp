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
import { CopyIcon, DownloadIcon, CheckIcon } from '../icons';
import { useClipboard } from '../../hooks';

export default function AttendanceQRModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  attendanceToken,
}) {
  const qrContainerRef = useRef(null);
  const { copy, isCopied } = useClipboard();
  const attendanceUrl = attendanceToken
    ? `${window.location.origin}/app/attend/${attendanceToken}`
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
            <div className="flex flex-wrap gap-2 justify-center">
              <GradientButton
                icon={isCopied ? <CheckIcon size="sm" /> : <CopyIcon size="sm" />}
                onClick={handleCopyLink}
                size="sm"
                className="whitespace-nowrap"
              >
                {isCopied ? 'Copied' : 'Copy'}
              </GradientButton>

              <SecondaryButton
                icon={<DownloadIcon size="sm" />}
                onClick={handleDownloadQR}
                size="sm"
                className="whitespace-nowrap"
              >
                Download
              </SecondaryButton>
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground">
            You do not have access to this event&apos;s attendance QR code.
          </p>
        )}
      </div>
    </BaseModal>
  );
}
