"""
Socket Event Emitters Module

This module provides helper functions for emitting real-time events to connected
clients. These functions are called from route handlers when data changes occur.

Design Philosophy:
- Functions here are "fire and forget" - they emit events without blocking
- Each function targets specific user rooms for privacy
- Events carry minimal data needed for UI updates

Available Emitters:
- emit_new_message: Notify recipient of new message
- emit_message_read: Notify sender that messages were read
- emit_new_note: Notify users of new community note
- emit_note_interaction: Notify note author of like/bookmark

Usage:
    from backend.sockets.events import emit_new_message

    # In your route handler after saving a message:
    emit_new_message(recipient_id, message_data)
"""

from backend.extensions import socketio


def emit_new_message(recipient_id, message_data, conversation_data=None):
    """
    Emit a new message event to the recipient.

    Called when a user sends a message. The recipient receives this event
    in real-time so their UI can update instantly without polling.

    Args:
        recipient_id (int): The user ID of the message recipient
        message_data (dict): The message object containing:
            - id: Message ID
            - content: Message text
            - timestamp: Human-readable time string
            - sender_id: ID of the user who sent the message
            - isSentByCurrentUser: Always False for recipient
        conversation_data (dict, optional): Additional conversation context:
            - sender_name: Name of the sender
            - sender_avatar: URL to sender's profile picture
            - sender_university: Sender's university name

    Event payload structure:
        {
            'type': 'new_message',
            'message': { ... message_data ... },
            'conversation': { ... conversation_data ... }
        }

    Example:
        emit_new_message(
            recipient_id=42,
            message_data={
                'id': 123,
                'content': 'Hello!',
                'timestamp': '2 minutes ago',
                'sender_id': 1,
                'isSentByCurrentUser': False
            },
            conversation_data={
                'sender_name': 'John Doe',
                'sender_avatar': '/static/avatars/john.jpg',
                'sender_university': 'MIT'
            }
        )
    """
    # Target the recipient's private room
    room = f'user_{recipient_id}'

    # Build the event payload
    payload = {
        'type': 'new_message',
        'message': message_data
    }

    # Include conversation data if provided (for UI updates)
    if conversation_data:
        payload['conversation'] = conversation_data

    # Emit to the recipient's room
    # Using 'new_message' as the event name for clarity
    socketio.emit('new_message', payload, room=room)

    print(f'[Socket] Emitted new_message to user_{recipient_id}')


def emit_messages_read(sender_id, reader_id, conversation_id):
    """
    Emit an event when messages are marked as read.

    Called when a user opens a conversation and their unread messages
    are marked as read. The original sender receives this event so
    they can update read receipts in their UI.

    Args:
        sender_id (int): The user ID of the original message sender
        reader_id (int): The user ID who read the messages
        conversation_id (int): The ID of the conversation (other user's ID)

    Event payload structure:
        {
            'type': 'messages_read',
            'reader_id': int,
            'conversation_id': int
        }
    """
    room = f'user_{sender_id}'

    payload = {
        'type': 'messages_read',
        'reader_id': reader_id,
        'conversation_id': conversation_id
    }

    socketio.emit('messages_read', payload, room=room)

    print(f'[Socket] Emitted messages_read to user_{sender_id}')


def emit_new_note(author_id, note_data, exclude_author=True):
    """
    Emit a new note event to all connected users.

    Called when a user creates a new community note. All other users
    receive this event so their feeds update in real-time.

    Args:
        author_id (int): The user ID of the note author
        note_data (dict): The note object for UI rendering
        exclude_author (bool): If True, don't send to the author (they already see it)

    Note: This broadcasts to all connected users. For larger scale,
    consider using a pub/sub system or only notifying followers.
    """
    payload = {
        'type': 'new_note',
        'note': note_data,
        'author_id': author_id
    }

    # Broadcast to all connected clients
    # In production, you might want to limit this to followers only
    if exclude_author:
        # Emit to all except the author's room
        socketio.emit('new_note', payload, broadcast=True, include_self=False)
    else:
        socketio.emit('new_note', payload, broadcast=True)

    print(f'[Socket] Broadcasted new_note from user_{author_id}')


def emit_note_liked(note_author_id, liker_id, note_id, likes_count, is_liked):
    """
    Emit a note liked/unliked event to the note author.

    Called when a user likes or unlikes a note. The note author receives
    this event so they can see engagement in real-time.

    Args:
        note_author_id (int): The user ID of the note author
        liker_id (int): The user ID who liked/unliked the note
        note_id (int): The ID of the note that was liked
        likes_count (int): The new total likes count
        is_liked (bool): True if liked, False if unliked
    """
    # Don't notify if user liked their own note
    if note_author_id == liker_id:
        return

    room = f'user_{note_author_id}'

    payload = {
        'type': 'note_liked',
        'note_id': note_id,
        'liker_id': liker_id,
        'likes_count': likes_count,
        'is_liked': is_liked
    }

    socketio.emit('note_liked', payload, room=room)

    print(f'[Socket] Emitted note_liked to user_{note_author_id}')


def emit_new_follower(followed_user_id, follower_data):
    """
    Emit a new follower event to the user being followed.

    Args:
        followed_user_id (int): The user ID who gained a follower
        follower_data (dict): Information about the new follower:
            - id: Follower's user ID
            - name: Follower's display name
            - avatar: URL to follower's profile picture
            - university: Follower's university
    """
    room = f'user_{followed_user_id}'

    payload = {
        'type': 'new_follower',
        'follower': follower_data
    }

    socketio.emit('new_follower', payload, room=room)

    print(f'[Socket] Emitted new_follower to user_{followed_user_id}')


def emit_university_update(university_id, members, update_type, user_data=None):
    """
    Emit an update when university membership changes.

    Called when a user joins or leaves a university. All current members
    receive this event so their UI can update the member count/list.

    Args:
        university_id (int): The ID of the university
        members (list): List of member user IDs to notify
        update_type (str): Either 'member_joined' or 'member_left'
        user_data (dict, optional): Information about the user who joined/left
    """
    payload = {
        'type': 'university_update',
        'university_id': university_id,
        'update_type': update_type,
        'user': user_data
    }

    # Emit to each member's room
    for member_id in members:
        room = f'user_{member_id}'
        socketio.emit('university_update', payload, room=room)

    print(f'[Socket] Emitted university_update ({update_type}) to {len(members)} members')
