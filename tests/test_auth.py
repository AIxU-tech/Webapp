"""
Authentication API Tests

Tests for the /api/auth/* endpoints:
- Login
- Registration
- Email verification
- Logout
- Auto-enrollment
- Session security
"""

import pytest
import time
from backend.models import User, University
from backend.extensions import db


class TestLogin:
    """Tests for POST /api/auth/login"""

    def test_login_success(self, client, test_user, app):
        """Test successful login with valid credentials"""
        response = client.post('/api/auth/login', json={
            'email': 'test@example.edu',
            'password': 'testpassword123'
        })

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'user' in data
        assert data['user']['email'] == 'test@example.edu'

    def test_login_invalid_password(self, client, test_user):
        """Test login with wrong password"""
        response = client.post('/api/auth/login', json={
            'email': 'test@example.edu',
            'password': 'wrongpassword'
        })

        assert response.status_code == 401
        data = response.get_json()
        assert 'error' in data

    def test_login_nonexistent_user(self, client):
        """Test login with non-existent email"""
        response = client.post('/api/auth/login', json={
            'email': 'nobody@example.edu',
            'password': 'anypassword'
        })

        assert response.status_code == 401

    def test_login_missing_fields(self, client):
        """Test login with missing required fields"""
        # Missing password
        response = client.post('/api/auth/login', json={
            'email': 'test@example.edu'
        })
        assert response.status_code == 400

        # Missing email
        response = client.post('/api/auth/login', json={
            'password': 'testpassword123'
        })
        assert response.status_code == 400

        # Empty request
        response = client.post('/api/auth/login', json={})
        assert response.status_code == 400

    def test_login_sets_session_cookie(self, client, test_user, app):
        """Test that session cookie is set after login"""
        response = client.post('/api/auth/login', json={
            'email': 'test@example.edu',
            'password': 'testpassword123'
        })

        assert response.status_code == 200
        # Check that we can access authenticated endpoint
        me_response = client.get('/api/user/profile')
        assert me_response.status_code == 200


class TestRegistration:
    """Tests for POST /api/auth/register"""

    def test_register_requires_edu_email(self, client, test_university):
        """Test that registration requires a .edu email"""
        response = client.post('/api/auth/register', json={
            'email': 'user@gmail.com',
            'password': 'password123',
            'firstName': 'John',
            'lastName': 'Doe'
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'edu' in data['error'].lower()

    def test_register_missing_fields(self, client):
        """Test registration with missing required fields"""
        # Missing firstName
        response = client.post('/api/auth/register', json={
            'email': 'user@example.edu',
            'password': 'password123',
            'lastName': 'Doe'
        })
        assert response.status_code == 400

        # Missing lastName
        response = client.post('/api/auth/register', json={
            'email': 'user@example.edu',
            'password': 'password123',
            'firstName': 'John'
        })
        assert response.status_code == 400

    def test_register_duplicate_email(self, client, test_user, test_university):
        """Test registration with already existing email"""
        response = client.post('/api/auth/register', json={
            'email': 'test@example.edu',  # Already exists from test_user
            'password': 'newpassword123',
            'firstName': 'Another',
            'lastName': 'User'
        })

        assert response.status_code == 409
        data = response.get_json()
        assert 'exists' in data['error'].lower()

    def test_register_no_matching_university(self, client):
        """Test registration with .edu email that has no matching university"""
        response = client.post('/api/auth/register', json={
            'email': 'user@unknownuni.edu',
            'password': 'password123',
            'firstName': 'John',
            'lastName': 'Doe'
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'no university found' in data['error'].lower()

    def test_register_success_sends_verification(self, client, test_university, app):
        """Test successful registration initiates verification flow"""
        with app.app_context():
            response = client.post('/api/auth/register', json={
                'email': 'newuser@example.edu',
                'password': 'password123',
                'firstName': 'New',
                'lastName': 'User'
            })

            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert 'verification' in data['message'].lower()
            # Should include university info
            assert 'university' in data
            assert data['university']['name'] == 'Test University'

    def test_register_invalid_email_format(self, client, test_university):
        """Test registration with invalid email format"""
        response = client.post('/api/auth/register', json={
            'email': 'notanemail',
            'password': 'password123',
            'firstName': 'John',
            'lastName': 'Doe'
        })

        assert response.status_code == 400


class TestEmailVerification:
    """Tests for POST /api/auth/verify-email"""

    def test_verify_email_no_pending_registration(self, client):
        """Test verification without prior registration"""
        response = client.post('/api/auth/verify-email', json={
            'code': '123456'
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'no pending registration' in data['error'].lower()

    def test_verify_email_missing_code(self, client, test_university, app):
        """Test verification with missing code"""
        # First start registration
        with app.app_context():
            client.post('/api/auth/register', json={
                'email': 'newuser@example.edu',
                'password': 'password123',
                'firstName': 'New',
                'lastName': 'User'
            })

            # Try to verify without code
            response = client.post('/api/auth/verify-email', json={})
            assert response.status_code == 400

    def test_verify_email_wrong_code(self, client, test_university, app):
        """Test verification with incorrect code"""
        with app.app_context():
            # Start registration
            client.post('/api/auth/register', json={
                'email': 'newuser@example.edu',
                'password': 'password123',
                'firstName': 'New',
                'lastName': 'User'
            })

            # Try wrong code
            response = client.post('/api/auth/verify-email', json={
                'code': '000000'
            })

            assert response.status_code == 401
            data = response.get_json()
            assert 'invalid' in data['error'].lower()


class TestResendVerification:
    """Tests for POST /api/auth/resend-verification"""

    def test_resend_verification_no_pending(self, client):
        """Test resend without starting registration"""
        response = client.post('/api/auth/resend-verification')

        assert response.status_code == 400
        data = response.get_json()
        assert 'no pending registration' in data['error'].lower()

    def test_resend_verification_success(self, client, test_university, app):
        """Test successful verification code resend"""
        with app.app_context():
            # Start registration
            client.post('/api/auth/register', json={
                'email': 'newuser@example.edu',
                'password': 'password123',
                'firstName': 'New',
                'lastName': 'User'
            })

            # Resend code
            response = client.post('/api/auth/resend-verification')
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert 'remainingTime' in data


class TestAutoEnrollment:
    """Tests for automatic university enrollment during registration"""

    def test_register_auto_enrolls_in_matching_university(self, client, test_university, app):
        """Test that user with matching email domain is auto-enrolled"""
        with app.app_context():
            # Start registration with email matching test_university
            response = client.post('/api/auth/register', json={
                'email': 'student@example.edu',  # example domain matches test_university
                'password': 'password123',
                'firstName': 'Student',
                'lastName': 'Test'
            })

            assert response.status_code == 200
            data = response.get_json()
            assert 'university' in data
            assert data['university']['name'] == 'Test University'

    def test_register_subdomain_email_matches_base_domain(self, client, app):
        """Test that subdomain emails match base domain universities"""
        with app.app_context():
            # Create university with stanford domain
            university = University(
                name='Stanford University',
                email_domain='stanford',
                clubName='Stanford AI Club',
                location='Stanford, CA',
                description='Stanford AI club'
            )
            db.session.add(university)
            db.session.commit()

            # Try to register with cs.stanford.edu
            response = client.post('/api/auth/register', json={
                'email': 'student@cs.stanford.edu',
                'password': 'password123',
                'firstName': 'CS',
                'lastName': 'Student'
            })

            assert response.status_code == 200
            data = response.get_json()
            assert 'university' in data
            assert data['university']['name'] == 'Stanford University'


class TestWhitelistedDomains:
    """Tests for whitelisted non-.edu domains"""

    def test_register_whitelisted_domain_bypasses_university_check(self, client, app):
        """Test that whitelisted domains can register without matching university"""
        with app.app_context():
            response = client.post('/api/auth/register', json={
                'email': 'user@peekz.com',  # peekz.com is in whitelist
                'password': 'password123',
                'firstName': 'Whitelisted',
                'lastName': 'User'
            })

            # Should succeed even without matching university
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            # University should not be included for whitelisted domains
            assert 'university' not in data or data.get('university') is None


class TestLogout:
    """Tests for /api/auth/logout"""

    def test_logout_success(self, authenticated_client, app):
        """Test successful logout"""
        response = authenticated_client.post('/api/auth/logout')

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True

    def test_logout_unauthenticated(self, client):
        """Test logout when not logged in"""
        response = client.post('/api/auth/logout')

        # Should redirect or return 401
        assert response.status_code in [401, 302]

    def test_logout_clears_session(self, authenticated_client, app):
        """Test that logout clears session and prevents access"""
        # Logout
        authenticated_client.post('/api/auth/logout')

        # Try to access protected route
        response = authenticated_client.get('/api/user/profile')
        assert response.status_code == 401


class TestSessionSecurity:
    """Tests for session management and security"""

    def test_authenticated_route_after_login(self, client, test_user, app):
        """Test accessing protected route with valid session"""
        with app.app_context():
            # Login
            client.post('/api/auth/login', json={
                'email': 'test@example.edu',
                'password': 'testpassword123'
            })

            # Access protected route
            response = client.get('/api/user/profile')
            assert response.status_code == 200
            data = response.get_json()
            assert data['email'] == 'test@example.edu'

    def test_protected_route_without_login(self, client):
        """Test accessing protected route without login"""
        response = client.get('/api/user/profile')
        assert response.status_code == 401

    def test_multiple_login_sessions(self, app, test_user):
        """Test that multiple clients can have separate sessions"""
        test_app = app

        # Create two separate clients
        client1 = test_app.test_client()
        client2 = test_app.test_client()

        with test_app.app_context():
            # Login with client1
            response1 = client1.post('/api/auth/login', json={
                'email': 'test@example.edu',
                'password': 'testpassword123'
            })
            assert response1.status_code == 200

            # Client2 should still be unauthenticated
            response2 = client2.get('/api/user/profile')
            assert response2.status_code == 401
