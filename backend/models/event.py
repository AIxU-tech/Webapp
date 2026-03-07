"""
Event Models

Models for university club events with RSVP tracking.

Events are associated with a specific university and can have
multiple attendees (RSVP tracking). Only executives and presidents
of a university can create events for that university.
"""

from datetime import datetime
from backend.extensions import db


def _datetime_to_iso_utc(dt):
    """
    Serialize a datetime for JSON so the frontend parses it as UTC.
    Naive datetimes (from DB) are assumed to be UTC and get a trailing 'Z'.
    Without 'Z', JavaScript parses the string as local time and shows wrong times.
    """
    if dt is None:
        return None
    s = dt.isoformat()
    if dt.tzinfo is None:
        return s + 'Z'
    return s


class Event(db.Model):
    """
    Event model for university club events.

    Attributes:
        id: Primary key
        university_id: Foreign key to the university hosting the event
        title: Event title (required)
        description: Event description (optional)
        location: Physical location or "Virtual (Zoom)" (optional)
        start_time: Event start time (required)
        end_time: Event end time (optional)
        created_by_id: User who created the event
        created_at: Timestamp when event was created
    """
    __tablename__ = 'events'

    id = db.Column(db.Integer, primary_key=True)
    university_id = db.Column(
        db.Integer,
        db.ForeignKey('universities.id', ondelete='CASCADE'),
        nullable=False
    )

    # Event details
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(300), nullable=True)

    # Timing
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=True)

    # Metadata
    created_by_id = db.Column(
        db.Integer,
        db.ForeignKey('user.id'),
        nullable=False
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # QR attendance token (generated on demand by executives)
    attendance_token = db.Column(db.String(64), nullable=True, unique=True, index=True)

    # Relationships
    university = db.relationship('University', backref='university_events')
    created_by = db.relationship('User', backref='created_events', passive_deletes=True)
    attendees = db.relationship('EventAttendee', backref='event', cascade='all, delete-orphan')

    def to_dict(self, include_attendees=False, attendee_count=None):
        """
        Serialize event to dictionary for API responses.

        Args:
            include_attendees: If True, include list of attendee user info
            attendee_count: If provided, use instead of len(attendees) to avoid N+1

        Returns:
            dict: Event data
        """
        count = attendee_count if attendee_count is not None else (len(self.attendees) if self.attendees else 0)
        data = {
            'id': self.id,
            'universityId': self.university_id,
            'title': self.title,
            'description': self.description,
            'location': self.location,
            'startTime': _datetime_to_iso_utc(self.start_time),
            'endTime': _datetime_to_iso_utc(self.end_time),
            'createdById': self.created_by_id,
            'createdAt': _datetime_to_iso_utc(self.created_at),
            'attendeeCount': count,
        }

        if include_attendees:
            data['attendees'] = [
                {
                    'id': a.user.id,
                    'name': a.user.get_full_name(),
                    'avatar': a.user.get_profile_picture_url(),
                    'status': a.status,
                }
                for a in self.attendees
            ]

        return data

    def __repr__(self):
        return f'<Event {self.id}: {self.title[:30]}...>'


class EventAttendee(db.Model):
    """
    Tracks RSVP/attendance for events.

    Attributes:
        id: Primary key
        event_id: Foreign key to the event
        user_id: Foreign key to the user
        status: RSVP status (attending, maybe, declined)
        created_at: When the RSVP was made
    """
    __tablename__ = 'event_attendees'

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(
        db.Integer,
        db.ForeignKey('events.id', ondelete='CASCADE'),
        nullable=False
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('user.id'),
        nullable=False
    )
    status = db.Column(db.String(20), default='attending')  # attending, maybe, declined
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Unique constraint: one RSVP per user per event
    __table_args__ = (
        db.UniqueConstraint('event_id', 'user_id', name='unique_event_attendee'),
    )

    # Relationships
    user = db.relationship('User', backref='event_rsvps')


    def to_dict(self):
        """Serialize attendee to dictionary."""
        return {
            'id': self.id,
            'eventId': self.event_id,
            'userId': self.user_id,
            'status': self.status,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<EventAttendee event={self.event_id} user={self.user_id}>'
