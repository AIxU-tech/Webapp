/**
 * SpeakerCard Component
 *
 * Compact card showing a speaker's avatar, name, position, truncated description,
 * and attribution. The entire card is clickable to open the detailed contact modal.
 * Edit/delete icons appear for authorized users (creator or site admin).
 * All cards have a fixed height with description space always reserved.
 */

import { useState, useRef, useEffect } from 'react';
import { Card, Avatar } from '../ui';
import { PencilIcon, TrashIcon } from '../icons';
import SpeakerImage from './SpeakerImage';

export default function SpeakerCard({ speaker, onContact, onEdit, onDelete, currentUserId, isSiteAdmin }) {
  const canManage = isSiteAdmin || speaker.addedById === currentUserId;
  const descRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = descRef.current;
    if (el) {
      setIsTruncated(el.scrollHeight > el.clientHeight);
    }
  }, [speaker.notes]);

  return (
    <Card
      padding="none"
      hover
      onClick={() => onContact?.(speaker)}
      className={`group overflow-hidden hover:shadow-lg hover:border-primary/30 flex flex-col ${speaker.isOptimistic ? 'animate-pulse' : ''}`}
    >
      <div className="p-4 pb-0 flex flex-col flex-1">
        {/* Header: Avatar + Name + Actions */}
        <div className="flex items-start gap-3">
          <SpeakerImage
            imageUrl={speaker.imageUrl}
            name={speaker.name}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-foreground break-words leading-snug group-hover:text-primary transition-colors">
              {speaker.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5 break-words leading-snug">
              {speaker.position}
              {speaker.organization && ` · ${speaker.organization}`}
            </p>
          </div>

          {/* Edit / Delete */}
          {canManage && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit?.(speaker); }}
                className="text-muted-foreground hover:text-primary transition-colors p-1 cursor-pointer"
                title="Edit speaker"
                aria-label="Edit speaker"
              >
                <PencilIcon size="sm" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete?.(speaker); }}
                className="text-muted-foreground hover:text-red-500 transition-colors p-1 cursor-pointer"
                title="Delete speaker"
                aria-label="Delete speaker"
              >
                <TrashIcon size="sm" />
              </button>
            </div>
          )}
        </div>

        {/* Description — always reserves 3 lines of space */}
        <div className="mt-3 min-h-[3.75rem]">
          {speaker.notes ? (
            <>
              <pre ref={descRef} className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap font-sans">
                {speaker.notes}
              </pre>
              {isTruncated && (
                <span className="text-xs text-primary mt-1 inline-block group-hover:underline">
                  Read more
                </span>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">No description</p>
          )}
        </div>

        {/* Spacer to push attribution to bottom */}
        <div className="flex-1" />

        {/* Attribution — pinned to bottom */}
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar
            src={speaker.addedByAvatar}
            name={speaker.addedByName}
            size="xs"
          />
          <span className="truncate">
            {speaker.addedByName}
            {speaker.universityName && ` · ${speaker.universityName}`}
          </span>
        </div>
      </div>
    </Card>
  );
}
