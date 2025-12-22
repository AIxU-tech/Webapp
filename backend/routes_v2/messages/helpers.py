from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from backend.extensions import db
from backend.models import Message, User
from backend.sockets.events import emit_new_message, emit_messages_read


def create_conversations_dict(all_messages):
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
    return conversations_dict
