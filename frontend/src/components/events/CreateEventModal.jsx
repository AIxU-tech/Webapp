/**
 * CreateEventModal Component
 *
 * Modal for creating new university events.
 * Available to executives and above at the university.
 * Follows existing modal patterns from CommunityPage and OpportunitiesPage.
 */

import { useState } from 'react';
import { BaseModal, GradientButton, SecondaryButton } from '../ui';
import { useCreateEvent } from '../../hooks';

export default function CreateEventModal({ isOpen, onClose, universityId }) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Mutation
  const createEventMutation = useCreateEvent();

  // Reset form and close modal
  const handleClose = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setStartTime('');
    setEndTime('');
    onClose();
  };

  // Form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      alert('Title is required');
      return;
    }

    if (!startTime) {
      alert('Start time is required');
      return;
    }

    // Prepare event data with ISO format times
    const eventData = {
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startTime: new Date(startTime).toISOString(),
      endTime: endTime ? new Date(endTime).toISOString() : undefined,
    };

    // Create event
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

  // Get minimum datetime for inputs (current time)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  // Character count for description
  const charCount = description.length;

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

        {/* Date/Time Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              min={getMinDateTime()}
              required
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              End Time
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              min={startTime || getMinDateTime()}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
            disabled={!title.trim() || !startTime}
          >
            Create Event
          </GradientButton>
        </div>
      </form>
    </BaseModal>
  );
}
