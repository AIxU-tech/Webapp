"""
Note Comment Model

Represents comments on notes in the community feature.
"""

from datetime import datetime
from backend.extensions import db
from backend.utils.time import get_time_ago


class NoteComment(db.Model):
    """
    A comment on a note.
    
    Comments are flat (no threading/nesting). Each comment belongs to a note
    and has an author. The likes counter is denormalized for performance.
    """
    __tablename__ = 'note_comments'

    id = db.Column(db.Integer, primary_key=True)
    note_id = db.Column(db.Integer, db.ForeignKey('notes.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    likes = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        db.Index('ix_note_comments_note', 'note_id'),
        db.Index('ix_note_comments_user', 'user_id'),
    )

    # Relationships
    like_records = db.relationship('NoteCommentLike', backref='comment', cascade='all, delete-orphan', passive_deletes=True)
    author = db.relationship('User', backref='comments')
    note = db.relationship('Note', backref='comment_records')

    def get_time_ago(self):
        """Calculate time ago string for display."""
        return get_time_ago(self.created_at)

    def to_dict(self):
        """Convert comment to dictionary for JSON responses."""
        return {
            'id': self.id,
            'noteId': self.note_id,
            'text': self.text,
            'author': {
                'id': self.user_id,
                'name': self.author.get_full_name(),
                'avatar': self.author.get_profile_picture_url()
            },
            'likes': self.likes,
            'timeAgo': self.get_time_ago(),
            'isEdited': self.updated_at is not None,
            'isLiked': False  # Will be updated based on current user
        }

    def is_liked_by(self, user_id: int) -> bool:
        """Check if this comment has been liked by a specific user."""
        from backend.models.relationships import NoteCommentLike
        return NoteCommentLike.exists(user_id, self.id)

    def toggle_like(self, user_id: int) -> bool:
        """
        Toggle like status for this comment by a user.
        
        Updates both the NoteCommentLike record and the denormalized likes counter.
        Caller must handle db.session.commit().
        
        Args:
            user_id: The ID of the user toggling the like
            
        Returns:
            True if now liked, False if now unliked
        """
        from backend.models.relationships import NoteCommentLike
        
        if NoteCommentLike.exists(user_id, self.id):
            NoteCommentLike.delete(user_id, self.id)
            self.likes = max(0, self.likes - 1)
            return False
        else:
            NoteCommentLike.create(user_id, self.id)
            self.likes += 1
            return True

