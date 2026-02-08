/**
 * TimePicker Component
 *
 * Scrollable dropdown for selecting times in 15-minute increments.
 * Optionally shows duration hints relative to a reference time.
 *
 * Features:
 * - 96 time slots (15-min increments, 12:00 AM – 11:45 PM)
 * - Duration hints when referenceTime is provided (e.g., "(1 hr 30 min)")
 * - Auto-scrolls to selected/nearest time on open
 * - Keyboard navigation (ArrowUp/Down, Enter, Escape)
 * - Click outside and ESC to close
 * - ARIA listbox pattern
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../../../hooks/useUI';
import { ChevronDownIcon } from '../../icons';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatTime12h(hour, minute) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  return `${h}:${m} ${period}`;
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function formatDuration(minutes) {
  if (minutes <= 0) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `(${mins} min)`;
  if (mins === 0) return `(${hrs} hr)`;
  return `(${hrs} hr ${mins} min)`;
}

// Build 96 time options (15-min increments)
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const totalMinutes = i * 15;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return {
    value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
    label: formatTime12h(hour, minute),
  };
});

// =============================================================================
// EXPORTED UTILITIES (used by CreateEventModal)
// =============================================================================

export { timeToMinutes, minutesToTime, formatTime12h, TIME_OPTIONS };

// =============================================================================
// COMPONENT
// =============================================================================

export default function TimePicker({
  value,
  onChange,
  minTime,
  referenceTime,
  placeholder = 'Select time',
  disabled = false,
  required = false,
  id,
  className = '',
  ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const optionRefs = useRef([]);

  // Close when clicking outside either the trigger or the dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        listRef.current && !listRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

  useEscapeKey(isOpen, () => setIsOpen(false));

  // Stop native mousedown from reaching document so BaseModal's useClickOutside
  // doesn't see portaled dropdown clicks as "outside the modal"
  useEffect(() => {
    const el = listRef.current;
    if (!el || !isOpen) return;
    const stopProp = (e) => e.stopPropagation();
    el.addEventListener('mousedown', stopProp);
    return () => el.removeEventListener('mousedown', stopProp);
  }, [isOpen]);

  // Find selected option index
  const selectedIndex = TIME_OPTIONS.findIndex((opt) => opt.value === value);

  // Compute which options are disabled (before minTime)
  const minMinutes = minTime ? timeToMinutes(minTime) : -1;
  const refMinutes = referenceTime ? timeToMinutes(referenceTime) : null;

  // Auto-scroll to selected or nearest option on open
  useEffect(() => {
    if (isOpen && listRef.current) {
      const targetIndex = selectedIndex >= 0 ? selectedIndex : findNearestIndex();
      setHighlightedIndex(targetIndex);

      // Scroll to target
      requestAnimationFrame(() => {
        const el = optionRefs.current[targetIndex];
        if (el) {
          el.scrollIntoView({ block: 'center' });
        }
      });
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  function findNearestIndex() {
    if (minTime) {
      // Scroll to first available time
      return TIME_OPTIONS.findIndex((opt) => timeToMinutes(opt.value) > minMinutes);
    }
    // Default: scroll to ~9:00 AM area
    return TIME_OPTIONS.findIndex((opt) => opt.value === '09:00') || 36;
  }

  const toggleOpen = useCallback(() => {
    if (disabled) return;
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const listHeight = 244;
      const fitsBelow = (window.innerHeight - rect.bottom) >= listHeight + 4;
      setDropdownPos({
        top: fitsBelow ? rect.bottom + 4 : rect.top - listHeight - 4,
        left: rect.left,
        width: rect.width,
      });
    }
    setIsOpen((prev) => !prev);
  }, [disabled, isOpen]);

  const selectOption = useCallback(
    (optValue) => {
      onChange(optValue);
      setIsOpen(false);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsOpen(true);
          return;
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = Math.min(prev + 1, TIME_OPTIONS.length - 1);
            optionRefs.current[next]?.scrollIntoView({ block: 'nearest' });
            return next;
          });
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = Math.max(prev - 1, 0);
            optionRefs.current[next]?.scrollIntoView({ block: 'nearest' });
            return next;
          });
          break;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          if (highlightedIndex >= 0) {
            const opt = TIME_OPTIONS[highlightedIndex];
            if (timeToMinutes(opt.value) > minMinutes) {
              selectOption(opt.value);
            }
          }
          break;
        }
        default:
          break;
      }
    },
    [isOpen, highlightedIndex, minMinutes, selectOption]
  );

  // Display label for the trigger
  const displayLabel = value
    ? TIME_OPTIONS.find((opt) => opt.value === value)?.label || value
    : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        className={`
          w-full flex items-center justify-between px-4 py-3
          bg-background border border-border rounded-lg
          text-left
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          ${displayLabel ? 'text-foreground' : 'text-muted-foreground'}
        `}
      >
        <span>{displayLabel || placeholder}</span>
        <ChevronDownIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" expanded={isOpen} />
      </button>

      {/* Dropdown List - portaled to body so it escapes modal overflow */}
      {isOpen && createPortal(
        <ul
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel || 'Time options'}
          className="fixed z-[100] max-h-60 overflow-y-auto bg-card border border-border rounded-xl shadow-lg py-1"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          {TIME_OPTIONS.map((option, i) => {
            const optMinutes = timeToMinutes(option.value);
            const isDisabled = optMinutes <= minMinutes;
            const isSelected = option.value === value;
            const isHighlighted = i === highlightedIndex;

            // Duration hint
            let durationHint = '';
            if (refMinutes !== null && !isDisabled) {
              const diff = optMinutes - refMinutes;
              if (diff > 0) {
                durationHint = formatDuration(diff);
              }
            }

            return (
              <li
                key={option.value}
                ref={(el) => (optionRefs.current[i] = el)}
                role="option"
                aria-selected={isSelected}
                aria-disabled={isDisabled}
                onClick={() => !isDisabled && selectOption(option.value)}
                className={`
                  px-4 py-2 text-sm cursor-pointer flex items-center justify-between
                  transition-colors
                  ${isDisabled
                    ? 'text-muted-foreground/30 cursor-not-allowed'
                    : isSelected
                      ? 'text-primary font-medium bg-primary/5'
                      : isHighlighted
                        ? 'bg-muted text-foreground'
                        : 'text-foreground hover:bg-muted'
                  }
                `}
              >
                <span>{option.label}</span>
                {durationHint && !isDisabled && (
                  <span className="text-xs text-muted-foreground ml-2">{durationHint}</span>
                )}
              </li>
            );
          })}
        </ul>,
        document.body
      )}
    </div>
  );
}
