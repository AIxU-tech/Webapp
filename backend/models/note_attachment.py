"""
NoteAttachment Model

Stores metadata for files attached to community notes.
Actual files are stored in Google Cloud Storage; this table
tracks the GCS path and file metadata.

Simplified upload flow:
- Files are uploaded to GCS at uploads/{user_id}/{uuid}_{filename}
- A NoteAttachment record is created with note_id=NULL and session_id set
- When the note is created/updated, note_id is set via UPDATE
- Orphaned uploads (note_id=NULL, older than 24h) can be cleaned up

Constraints:
- Max 5 attachments per note
- Max 10 MB per file
- Allowed file types defined in constants
"""

from datetime import datetime
from backend.extensions import db


class NoteAttachment(db.Model):
    """
    Represents a file attachment, either associated with a Note or pending association.

    Files are stored in GCS at path: uploads/{user_id}/{uuid}_{filename}
    This model stores the metadata for retrieval and display.

    Lifecycle:
    1. Upload: record created with note_id=NULL, session_id=X, user_id=Y
    2. Associate: when note is created, UPDATE SET note_id=Z WHERE session_id=X AND user_id=Y
    3. (Optional) Cleanup: DELETE WHERE note_id IS NULL AND created_at < NOW() - 24h
    """
    __tablename__ = 'note_attachments'

    id = db.Column(db.Integer, primary_key=True)

    # The note this attachment belongs to (NULL while pending association)
    note_id = db.Column(
        db.Integer,
        db.ForeignKey('notes.id', ondelete='CASCADE'),
        nullable=True,
        index=True
    )

    # The user who uploaded this file (for ownership verification)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('user.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    # Client-generated session ID for grouping uploads before note creation
    # Used to associate uploads with a note: UPDATE ... WHERE session_id=X
    session_id = db.Column(db.String(64), nullable=True, index=True)

    # GCS storage path (e.g., "uploads/123/a1b2c3d4_document.pdf")
    gcs_path = db.Column(db.String(500), nullable=False, unique=True)

    # Original filename for display
    filename = db.Column(db.String(255), nullable=False)

    # MIME type (e.g., "application/pdf", "image/jpeg")
    content_type = db.Column(db.String(100), nullable=False)

    # File size in bytes
    size_bytes = db.Column(db.Integer, nullable=False)

    # Upload timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    note = db.relationship(
        'Note',
        backref=db.backref(
            'attachments',
            lazy='dynamic',
            cascade='all, delete-orphan',
            passive_deletes=True
        )
    )

    user = db.relationship(
        'User',
        backref=db.backref('uploads', lazy='dynamic')
    )

    def to_dict(self, include_download_url=False, download_url=None):
        """
        Convert attachment to dictionary for JSON responses.

        Args:
            include_download_url: Whether to include a signed download URL
            download_url: Pre-generated signed URL (if include_download_url is True)

        Returns:
            Dictionary with attachment metadata
        """
        result = {
            'id': self.id,
            'noteId': self.note_id,
            'filename': self.filename,
            'contentType': self.content_type,
            'sizeBytes': self.size_bytes,
            'sizeFormatted': self._format_size(self.size_bytes),
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'isImage': self.content_type.startswith('image/'),
            'isPdf': self.content_type == 'application/pdf',
        }

        if include_download_url and download_url:
            result['downloadUrl'] = download_url

        return result

    @staticmethod
    def _format_size(size_bytes):
        """Format file size in human-readable form."""
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB"
        else:
            return f"{size_bytes / (1024 * 1024):.1f} MB"

    @classmethod
    def count_for_note(cls, note_id):
        """Get the number of attachments for a note."""
        return cls.query.filter_by(note_id=note_id).count()

    @classmethod
    def count_for_session(cls, session_id, user_id):
        """Get the number of pending uploads for a session."""
        return cls.query.filter_by(
            session_id=session_id,
            user_id=user_id,
            note_id=None
        ).count()

    @classmethod
    def get_for_note(cls, note_id):
        """Get all attachments for a note."""
        return cls.query.filter_by(note_id=note_id).order_by(cls.created_at).all()

    @classmethod
    def get_for_session(cls, session_id, user_id):
        """Get all pending uploads for a session (not yet associated with a note)."""
        return cls.query.filter_by(
            session_id=session_id,
            user_id=user_id,
            note_id=None
        ).order_by(cls.created_at).all()

    @classmethod
    def associate_with_note(cls, session_id, user_id, note_id):
        """
        Associate all pending uploads for a session with a note.

        This is the key operation that links uploaded files to a newly created note.

        Args:
            session_id: The client-generated session ID
            user_id: The user ID (for verification)
            note_id: The note ID to associate with

        Returns:
            Number of attachments associated
        """
        result = cls.query.filter_by(
            session_id=session_id,
            user_id=user_id,
            note_id=None
        ).update({
            'note_id': note_id,
            'session_id': None  # Clear session_id after association
        })
        return result

    def __repr__(self):
        status = f"note={self.note_id}" if self.note_id else f"session={self.session_id}"
        return f'<NoteAttachment {self.id}: {self.filename} ({status})>'
