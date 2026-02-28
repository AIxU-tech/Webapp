"""
Resume Model

Stores metadata for a user's uploaded resume file.
Actual files are stored in Google Cloud Storage; this table
tracks the GCS path and file metadata.

Each user may have at most one resume (enforced by a unique
constraint on user_id). Uploading a new resume replaces the
existing one.
"""

from datetime import datetime
from backend.extensions import db


class Resume(db.Model):
    __tablename__ = 'resumes'

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey('user.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True,
    )

    gcs_path = db.Column(db.String(500), nullable=False, unique=True)
    filename = db.Column(db.String(255), nullable=False)
    content_type = db.Column(db.String(100), nullable=False)
    size_bytes = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship(
        'User',
        backref=db.backref('resume', uselist=False, cascade='all, delete-orphan', passive_deletes=True),
    )

    def to_dict(self, download_url=None):
        result = {
            'id': self.id,
            'userId': self.user_id,
            'filename': self.filename,
            'contentType': self.content_type,
            'sizeBytes': self.size_bytes,
            'sizeFormatted': self._format_size(self.size_bytes),
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }
        if download_url:
            result['downloadUrl'] = download_url
        return result

    @staticmethod
    def _format_size(size_bytes):
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB"
        else:
            return f"{size_bytes / (1024 * 1024):.1f} MB"

    def __repr__(self):
        return f'<Resume user={self.user_id} file={self.filename}>'
