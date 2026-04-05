from datetime import datetime

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
    """Call after a comment is deleted. Decrements or removes the notification."""
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


def notify_event_created(event, creator, university):
    """
    Notify all university members that a new event was created.
    Uses bulk insert and skips the creator.
    """
    member_ids = university.get_members_list()
    member_ids = [uid for uid in member_ids if uid != creator.id]

    if not member_ids:
        return

    now = datetime.utcnow()
    creator_name = creator.get_full_name()
    event_title = (event.title[:80] + '...') if len(event.title) > 80 else event.title

    notifications = [
        Notification(
            recipient_id=uid,
            actor_id=creator.id,
            verb='event_created',
            target_id=event.id,
            target_type='event',
            extra_data={
                'count': 1,
                'actor_name': creator_name,
                'event_title': event_title,
                'university_name': university.clubName,
                'university_id': university.id,
            },
            created_at=now,
            updated_at=now,
        )
        for uid in member_ids
    ]

    db.session.add_all(notifications)
    db.session.commit()

    for notif in notifications:
        emit_notification_update(notif.recipient_id, notif.to_dict())


def notify_new_message(recipient, sender, message):
    """
    Notify a user that someone messaged them for the first time.
    Only called for brand-new conversations (first message between two users).
    """
    snippet = (message.content[:100] + '...') if len(message.content) > 100 else message.content

    notif = Notification(
        recipient_id=recipient.id,
        actor_id=sender.id,
        verb='new_message',
        target_id=sender.id,
        target_type='message',
        extra_data={
            'count': 1,
            'actor_name': sender.get_full_name(),
            'snippet': snippet,
        },
    )
    db.session.add(notif)
    db.session.commit()
    emit_notification_update(recipient.id, notif.to_dict())
