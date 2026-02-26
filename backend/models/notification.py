from datetime import datetime
from backend.extensions import db


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    recipient_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    actor_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    verb = db.Column(db.String(50), nullable=False)
    target_id = db.Column(db.Integer, nullable=False)
    target_type = db.Column(db.String(50), nullable=False)
    extra_data = db.Column(db.JSON, default=dict)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index(
            'ix_unread_aggregation',
            'recipient_id', 'target_id', 'verb',
            unique=True,
            postgresql_where=db.text('is_read = false'),
        ),
        db.Index('ix_notifications_recipient', 'recipient_id'),
        db.Index('ix_notifications_updated', 'updated_at'),
    )

    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='notifications_received')
    actor = db.relationship('User', foreign_keys=[actor_id])

    def to_dict(self):
        return {
            'id': self.id,
            'recipientId': self.recipient_id,
            'actorId': self.actor_id,
            'verb': self.verb,
            'targetId': self.target_id,
            'targetType': self.target_type,
            'metadata': self.extra_data or {},
            'isRead': self.is_read,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }

    @classmethod
    def upsert_for_event(cls, recipient_id, actor_id, verb, target_id, target_type, extra):
        """
        Create a new notification or update an existing unread one for the same
        (recipient, target, verb) combination. Returns the notification row.
        """
        if recipient_id == actor_id:
            return None

        existing = cls.query.filter_by(
            recipient_id=recipient_id,
            target_id=target_id,
            verb=verb,
        ).first()

        if existing:
            existing.actor_id = actor_id
            existing.is_read = False
            existing.extra_data = {
                **(existing.extra_data or {}),
                'count': (existing.extra_data or {}).get('count', 1) + 1,
                'actor_name': extra.get('actor_name', ''),
                'snippet': extra.get('snippet', (existing.extra_data or {}).get('snippet', '')),
            }
            existing.updated_at = datetime.utcnow()
            return existing
        else:
            notif = cls(
                recipient_id=recipient_id,
                actor_id=actor_id,
                verb=verb,
                target_id=target_id,
                target_type=target_type,
                extra_data={'count': 1, **extra},
            )
            db.session.add(notif)
            return notif

    @classmethod
    def decrement_for_event(cls, recipient_id, verb, target_id, get_latest_actor_fn):
        """
        Decrement count on the notification for (recipient, target, verb).
        Searches unread first, then falls back to read notifications so that
        undo actions (un-like, delete comment) always clean up.

        If count hits 0, delete the row. Otherwise, use get_latest_actor_fn to
        refresh actor_id/actor_name from the source-of-truth table.

        get_latest_actor_fn() should return (user_id, user_name, snippet_or_none)
        or None if no actors remain.
        """
        existing = (
            cls.query
            .filter_by(recipient_id=recipient_id, target_id=target_id, verb=verb)
            .order_by(cls.is_read.asc(), cls.updated_at.desc())
            .first()
        )

        if not existing:
            return None

        count = (existing.extra_data or {}).get('count', 1)

        if count <= 1:
            db.session.delete(existing)
            return None

        latest = get_latest_actor_fn()
        if latest is None:
            db.session.delete(existing)
            return None

        user_id, user_name, snippet = latest
        existing.actor_id = user_id
        existing.extra_data = {
            **(existing.extra_data or {}),
            'count': count - 1,
            'actor_name': user_name,
        }
        if snippet is not None:
            existing.extra_data['snippet'] = snippet
        existing.updated_at = datetime.utcnow()
        return existing
