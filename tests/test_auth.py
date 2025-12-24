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
        me_response = client.get('/api/profile')
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
        response = authenticated_client.get('/api/profile')
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
            response = client.get('/api/profile')
            assert response.status_code == 200
            data = response.get_json()
            assert data['email'] == 'test@example.edu'

    def test_protected_route_without_login(self, client):
        """Test accessing protected route without login"""
        response = client.get('/api/profile')
        assert response.status_code == 401

    def test_multiple_login_sessions(self, app, test_user):
        """Test that session is isolated to the logged-in client"""
        # This test verifies that login creates a session that persists across requests
        # and that a fresh client without the session cookie cannot access protected routes

        # First, verify that an unauthenticated client cannot access profile
        fresh_client = app.test_client()
        response_unauth = fresh_client.get('/api/profile')
        assert response_unauth.status_code == 401

        # Now login and verify we can access profile
        with app.test_client() as client:
            # Login
            response_login = client.post('/api/auth/login', json={
                'email': 'test@example.edu',
                'password': 'testpassword123'
            })
            assert response_login.status_code == 200

            # Should be able to access profile after login
            response_profile = client.get('/api/profile')
            assert response_profile.status_code == 200

        # After exiting the context, a new client should be unauthenticated
        another_fresh_client = app.test_client()
        response_new = another_fresh_client.get('/api/profile')
        assert response_new.status_code == 401


class TestValidateToken:
    """Tests for GET /api/auth/validate-token"""

    def test_validate_token_missing_param(self, client, app):
        """Test validation fails without token parameter"""
        response = client.get('/api/auth/validate-token')

        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'required' in data['error'].lower()

    def test_validate_token_empty_param(self, client, app):
        """Test validation fails with empty token"""
        response = client.get('/api/auth/validate-token?token=')

        assert response.status_code == 400

    def test_validate_token_invalid(self, client, app):
        """Test validation fails with invalid token"""
        response = client.get('/api/auth/validate-token?token=invalid_token_12345')

        assert response.status_code == 404
        data = response.get_json()
        assert 'invalid' in data['error'].lower() or 'expired' in data['error'].lower()

    def test_validate_token_success(self, client, pending_university_request, app):
        """Test validation succeeds with valid token"""
        with app.app_context():
            from backend.models import UniversityRequest, University
            from backend.extensions import db

            request = db.session.get(UniversityRequest, pending_university_request.id)

            # Create a university for the request's email domain
            university = University(
                name=request.university_name,
                email_domain=request.email_domain,
                clubName=request.club_name,
                location=request.university_location,
                description=request.club_description or ''
            )
            db.session.add(university)
            db.session.commit()

            # Approve the request (generates token)
            admin = User(email='tokenadmin@example.edu', first_name='Token', last_name='Admin')
            admin.set_password('password123')
            admin.permission_level = 1  # ADMIN
            db.session.add(admin)
            db.session.commit()

            request.approve(admin.id, 'Approved for token test')
            request.generate_account_creation_token()
            db.session.commit()

            token = request.account_creation_token

            response = client.get(f'/api/auth/validate-token?token={token}')

            assert response.status_code == 200
            data = response.get_json()
            assert data['valid'] is True
            assert data['email'] == request.requester_email
            assert data['firstName'] == request.requester_first_name
            assert data['lastName'] == request.requester_last_name

    def test_validate_token_expired(self, client, pending_university_request, app):
        """Test validation fails with expired token"""
        with app.app_context():
            from backend.models import UniversityRequest, University
            from backend.extensions import db
            from datetime import datetime, timedelta

            request = db.session.get(UniversityRequest, pending_university_request.id)

            # Create university
            university = University(
                name=request.university_name,
                email_domain=request.email_domain,
                clubName=request.club_name,
                location=request.university_location,
                description=request.club_description or ''
            )
            db.session.add(university)
            db.session.commit()

            # Approve and generate token
            admin = User(email='expiryadmin@example.edu', first_name='Expiry', last_name='Admin')
            admin.set_password('password123')
            admin.permission_level = 1
            db.session.add(admin)
            db.session.commit()

            request.approve(admin.id, 'Approved')
            request.generate_account_creation_token()
            # Set token to expired
            request.token_expires_at = datetime.utcnow() - timedelta(days=1)
            db.session.commit()

            token = request.account_creation_token

            response = client.get(f'/api/auth/validate-token?token={token}')

            assert response.status_code == 404
            data = response.get_json()
            assert 'expired' in data['error'].lower() or 'invalid' in data['error'].lower()


class TestCompleteAccount:
    """Tests for POST /api/auth/complete-account"""

    def test_complete_account_missing_token(self, client, app):
        """Test completion fails without token"""
        response = client.post('/api/auth/complete-account', json={
            'password': 'newpassword123'
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_complete_account_missing_password(self, client, app):
        """Test completion fails without password"""
        response = client.post('/api/auth/complete-account', json={
            'token': 'sometoken'
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'password' in data['error'].lower()

    def test_complete_account_short_password(self, client, app):
        """Test completion fails with password too short"""
        response = client.post('/api/auth/complete-account', json={
            'token': 'sometoken',
            'password': '123'
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'at least 6' in data['error'].lower()

    def test_complete_account_invalid_token(self, client, app):
        """Test completion fails with invalid token"""
        response = client.post('/api/auth/complete-account', json={
            'token': 'invalid_token_xyz',
            'password': 'validpassword123'
        })

        assert response.status_code == 404
        data = response.get_json()
        assert 'invalid' in data['error'].lower() or 'expired' in data['error'].lower()

    def test_complete_account_success(self, client, pending_university_request, app):
        """Test successful account completion creates user and enrolls in university"""
        with app.app_context():
            from backend.models import UniversityRequest, University
            from backend.extensions import db

            request = db.session.get(UniversityRequest, pending_university_request.id)

            # Create the university
            university = University(
                name=request.university_name,
                email_domain=request.email_domain,
                clubName=request.club_name,
                location=request.university_location,
                description=request.club_description or ''
            )
            db.session.add(university)
            db.session.commit()
            uni_id = university.id

            # Approve and generate token
            admin = User(email='completeadmin@example.edu', first_name='Complete', last_name='Admin')
            admin.set_password('password123')
            admin.permission_level = 1
            db.session.add(admin)
            db.session.commit()

            request.approve(admin.id, 'Approved')
            request.generate_account_creation_token()
            db.session.commit()

            token = request.account_creation_token
            email = request.requester_email

            response = client.post('/api/auth/complete-account', json={
                'token': token,
                'password': 'newuserpassword123'
            })

            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert 'user' in data
            assert data['user']['email'] == email

            # Verify user was created and enrolled
            new_user = User.query.filter_by(email=email).first()
            assert new_user is not None
            assert new_user.university == request.university_name

            # Verify user is in university members list
            db.session.refresh(university)
            assert new_user.id in university.get_members_list()

            # Verify token is marked as used
            db.session.refresh(request)
            assert request.account_created_user_id == new_user.id

    def test_complete_account_token_already_used(self, client, pending_university_request, app):
        """Test completion fails if token was already used"""
        with app.app_context():
            from backend.models import UniversityRequest, University
            from backend.extensions import db

            request = db.session.get(UniversityRequest, pending_university_request.id)

            # Create university
            university = University(
                name=request.university_name,
                email_domain=request.email_domain,
                clubName=request.club_name,
                location=request.university_location,
                description=''
            )
            db.session.add(university)
            db.session.commit()

            # Create admin
            admin = User(email='usedadmin@example.edu', first_name='Used', last_name='Admin')
            admin.set_password('password123')
            admin.permission_level = 1
            db.session.add(admin)
            db.session.commit()

            request.approve(admin.id, 'Approved')
            request.generate_account_creation_token()
            db.session.commit()

            token = request.account_creation_token

            # Complete account first time (success)
            response1 = client.post('/api/auth/complete-account', json={
                'token': token,
                'password': 'password123'
            })
            assert response1.status_code == 200

            # Create a new client to avoid session issues
            new_client = app.test_client()

            # Try to use same token again (should fail)
            response2 = new_client.post('/api/auth/complete-account', json={
                'token': token,
                'password': 'anotherpassword123'
            })

            assert response2.status_code in [404, 409]

    def test_complete_account_email_already_exists(self, client, pending_university_request, app):
        """Test completion fails if email already has an account"""
        with app.app_context():
            from backend.models import UniversityRequest, University
            from backend.extensions import db

            request = db.session.get(UniversityRequest, pending_university_request.id)

            # Create university
            university = University(
                name=request.university_name,
                email_domain=request.email_domain,
                clubName=request.club_name,
                location=request.university_location,
                description=''
            )
            db.session.add(university)
            db.session.commit()

            # Create admin
            admin = User(email='existsadmin@example.edu', first_name='Exists', last_name='Admin')
            admin.set_password('password123')
            admin.permission_level = 1
            db.session.add(admin)
            db.session.commit()

            # Create a user with the same email as the request
            existing_user = User(
                email=request.requester_email,
                first_name='Existing',
                last_name='User'
            )
            existing_user.set_password('existingpass123')
            db.session.add(existing_user)
            db.session.commit()

            request.approve(admin.id, 'Approved')
            request.generate_account_creation_token()
            db.session.commit()

            token = request.account_creation_token

            response = client.post('/api/auth/complete-account', json={
                'token': token,
                'password': 'newpassword123'
            })

            assert response.status_code == 409
            data = response.get_json()
            assert 'exists' in data['error'].lower()

    def test_complete_account_logs_user_in(self, client, pending_university_request, app):
        """Test that completing account also logs the user in"""
        with app.app_context():
            from backend.models import UniversityRequest, University
            from backend.extensions import db

            request = db.session.get(UniversityRequest, pending_university_request.id)

            # Create university
            university = University(
                name=request.university_name,
                email_domain=request.email_domain,
                clubName=request.club_name,
                location=request.university_location,
                description=''
            )
            db.session.add(university)
            db.session.commit()

            # Create admin
            admin = User(email='loginadmin@example.edu', first_name='Login', last_name='Admin')
            admin.set_password('password123')
            admin.permission_level = 1
            db.session.add(admin)
            db.session.commit()

            request.approve(admin.id, 'Approved')
            request.generate_account_creation_token()
            db.session.commit()

            token = request.account_creation_token

            # Complete account
            client.post('/api/auth/complete-account', json={
                'token': token,
                'password': 'password123'
            })

            # Should be able to access protected route
            profile_response = client.get('/api/profile')
            assert profile_response.status_code == 200
