/**
 * DatePicker Component
 *
 * Custom calendar dropdown for selecting dates.
 * Replaces native date inputs with a consistent, accessible UI.
 *
 * Features:
 * - Monthly calendar grid with navigation
 * - Today highlight, selected state, disabled past dates
 * - Keyboard navigation (arrows, Enter, Escape, PageUp/PageDown)
 * - Click outside and ESC to close
 * - ARIA attributes for accessibility
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useClickOutside, useEscapeKey } from '../../../hooks/useUI';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../../icons';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBeforeDay(date, minDate) {
  if (!minDate) return false;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const m = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  return d < m;
}

function buildCalendarGrid(year, month) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1);

  const cells = [];

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      date: new Date(year, month, day),
      isCurrentMonth: true,
    });
  }

  // Next month leading days (fill to 42 cells = 6 rows)
  const remaining = 42 - cells.length;
  for (let day = 1; day <= remaining; day++) {
    cells.push({
      date: new Date(year, month + 1, day),
      isCurrentMonth: false,
    });
  }

  return cells;
}

function formatDateDisplay(date) {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function DatePicker({
  value,
  onChange,
  minDate,
  placeholder = 'Select a date',
  disabled = false,
  required = false,
  id,
  className = '',
  ariaLabel,
}) {
  const today = new Date();
  const effectiveMinDate = minDate || new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(value?.getFullYear() || today.getFullYear());
  const [viewMonth, setViewMonth] = useState(value?.getMonth() ?? today.getMonth());
  const [focusedDate, setFocusedDate] = useState(null);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const gridRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  // Close when clicking outside either the trigger or the dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
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
    const el = dropdownRef.current;
    if (!el || !isOpen) return;
    const stopProp = (e) => e.stopPropagation();
    el.addEventListener('mousedown', stopProp);
    return () => el.removeEventListener('mousedown', stopProp);
  }, [isOpen]);

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      setViewYear(value.getFullYear());
      setViewMonth(value.getMonth());
    }
  }, [value]);

  const toggleOpen = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => {
      if (!prev) {
        // Opening: compute position from trigger, flip above if near viewport bottom
        if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          const calendarHeight = 320;
          const fitsBelow = (window.innerHeight - rect.bottom) >= calendarHeight + 4;
          setDropdownPos({
            top: fitsBelow ? rect.bottom + 4 : rect.top - calendarHeight - 4,
            left: rect.left,
          });
        }
        setFocusedDate(value || today);
        if (value) {
          setViewYear(value.getFullYear());
          setViewMonth(value.getMonth());
        }
      }
      return !prev;
    });
  }, [disabled, value, today]);

  const navigateMonth = useCallback((delta) => {
    setViewMonth((prev) => {
      const newMonth = prev + delta;
      if (newMonth < 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      if (newMonth > 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return newMonth;
    });
  }, []);

  const selectDate = useCallback(
    (date) => {
      if (isBeforeDay(date, effectiveMinDate)) return;
      onChange(date);
      setIsOpen(false);
    },
    [onChange, effectiveMinDate]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen || !focusedDate) return;

      let newDate = new Date(focusedDate);
      let handled = true;

      switch (e.key) {
        case 'ArrowLeft':
          newDate.setDate(newDate.getDate() - 1);
          break;
        case 'ArrowRight':
          newDate.setDate(newDate.getDate() + 1);
          break;
        case 'ArrowUp':
          newDate.setDate(newDate.getDate() - 7);
          break;
        case 'ArrowDown':
          newDate.setDate(newDate.getDate() + 7);
          break;
        case 'PageUp':
          newDate.setMonth(newDate.getMonth() - 1);
          break;
        case 'PageDown':
          newDate.setMonth(newDate.getMonth() + 1);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          selectDate(focusedDate);
          return;
        default:
          handled = false;
      }

      if (handled) {
        e.preventDefault();
        setFocusedDate(newDate);
        setViewYear(newDate.getFullYear());
        setViewMonth(newDate.getMonth());
      }
    },
    [isOpen, focusedDate, selectDate]
  );

  const calendarCells = buildCalendarGrid(viewYear, viewMonth);
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
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
          transition-colors cursor-pointer
          ${value ? 'text-foreground' : 'text-muted-foreground'}
        `}
      >
        <span>{value ? formatDateDisplay(value) : placeholder}</span>
        <span className="text-muted-foreground flex-shrink-0"><CalendarIcon size="md" /></span>
      </button>

      {/* Calendar Dropdown - portaled to body so it escapes modal overflow */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          role="dialog"
          aria-label="Choose date"
          className="fixed z-[100] w-72 bg-card border border-border rounded-xl shadow-lg p-3"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              aria-label="Previous month"
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ChevronLeftIcon size="sm" />
            </button>
            <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              aria-label="Next month"
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ChevronRightIcon size="sm" />
            </button>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 mb-1" role="row">
            {DAYS_OF_WEEK.map((day, i) => (
              <div
                key={i}
                role="columnheader"
                className="text-center text-xs font-medium text-muted-foreground py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div ref={gridRef} role="grid" className="grid grid-cols-7">
            {calendarCells.map((cell, i) => {
              const isToday = isSameDay(cell.date, today);
              const isSelected = isSameDay(cell.date, value);
              const isFocused = isSameDay(cell.date, focusedDate);
              const isDisabled = isBeforeDay(cell.date, effectiveMinDate);
              const isOutOfMonth = !cell.isCurrentMonth;
              return (
                <button
                  key={i}
                  type="button"
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-disabled={isDisabled}
                  tabIndex={isFocused ? 0 : -1}
                  disabled={isDisabled}
                  onClick={() => selectDate(cell.date)}
                  className={`
                    h-9 w-full text-sm rounded-lg transition-colors cursor-pointer
                    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset
                    ${isSelected
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : isToday
                        ? 'ring-1 ring-primary text-primary font-medium hover:bg-primary/10'
                        : isDisabled
                          ? 'text-muted-foreground/30 cursor-not-allowed'
                          : isOutOfMonth
                            ? 'text-muted-foreground/40 hover:bg-muted'
                            : 'text-foreground hover:bg-muted'
                    }
                  `}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
