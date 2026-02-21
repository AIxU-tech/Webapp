/**
 * SpeakerCard Component
 *
 * Displays a guest speaker contact card with name, position, contact info,
 * notes, and attribution. Supports edit/delete actions for the original adder
 * or site admins.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Avatar, Toast } from '../ui';
import { MailIcon, LinkedInIcon, CopyIcon, CheckIcon, PencilIcon, TrashIcon } from '../icons';
import { getTimeAgo } from '../../utils/time';

/**
 * PhoneIcon - Simple phone icon for contact display
 */
function PhoneIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

/**
 * CopyButton - Small button that copies text and shows a checkmark briefly
 */
function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  });
}

function CopyButton({ text, onCopied }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(text);
    setCopied(true);
    onCopied?.(text);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 text-muted-foreground hover:text-primary transition-colors p-1.5 -m-1 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
      title={copied ? 'Copied!' : 'Copy'}
      aria-label={copied ? 'Copied' : `Copy ${text}`}
    >
      {copied ? (
        <CheckIcon className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <CopyIcon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export default function SpeakerCard({ speaker, currentUserId, isSiteAdmin, onEdit, onDelete }) {
  const canManage = isSiteAdmin || speaker.addedById === currentUserId;
  const [toastMessage, setToastMessage] = useState('');

  const handleCopied = (text) => {
    setToastMessage(`${text} copied`);
  };

  return (
    <>
    <Card padding="md" className={`group ${speaker.isOptimistic ? 'animate-pulse' : ''}`}>
      {/* Header: Name + actions + timestamp */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate">
            {speaker.name}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {speaker.position}
            {speaker.organization && ` · ${speaker.organization}`}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {canManage && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit?.(speaker)}
                className="text-muted-foreground hover:text-primary transition-colors p-1 cursor-pointer"
                title="Edit speaker"
                aria-label="Edit speaker"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete?.(speaker)}
                className="text-muted-foreground hover:text-red-500 transition-colors p-1 cursor-pointer"
                title="Delete speaker"
                aria-label="Delete speaker"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          )}
          {speaker.createdAt && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {getTimeAgo(speaker.createdAt)}
            </span>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-1.5 mt-3">
        {speaker.email && (
          <div className="flex items-center text-sm text-muted-foreground">
            <MailIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <a href={`mailto:${speaker.email}`} className="hover:text-primary transition-colors truncate">
              {speaker.email}
            </a>
            <CopyButton text={speaker.email} onCopied={handleCopied} />
          </div>
        )}

        {speaker.phone && (
          <div className="flex items-center text-sm text-muted-foreground">
            <PhoneIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <button
              onClick={() => { copyToClipboard(speaker.phone); handleCopied(speaker.phone); }}
              className="hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-0 text-sm text-muted-foreground"
              title="Click to copy"
            >
              {speaker.phone}
            </button>
            <CopyButton text={speaker.phone} onCopied={handleCopied} />
          </div>
        )}

        {speaker.linkedinUrl && (
          <div className="flex items-center text-sm text-muted-foreground">
            <LinkedInIcon className="h-4 w-4 mr-2 flex-shrink-0 text-[#0077b5]" />
            <a href={speaker.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors truncate">
              {speaker.linkedinUrl.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
            <CopyButton text={speaker.linkedinUrl} onCopied={handleCopied} />
          </div>
        )}
      </div>

      {/* Notes */}
      {speaker.notes && (
        <p className="mt-3 text-sm italic text-muted-foreground">
          "{speaker.notes}"
        </p>
      )}

      {/* Attribution Footer */}
      <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
        <Avatar
          src={speaker.addedByAvatar}
          name={speaker.addedByName}
          size="xs"
        />
        <span>
          <Link
            to={`/users/${speaker.addedById}`}
            className="hover:text-primary transition-colors font-medium"
          >
            {speaker.addedByName}
          </Link>
          {speaker.universityName && ` · ${speaker.universityName}`}
        </span>
      </div>
    </Card>
    <Toast
      message={toastMessage}
      isVisible={!!toastMessage}
      onDismiss={() => setToastMessage('')}
      duration={1500}
      position="left"
    />
    </>
  );
}
