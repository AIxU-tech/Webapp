"""
AIxU Application Entry Point

This is the main entry point for running the AIxU Flask application.
It creates the app using the application factory and starts the server
with WebSocket support via Flask-SocketIO.

Development:
    python app.py

Production:
    gunicorn -k geventwebsocket.gunicorn.workers.GeventWebSocketWorker -w 1 app:app

Note: WebSockets use the gevent-websocket worker for async support in production.
Local development uses threading mode to avoid monkey-patching the stdlib while
working on macOS.
"""

import os

# =============================================================================
# Conditional Gevent Monkey Patching
# =============================================================================
# Monkey-patching must happen as early as possible — before any other imports
# touch the stdlib socket/ssl/threading modules — otherwise psycopg2 and the
# socketio server can hang or behave unpredictably.
#
# Only patch in production (Render) or when explicitly requested via USE_GEVENT.
# USE_EVENTLET is kept as a legacy alias so existing infra keeps working until
# renamed.
if os.environ.get('RENDER') or os.environ.get('USE_GEVENT') or os.environ.get('USE_EVENTLET'):
    from gevent import monkey
    monkey.patch_all()

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
    #   - allow_unsafe_werkzeug=True permits threading mode for local dev
    #
    # For production, use gunicorn with the gevent-websocket worker:
    #   gunicorn -k geventwebsocket.gunicorn.workers.GeventWebSocketWorker -w 1 app:app
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)
