"""
NoteAttachment Model

Stores metadata for files attached to community notes.
Actual files are stored in Google Cloud Storage; this table
tracks the GCS path and file metadata.

Upload flow:
1. User selects files and clicks "Post"
2. Frontend uploads files directly to GCS (gets gcs_paths)
3. Frontend sends note data + attachment info to create_note endpoint
4. Backend creates Note and NoteAttachments atomically in one transaction

Constraints:
- Max 5 attachments per note
- Max 10 MB per file
- Allowed file types defined in constants
"""

from datetime import datetime
from backend.extensions import db


class NoteAttachment(db.Model):
    """
    Represents a file attachment associated with a Note.

    Files are stored in GCS at path: uploads/{user_id}/{uuid}_{filename}
    This model stores the metadata for retrieval and display.
    """
    __tablename__ = 'note_attachments'

    id = db.Column(db.Integer, primary_key=True)

    # The note this attachment belongs to
    note_id = db.Column(
        db.Integer,
        db.ForeignKey('notes.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    # The user who uploaded this file
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('user.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

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
    def get_for_note(cls, note_id):
        """Get all attachments for a note, ordered by creation time."""
        return cls.query.filter_by(note_id=note_id).order_by(cls.created_at).all()

    @classmethod
    def create_for_note(cls, note_id, user_id, attachments_data):
        """
        Create attachment records for a note.

        Args:
            note_id: The note ID to attach to
            user_id: The user ID who uploaded the files
            attachments_data: List of dicts with gcsPath, filename, contentType, sizeBytes

        Returns:
            List of created NoteAttachment objects
        """
        created = []
        for data in attachments_data:
            attachment = cls(
                note_id=note_id,
                user_id=user_id,
                gcs_path=data['gcsPath'],
                filename=data['filename'],
                content_type=data['contentType'],
                size_bytes=data['sizeBytes'],
            )
            db.session.add(attachment)
            created.append(attachment)
        return created

    def __repr__(self):
        return f'<NoteAttachment {self.id}: {self.filename} (note={self.note_id})>'
