"""
Event Attendance Model

Tracks physical attendance at university club events via QR code check-in.
Supports both registered users and anonymous walk-in attendees.

Deduplication:
- Logged-in users: one record per user per event (enforced by partial unique index)
- Email-only guests: one record per email per event (enforced by partial unique index)
- Name-only guests: no deduplication (acceptable tradeoff for frictionless check-in)
"""

from datetime import datetime
from backend.extensions import db


class EventAttendance(db.Model):
    __tablename__ = 'event_attendance'

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id', ondelete='CASCADE'), nullable=False)

    # Attendee info (no account required)
    name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(255), nullable=True)

    # Link to registered user if they were logged in
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='SET NULL'), nullable=True)

    # How the attendance was recorded
    checked_in_via = db.Column(db.String(50), default='qr_scan', nullable=False)

    checked_in_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.Index(
            'uq_attendance_event_user',
            'event_id', 'user_id',
            unique=True,
            postgresql_where=db.text('user_id IS NOT NULL')
        ),
        db.Index(
            'uq_attendance_event_email',
            'event_id', 'email',
            unique=True,
            postgresql_where=db.text('email IS NOT NULL AND user_id IS NULL')
        ),
    )

    event = db.relationship('Event', backref=db.backref('attendance_records', cascade='all, delete-orphan'))
    user = db.relationship('User', backref='event_attendance_records')

    @classmethod
    def find_existing(cls, event_id, user_id=None, email=None):
        """Check for existing attendance record (dedup)."""
        if user_id:
            return cls.query.filter_by(event_id=event_id, user_id=user_id).first()
        if email:
            return cls.query.filter_by(event_id=event_id, email=email, user_id=None).first()
        return None

    def to_dict(self):
        return {
            'id': self.id,
            'eventId': self.event_id,
            'name': self.name,
            'email': self.email,
            'userId': self.user_id,
            'checkedInVia': self.checked_in_via,
            'checkedInAt': self.checked_in_at.isoformat() + 'Z' if self.checked_in_at else None,
        }

    def __repr__(self):
        return f'<EventAttendance event={self.event_id} name={self.name!r}>'
