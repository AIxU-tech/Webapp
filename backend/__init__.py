"""
AIxU Backend Application Factory

This module contains the application factory pattern implementation for the
Flask backend. The create_app() function creates and configures a new Flask
application instance with all extensions, blueprints, and routes.

Architecture:
- Application Factory Pattern: Allows multiple app instances for testing
- Extension Initialization: SQLAlchemy, Flask-Login, Flask-SocketIO
- Blueprint Registration: Modular route organization
- WebSocket Support: Real-time communication via Flask-SocketIO
"""

from flask import Flask, send_from_directory, jsonify
import os
from backend.config import Config
from backend.extensions import db, login_manager, socketio
from flask_migrate import Migrate


def create_app(config_class=Config):
    """
    Application factory for creating Flask app instances.

    Creates and configures a Flask application with:
    - Database connection (SQLAlchemy + PostgreSQL)
    - User authentication (Flask-Login)
    - Real-time WebSockets (Flask-SocketIO)
    - All route blueprints
    - React SPA serving at /app/*

    Args:
        config_class: Configuration class to use (default: Config)

    Returns:
        Flask: Configured Flask application instance
    """
    app = Flask(__name__,
                template_folder='../templates',
                static_folder='../static')

    # Load configuration from config class
    app.config.from_object(config_class)

    # =========================================================================
    # Initialize Flask Extensions
    # =========================================================================

    # Database: SQLAlchemy ORM
    db.init_app(app)

    # Authentication: Flask-Login session management
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'  # Redirect here if login required
    login_manager.login_message = 'Please log in to access this page.'

    migrate = Migrate(app, db)

    # Custom unauthorized handler for API routes - return JSON 401 instead of redirect
    @login_manager.unauthorized_handler
    def unauthorized():
        """Return 401 JSON for API requests, redirect for page requests."""
        from flask import request
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Authentication required'}), 401
        # For non-API routes, use default redirect behavior
        from flask import redirect, url_for
        return redirect(url_for('auth.login'))

    # Clear Flask-Login's cached user after each request for proper session isolation
    @app.after_request
    def clear_login_user_cache(response):
        """
        Clear Flask-Login's cached user after each request.

        Flask-Login caches the authenticated user in g._login_user. In Flask 2.x,
        the 'g' object is scoped to the application context. When multiple requests
        share an app context (e.g., in tests), this cache can leak between requests,
        causing authentication state to persist incorrectly.

        This handler ensures each request starts with a fresh authentication check.
        The session cookie properly re-authenticates users via user_loader.
        """
        from flask import g
        if hasattr(g, '_login_user'):
            delattr(g, '_login_user')
        return response

    # WebSockets: Flask-SocketIO for real-time communication
    # This enables bidirectional communication between server and client
    socketio.init_app(app)

    # Import models to ensure they're registered with SQLAlchemy
    from backend import models

    # Create database tables
    with app.app_context():
        db.create_all()  # default bind
        print("All tables ensured.")

        # One-time migration: move opportunity tags from JSON to normalized table
        # Wrapped in try/except to allow app to start during flask db migrate/upgrade
        try:
            from backend.routes_v2.opportunities.helpers import migrate_json_tags_to_table
            migrated = migrate_json_tags_to_table()
            if migrated > 0:
                print(f"Migrated {migrated} opportunity tags to normalized table.")
        except Exception as e:
            print(f"Skipping tag migration (schema may need updating): {e}")

        # In development mode, ensure dev user exists for auto-login.
        # This creates dev@test.edu if not present, enabling seamless dev experience.
        if app.config.get('DEV_MODE', False):
            from backend.seed_data import ensure_dev_user

            try:
                ensure_dev_user()
            except Exception as e:
                print(
                    f"Skipping dev user creation (likely during migration): {e}")

    # Register blueprints
    from backend.routes_v2 import (
        public_bp,
        auth_bp,
        api_auth_bp,
        profile_bp,
        universities_bp,
        university_requests_bp,
        community_bp,
        opportunities_bp,
        messages_bp,
        notifications_bp,
        news_bp,
        events_bp
    )

    app.register_blueprint(public_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(api_auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(universities_bp)
    app.register_blueprint(university_requests_bp)
    app.register_blueprint(community_bp)
    app.register_blueprint(opportunities_bp)
    app.register_blueprint(messages_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(news_bp)
    app.register_blueprint(events_bp)

    # =========================================================================
    # Register WebSocket Event Handlers
    # =========================================================================
    # Socket handlers manage real-time connections and events.
    # Must be registered after app context is available.
    from backend.sockets import register_socket_handlers
    register_socket_handlers(socketio)

    # =========================================================================
    # Health Check Endpoint
    # =========================================================================
    @app.route('/healthz')
    def health_check():
        """Health check endpoint for Render and other orchestrators."""
        return jsonify({"status": "healthy"}), 200

    # =========================================================================
    # Error Handlers
    # =========================================================================
    from werkzeug.exceptions import BadRequest, UnsupportedMediaType

    @app.errorhandler(BadRequest)
    def handle_bad_request(e):
        """Handle malformed JSON and other bad requests"""
        return jsonify({'error': 'Bad request: ' + str(e.description)}), 400

    @app.errorhandler(UnsupportedMediaType)
    def handle_unsupported_media_type(e):
        """Handle requests with unsupported content types"""
        return jsonify({'error': 'Unsupported media type'}), 415

    @app.errorhandler(400)
    def handle_400_error(e):
        """Generic 400 error handler"""
        return jsonify({'error': str(e.description) if hasattr(e, 'description') else 'Bad request'}), 400

    # =========================================================================
    # Serve React SPA
    # =========================================================================
    # Serve the React SPA (built assets) under /app
    # Use absolute path to avoid any path resolution issues in production
    STATIC_APP_DIR = os.path.abspath(
        os.path.join(app.root_path, '..', 'static', 'app'))

    @app.route('/app', defaults={'path': ''})
    @app.route('/app/<path:path>')
    def serve_react_app(path):
        """
        Serve the React single-page application from static/app.
        Any /app/* path that isn't a real file returns index.html
        so React Router can handle it.
        """
        if path != "" and os.path.exists(os.path.join(STATIC_APP_DIR, path)):
            return send_from_directory(STATIC_APP_DIR, path)
        # Fallback: always serve index.html for SPA routes
        return send_from_directory(STATIC_APP_DIR, 'index.html')

    return app
