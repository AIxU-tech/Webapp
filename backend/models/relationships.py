from datetime import datetime
from backend.extensions import db


# Optional: User relationships table
class UserFollows(db.Model):
    __tablename__ = 'user_follows'

    id = db.Column(db.Integer, primary_key=True)
    follower_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    following_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Ensure a user can't follow the same person twice
    __table_args__ = (db.UniqueConstraint('follower_id', 'following_id'),)

    follower = db.relationship('User', foreign_keys=[follower_id], backref='following_relationships')
    following = db.relationship('User', foreign_keys=[following_id], backref='follower_relationships')


class UserLikedUniversity(db.Model):
    __tablename__ = 'user_liked_universities'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    university_id = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('user_id', 'university_id'),)

    user = db.relationship('User', backref='liked_universities_relationships')
