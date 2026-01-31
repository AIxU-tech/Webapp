"""
NoteAttachment Model

Stores metadata for files attached to community notes.
Actual files are stored in Google Cloud Storage; this table
tracks the GCS path and file metadata.

Constraints:
- Max 5 attachments per note
- Max 10 MB per file
- Allowed file types defined in constants
"""

from datetime import datetime
from backend.extensions import db


class NoteAttachment(db.Model):
    """
    Represents a file attachment on a Note.
    
    Files are stored in GCS at path: notes/{note_id}/{filename}
    This model stores the metadata for retrieval and display.
    """
    __tablename__ = 'note_attachments'

    id = db.Column(db.Integer, primary_key=True)
    note_id = db.Column(
        db.Integer,
        db.ForeignKey('notes.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # GCS storage path (e.g., "notes/123/document.pdf")
    gcs_path = db.Column(db.String(500), nullable=False)
    
    # Original filename for display
    filename = db.Column(db.String(255), nullable=False)
    
    # MIME type (e.g., "application/pdf", "image/jpeg")
    content_type = db.Column(db.String(100), nullable=False)
    
    # File size in bytes
    size_bytes = db.Column(db.Integer, nullable=False)
    
    # Upload timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to Note
    note = db.relationship(
        'Note',
        backref=db.backref(
            'attachments',
            lazy='dynamic',
            cascade='all, delete-orphan',
            passive_deletes=True
        )
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
        """Get all attachments for a note."""
        return cls.query.filter_by(note_id=note_id).order_by(cls.created_at).all()
    
    def __repr__(self):
        return f'<NoteAttachment {self.id}: {self.filename}>'
