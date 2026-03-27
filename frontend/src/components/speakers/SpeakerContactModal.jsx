/**
 * SpeakerContactModal Component
 *
 * Full-detail view of a speaker with contact information, notes, tags,
 * and edit/delete actions for authorized users.
 */

import { Link } from 'react-router-dom';
import { BaseModal, Avatar, Toast } from '../ui';
import { MailIcon, LinkedInIcon, CopyIcon, CheckIcon, PhoneIcon, PencilIcon, TrashIcon } from '../icons';
import { useClipboard } from '../../hooks';
import { getTimeAgo } from '../../utils/time';
import SpeakerImage from './SpeakerImage';

export default function SpeakerContactModal({
  isOpen,
  onClose,
  speaker,
  currentUserId,
  isSiteAdmin,
  onEdit,
  onDelete,
}) {
  const { copy, isCopied } = useClipboard();

  if (!speaker) return null;

  const canManage = isSiteAdmin || speaker.addedById === currentUserId;

  return (
    <>
      <BaseModal isOpen={isOpen} onClose={onClose} size="lg">
        <div className="p-6">
          {/* Speaker Image */}
          <div className="flex justify-center mb-4">
            <SpeakerImage
              imageUrl={speaker.imageUrl}
              name={speaker.name}
              size="lg"
            />
          </div>

          {/* Name and Position */}
          <div className="text-center mb-5">
            <h2 className="text-xl font-semibold text-foreground">{speaker.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {speaker.position}
              {speaker.organization && ` at ${speaker.organization}`}
            </p>
          </div>

          {/* Contact Rows */}
          <div className="space-y-3 mb-5">
            {speaker.email && (
              <ContactRow
                icon={<MailIcon className="h-4 w-4" />}
                onCopy={() => copy(speaker.email)}
                isCopied={isCopied}
              >
                <a
                  href={`mailto:${speaker.email}`}
                  className="hover:text-primary transition-colors truncate"
                >
                  {speaker.email}
                </a>
              </ContactRow>
            )}

            {speaker.phone && (
              <ContactRow
                icon={<PhoneIcon className="h-4 w-4" />}
                onCopy={() => copy(speaker.phone)}
                isCopied={isCopied}
              >
                <span className="truncate">{speaker.phone}</span>
              </ContactRow>
            )}

            {speaker.linkedinUrl && (
              <ContactRow
                icon={<LinkedInIcon className="h-4 w-4 text-[#0077b5]" />}
                onCopy={() => copy(speaker.linkedinUrl)}
                isCopied={isCopied}
              >
                <a
                  href={speaker.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors truncate"
                >
                  {speaker.linkedinUrl.replace(/^https?:\/\/(www\.)?/, '')}
                </a>
              </ContactRow>
            )}
          </div>

          {/* Description */}
          {speaker.notes && (
            <div className="mb-5">
              <h3 className="text-sm font-medium text-foreground mb-1">Description</h3>
              <p className="text-sm text-muted-foreground">{speaker.notes}</p>
            </div>
          )}

          {/* Attribution Footer */}
          <div className="pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
            <Avatar
              src={speaker.addedByAvatar}
              name={speaker.addedByName}
              size="xs"
            />
            <span>
              Added by{' '}
              <Link
                to={`/users/${speaker.addedById}`}
                className="hover:text-primary transition-colors font-medium"
                onClick={onClose}
              >
                {speaker.addedByName}
              </Link>
              {speaker.universityName && ` · ${speaker.universityName}`}
              {speaker.createdAt && ` · ${getTimeAgo(speaker.createdAt)}`}
            </span>
          </div>

          {/* Edit / Delete Actions */}
          {canManage && (
            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit?.(speaker);
                }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer px-3 py-1.5 rounded-md hover:bg-muted"
              >
                <PencilIcon className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete?.(speaker);
                }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-500 transition-colors cursor-pointer px-3 py-1.5 rounded-md hover:bg-red-500/10"
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </BaseModal>

      <Toast
        message="Copied to clipboard"
        isVisible={isCopied}
        onDismiss={() => {}}
        duration={1500}
      />
    </>
  );
}

/**
 * A single contact information row with an icon, content, and copy button.
 */
function ContactRow({ icon, children, onCopy, isCopied }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1 min-w-0 truncate">{children}</span>
      <button
        type="button"
        onClick={onCopy}
        className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors p-1 cursor-pointer"
        title={isCopied ? 'Copied!' : 'Copy'}
        aria-label="Copy to clipboard"
      >
        {isCopied ? (
          <CheckIcon className="h-4 w-4 text-green-500" />
        ) : (
          <CopyIcon className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
