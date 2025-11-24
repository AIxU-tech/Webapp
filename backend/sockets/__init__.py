"""
WebSocket Event Handlers Module

This module sets up all WebSocket event handlers for real-time communication.
It manages user connections, disconnections, and room assignments for targeted
message delivery.

Architecture:
- Each authenticated user joins a private room named 'user_{user_id}'
- Messages and notifications are emitted to specific user rooms
- This enables targeted real-time updates without broadcasting to all users

Events Handled:
- connect: User establishes WebSocket connection
- disconnect: User closes WebSocket connection
- join_room: User explicitly joins a room (for future features like group chats)

Usage:
    Import and call register_socket_handlers(socketio) in create_app()
"""

from flask import request
from flask_login import current_user
from flask_socketio import join_room, leave_room, emit


def register_socket_handlers(socketio):
    """
    Register all WebSocket event handlers with the SocketIO instance.

    This function is called from create_app() to set up socket handlers
    after the app context is available.

    Args:
        socketio: The Flask-SocketIO instance from extensions.py

    Events registered:
        - connect: Handles new WebSocket connections
        - disconnect: Handles WebSocket disconnections
        - join_user_room: Explicitly join user's private room
    """

    @socketio.on('connect')
    def handle_connect():
        """
        Handle new WebSocket connection.

        When a user connects:
        1. Check if they're authenticated via Flask-Login session
        2. If authenticated, join their private room for targeted messages
        3. Emit a confirmation event back to the client

        The private room pattern (user_{id}) allows us to send messages
        only to specific users without maintaining a mapping of socket IDs.

        Returns:
            bool: True to accept connection, False to reject
        """
        # Check if user is authenticated via Flask-Login session cookie
        if current_user.is_authenticated:
            # Join user's private room for targeted message delivery
            # Room name format: 'user_{user_id}'
            user_room = f'user_{current_user.id}'
            join_room(user_room)

            # Log connection for debugging (remove in production)
            print(f'[WebSocket] User {current_user.id} connected and joined room {user_room}')

            # Emit connection confirmation to the client
            emit('connected', {
                'status': 'connected',
                'user_id': current_user.id,
                'room': user_room
            })

            return True
        else:
            # Allow unauthenticated connections but don't join any rooms
            # This supports the case where user might authenticate later
            print('[WebSocket] Unauthenticated connection attempt')
            emit('connected', {
                'status': 'connected',
                'user_id': None,
                'room': None
            })
            return True

    @socketio.on('disconnect')
    def handle_disconnect():
        """
        Handle WebSocket disconnection.

        When a user disconnects:
        1. Leave their private room (cleanup)
        2. Log the disconnection for debugging

        Note: Flask-SocketIO automatically handles room cleanup on disconnect,
        but we explicitly leave for clarity and any custom cleanup logic.
        """
        if current_user.is_authenticated:
            user_room = f'user_{current_user.id}'
            leave_room(user_room)
            print(f'[WebSocket] User {current_user.id} disconnected from room {user_room}')
        else:
            print('[WebSocket] Unauthenticated user disconnected')

    @socketio.on('join_user_room')
    def handle_join_user_room():
        """
        Explicitly join user's private room.

        This event allows the client to request room membership after
        initial connection. Useful when:
        - User logs in after WebSocket connection is established
        - Reconnection scenarios where room membership needs refresh

        Emits:
            room_joined: Confirmation that user joined their room
        """
        if current_user.is_authenticated:
            user_room = f'user_{current_user.id}'
            join_room(user_room)

            emit('room_joined', {
                'room': user_room,
                'user_id': current_user.id
            })

            print(f'[WebSocket] User {current_user.id} explicitly joined room {user_room}')
        else:
            emit('error', {
                'message': 'Must be authenticated to join user room'
            })

    @socketio.on('ping')
    def handle_ping():
        """
        Handle ping event for connection keep-alive.

        Clients can send periodic pings to keep the WebSocket connection alive
        and verify connectivity. This is especially useful for:
        - Detecting stale connections
        - Preventing proxy/firewall timeouts
        - Client-side connection health monitoring

        Emits:
            pong: Response to confirm connection is alive
        """
        emit('pong', {'status': 'alive'})
