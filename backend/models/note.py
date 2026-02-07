from datetime import datetime
import json
from backend.extensions import db
from backend.utils.time import get_time_ago


class Note(db.Model):
    __tablename__ = 'notes'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=True)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    tags = db.Column(db.Text, nullable=True)  # Store as JSON string
    likes = db.Column(db.Integer, default=0)
    comments = db.Column(db.Integer, default=0)
    university_only = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    author = db.relationship('User', backref='notes')
    like_records = db.relationship('NoteLike', backref='note', cascade='all, delete-orphan', passive_deletes=True)
    bookmark_records = db.relationship('NoteBookmark', backref='note', cascade='all, delete-orphan', passive_deletes=True)
    comment_records = db.relationship('NoteComment', backref='note', cascade='all, delete-orphan', passive_deletes=True)

    def get_note_by_id(self, note_id):
        return Note.query.filter_by(id=note_id).first()

    def get_tags_list(self):
        """Convert tags JSON string back to list"""
        if self.tags:
            try:
                return json.loads(self.tags)
            except:
                return []
        return []

    def set_tags_list(self, tags_list):
        """Convert list to JSON string for storage"""
        self.tags = json.dumps(tags_list) if tags_list else None

    def get_time_ago(self):
        """Calculate time ago string"""
        return get_time_ago(self.created_at)

    def to_dict(self):
        """Convert note to dictionary for JSON responses"""
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'author': {
                'id': self.author_id,
                'name': self.author.get_full_name(),
                'university': self.author.university or 'University',
                'avatar': self.author.get_profile_picture_url()
            },
            'tags': self.get_tags_list(),
            'likes': self.likes,
            'comments': self.comments,
            'timeAgo': self.get_time_ago(),
            'universityOnly': self.university_only,
            'isLiked': False,  # Will be updated based on current user
            'isBookmarked': False  # Will be updated based on current user
        }

    def is_liked_by(self, user_id: int) -> bool:
        """Check if this note has been liked by a specific user."""
        from backend.models.relationships import NoteLike
        return NoteLike.exists(user_id, self.id)

    def is_bookmarked_by(self, user_id: int) -> bool:
        """Check if this note has been bookmarked by a specific user."""
        from backend.models.relationships import NoteBookmark
        return NoteBookmark.exists(user_id, self.id)

    def toggle_like(self, user_id: int) -> bool:
        """
        Toggle like status for this note by a user.
        
        Updates both the NoteLike record and the denormalized likes counter.
        Caller must handle db.session.commit().
        
        Args:
            user_id: The ID of the user toggling the like
            
        Returns:
            True if now liked, False if now unliked
        """
        from backend.models.relationships import NoteLike
        
        if NoteLike.exists(user_id, self.id):
            NoteLike.delete(user_id, self.id)
            self.likes = max(0, self.likes - 1)
            return False
        else:
            NoteLike.create(user_id, self.id)
            self.likes += 1
            return True

    def toggle_bookmark(self, user_id: int) -> bool:
        """
        Toggle bookmark status for this note by a user.
        
        Caller must handle db.session.commit().
        
        Args:
            user_id: The ID of the user toggling the bookmark
            
        Returns:
            True if now bookmarked, False if now unbookmarked
        """
        from backend.models.relationships import NoteBookmark
        
        if NoteBookmark.exists(user_id, self.id):
            NoteBookmark.delete(user_id, self.id)
            return False
        else:
            NoteBookmark.create(user_id, self.id)
            return True
