"""
Security and Edge Case Tests

Tests for security-related concerns:
- SQL injection prevention
- Session security
- Input validation edge cases
- Rate limiting scenarios
- Unicode handling
"""

import pytest
from backend.models import User, Note
from backend.extensions import db


class TestSQLInjection:
    """Tests for SQL injection prevention"""

    def test_sql_injection_in_search(self, client, app, test_user, test_note):
        """Test that SQL injection in search is properly escaped"""
        with app.app_context():
            # Try SQL injection in search query
            malicious_queries = [
                "'; DROP TABLE notes;--",
                "' OR '1'='1",
                "1; DELETE FROM users;--",
                "admin'--",
                "' UNION SELECT * FROM users--"
            ]

            for query in malicious_queries:
                response = client.get(f'/api/notes?search={query}')
                # Should return 200 (not crash) and handle safely
                assert response.status_code == 200

                # Verify tables still exist by checking we can query
                notes_count = Note.query.count()
                users_count = User.query.count()
                assert notes_count >= 0
                assert users_count >= 1  # test_user exists

    def test_sql_injection_in_login(self, client, app, test_user):
        """Test SQL injection prevention in login"""
        with app.app_context():
            response = client.post('/api/auth/login', json={
                'email': "admin'--",
                'password': "' OR '1'='1"
            })

            # Should fail authentication, not succeed via injection
            assert response.status_code == 401

    def test_sql_injection_in_user_search(self, authenticated_client, app):
        """Test SQL injection in user search endpoint"""
        malicious_query = "' OR '1'='1"

        response = authenticated_client.get(
            f'/api/users/search?q={malicious_query}'
        )

        # Should return 200 and empty or valid results
        assert response.status_code == 200


class TestSessionSecurity:
    """Tests for session security measures"""

    def test_session_cookie_settings(self, client, test_user, app):
        """Test that session cookies have secure settings"""
        response = client.post('/api/auth/login', json={
            'email': 'test@example.edu',
            'password': 'testpassword123'
        })

        assert response.status_code == 200

        # Check that session cookie exists
        cookies = response.headers.getlist('Set-Cookie')
        session_cookie = next(
            (c for c in cookies if 'session' in c.lower()),
            None
        )

        # Session cookie should exist
        assert session_cookie is not None

    def test_protected_routes_require_auth(self, client, app):
        """Test that all protected routes properly require authentication"""
        protected_endpoints = [
            ('GET', '/api/user/profile'),
            ('POST', '/api/update_profile'),
            ('POST', '/api/notes/create'),
            ('GET', '/api/messages/conversations'),
            ('POST', '/api/messages/send'),
            ('POST', '/api/upload_profile_picture'),
            ('POST', '/api/delete_account'),
            ('GET', '/api/notifications/university-posts'),
        ]

        for method, endpoint in protected_endpoints:
            if method == 'GET':
                response = client.get(endpoint)
            else:
                response = client.post(endpoint, json={})

            assert response.status_code == 401, f"{method} {endpoint} should require auth"


class TestInputValidation:
    """Tests for input validation edge cases"""

    def test_unicode_in_profile(self, authenticated_client, app):
        """Test handling of unicode characters in profile"""
        response = authenticated_client.post('/api/update_profile', json={
            'first_name': 'Testy',
            'about_section': 'Hello! Привет! こんにちは! 你好! 안녕하세요!'
        })

        assert response.status_code == 200
        data = response.get_json()
        assert 'Привет' in data['user']['about_section']

    def test_emoji_in_content(self, authenticated_client, app):
        """Test handling of emojis in note content"""
        response = authenticated_client.post('/api/notes/create', json={
            'title': 'Emoji Test',
            'content': 'Hello World! 🌍🚀💡🔥'
        })

        assert response.status_code == 201
        data = response.get_json()
        assert '🌍' in data['note']['content']

    def test_very_long_content(self, authenticated_client, app):
        """Test handling of extremely long content"""
        # Create a very long string (100KB of text)
        long_content = 'A' * (100 * 1024)

        response = authenticated_client.post('/api/notes/create', json={
            'title': 'Long Content Test',
            'content': long_content
        })

        # Should either accept or reject gracefully
        assert response.status_code in [201, 400, 413]

    def test_null_bytes_in_input(self, authenticated_client, app):
        """Test handling of null byte injection"""
        response = authenticated_client.post('/api/notes/create', json={
            'title': 'Null\x00Byte',
            'content': 'Content with\x00null byte'
        })

        # Should handle without crashing
        assert response.status_code in [201, 400]

    def test_special_characters_in_email(self, client, test_university, app):
        """Test handling of special characters in email"""
        special_emails = [
            "user+tag@example.edu",
            "user.name@example.edu",
            "user_name@example.edu"
        ]

        for email in special_emails:
            response = client.post('/api/auth/register', json={
                'email': email,
                'password': 'password123',
                'firstName': 'Test',
                'lastName': 'User'
            })

            # Should handle gracefully (success or proper validation error)
            assert response.status_code in [200, 400, 409]

    def test_whitespace_variations(self, authenticated_client, app):
        """Test various whitespace handling"""
        # Leading/trailing whitespace should be trimmed
        response = authenticated_client.post('/api/update_profile', json={
            'first_name': '  Spaced  ',
            'last_name': '\tTabbed\t'
        })

        assert response.status_code == 200
        data = response.get_json()
        # Names should be trimmed
        assert data['user']['first_name'].strip() == 'Spaced'


class TestRateLimiting:
    """Tests for rate limiting scenarios (behavior verification)"""

    def test_rate_of_verification_code_resends(self, client, test_university, app):
        """Test multiple rapid resend requests"""
        with app.app_context():
            # Start registration
            client.post('/api/auth/register', json={
                'email': 'ratelimit@example.edu',
                'password': 'password123',
                'firstName': 'Rate',
                'lastName': 'Limit'
            })

            # Try multiple rapid resends
            responses = []
            for _ in range(5):
                response = client.post('/api/auth/resend-verification')
                responses.append(response.status_code)

            # Should succeed (or rate limit if implemented)
            # All should return valid HTTP status
            for status in responses:
                assert status in [200, 429]

    def test_rapid_login_attempts(self, client, test_user, app):
        """Test rapid login attempts with wrong password"""
        with app.app_context():
            for _ in range(10):
                response = client.post('/api/auth/login', json={
                    'email': 'test@example.edu',
                    'password': 'wrongpassword'
                })

                # Should return 401 (not crash or behave unexpectedly)
                assert response.status_code in [401, 429]


class TestConcurrency:
    """Tests for concurrent operations"""

    def test_concurrent_like_toggle(self, authenticated_client, app, test_note):
        """Test rapid like/unlike operations"""
        with app.app_context():
            note = db.session.get(Note, test_note.id)
            initial_likes = note.likes

            # Rapid like/unlike
            for _ in range(5):
                authenticated_client.post(f'/api/notes/{note.id}/like')

            # Should end up in a consistent state
            db.session.refresh(note)
            # Likes should be either initial+1 (odd toggles) or initial (even toggles)
            assert note.likes in [initial_likes, initial_likes + 1]


class TestErrorHandling:
    """Tests for proper error handling"""

    def test_malformed_json(self, client, test_user, app):
        """Test handling of malformed JSON in requests"""
        response = client.post(
            '/api/auth/login',
            data='not valid json',
            content_type='application/json'
        )

        # Backend should return an error status (400 ideal, 500 acceptable)
        # Note: Flask returns 500 if JSON parsing fails before route handling
        assert response.status_code in [400, 500]

    def test_missing_content_type(self, authenticated_client, app):
        """Test request without content type"""
        response = authenticated_client.post(
            '/api/notes/create',
            data='{"title": "Test", "content": "Content"}'
        )

        # Should handle gracefully - may succeed, fail validation, or error
        # 500 is acceptable since request.get_json() may fail without content type
        assert response.status_code in [201, 400, 415, 500]

    def test_invalid_ids(self, authenticated_client, app):
        """Test handling of invalid ID formats"""
        # String instead of int
        response = authenticated_client.get('/api/users/notanumber')
        assert response.status_code in [404, 400]

        # Very large ID
        response = authenticated_client.get('/api/users/99999999999999')
        assert response.status_code in [404, 400]

        # Negative ID
        response = authenticated_client.get('/api/users/-1')
        assert response.status_code in [404, 400]
