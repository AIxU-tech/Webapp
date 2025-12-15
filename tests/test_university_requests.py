"""
University Requests API Tests

Tests for university request flow:
- POST /api/university-requests/start - Start request flow
- POST /api/university-requests/verify - Verify email code
- POST /api/university-requests/submit - Submit request
- POST /api/university-requests/resend-code - Resend verification
- GET /api/university-requests/admin/pending - Admin: list pending
- POST /api/university-requests/admin/<id>/approve - Admin: approve
- POST /api/university-requests/admin/<id>/reject - Admin: reject
"""

import pytest
import time
from backend.models import User, University, UniversityRequest
from backend.models.university_request import RequestStatus
from backend.extensions import db


class TestStartRequest:
    """Tests for starting university request flow"""

    def test_start_request_sends_verification(self, client, app):
        """Test that starting request sends verification email"""
        response = client.post('/api/university-requests/start', json={
            'email': 'newstudent@newuniversity.edu',
            'firstName': 'New',
            'lastName': 'Student'
        })

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'verification' in data['message'].lower()
        assert data['emailDomain'] == 'newuniversity'

    def test_start_request_requires_edu_email(self, client, app):
        """Test that request requires .edu email"""
        response = client.post('/api/university-requests/start', json={
            'email': 'user@gmail.com',
            'firstName': 'Test',
            'lastName': 'User'
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'edu' in data['error'].lower()

    def test_start_request_existing_university_fails(self, client, test_university, app):
        """Test that request fails if university already exists for domain"""
        with app.app_context():
            # test_university has domain 'example'
            response = client.post('/api/university-requests/start', json={
                'email': 'student@example.edu',
                'firstName': 'Existing',
                'lastName': 'Student'
            })

            assert response.status_code == 400
            data = response.get_json()
            assert data['universityExists'] is True
            assert 'Test University' in data['universityName']

    def test_start_request_existing_user_fails(self, client, test_user, app):
        """Test that request fails if email already has account"""
        with app.app_context():
            response = client.post('/api/university-requests/start', json={
                'email': 'test@example.edu',  # test_user's email
                'firstName': 'Duplicate',
                'lastName': 'User'
            })

            assert response.status_code == 409
            data = response.get_json()
            assert 'exists' in data['error'].lower()

    def test_start_request_pending_request_exists(self, client, pending_university_request, app):
        """Test that request fails if pending request exists"""
        with app.app_context():
            response = client.post('/api/university-requests/start', json={
                'email': 'requester@newuni.edu',  # Same as pending_university_request
                'firstName': 'Duplicate',
                'lastName': 'Request'
            })

            assert response.status_code == 409
            data = response.get_json()
            assert 'pending' in data['error'].lower()

    def test_start_request_missing_fields(self, client, app):
        """Test that request requires all fields"""
        # Missing firstName
        response = client.post('/api/university-requests/start', json={
            'email': 'student@newuni.edu',
            'lastName': 'User'
        })
        assert response.status_code == 400

        # Missing lastName
        response = client.post('/api/university-requests/start', json={
            'email': 'student@newuni.edu',
            'firstName': 'Test'
        })
        assert response.status_code == 400


class TestVerifyRequest:
    """Tests for verifying email code"""

    def test_verify_request_code_wrong(self, client, app):
        """Test that wrong code is rejected"""
        # Start request first
        client.post('/api/university-requests/start', json={
            'email': 'verify@newuni.edu',
            'firstName': 'Verify',
            'lastName': 'User'
        })

        # Try wrong code
        response = client.post('/api/university-requests/verify', json={
            'code': '000000'
        })

        assert response.status_code == 401
        data = response.get_json()
        assert 'invalid' in data['error'].lower()

    def test_verify_request_no_pending(self, client, app):
        """Test verification without pending request"""
        response = client.post('/api/university-requests/verify', json={
            'code': '123456'
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'no pending request' in data['error'].lower()

    def test_verify_request_missing_code(self, client, app):
        """Test verification without code"""
        # Start request
        client.post('/api/university-requests/start', json={
            'email': 'nocode@newuni.edu',
            'firstName': 'No',
            'lastName': 'Code'
        })

        response = client.post('/api/university-requests/verify', json={})

        assert response.status_code == 400


class TestResendCode:
    """Tests for resending verification code"""

    def test_resend_code_success(self, client, app):
        """Test successful code resend"""
        # Start request
        client.post('/api/university-requests/start', json={
            'email': 'resend@newuni.edu',
            'firstName': 'Resend',
            'lastName': 'User'
        })

        # Resend code
        response = client.post('/api/university-requests/resend-code')

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'remainingTime' in data

    def test_resend_code_no_pending(self, client, app):
        """Test resend without pending request"""
        response = client.post('/api/university-requests/resend-code')

        assert response.status_code == 400


class TestSubmitRequest:
    """Tests for submitting university request"""

    def test_submit_request_without_verification_fails(self, client, app):
        """Test that submit fails without prior verification"""
        # Start request but don't verify
        client.post('/api/university-requests/start', json={
            'email': 'noverify@newuni.edu',
            'firstName': 'No',
            'lastName': 'Verify'
        })

        response = client.post('/api/university-requests/submit', json={
            'universityName': 'New University',
            'universityLocation': 'New City, NC',
            'clubName': 'New AI Club',
            'clubDescription': 'A new AI club'
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'not verified' in data['error'].lower()

    def test_submit_request_no_pending(self, client, app):
        """Test submit without starting request"""
        response = client.post('/api/university-requests/submit', json={
            'universityName': 'New University',
            'universityLocation': 'New City, NC',
            'clubName': 'New AI Club',
            'clubDescription': 'A new AI club'
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'no pending request' in data['error'].lower()

    def test_submit_request_missing_fields(self, client, app):
        """Test that submit requires all university fields"""
        # Start and manually set verified flag (simulating verification)
        with client.session_transaction() as sess:
            sess['pending_uni_request'] = {
                'email': 'verified@newuni.edu',
                'first_name': 'Verified',
                'last_name': 'User',
                'email_domain': 'newuni',
                'timestamp': time.time()
            }
            sess['uni_request_verified'] = time.time()

        # Missing clubName
        response = client.post('/api/university-requests/submit', json={
            'universityName': 'New University',
            'universityLocation': 'New City',
            'clubDescription': 'Description'
        })

        assert response.status_code == 400


class TestAdminPendingRequests:
    """Tests for admin viewing pending requests"""

    def test_get_pending_requests_as_admin(
        self, authenticated_admin_client, pending_university_request, admin_user, app
    ):
        """Test that admin can list pending requests"""
        response = authenticated_admin_client.get(
            '/api/university-requests/admin/pending'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert 'requests' in data
        assert len(data['requests']) >= 1
        assert 'count' in data

    def test_get_pending_requests_as_user_fails(
        self, authenticated_client, pending_university_request, app
    ):
        """Test that regular user cannot list pending requests"""
        response = authenticated_client.get(
            '/api/university-requests/admin/pending'
        )

        assert response.status_code == 403

    def test_get_pending_requests_unauthenticated(self, client, app):
        """Test that unauthenticated user cannot access"""
        response = client.get('/api/university-requests/admin/pending')

        assert response.status_code == 401


class TestAdminApproveRequest:
    """Tests for admin approving requests"""

    def test_approve_request_creates_university(
        self, authenticated_admin_client, pending_university_request, admin_user, app
    ):
        """Test that approving request creates university"""
        with app.app_context():
            request = db.session.get(UniversityRequest, pending_university_request.id)
            request_id = request.id
            email_domain = request.email_domain

            response = authenticated_admin_client.post(
                f'/api/university-requests/admin/{request_id}/approve',
                json={'notes': 'Approved for testing'}
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert 'universityId' in data

            # Verify university was created
            university = University.query.filter_by(email_domain=email_domain).first()
            assert university is not None
            assert university.name == 'New University'

    def test_approve_request_already_processed(
        self, authenticated_admin_client, admin_user, app
    ):
        """Test that approving already approved request fails"""
        with app.app_context():
            # Create and approve a request
            request = UniversityRequest(
                requester_email='approved@newuni.edu',
                requester_first_name='Approved',
                requester_last_name='User',
                university_name='Approved Uni',
                university_location='City',
                email_domain='approveduni',
                club_name='Club',
                club_description='Description',
                status=RequestStatus.APPROVED  # Already approved
            )
            db.session.add(request)
            db.session.commit()
            request_id = request.id

            response = authenticated_admin_client.post(
                f'/api/university-requests/admin/{request_id}/approve'
            )

            assert response.status_code == 400
            data = response.get_json()
            assert 'already' in data['error'].lower()

    def test_approve_request_domain_taken(
        self, authenticated_admin_client, pending_university_request, test_university, admin_user, app
    ):
        """Test that approve fails if domain became taken"""
        with app.app_context():
            # Change pending request's domain to match existing university
            request = db.session.get(UniversityRequest, pending_university_request.id)
            request.email_domain = 'example'  # Same as test_university
            db.session.commit()

            response = authenticated_admin_client.post(
                f'/api/university-requests/admin/{request.id}/approve'
            )

            assert response.status_code == 400
            data = response.get_json()
            assert 'exists' in data['error'].lower()

    def test_approve_request_as_user_fails(
        self, authenticated_client, pending_university_request, app
    ):
        """Test that regular user cannot approve"""
        with app.app_context():
            request = db.session.get(UniversityRequest, pending_university_request.id)

            response = authenticated_client.post(
                f'/api/university-requests/admin/{request.id}/approve'
            )

            assert response.status_code == 403


class TestAdminRejectRequest:
    """Tests for admin rejecting requests"""

    def test_reject_request_with_notes(
        self, authenticated_admin_client, pending_university_request, admin_user, app
    ):
        """Test rejecting request stores admin notes"""
        with app.app_context():
            request = db.session.get(UniversityRequest, pending_university_request.id)
            request_id = request.id

            response = authenticated_admin_client.post(
                f'/api/university-requests/admin/{request_id}/reject',
                json={'notes': 'Rejected: Insufficient information'}
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True

            # Verify request is rejected with notes
            db.session.refresh(request)
            assert request.status == RequestStatus.REJECTED
            assert 'Insufficient information' in request.admin_notes

    def test_reject_already_processed_fails(
        self, authenticated_admin_client, admin_user, app
    ):
        """Test rejecting already rejected request fails"""
        with app.app_context():
            request = UniversityRequest(
                requester_email='rejected@newuni.edu',
                requester_first_name='Rejected',
                requester_last_name='User',
                university_name='Rejected Uni',
                university_location='City',
                email_domain='rejecteduni',
                club_name='Club',
                club_description='Description',
                status=RequestStatus.REJECTED
            )
            db.session.add(request)
            db.session.commit()
            request_id = request.id

            response = authenticated_admin_client.post(
                f'/api/university-requests/admin/{request_id}/reject'
            )

            assert response.status_code == 400

    def test_reject_request_as_user_fails(
        self, authenticated_client, pending_university_request, app
    ):
        """Test that regular user cannot reject"""
        with app.app_context():
            request = db.session.get(UniversityRequest, pending_university_request.id)

            response = authenticated_client.post(
                f'/api/university-requests/admin/{request.id}/reject'
            )

            assert response.status_code == 403

    def test_reject_nonexistent_request(
        self, authenticated_admin_client, admin_user, app
    ):
        """Test rejecting non-existent request"""
        response = authenticated_admin_client.post(
            '/api/university-requests/admin/99999/reject'
        )

        assert response.status_code == 404
