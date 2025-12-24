"""
AIxU Application Entry Point

This is the main entry point for running the AIxU Flask application.
It creates the app using the application factory and starts the server
with WebSocket support via Flask-SocketIO.

Development:
    python app.py

Production:
    gunicorn --worker-class eventlet -w 1 app:app

Note: WebSockets require the eventlet worker for async support in production.
Local development uses threading mode to avoid eventlet/kqueue/psycopg2 issues on macOS.
"""

import os

# =============================================================================
# Conditional Eventlet Monkey Patching
# =============================================================================
# Only apply eventlet monkey patching in production (Render) or when explicitly requested.
# On macOS, eventlet has compatibility issues with kqueue and psycopg2 that cause
# database connection failures. We use threading mode for local development instead.
if os.environ.get('RENDER') or os.environ.get('USE_EVENTLET'):
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

# =============================================================================
# Initialize Background Task Scheduler
# =============================================================================
# Start the scheduler for automatic news refresh every 24 hours.
# Only start in the main process (not in Flask's reloader subprocess).
# WERKZEUG_RUN_MAIN is set to 'true' in the reloader child process.
# Skip scheduler in DEV_MODE to avoid automatic API calls during development.
if not app.config.get('DEV_MODE', False):
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        from backend.services.scheduler import init_scheduler
        init_scheduler(app)

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
    # For production, use gunicorn with eventlet worker:
    #   gunicorn --worker-class eventlet -w 1 app:app
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)
