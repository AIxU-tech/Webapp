from datetime import datetime
import json
from backend.extensions import db


class Note(db.Model):
    __tablename__ = 'notes'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    tags = db.Column(db.Text, nullable=True)  # Store as JSON string
    likes = db.Column(db.Integer, default=0)
    comments = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to User
    author = db.relationship('User', backref='notes')

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
        now = datetime.utcnow()
        diff = now - self.created_at

        if diff.days > 0:
            if diff.days == 1:
                return '1 day ago'
            return f'{diff.days} days ago'
        elif diff.seconds >= 3600:
            hours = diff.seconds // 3600
            if hours == 1:
                return '1 hour ago'
            return f'{hours} hours ago'
        elif diff.seconds >= 60:
            minutes = diff.seconds // 60
            if minutes == 1:
                return '1 minute ago'
            return f'{minutes} minutes ago'
        else:
            return 'Just now'

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
            'isLiked': False,  # Will be updated based on current user
            'isBookmarked': False  # Will be updated based on current user
        }
