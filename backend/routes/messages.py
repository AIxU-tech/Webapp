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

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from backend.extensions import db
from backend.models import Message, User
from backend.sockets.events import emit_new_message, emit_messages_read

messages_bp = Blueprint('messages', __name__)


#Route for searching users
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


#Route for getting all conversations (list of users the current user has messaged)
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
        conversations_dict = {}

        for message in all_messages:
            # Determine the other user in the conversation
            other_user_id = message.recipient_id if message.sender_id == current_user.id else message.sender_id

            # Only add the most recent message per conversation
            if other_user_id not in conversations_dict:
                other_user = User.query.get(other_user_id)
                if other_user:
                    # Check if there are unread messages from this user
                    has_unread = Message.query.filter_by(
                        sender_id=other_user_id,
                        recipient_id=current_user.id,
                        is_read=False
                    ).first() is not None

                    conversations_dict[other_user_id] = {
                        'otherUser': {
                            'id': other_user.id,
                            'name': other_user.get_full_name(),
                            'university': other_user.university or 'University',
                            'avatar': other_user.get_profile_picture_url()
                        },
                        'lastMessage': {
                            'content': message.content,
                            'timestamp': message.get_time_ago(),
                            'isSentByCurrentUser': message.sender_id == current_user.id
                        },
                        'hasUnread': has_unread
                    }

        # Convert to list (already sorted by most recent due to query order)
        conversations = list(conversations_dict.values())

        return jsonify({
            'success': True,
            'conversations': conversations
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


#Route for sending a message
@messages_bp.route('/api/messages/send', methods=['POST'])
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

        # Create message
        message = Message(
            sender_id=current_user.id,
            recipient_id=recipient_id,
            content=content
        )

        db.session.add(message)
        db.session.commit()

        # =================================================================
        # Real-time WebSocket Notification
        # =================================================================
        # Emit the new message to the recipient so their UI updates instantly.
        # The message_data includes all fields needed to render in the UI.
        message_data = {
            'id': message.id,
            'content': message.content,
            'timestamp': message.get_time_ago(),
            'sender_id': current_user.id,
            'isSentByCurrentUser': False  # From recipient's perspective
        }

        # Include sender info for conversation list updates
        conversation_data = {
            'sender_id': current_user.id,
            'sender_name': current_user.get_full_name(),
            'sender_avatar': current_user.get_profile_picture_url(),
            'sender_university': current_user.university or 'University'
        }

        # Emit to recipient via WebSocket
        emit_new_message(recipient_id, message_data, conversation_data)

        return jsonify({
            'success': True,
            'message': message.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


#Route for getting a conversation with a specific user
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
        messages = Message.query.filter(
            db.or_(
                db.and_(Message.sender_id == current_user.id, Message.recipient_id == user_id),
                db.and_(Message.sender_id == user_id, Message.recipient_id == current_user.id)
            )
        ).order_by(Message.created_at.asc()).all()

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

        return jsonify({
            'success': True,
            'user': {
                'id': other_user.id,
                'name': other_user.get_full_name(),
                'university': other_user.university or 'University',
                'avatar': other_user.get_profile_picture_url()
            },
            'messages': [{
                'id': msg.id,
                'content': msg.content,
                'timestamp': msg.get_time_ago(),
                'isSentByCurrentUser': msg.sender_id == current_user.id,
                'isRead': msg.is_read
            } for msg in messages]
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
