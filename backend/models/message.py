from datetime import datetime
from backend.extensions import db
from backend.utils.time import get_time_ago


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
        return get_time_ago(self.created_at)

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
