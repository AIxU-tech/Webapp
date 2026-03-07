"""
Pytest Configuration and Fixtures

This module provides shared fixtures for all tests:
- app: Flask application configured for testing
- client: Test client for making HTTP requests
- init_database: Fresh database for each test
- test_user: Pre-created user for authenticated tests
- test_university: Pre-created university for testing
- authenticated_client: Client with logged-in user session
- admin_user: User with site admin permissions
- And many more specialized fixtures...
"""

import pytest
import json
from backend import create_app
from backend.config import TestConfig
from backend.extensions import db
from backend.models import User, University, Note, Message, UniversityRole, UniversityRequest
from backend.constants import ADMIN, UniversityRoles


@pytest.fixture(scope='function')
def app():
    """
    Create and configure a Flask application instance for testing.

    Uses TestConfig which provides:
    - SQLite in-memory database
    - Testing mode enabled
    - Email sending disabled

    Yields:
        Flask: Configured test application
    """
    app = create_app(TestConfig)

    # Create application context
    with app.app_context():
        # Create all database tables
        db.create_all()
        yield app
        # Clean up after test
        db.session.remove()
        db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    """
    Create a test client for making HTTP requests.

    Args:
        app: Flask application fixture

    Returns:
        FlaskClient: Test client instance
    """
    return app.test_client()


@pytest.fixture(scope='function')
def init_database(app):
    """
    Initialize a fresh database for each test.

    This fixture ensures each test starts with a clean database state.

    Args:
        app: Flask application fixture

    Yields:
        SQLAlchemy: Database instance
    """
    with app.app_context():
        db.create_all()
        yield db
        db.session.rollback()


@pytest.fixture(scope='function')
def test_user(app):
    """
    Create a test user for authentication tests.

    Creates a user with:
    - Email: test@example.edu
    - Password: testpassword123
    - Name: Test User

    Args:
        app: Flask application fixture

    Returns:
        User: Created test user instance
    """
    with app.app_context():
        user = User(
            email='test@example.edu',
            first_name='Test',
            last_name='User'
        )
        user.set_password('testpassword123')
        db.session.add(user)
        db.session.commit()

        # Refresh to get the ID
        db.session.refresh(user)
        return user


@pytest.fixture(scope='function')
def test_university(app):
    """
    Create a test university.

    Creates a university with:
    - Name: Test University
    - Email domain: example
    - Club name: Test AI Club

    Args:
        app: Flask application fixture

    Returns:
        University: Created test university instance
    """
    with app.app_context():
        university = University(
            name='Test University',
            email_domain='example',
            clubName='Test AI Club',
            location='Test City, TS',
            description='A test university for automated testing'
        )
        db.session.add(university)
        db.session.commit()

        db.session.refresh(university)
        return university


@pytest.fixture(scope='function')
def authenticated_client(client, test_user, app):
    """
    Create a test client with an authenticated user session.

    This fixture logs in the test user and returns a client
    that maintains the authenticated session.

    Args:
        client: Test client fixture
        test_user: Test user fixture
        app: Flask application fixture

    Returns:
        FlaskClient: Authenticated test client
    """
    with app.app_context():
        # Login via the API endpoint
        response = client.post('/api/auth/login', json={
            'email': 'test@example.edu',
            'password': 'testpassword123'
        })
        assert response.status_code == 200

    return client


@pytest.fixture(scope='function')
def test_user_with_university(app, test_university):
    """
    Create a test user enrolled in a university.

    Args:
        app: Flask application fixture
        test_university: Test university fixture

    Returns:
        User: User enrolled in test university
    """
    with app.app_context():
        # Refresh university in this context
        university = db.session.get(University, test_university.id)

        user = User(
            email='student@example.edu',
            first_name='Student',
            last_name='Tester',
            university=university.name
        )
        user.set_password('studentpass123')
        db.session.add(user)
        db.session.commit()

        # Add user to university members
        university.add_member(user.id)
        db.session.commit()

        db.session.refresh(user)
        return user


# =============================================================================
# Admin User Fixtures
# =============================================================================

@pytest.fixture(scope='function')
def admin_user(app):
    """
    Create a site admin user.

    Creates a user with:
    - Email: admin@example.edu
    - Password: adminpassword123
    - Permission level: ADMIN (1)

    Args:
        app: Flask application fixture

    Returns:
        User: Created admin user instance
    """
    with app.app_context():
        user = User(
            email='admin@example.edu',
            first_name='Admin',
            last_name='User',
            permission_level=ADMIN
        )
        user.set_password('adminpassword123')
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        return user


@pytest.fixture(scope='function')
def authenticated_admin_client(client, admin_user, app):
    """
    Create a test client with an authenticated admin session.

    Args:
        client: Test client fixture
        admin_user: Admin user fixture
        app: Flask application fixture

    Returns:
        FlaskClient: Authenticated admin test client
    """
    with app.app_context():
        response = client.post('/api/auth/login', json={
            'email': 'admin@example.edu',
            'password': 'adminpassword123'
        })
        assert response.status_code == 200

    return client


# =============================================================================
# University Role Fixtures
# =============================================================================

@pytest.fixture(scope='function')
def president_user(app, test_university):
    """
    Create a user who is president of test_university.

    Args:
        app: Flask application fixture
        test_university: Test university fixture

    Returns:
        User: User who is president of the university
    """
    with app.app_context():
        university = db.session.get(University, test_university.id)

        user = User(
            email='president@example.edu',
            first_name='President',
            last_name='User',
            university=university.name
        )
        user.set_password('presidentpass123')
        db.session.add(user)
        db.session.commit()

        # Add to university members
        university.add_member(user.id)

        # Set as president
        UniversityRole.set_role(user.id, university.id, UniversityRoles.PRESIDENT)
        db.session.commit()

        db.session.refresh(user)
        return user


@pytest.fixture(scope='function')
def authenticated_president_client(client, president_user, app):
    """
    Create a test client with an authenticated president session.

    Args:
        client: Test client fixture
        president_user: President user fixture
        app: Flask application fixture

    Returns:
        FlaskClient: Authenticated president test client
    """
    with app.app_context():
        response = client.post('/api/auth/login', json={
            'email': 'president@example.edu',
            'password': 'presidentpass123'
        })
        assert response.status_code == 200

    return client


@pytest.fixture(scope='function')
def executive_user(app, test_university):
    """
    Create a user who is executive of test_university.

    Args:
        app: Flask application fixture
        test_university: Test university fixture

    Returns:
        User: User who is executive of the university
    """
    with app.app_context():
        university = db.session.get(University, test_university.id)

        user = User(
            email='executive@example.edu',
            first_name='Executive',
            last_name='User',
            university=university.name
        )
        user.set_password('executivepass123')
        db.session.add(user)
        db.session.commit()

        # Add to university members
        university.add_member(user.id)

        # Set as executive
        UniversityRole.set_role(user.id, university.id, UniversityRoles.EXECUTIVE)
        db.session.commit()

        db.session.refresh(user)
        return user


@pytest.fixture(scope='function')
def authenticated_executive_client(client, executive_user, app):
    """
    Create a test client with an authenticated executive session.

    Args:
        client: Test client fixture
        executive_user: Executive user fixture
        app: Flask application fixture

    Returns:
        FlaskClient: Authenticated executive test client
    """
    with app.app_context():
        response = client.post('/api/auth/login', json={
            'email': 'executive@example.edu',
            'password': 'executivepass123'
        })
        assert response.status_code == 200

    return client


@pytest.fixture(scope='function')
def member_user(app, test_university):
    """
    Create a regular member user of test_university.

    Args:
        app: Flask application fixture
        test_university: Test university fixture

    Returns:
        User: Regular member user
    """
    with app.app_context():
        university = db.session.get(University, test_university.id)

        user = User(
            email='member@example.edu',
            first_name='Member',
            last_name='User',
            university=university.name
        )
        user.set_password('memberpass123')
        db.session.add(user)
        db.session.commit()

        # Add to university members
        university.add_member(user.id)
        db.session.commit()

        db.session.refresh(user)
        return user


@pytest.fixture(scope='function')
def authenticated_member_client(client, member_user, app):
    """
    Create a test client with an authenticated member session.

    Args:
        client: Test client fixture
        member_user: Member user fixture
        app: Flask application fixture

    Returns:
        FlaskClient: Authenticated member test client
    """
    with app.app_context():
        response = client.post('/api/auth/login', json={
            'email': 'member@example.edu',
            'password': 'memberpass123'
        })
        assert response.status_code == 200

    return client


# =============================================================================
# Event Fixtures
# =============================================================================

@pytest.fixture(scope='function')
def test_event(app, test_university, executive_user):
    """
    Create a test event for attendance tests.

    Args:
        app: Flask application fixture
        test_university: Test university fixture
        executive_user: Executive user fixture

    Returns:
        Event: Created test event
    """
    with app.app_context():
        from backend.models.event import Event
        from datetime import datetime, timedelta
        event = Event(
            university_id=test_university.id,
            title='Test Event',
            description='A test event',
            location='Room 101',
            start_time=datetime.utcnow() + timedelta(days=1),
            created_by_id=executive_user.id
        )
        db.session.add(event)
        db.session.commit()
        db.session.refresh(event)
        return event


# =============================================================================
# Note Fixtures
# =============================================================================

@pytest.fixture(scope='function')
def test_note(app, test_user):
    """
    Create a test note authored by test_user.

    Args:
        app: Flask application fixture
        test_user: Test user fixture

    Returns:
        Note: Created test note
    """
    with app.app_context():
        user = db.session.get(User, test_user.id)

        note = Note(
            title='Test Note Title',
            content='This is test note content for testing purposes.',
            author_id=user.id
        )
        note.set_tags_list(['python', 'testing'])
        db.session.add(note)
        db.session.commit()

        db.session.refresh(note)
        return note


@pytest.fixture(scope='function')
def multiple_notes(app, test_user):
    """
    Create multiple test notes for listing/search tests.

    Args:
        app: Flask application fixture
        test_user: Test user fixture

    Returns:
        list: List of created notes
    """
    with app.app_context():
        user = db.session.get(User, test_user.id)

        notes = []
        for i in range(5):
            note = Note(
                title=f'Test Note {i}',
                content=f'Content for note {i}. Keywords: machine learning, AI.',
                author_id=user.id
            )
            note.set_tags_list(['test', f'tag{i}'])
            db.session.add(note)
            notes.append(note)

        db.session.commit()

        for note in notes:
            db.session.refresh(note)

        return notes


# =============================================================================
# Message Fixtures
# =============================================================================

@pytest.fixture(scope='function')
def second_user(app):
    """
    Create a second user for messaging tests.

    Args:
        app: Flask application fixture

    Returns:
        User: Second test user
    """
    with app.app_context():
        user = User(
            email='second@example.edu',
            first_name='Second',
            last_name='User'
        )
        user.set_password('secondpass123')
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        return user


@pytest.fixture(scope='function')
def test_message(app, test_user, second_user):
    """
    Create a test message between test_user and second_user.

    Args:
        app: Flask application fixture
        test_user: Sender user fixture
        second_user: Recipient user fixture

    Returns:
        Message: Created test message
    """
    with app.app_context():
        sender = db.session.get(User, test_user.id)
        recipient = db.session.get(User, second_user.id)

        message = Message(
            sender_id=sender.id,
            recipient_id=recipient.id,
            content='Hello, this is a test message!'
        )
        db.session.add(message)
        db.session.commit()
        db.session.refresh(message)
        return message


@pytest.fixture(scope='function')
def conversation_messages(app, test_user, second_user):
    """
    Create a conversation with multiple messages between two users.

    Args:
        app: Flask application fixture
        test_user: First user fixture
        second_user: Second user fixture

    Returns:
        list: List of messages in the conversation
    """
    with app.app_context():
        user1 = db.session.get(User, test_user.id)
        user2 = db.session.get(User, second_user.id)

        messages = []
        # User1 sends to User2
        msg1 = Message(sender_id=user1.id, recipient_id=user2.id, content='Hi there!')
        messages.append(msg1)

        # User2 replies
        msg2 = Message(sender_id=user2.id, recipient_id=user1.id, content='Hello!')
        messages.append(msg2)

        # User1 sends again
        msg3 = Message(sender_id=user1.id, recipient_id=user2.id, content='How are you?')
        messages.append(msg3)

        for msg in messages:
            db.session.add(msg)

        db.session.commit()

        for msg in messages:
            db.session.refresh(msg)

        return messages


# =============================================================================
# University Request Fixtures
# =============================================================================

@pytest.fixture(scope='function')
def pending_university_request(app):
    """
    Create a pending university request.

    Args:
        app: Flask application fixture

    Returns:
        UniversityRequest: Created pending request
    """
    with app.app_context():
        from backend.models.university_request import RequestStatus

        request = UniversityRequest(
            requester_email='requester@newuni.edu',
            requester_first_name='Request',
            requester_last_name='User',
            university_name='New University',
            university_location='New City, NC',
            email_domain='newuni',
            club_name='New AI Club',
            club_description='A new AI club for testing',
            status=RequestStatus.PENDING
        )
        db.session.add(request)
        db.session.commit()
        db.session.refresh(request)
        return request


# =============================================================================
# Helper Fixtures
# =============================================================================

@pytest.fixture(scope='function')
def sample_image_data():
    """
    Generate sample image data for profile picture tests.

    Returns:
        bytes: Minimal valid JPEG image data
    """
    # Minimal valid JPEG (1x1 pixel red image)
    # This is a real JPEG that will pass image validation
    return bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
        0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
        0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
        0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
        0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
        0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
        0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
        0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
        0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
        0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
        0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
        0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
        0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
        0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
        0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
        0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xA0, 0x02, 0x80,
        0x0A, 0x00, 0xFF, 0xD9
    ])


@pytest.fixture(scope='function')
def large_image_data():
    """
    Generate oversized image data for testing size limits.

    Returns:
        bytes: Image data larger than 5MB
    """
    # Create data larger than 5MB limit
    return b'\x00' * (6 * 1024 * 1024)  # 6MB of zeros


# =============================================================================
# Second University Fixture (for multi-university tests)
# =============================================================================

@pytest.fixture(scope='function')
def second_university(app):
    """
    Create a second university for multi-university tests.

    Args:
        app: Flask application fixture

    Returns:
        University: Second test university
    """
    with app.app_context():
        university = University(
            name='Second University',
            email_domain='seconduni',
            clubName='Second AI Club',
            location='Second City, SC',
            description='A second test university'
        )
        db.session.add(university)
        db.session.commit()
        db.session.refresh(university)
        return university
