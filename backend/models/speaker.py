"""
Speaker Model

Represents a guest speaker contact shared across university AI clubs.
Only accessible to club executives, presidents, and site admins.

Speakers are associated with the university club that added them and
include contact information (email, phone, LinkedIn) plus free-text notes.
"""

from datetime import datetime
import json
from backend.extensions import db


class Speaker(db.Model):
    """
    Speaker model for guest speaker contacts.

    Attributes:
        id: Primary key
        name: Speaker's full name (required)
        position: Speaker's title/role (required)
        organization: Speaker's organization (optional)
        email: Contact email (optional)
        phone: Contact phone (optional)
        linkedin_url: LinkedIn profile URL (optional)
        notes: Free-text additional info (optional)
        tags: JSON-encoded list of speaker background tags (optional)
        university_id: Which club added this speaker
        added_by_id: Which user added this speaker
        created_at: When the speaker was added
        updated_at: When the speaker was last modified
    """
    __tablename__ = 'speakers'

    id = db.Column(db.Integer, primary_key=True)

    # Speaker details
    name = db.Column(db.String(150), nullable=False)
    position = db.Column(db.String(200), nullable=False)
    organization = db.Column(db.String(200), nullable=True)

    # Contact info
    email = db.Column(db.String(200), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    linkedin_url = db.Column(db.String(500), nullable=True)

    # Additional info
    notes = db.Column(db.Text, nullable=True)
    # JSON-encoded list of tag identifiers describing the speaker's background.
    # Example: ["academic_research", "industry_ml_engineer"]
    tags = db.Column(db.Text, nullable=True)

    # Associations
    university_id = db.Column(
        db.Integer,
        db.ForeignKey('universities.id', ondelete='CASCADE'),
        nullable=False
    )
    added_by_id = db.Column(
        db.Integer,
        db.ForeignKey('user.id'),
        nullable=False
    )

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    university = db.relationship('University', backref='speakers')
    added_by = db.relationship('User', backref='added_speakers', passive_deletes=True)

    def to_dict(self):
        """Serialize speaker to dictionary for API responses."""
        # Safely decode tags JSON into a list of strings
        tags: list[str] = []
        if self.tags:
            try:
                decoded = json.loads(self.tags)
                if isinstance(decoded, list):
                    tags = [str(t) for t in decoded if isinstance(t, str)]
            except Exception:
                tags = []

        return {
            'id': self.id,
            'name': self.name,
            'position': self.position,
            'organization': self.organization,
            'email': self.email,
            'phone': self.phone,
            'linkedinUrl': self.linkedin_url,
            'notes': self.notes,
            'tags': tags,
            'universityId': self.university_id,
            'universityName': self.university.name if self.university else None,
            'addedById': self.added_by_id,
            'addedByName': self.added_by.get_full_name() if self.added_by else None,
            'addedByAvatar': self.added_by.get_profile_picture_url() if self.added_by else None,
            'createdAt': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() + 'Z' if self.updated_at else None,
        }

    def __repr__(self):
        return f'<Speaker {self.id}: {self.name[:30]}>'
