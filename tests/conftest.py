"""
Test configuration and fixtures for pytest
"""
import pytest
import os
import tempfile
from backend import create_app
from backend.extensions import db
from backend.models import User, University, Note, Message, UserFollows, UserLikedUniversity

@pytest.fixture(scope='session')
def app():
    """Create and configure a test application instance"""
    # Create a temporary database file
    db_fd, db_path = tempfile.mkstemp()

    # Create the Flask app using the application factory
    from backend.config import Config

    class TestConfig(Config):
        TESTING = True
        SQLALCHEMY_DATABASE_URI = f'sqlite:///{db_path}'
        WTF_CSRF_ENABLED = False
        SECRET_KEY = 'test-secret-key'
        MAX_CONTENT_LENGTH = 10 * 1024 * 1024

    flask_app = create_app(TestConfig)

    # Create the database and tables
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.drop_all()

    # Clean up
    os.close(db_fd)
    os.unlink(db_path)

@pytest.fixture(scope='function')
def client(app):
    """Create a test client for the app"""
    return app.test_client()

@pytest.fixture(scope='function')
def runner(app):
    """Create a test CLI runner"""
    return app.test_cli_runner()

@pytest.fixture(scope='function')
def init_database(app):
    """Initialize database with clean state for each test"""
    with app.app_context():
        db.create_all()
        yield db
        db.session.remove()
        db.drop_all()

@pytest.fixture
def test_user(app, init_database):
    """Create a test user"""
    with app.app_context():
        user = User(
            email='testuser@example.com',
            first_name='Test',
            last_name='User',
            university='Test University'
        )
        user.set_password('TestPassword123!')
        db.session.add(user)
        db.session.commit()

        # Refresh to get the ID
        db.session.refresh(user)
        user_id = user.id

    return {
        'id': user_id,
        'email': 'testuser@example.com',
        'password': 'TestPassword123!',
        'first_name': 'Test',
        'last_name': 'User'
    }

@pytest.fixture
def test_user2(app, init_database):
    """Create a second test user"""
    with app.app_context():
        user = User(
            email='testuser2@example.com',
            first_name='Test2',
            last_name='User2'
        )
        user.set_password('TestPassword123!')
        db.session.add(user)
        db.session.commit()

        db.session.refresh(user)
        user_id = user.id

    return {
        'id': user_id,
        'email': 'testuser2@example.com',
        'password': 'TestPassword123!'
    }

@pytest.fixture
def admin_user(app, init_database):
    """Create an admin user"""
    with app.app_context():
        user = User(
            email='admin@example.com',
            permission_level=2  # SUPER_ADMIN
        )
        user.set_password('AdminPassword123!')
        db.session.add(user)
        db.session.commit()

        db.session.refresh(user)
        user_id = user.id

    return {
        'id': user_id,
        'email': 'admin@example.com',
        'password': 'AdminPassword123!',
        'permission_level': 2
    }

@pytest.fixture
def test_university(app, init_database, admin_user):
    """Create a test university"""
    with app.app_context():
        uni = University(
            name='Test University',
            clubName='Test AI Club',
            location='Test City, Test State',
            member_count=1,
            admin_id=admin_user['id']
        )
        uni.set_members_list([admin_user['id']])
        db.session.add(uni)
        db.session.commit()

        db.session.refresh(uni)
        uni_id = uni.id

    return {
        'id': uni_id,
        'name': 'Test University',
        'clubName': 'Test AI Club',
        'location': 'Test City, Test State'
    }

@pytest.fixture
def test_note(app, init_database, test_user):
    """Create a test note"""
    with app.app_context():
        note = Note(
            title='Test Note Title',
            content='This is test note content for testing purposes.',
            author_id=test_user['id']
        )
        note.set_tags_list(['Test', 'Sample', 'AI'])
        db.session.add(note)
        db.session.commit()

        db.session.refresh(note)
        note_id = note.id

    return {
        'id': note_id,
        'title': 'Test Note Title',
        'content': 'This is test note content for testing purposes.',
        'author_id': test_user['id']
    }

@pytest.fixture
def test_message(app, init_database, test_user, test_user2):
    """Create a test message"""
    with app.app_context():
        message = Message(
            sender_id=test_user['id'],
            recipient_id=test_user2['id'],
            content='This is a test message.'
        )
        db.session.add(message)
        db.session.commit()

        db.session.refresh(message)
        message_id = message.id

    return {
        'id': message_id,
        'sender_id': test_user['id'],
        'recipient_id': test_user2['id'],
        'content': 'This is a test message.'
    }

@pytest.fixture
def authenticated_client(client, test_user):
    """Return a client with authenticated session"""
    with client:
        client.post('/login', data={
            'email': test_user['email'],
            'password': test_user['password']
        }, follow_redirects=True)
        yield client

@pytest.fixture
def admin_authenticated_client(client, admin_user):
    """Return a client with authenticated admin session"""
    with client:
        client.post('/login', data={
            'email': admin_user['email'],
            'password': admin_user['password']
        }, follow_redirects=True)
        yield client

@pytest.fixture
def sample_image():
    """Create a sample image for testing profile picture uploads"""
    from PIL import Image
    import io

    # Create a simple 100x100 red image
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)

    return img_bytes
