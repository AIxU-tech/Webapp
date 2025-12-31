"""
Relationship Models

This module contains junction/association tables for many-to-many relationships
between users and other entities (notes, universities, other users).

These tables provide:
- Referential integrity via foreign keys
- Efficient indexed lookups
- Cascade deletes when parent entities are removed
- Timestamps for when relationships were created
"""

from datetime import datetime
from backend.extensions import db


class UserFollows(db.Model):
    """
    Junction table for user-follows-user relationships.

    Tracks which users follow which other users, enabling social features
    like follower counts and activity feeds.
    """
    __tablename__ = 'user_follows'

    id = db.Column(db.Integer, primary_key=True)
    follower_id = db.Column(db.Integer, db.ForeignKey(
        'user.id', ondelete='CASCADE'), nullable=False)
    following_id = db.Column(db.Integer, db.ForeignKey(
        'user.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('follower_id', 'following_id',
                            name='uq_user_follows'),
        db.Index('ix_user_follows_follower', 'follower_id'),
        db.Index('ix_user_follows_following', 'following_id'),
    )

    follower = db.relationship('User', foreign_keys=[
                               follower_id], backref='following_relationships')
    following = db.relationship(
        'User', foreign_keys=[following_id], backref='follower_relationships')


class UserLikedUniversity(db.Model):
    """
    Junction table for user-likes-university relationships.

    Tracks which universities a user has "liked" or shown interest in.
    """
    __tablename__ = 'user_liked_universities'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey(
        'user.id', ondelete='CASCADE'), nullable=False)
    university_id = db.Column(db.Integer, db.ForeignKey(
        'universities.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'university_id',
                            name='uq_user_liked_university'),
        db.Index('ix_user_liked_universities_user', 'user_id'),
        db.Index('ix_user_liked_universities_university', 'university_id'),
    )

    user = db.relationship('User', backref='liked_university_records')
    university = db.relationship('University', backref='liked_by_records')


class NoteLike(db.Model):
    """
    Junction table for user-likes-note relationships.

    Tracks which notes a user has liked. The Note model maintains a denormalized
    `likes` counter for performance; this table is the source of truth.
    """
    __tablename__ = 'note_likes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey(
        'user.id', ondelete='CASCADE'), nullable=False)
    note_id = db.Column(db.Integer, db.ForeignKey(
        'notes.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'note_id', name='uq_note_like'),
        db.Index('ix_note_likes_user', 'user_id'),
        db.Index('ix_note_likes_note', 'note_id'),
    )

    user = db.relationship('User', backref='note_likes')
    note = db.relationship('Note', backref='like_records')

    @classmethod
    def get_liked_notes(cls, user_id: int) -> list['Note']:
        """Get all notes liked by a specific user."""
        return cls.query.filter_by(user_id=user_id).all()

    @classmethod
    def exists(cls, user_id: int, note_id: int) -> bool:
        """Check if a user has liked a specific note."""
        return cls.query.filter_by(user_id=user_id, note_id=note_id).first() is not None

    @classmethod
    def create(cls, user_id: int, note_id: int) -> 'NoteLike':
        """Create a new like record. Caller must handle commit."""
        like = cls(user_id=user_id, note_id=note_id)
        db.session.add(like)
        return like

    @classmethod
    def delete(cls, user_id: int, note_id: int) -> bool:
        """Delete a like record. Returns True if deleted, False if not found. Caller must handle commit."""
        like = cls.query.filter_by(user_id=user_id, note_id=note_id).first()
        if like:
            db.session.delete(like)
            return True
        return False


class OpportunityBookmark(db.Model):

    __tablename__ = 'opportunity_bookmarks'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey(
        'user.id', ondelete='CASCADE'), nullable=False)
    opportunity_id = db.Column(db.Integer, db.ForeignKey(
        'opportunities.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'opportunity_id',
                            name='uq_opportunity_bookmark'),
        db.Index('ix_opportunity_bookmarks_user', 'user_id'),
        db.Index('ix_opportunity_bookmarks_opportunity', 'opportunity_id')
    )

    user = db.relationship('User', backref=db.backref('opportunity_bookmarks',
                                                      cascade='all, delete-orphan',
                                                      passive_deletes=True))
    opportunity = db.relationship('Opportunity', backref=db.backref('bookmark_records',
                                                                    cascade='all, delete-orphan',
                                                                    passive_deletes=True))

    @classmethod
    def get_bookmarked_opportunities(cls, user_id: int) -> list["OpportunityBookmark"]:
        """Get all notes bookmarked by a specific user."""
        return cls.query.filter_by(user_id=user_id).all()

    @classmethod
    def exists(cls, user_id: int, opportunity_id: int) -> bool:
        """Check if a user has bookmarked a specific opportunity."""
        return cls.query.filter_by(user_id=user_id, opportunity_id=opportunity_id).first() is not None

    @classmethod
    def create(cls, user_id: int, opportunity_id: int) -> "OpportunityBookmark":
        """Create a new bookmark record. Caller must handle commit."""
        bookmark = cls(user_id=user_id, opportunity_id=opportunity_id)
        db.session.add(bookmark)
        return bookmark

    @classmethod
    def delete(cls, user_id: int, opportunity_id: int) -> bool:
        """Delete a bookmark record. Returns True if deleted, False if not found. Caller must handle commit."""
        bookmark = cls.query.filter_by(
            user_id=user_id, opportunity_id=opportunity_id).first()
        if bookmark:
            db.session.delete(bookmark)
            return True
        return False


class NoteBookmark(db.Model):
    """
    Junction table for user-bookmarks-note relationships.

    Tracks which notes a user has bookmarked for later reference.
    """
    __tablename__ = 'note_bookmarks'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey(
        'user.id', ondelete='CASCADE'), nullable=False)
    note_id = db.Column(db.Integer, db.ForeignKey(
        'notes.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'note_id', name='uq_note_bookmark'),
        db.Index('ix_note_bookmarks_user', 'user_id'),
        db.Index('ix_note_bookmarks_note', 'note_id'),
    )

    user = db.relationship('User', backref='note_bookmarks')
    note = db.relationship('Note', backref='bookmark_records')

    @classmethod
    def get_bookmarked_notes(cls, user_id: int) -> list['Note']:
        """Get all notes bookmarked by a specific user."""
        return cls.query.filter_by(user_id=user_id).all()

    @classmethod
    def exists(cls, user_id: int, note_id: int) -> bool:
        """Check if a user has bookmarked a specific note."""
        return cls.query.filter_by(user_id=user_id, note_id=note_id).first() is not None

    @classmethod
    def create(cls, user_id: int, note_id: int) -> 'NoteBookmark':
        """Create a new bookmark record. Caller must handle commit."""
        bookmark = cls(user_id=user_id, note_id=note_id)
        db.session.add(bookmark)
        return bookmark

    @classmethod
    def delete(cls, user_id: int, note_id: int) -> bool:
        """Delete a bookmark record. Returns True if deleted, False if not found. Caller must handle commit."""
        bookmark = cls.query.filter_by(
            user_id=user_id, note_id=note_id).first()
        if bookmark:
            db.session.delete(bookmark)
            return True
        return False


class NoteCommentLike(db.Model):
    """
    Junction table for user-likes-comment relationships.

    Tracks which comments a user has liked. The NoteComment model maintains
    a denormalized `likes` counter for performance; this table is the source of truth.
    """
    __tablename__ = 'note_comment_likes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey(
        'user.id', ondelete='CASCADE'), nullable=False)
    comment_id = db.Column(db.Integer, db.ForeignKey(
        'note_comments.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'comment_id',
                            name='uq_note_comment_like'),
        db.Index('ix_note_comment_likes_user', 'user_id'),
        db.Index('ix_note_comment_likes_comment', 'comment_id'),
    )

    user = db.relationship('User', backref='comment_likes')

    @classmethod
    def exists(cls, user_id: int, comment_id: int) -> bool:
        """Check if a user has liked a specific comment."""
        return cls.query.filter_by(user_id=user_id, comment_id=comment_id).first() is not None

    @classmethod
    def create(cls, user_id: int, comment_id: int) -> 'NoteCommentLike':
        """Create a new like record. Caller must handle commit."""
        like = cls(user_id=user_id, comment_id=comment_id)
        db.session.add(like)
        return like

    @classmethod
    def delete(cls, user_id: int, comment_id: int) -> bool:
        """Delete a like record. Returns True if deleted, False if not found. Caller must handle commit."""
        like = cls.query.filter_by(
            user_id=user_id, comment_id=comment_id).first()
        if like:
            db.session.delete(like)
            return True
        return False
