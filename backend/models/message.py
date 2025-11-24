from datetime import datetime
from backend.extensions import db


class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_messages')
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='received_messages')

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
        """Convert message to dictionary for JSON responses"""
        return {
            'id': self.id,
            'sender': {
                'id': self.sender.id,
                'name': self.sender.get_full_name(),
                'university': self.sender.university or 'University',
                'avatar': self.sender.get_profile_picture_url()
            },
            'recipient': {
                'id': self.recipient.id,
                'name': self.recipient.get_full_name(),
                'university': self.recipient.university or 'University',
                'avatar': self.recipient.get_profile_picture_url()
            },
            'content': self.content,
            'isRead': self.is_read,
            'timestamp': self.get_time_ago(),
            'created_at': self.created_at.isoformat()
        }
