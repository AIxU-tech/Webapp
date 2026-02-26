from backend.extensions import db
from backend.models.notification import Notification
from backend.models.relationships import NoteLike
from backend.models.note_comment import NoteComment
from backend.models import User
from backend.sockets.events import emit_notification_update


def notify_post_liked(note, liker):
    """Call after a user likes a post. Upserts the aggregated notification."""
    if note.author_id == liker.id:
        return

    notif = Notification.upsert_for_event(
        recipient_id=note.author_id,
        actor_id=liker.id,
        verb='like',
        target_id=note.id,
        target_type='post',
        extra={
            'actor_name': liker.get_full_name(),
            'post_title': (note.title[:80] + '...') if len(note.title) > 80 else note.title,
        },
    )
    if notif:
        db.session.commit()
        emit_notification_update(note.author_id, notif.to_dict())


def notify_post_unliked(note, unliker):
    """Call after a user un-likes a post. Decrements or removes the notification."""
    if note.author_id == unliker.id:
        return

    def get_latest_liker():
        latest = (
            NoteLike.query
            .filter(NoteLike.note_id == note.id, NoteLike.user_id != note.author_id)
            .order_by(NoteLike.created_at.desc())
            .first()
        )
        if not latest:
            return None
        user = db.session.get(User, latest.user_id)
        if not user:
            return None
        return (user.id, user.get_full_name(), None)

    result = Notification.decrement_for_event(
        recipient_id=note.author_id,
        verb='like',
        target_id=note.id,
        get_latest_actor_fn=get_latest_liker,
    )
    db.session.commit()
    if result:
        emit_notification_update(note.author_id, result.to_dict())


def notify_post_commented(note, commenter, comment_text):
    """Call after a user comments on a post. Upserts the aggregated notification."""
    if note.author_id == commenter.id:
        return

    snippet = (comment_text[:100] + '...') if len(comment_text) > 100 else comment_text

    notif = Notification.upsert_for_event(
        recipient_id=note.author_id,
        actor_id=commenter.id,
        verb='comment',
        target_id=note.id,
        target_type='post',
        extra={
            'actor_name': commenter.get_full_name(),
            'post_title': (note.title[:80] + '...') if len(note.title) > 80 else note.title,
            'snippet': snippet,
        },
    )
    if notif:
        db.session.commit()
        emit_notification_update(note.author_id, notif.to_dict())


def notify_comment_deleted(note, deleter):
    """Call after a user deletes their comment. Decrements or removes the notification."""
    if note.author_id == deleter.id:
        return

    def get_latest_commenter():
        latest = (
            NoteComment.query
            .filter(
                NoteComment.note_id == note.id,
                NoteComment.user_id != note.author_id,
            )
            .order_by(NoteComment.created_at.desc())
            .first()
        )
        if not latest:
            return None
        user = db.session.get(User, latest.user_id)
        if not user:
            return None
        snippet = (latest.text[:100] + '...') if len(latest.text) > 100 else latest.text
        return (user.id, user.get_full_name(), snippet)

    result = Notification.decrement_for_event(
        recipient_id=note.author_id,
        verb='comment',
        target_id=note.id,
        get_latest_actor_fn=get_latest_commenter,
    )
    db.session.commit()
    if result:
        emit_notification_update(note.author_id, result.to_dict())
