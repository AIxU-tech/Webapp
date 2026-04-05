"""
Messages Routes Module

Handles all messaging-related HTTP endpoints for the AIxU platform.
Provides both traditional HTML rendering and JSON API endpoints.

Features:
- View all conversations (inbox)
- View individual conversation with a user
- Send messages (with real-time WebSocket notification)
- Search for users to message
- Mark messages as read

Real-time Updates:
When a message is sent, the recipient receives a WebSocket event
so their UI updates instantly without needing to refresh or poll.
"""

import os
import threading

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from backend.extensions import db
from backend.models import Message, User
from backend.sockets.events import emit_messages_read
from backend.routes_v2.messages.helpers import (
    conversation_detail_payload,
    create_conversations_dict,
    get_messages_between_users,
    send_to_recipient,
)
from backend.utils.email import send_new_conversation_email
from backend.routes_v2.notifications.helpers import notify_new_message

_DEV_MODE = os.environ.get('DEV_MODE')
_APP_URL = "http://localhost:8000" if _DEV_MODE else "https://aixu.tech"

messages_bp = Blueprint('messages', __name__)


def _send_first_conversation_email(app, recipient_email, recipient_first_name, sender_name):
    """Send a new-conversation email inside an app context (for background threads)."""
    with app.app_context():
        try:
            messages_url = f"{_APP_URL}/app/messages"
            send_new_conversation_email(
                recipient_email=recipient_email,
                recipient_first_name=recipient_first_name,
                sender_name=sender_name,
                messages_url=messages_url,
            )
        except Exception as e:
            app.logger.warning('Failed to send new-conversation email: %s', e)


# Route for searching users
@messages_bp.route('/api/users/search')
@login_required
def search_users():
    query = request.args.get('q', '').strip()

    if len(query) < 2:
        return jsonify({'users': []})

    # Search users by first name, last name, or email (excluding current user)
    users = User.query.filter(
        User.id != current_user.id,
        db.or_(
            User.first_name.ilike(f'%{query}%'),
            User.last_name.ilike(f'%{query}%'),
            User.email.ilike(f'%{query}%')
        )
    ).limit(10).all()

    return jsonify({
        'users': [{
            'id': user.id,
            'name': user.get_full_name(),
            'university': user.university or 'University',
            'avatar': user.get_profile_picture_url()
        } for user in users]
    })


# Route for getting all conversations (list of users the current user has messaged)
@messages_bp.route('/api/messages/conversations')
@login_required
def get_conversations():
    """
    Get all conversations for the current user.

    Returns a list of conversations, each containing:
    - otherUser: The other participant's information (id, name, university, avatar)
    - lastMessage: The most recent message in the conversation
    - hasUnread: Whether there are unread messages from this user

    Conversations are sorted by most recent message first.

    When there is at least one conversation, ``recentConversation`` contains the
    full message thread for the most recently active conversation (same shape as
    GET /conversation/<user_id>) so the client can hydrate cache without a second
    round-trip. Messages are not marked as read here; opening the thread still
    does that via GET /conversation/<user_id>.
    """
    try:
        # Get all messages involving the current user
        all_messages = Message.query.filter(
            db.or_(
                Message.sender_id == current_user.id,
                Message.recipient_id == current_user.id
            )
        ).order_by(Message.created_at.desc()).all()

        # Group messages by conversation (other user)

        conversations_dict = create_conversations_dict(all_messages)

        # Convert to list (already sorted by most recent due to query order)
        conversations = list(conversations_dict.values())

        recent_conversation = None
        if conversations:
            other_id = conversations[0]['otherUser']['id']
            other_user = User.query.get(other_id)
            if other_user:
                thread_messages = get_messages_between_users(current_user, other_id)
                recent_conversation = conversation_detail_payload(
                    current_user, other_user, thread_messages
                )

        return jsonify({
            'success': True,
            'conversations': conversations,
            'recentConversation': recent_conversation,
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# Route for sending a message
# RESTful: POST to collection creates a new resource
@messages_bp.route('/api/messages', methods=['POST'])
@login_required
def send_message():
    """
    Send a message to another user.

    This endpoint:
    1. Validates the request data
    2. Creates the message in the database
    3. Emits a WebSocket event to the recipient for real-time delivery

    Request JSON:
        {
            "recipient_id": int,
            "content": string
        }

    Returns:
        201: Message sent successfully with message data
        400: Missing required fields
        404: Recipient not found
        500: Server error
    """
    try:
        data = request.get_json()
        recipient_id = data.get('recipient_id')
        content = data.get('content', '').strip()

        if not recipient_id or not content:
            return jsonify({'success': False, 'error': 'Recipient and content are required'}), 400

        # Check if recipient exists
        recipient = User.query.get(recipient_id)
        if not recipient:
            return jsonify({'success': False, 'error': 'Recipient not found'}), 404

        # Detect if this is the first-ever message between these two users
        is_first_conversation = not db.session.query(
            Message.query.filter(
                db.or_(
                    db.and_(Message.sender_id == current_user.id, Message.recipient_id == recipient_id),
                    db.and_(Message.sender_id == recipient_id, Message.recipient_id == current_user.id),
                )
            ).exists()
        ).scalar()

        # Create message
        message = Message(
            sender_id=current_user.id,
            recipient_id=recipient_id,
            content=content
        )

        db.session.add(message)
        db.session.commit()

        # Emit WebSocket notification to recipient for real-time delivery
        send_to_recipient(message, current_user, recipient_id)

        # First-ever conversation: email + in-app notification
        if is_first_conversation:
            notify_new_message(recipient, current_user, message)

            app = current_app._get_current_object()
            thread = threading.Thread(
                target=_send_first_conversation_email,
                args=(app, recipient.email, recipient.first_name,
                      current_user.get_full_name()),
            )
            thread.start()

        return jsonify({
            'success': True,
            'message': message.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


# Route for getting a conversation with a specific user
@messages_bp.route('/api/messages/conversation/<int:user_id>')
@login_required
def get_conversation(user_id):
    """
    Get all messages in a conversation with a specific user.

    This endpoint:
    1. Fetches all messages between current user and specified user
    2. Marks unread messages as read
    3. Emits WebSocket event to notify sender of read receipts

    Args:
        user_id: The ID of the other user in the conversation

    Returns:
        200: Conversation data with user info and messages
        404: User not found
        500: Server error
    """
    try:
        # Get the other user
        other_user = User.query.get(user_id)
        if not other_user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        # Get all messages between current user and other user
        messages = get_messages_between_users(current_user, user_id)

        # Mark messages from other user as read
        unread_messages = Message.query.filter_by(
            sender_id=user_id,
            recipient_id=current_user.id,
            is_read=False
        ).all()

        for msg in unread_messages:
            msg.is_read = True

        if unread_messages:
            db.session.commit()

            # =================================================================
            # Real-time Read Receipt Notification
            # =================================================================
            # Notify the sender that their messages have been read.
            # This allows the sender's UI to update read indicators.
            emit_messages_read(
                sender_id=user_id,
                reader_id=current_user.id,
                conversation_id=current_user.id  # From sender's perspective
            )

        payload = conversation_detail_payload(current_user, other_user, messages)
        return jsonify({
            'success': True,
            **payload
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# Route for getting unread message count
@messages_bp.route('/api/messages/unread-count')
@login_required
def get_unread_count():
    """
    Get the count of unread messages for the current user.

    Returns:
        200: JSON with unread count
        500: Server error
    """
    try:
        count = Message.query.filter_by(
            recipient_id=current_user.id,
            is_read=False
        ).count()

        return jsonify({
            'success': True,
            'count': count
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
