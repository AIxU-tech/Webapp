"""
StagingUpload Model

Temporary storage for file metadata during the "upload media first, then create post" flow.
Files are uploaded to GCS under staging/{session_id}/ and recorded here; when the note
is created, they are moved to notes/{note_id}/ and turned into NoteAttachment records.
"""

from datetime import datetime
from backend.extensions import db


class StagingUpload(db.Model):
    """
    Represents a file uploaded to staging, not yet attached to a note.

    Used when creating a new note with attachments: client uploads files to staging,
    then POSTs create_note with sessionId; backend commits staging files to the new note.
    """
    __tablename__ = 'staging_uploads'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(64), nullable=False, index=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('user.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    gcs_path = db.Column(db.String(500), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    content_type = db.Column(db.String(100), nullable=False)
    size_bytes = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship
    user = db.relationship('User', backref=db.backref('staging_uploads', lazy='dynamic'))

    @classmethod
    def count_for_session(cls, session_id, user_id):
        """Return number of staging uploads for this session and user."""
        return cls.query.filter_by(session_id=session_id, user_id=user_id).count()

    @classmethod
    def get_for_session(cls, session_id, user_id):
        """Return all staging uploads for this session and user, ordered by created_at."""
        return cls.query.filter_by(session_id=session_id, user_id=user_id).order_by(cls.created_at).all()

    def __repr__(self):
        return f'<StagingUpload {self.id}: session={self.session_id} {self.filename}>'
