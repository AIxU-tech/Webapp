/**
 * CreateEventModal Component
 *
 * Modal for creating new university events.
 * Available to executives and above at the university.
 * Uses custom DatePicker and TimePicker for intuitive date/time selection
 * with smart defaults and duration tracking.
 */

import { useState, useCallback } from 'react';
import { BaseModal, GradientButton, SecondaryButton, DatePicker, TimePicker } from '../ui';
import { timeToMinutes, minutesToTime } from '../ui/forms/TimePicker';
import { useCreateEvent } from '../../hooks';

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Round minutes up to the next 15-minute increment.
 * e.g., 10:07 → "10:15", 10:00 → "10:00", 10:46 → "11:00"
 */
function roundToNext15(date) {
  const h = date.getHours();
  const m = date.getMinutes();
  const rounded = Math.ceil(m / 15) * 15;
  const totalMinutes = h * 60 + rounded;
  // Clamp to 23:45
  return minutesToTime(Math.min(totalMinutes, 23 * 60 + 45));
}

/**
 * Merge a Date object and an "HH:MM" time string into an ISO 8601 UTC string.
 */
function combineDateTimeToISO(date, time) {
  if (!date || !time) return null;
  const [h, m] = time.split(':').map(Number);
  const combined = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0);
  return combined.toISOString();
}

/**
 * Format a duration in minutes for display in the end time label.
 */
function formatDurationLabel(minutes) {
  if (!minutes || minutes <= 0) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

const DEFAULT_DURATION = 60; // 1 hour

// =============================================================================
// COMPONENT
// =============================================================================

export default function CreateEventModal({ isOpen, onClose, universityId }) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION);

  // Mutation
  const createEventMutation = useCreateEvent();

  // Reset form and close modal
  const handleClose = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setDate(null);
    setStartTime(null);
    setEndTime(null);
    setDurationMinutes(DEFAULT_DURATION);
    onClose();
  };

  // Smart default: when date is selected, auto-fill start + end times
  const handleDateChange = useCallback(
    (newDate) => {
      setDate(newDate);

      // Only auto-fill if no start time set yet
      if (!startTime) {
        const now = new Date();
        const isToday =
          newDate.getFullYear() === now.getFullYear() &&
          newDate.getMonth() === now.getMonth() &&
          newDate.getDate() === now.getDate();

        const defaultStart = isToday ? roundToNext15(now) : '10:00';
        const startMinutes = timeToMinutes(defaultStart);
        const endMinutes = Math.min(startMinutes + durationMinutes, 23 * 60 + 45);

        setStartTime(defaultStart);
        setEndTime(minutesToTime(endMinutes));
      }
    },
    [startTime, durationMinutes]
  );

  // When start time changes, preserve duration gap
  const handleStartTimeChange = useCallback(
    (newStart) => {
      setStartTime(newStart);
      const startMinutes = timeToMinutes(newStart);
      const endMinutes = Math.min(startMinutes + durationMinutes, 23 * 60 + 45);
      setEndTime(minutesToTime(endMinutes));
    },
    [durationMinutes]
  );

  // When end time changes, update tracked duration
  const handleEndTimeChange = useCallback(
    (newEnd) => {
      setEndTime(newEnd);
      if (startTime) {
        const diff = timeToMinutes(newEnd) - timeToMinutes(startTime);
        if (diff > 0) {
          setDurationMinutes(diff);
        }
      }
    },
    [startTime]
  );

  // Form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Title is required');
      return;
    }

    if (!date || !startTime) {
      alert('Date and start time are required');
      return;
    }

    const eventData = {
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startTime: combineDateTimeToISO(date, startTime),
      endTime: endTime ? combineDateTimeToISO(date, endTime) : undefined,
    };

    createEventMutation.mutate(
      { universityId, eventData },
      {
        onSuccess: () => {
          handleClose();
        },
        onError: (error) => {
          console.error('Error creating event:', error);
          alert(error.message || 'Failed to create event. Please try again.');
        },
      }
    );
  };

  // Character count for description
  const charCount = description.length;

  // Duration display for end time label
  const currentDuration =
    startTime && endTime
      ? timeToMinutes(endTime) - timeToMinutes(startTime)
      : 0;
  const durationLabel = currentDuration > 0 ? formatDurationLabel(currentDuration) : '';

  // Minimum date = today
  const today = new Date();
  const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Event"
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="p-6">
        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Event Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., AI Workshop: Introduction to Neural Networks"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Description
          </label>
          <textarea
            placeholder="Describe the event, what attendees will learn or do, any prerequisites..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {charCount} characters
          </p>
        </div>

        {/* Location */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Location
          </label>
          <input
            type="text"
            placeholder="e.g., Room 101, Computer Science Building or Zoom link"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Date */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Date <span className="text-red-500">*</span>
          </label>
          <DatePicker
            value={date}
            onChange={handleDateChange}
            minDate={minDate}
            placeholder="Select a date"
            required
            id="event-date"
            ariaLabel="Event date"
          />
        </div>

        {/* Start Time / End Time Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Start Time <span className="text-red-500">*</span>
            </label>
            <TimePicker
              value={startTime}
              onChange={handleStartTimeChange}
              placeholder="Start time"
              disabled={!date}
              required
              id="event-start-time"
              ariaLabel="Event start time"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              End Time
              {durationLabel && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({durationLabel})
                </span>
              )}
            </label>
            <TimePicker
              value={endTime}
              onChange={handleEndTimeChange}
              minTime={startTime}
              referenceTime={startTime}
              placeholder="End time"
              disabled={!startTime}
              id="event-end-time"
              ariaLabel="Event end time"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <SecondaryButton
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={createEventMutation.isPending}
          >
            Cancel
          </SecondaryButton>
          <GradientButton
            type="submit"
            loading={createEventMutation.isPending}
            loadingText="Creating..."
            disabled={!title.trim() || !date || !startTime}
          >
            Create Event
          </GradientButton>
        </div>
      </form>
    </BaseModal>
  );
}
