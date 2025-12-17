import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Flask application configuration"""

    # Development mode - enables features like bypassing email verification
    # Set DEV_MODE=true in environment to enable
    DEV_MODE = os.environ.get('DEV_MODE', '').lower() == 'true'

    # Secret key for sessions
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key')

    # =========================================================================
    # Session Cookie Security
    # =========================================================================
    # HttpOnly: Prevent JavaScript access to session cookie (XSS protection)
    SESSION_COOKIE_HTTPONLY = True

    # SameSite: CSRF protection - 'Lax' allows normal navigation but blocks
    # cross-site POST requests. Use 'Strict' for maximum security.
    SESSION_COOKIE_SAMESITE = 'Lax'

    # Secure: Only send cookies over HTTPS
    # Disabled in dev mode since localhost uses HTTP
    SESSION_COOKIE_SECURE = not DEV_MODE

    # Session lifetime: 31 days for "remember me" functionality
    PERMANENT_SESSION_LIFETIME = timedelta(days=31)

    # Database configuration
    # URL has to be in certain format for render
    uri = os.environ.get("DATABASE_URL")
    if uri and uri.startswith("postgres://"):
        uri = uri.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_DATABASE_URI = uri
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Allow for connection pooling - otherwise every user makes a new connection to the DB with every click
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 10,
        "max_overflow": 5,
        "pool_timeout": 30,
        "pool_recycle": 1800,
    }

    # File upload settings
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB max request size (for profile pics)

    # SMTP configuration
    SMTP_HOST = os.getenv('SMTP_HOST')
    SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USER = os.getenv('SMTP_USER')
    SMTP_PASS = os.getenv('SMTP_PASS')
    ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@aixu.tech')


class TestConfig(Config):
    """Test configuration - uses SQLite for isolated, fast tests"""

    TESTING = True
    SECRET_KEY = 'test-secret-key'

    # Explicitly disable DEV_MODE in tests to ensure deterministic behavior
    # Tests should verify actual validation logic, not dev bypass
    DEV_MODE = False

    # Tests run over HTTP, so disable secure cookie requirement
    SESSION_COOKIE_SECURE = False

    # Use SQLite for testing (in-memory for speed, or file for debugging)
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

    # Disable connection pooling for SQLite
    SQLALCHEMY_ENGINE_OPTIONS = {}

    # Disable CSRF for easier testing
    WTF_CSRF_ENABLED = False

    # Use simpler password hashing for faster tests
    # Note: Still secure, just fewer iterations
    BCRYPT_LOG_ROUNDS = 4

    # Disable email sending in tests
    SMTP_HOST = None
    SMTP_USER = None
    SMTP_PASS = None
