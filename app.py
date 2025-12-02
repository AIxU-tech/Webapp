"""
AIxU Application Entry Point

This is the main entry point for running the AIxU Flask application.
It creates the app using the application factory and starts the server
with WebSocket support via Flask-SocketIO.

Development:
    python app.py

Production:
    gunicorn --worker-class eventlet -w 1 app:app

Note: WebSockets require the eventlet worker for async support.
"""

# =============================================================================
# CRITICAL: Eventlet monkey patching MUST happen before any other imports
# =============================================================================
# This patches Python's standard library to be cooperative with eventlet's
# green threads. Without this, gunicorn with eventlet worker will fail.
import eventlet
eventlet.monkey_patch()

from backend import create_app
from backend.extensions import socketio

# =============================================================================
# Create Flask Application
# =============================================================================
# Uses the application factory pattern to create and configure the app.
# This allows different configurations for development, testing, and production.
app = create_app()

if __name__ == '__main__':
    # =========================================================================
    # Start Development Server with WebSocket Support
    # =========================================================================
    # socketio.run() replaces app.run() to enable WebSocket handling.
    # In development:
    #   - debug=True enables auto-reload and debug mode
    #   - port=5000 is the default Flask port
    #   - WebSocket connections are handled via eventlet
    #
    # For production, use gunicorn with eventlet worker:
    #   gunicorn --worker-class eventlet -w 1 app:app
    socketio.run(app, debug=True, port=5000)
