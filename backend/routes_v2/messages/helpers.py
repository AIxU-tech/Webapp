from flask_login import current_user
from backend.extensions import db
from backend.models import Message, User
from backend.sockets.events import emit_new_message


def create_conversations_dict(all_messages):
    """
    Convert a list of messages into a conversations dictionary.
    
    Optimized to use batch queries instead of N+1 queries:
    - 1 query to fetch all other users
    - 1 query to fetch unread counts per sender
    
    Args:
        all_messages: List of Message objects, ordered by created_at desc
        
    Returns:
        Dictionary mapping other_user_id to conversation data
    """
    if not all_messages:
        return {}
    
    # First pass: collect unique other_user_ids and find most recent message per conversation
    other_user_ids = set()
    most_recent_messages = {}  # other_user_id -> message
    
    for message in all_messages:
        other_user_id = (
            message.recipient_id 
            if message.sender_id == current_user.id 
            else message.sender_id
        )
        other_user_ids.add(other_user_id)
        
        # Keep only the first (most recent) message per conversation
        if other_user_id not in most_recent_messages:
            most_recent_messages[other_user_id] = message
    
    # Batch fetch all other users in one query
    users_by_id = {
        user.id: user 
        for user in User.query.filter(User.id.in_(other_user_ids)).all()
    }
    
    # Batch fetch unread counts per sender in one query
    # Returns list of (sender_id,) tuples for senders with unread messages
    unread_senders = {
        row.sender_id for row in
        Message.query.filter(
            Message.sender_id.in_(other_user_ids),
            Message.recipient_id == current_user.id,
            Message.is_read == False
        ).with_entities(Message.sender_id).distinct().all()
    }
    
    # Build conversations dict using pre-fetched data (no additional queries)
    conversations_dict = {}
    for other_user_id, message in most_recent_messages.items():
        other_user = users_by_id.get(other_user_id)
        if not other_user:
            continue
            
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
            'hasUnread': other_user_id in unread_senders
        }
    
    return conversations_dict


def get_messages_between_users(current_user, user_id):
    messages = Message.query.filter(
        db.or_(
            db.and_(Message.sender_id == current_user.id,
                    Message.recipient_id == user_id),
            db.and_(Message.sender_id == user_id,
                    Message.recipient_id == current_user.id)
        )
    ).order_by(Message.created_at.asc()).all()
    return messages


def conversation_detail_payload(current_user, other_user, messages):
    """
    Build the user + messages object for JSON (same shape as GET /conversation/<id>).

    Does not mark messages read — used when embedding the latest thread in
    GET /conversations so unread state stays accurate until the user opens it.
    """
    return {
        'user': {
            'id': other_user.id,
            'name': other_user.get_full_name(),
            'university': other_user.university or 'University',
            'avatar': other_user.get_profile_picture_url()
        },
        'messages': [
            {
                'id': msg.id,
                'content': msg.content,
                'timestamp': msg.get_time_ago(),
                'isSentByCurrentUser': msg.sender_id == current_user.id,
                'isRead': msg.is_read
            }
            for msg in messages
        ]
    }



def send_to_recipient(message, current_user, recipient_id):
    """
    
    Send a message to a recipient.

    Args:
        message: The message object to send
        current_user: The current user object

    Returns:
        None
    """
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