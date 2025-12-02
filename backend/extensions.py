"""
Flask Extensions Module

Initializes and exports all Flask extensions used throughout the application.
Extensions are initialized here without an app context, then bound to the app
in the application factory (create_app).

Extensions:
- db: SQLAlchemy database instance for ORM operations
- login_manager: Flask-Login manager for user session handling
- socketio: Flask-SocketIO instance for real-time WebSocket communication
"""

import os
import sys
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_socketio import SocketIO

# =============================================================================
# Database Extension
# =============================================================================
# SQLAlchemy instance for all database operations.
# Configured in create_app() with the DATABASE_URL from environment.
db = SQLAlchemy()

# =============================================================================
# Authentication Extension
# =============================================================================
# Flask-Login manager handles user session management.
# Configured in create_app() with login_view and login_message.
login_manager = LoginManager()

# =============================================================================
# WebSocket Extension
# =============================================================================
# Flask-SocketIO enables real-time bidirectional communication.
# Used for:
# - Real-time messaging between users
# - Live notifications
# - Instant updates to UI without polling
#
# Configuration:
# - cors_allowed_origins: Allows connections from any origin (configure for production)
# - async_mode: Uses eventlet for production, threading for local dev (macOS compatibility)
# - logger/engineio_logger: Disabled in production for performance
#
# Note: eventlet has compatibility issues with kqueue (macOS) and psycopg2.
# We use threading mode for local development to avoid this issue.
def _get_async_mode():
    """Determine async mode based on environment."""
    # Use threading for local development on macOS to avoid eventlet/kqueue issues
    # Use eventlet in production (Render sets RENDER=true)
    if os.environ.get('RENDER') or os.environ.get('USE_EVENTLET'):
        return 'eventlet'
    # Default to threading for local dev
    return 'threading'

socketio = SocketIO(
    cors_allowed_origins="*",  # In production, restrict to your domain
    async_mode=_get_async_mode(),
    logger=False,              # Disable verbose logging in production
    engineio_logger=False      # Disable engine.io logging
)
