"""
Tests for authentication functionality
"""
import pytest
import json
from backend.models import User
from backend.extensions import db

@pytest.mark.auth
class TestRegistration:
    """Test user registration"""

    def test_register_page_loads(self, client):
        """Test that register page loads successfully"""
        response = client.get('/register')
        assert response.status_code == 200
        assert b'register' in response.data.lower() or b'sign up' in response.data.lower()

    def test_entry_page_loads(self, client):
        """Test that entry page loads successfully"""
        response = client.get('/entry')
        assert response.status_code == 200

    def test_entry_check_existing_user(self, client, test_user, app):
        """Test entry page redirects existing user to login"""
        response = client.post('/entry',
                              json={'email': test_user['email']},
                              content_type='application/json')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'login' in data['redirect']

    def test_entry_check_new_user(self, client, init_database):
        """Test entry page redirects new user to register"""
        response = client.post('/entry',
                              json={'email': 'newuser@example.com'},
                              content_type='application/json')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'register' in data['redirect']

    def test_successful_registration_flow(self, client, init_database, app, mocker):
        """Test complete registration flow with email verification"""
        # Mock the email sending function
        mock_send_email = mocker.patch('app.send_verification_email', return_value=True)

        # Submit registration form
        response = client.post('/register', data={
            'email': 'newuser@example.edu',
            'password': 'SecurePassword123!',
            'first_name': 'New',
            'last_name': 'User'
        }, follow_redirects=True)

        assert response.status_code == 200
        assert b'verification' in response.data.lower()
        mock_send_email.assert_called_once()

    def test_registration_duplicate_email(self, client, test_user, app):
        """Test registration fails with duplicate email"""
        response = client.post('/register', data={
            'email': test_user['email'],
            'password': 'Password123!',
        }, follow_redirects=True)

        assert response.status_code == 200
        assert b'already exists' in response.data.lower()

    def test_email_verification_success(self, client, init_database, app, mocker):
        """Test successful email verification"""
        mocker.patch('app.send_verification_email', return_value=True)
        # Mock time to prevent expiration
        mocker.patch('time.time', return_value=1234567890)

        # Use a single context for both session setup and request
        with client:
            # Register user
            with client.session_transaction() as sess:
                sess['pending_registration'] = {
                    'email': 'verify@example.com',
                    'password': 'Password123!',
                    'first_name': 'Verify',
                    'last_name': 'User',
                    'university_id': None,
                    'timestamp': 1234567890
                }
                sess['verification_code'] = '123456'
                sess['verification_timestamp'] = 1234567890

            # Submit verification code within the same context
            response = client.post('/verify_email', data={
                'code': '123456'
            }, follow_redirects=True)

            assert response.status_code == 200

        # Check user was created
        with app.app_context():
            user = User.query.filter_by(email='verify@example.com').first()
            assert user is not None
            assert user.email == 'verify@example.com'

    def test_email_verification_invalid_code(self, client, mocker):
        """Test email verification fails with invalid code"""
        mocker.patch('time.time', return_value=1234567890)

        with client:
            with client.session_transaction() as sess:
                sess['pending_registration'] = {
                    'email': 'test@example.com',
                    'password': 'Password123!',
                    'timestamp': 1234567890
                }
                sess['verification_code'] = '123456'
                sess['verification_timestamp'] = 1234567890

            response = client.post('/verify_email', data={
                'code': '999999'  # Wrong code
            }, follow_redirects=True)

            assert response.status_code == 200
            assert b'invalid' in response.data.lower()

    def test_email_verification_expired_code(self, client, mocker):
        """Test email verification fails with expired code"""
        # Mock time to be > 180 seconds later
        mocker.patch('time.time', return_value=1234567890 + 200)

        with client:
            with client.session_transaction() as sess:
                sess['pending_registration'] = {
                    'email': 'test@example.com',
                    'password': 'Password123!',
                    'timestamp': 1234567890
                }
                sess['verification_code'] = '123456'
                sess['verification_timestamp'] = 1234567890

            response = client.post('/verify_email', data={
                'code': '123456'
            }, follow_redirects=True)

            assert response.status_code == 200
            assert b'expired' in response.data.lower()


@pytest.mark.auth
class TestLogin:
    """Test user login"""

    def test_login_page_loads(self, client):
        """Test that login page loads successfully"""
        response = client.get('/login')
        assert response.status_code == 200

    def test_successful_login_with_email(self, client, test_user):
        """Test successful login with email"""
        response = client.post('/login', data={
            'email': test_user['email'],
            'password': test_user['password']
        }, follow_redirects=True)

        assert response.status_code == 200
        assert b'profile' in response.data.lower() or b'logged in' in response.data.lower()

    def test_login_invalid_email(self, client, init_database):
        """Test login fails with invalid email"""
        response = client.post('/login', data={
            'email': 'nonexistent@example.com',
            'password': 'WrongPassword123!'
        }, follow_redirects=True)

        assert response.status_code == 200
        assert b'invalid' in response.data.lower()

    def test_login_invalid_password(self, client, test_user):
        """Test login fails with invalid password"""
        response = client.post('/login', data={
            'email': test_user['email'],
            'password': 'WrongPassword123!'
        }, follow_redirects=True)

        assert response.status_code == 200
        assert b'invalid' in response.data.lower()

    def test_login_empty_fields(self, client, init_database):
        """Test login fails with empty fields"""
        response = client.post('/login', data={
            'email': '',
            'password': ''
        }, follow_redirects=True)

        assert response.status_code == 200


@pytest.mark.auth
class TestLogout:
    """Test user logout"""

    def test_logout_authenticated_user(self, authenticated_client):
        """Test logout for authenticated user"""
        response = authenticated_client.get('/logout', follow_redirects=True)
        assert response.status_code == 200
        assert b'logged out' in response.data.lower() or b'home' in response.data.lower()

    def test_logout_redirects_to_index(self, authenticated_client):
        """Test logout redirects to index page"""
        response = authenticated_client.get('/logout', follow_redirects=False)
        assert response.status_code == 302
        assert '/' in response.location


@pytest.mark.auth
class TestPasswordSecurity:
    """Test password hashing and security"""

    def test_password_is_hashed(self, app, init_database):
        """Test that passwords are stored as hashes"""
        with app.app_context():
            user = User(email='hash@example.com')
            user.set_password('TestPassword123!')
            db.session.add(user)
            db.session.commit()

            # Password should not be stored in plain text
            assert user.password_hash != 'TestPassword123!'
            assert len(user.password_hash) > 50  # Hashes are long

    def test_password_verification(self, app, init_database):
        """Test password verification"""
        with app.app_context():
            user = User(email='verify@example.com')
            user.set_password('TestPassword123!')
            db.session.add(user)
            db.session.commit()

            # Correct password should verify
            assert user.check_password('TestPassword123!') is True
            # Wrong password should not verify
            assert user.check_password('WrongPassword') is False


@pytest.mark.auth
class TestAuthorizationProtection:
    """Test login_required protection on routes"""

    def test_profile_requires_login(self, client):
        """Test that profile page requires login"""
        response = client.get('/profile', follow_redirects=False)
        assert response.status_code == 302  # Redirect to login

    def test_messages_requires_login(self, client):
        """Test that messages page requires login"""
        response = client.get('/messages', follow_redirects=False)
        assert response.status_code == 302

    def test_api_user_profile_requires_login(self, client):
        """Test that API user profile requires login"""
        response = client.get('/api/user/profile')
        assert response.status_code == 401  # API returns 401

    def test_update_profile_requires_login(self, client):
        """Test that update profile requires login"""
        response = client.post('/update_profile', data={
            'first_name': 'Test'
        }, follow_redirects=False)
        assert response.status_code == 302

    def test_authenticated_user_can_access_profile(self, authenticated_client):
        """Test that authenticated users can access profile"""
        response = authenticated_client.get('/profile')
        assert response.status_code == 200
