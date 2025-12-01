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

from flask import Flask, send_from_directory
import os
from backend.config import Config
from backend.extensions import db, login_manager, socketio


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

    # WebSockets: Flask-SocketIO for real-time communication
    # This enables bidirectional communication between server and client
    socketio.init_app(app)

    # Import models to ensure they're registered with SQLAlchemy
    from backend import models

    # Create database tables
    with app.app_context():
        db.create_all()  # default bind
        print("All tables ensured.")

    # Register blueprints
    from backend.routes import (
        public_bp,
        auth_bp,
        api_auth_bp,
        profile_bp,
        universities_bp,
        community_bp,
        messages_bp,
        notifications_bp,
        news_bp
    )

    app.register_blueprint(public_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(api_auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(universities_bp)
    app.register_blueprint(community_bp)
    app.register_blueprint(messages_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(news_bp)

    # =========================================================================
    # Register WebSocket Event Handlers
    # =========================================================================
    # Socket handlers manage real-time connections and events.
    # Must be registered after app context is available.
    from backend.sockets import register_socket_handlers
    register_socket_handlers(socketio)

    # =========================================================================
    # Serve React SPA
    # =========================================================================
    # Serve the React SPA (built assets) under /app
    @app.route('/app', defaults={'path': ''})
    @app.route('/app/<path:path>')
    def serve_react_app(path):
        """
        Serve the React single-page application from static/app.
        Any /app/* path that isn't a real file returns index.html
        so React Router can handle it.
        """
        static_app_dir = os.path.join(app.root_path, '..', 'static', 'app')

        if path != "" and os.path.exists(os.path.join(static_app_dir, path)):
            return send_from_directory(static_app_dir, path)
        # Fallback: always serve index.html for SPA routes
        return send_from_directory(static_app_dir, 'index.html')

    return app
