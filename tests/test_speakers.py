"""
Speakers API Tests

Tests for speaker-related endpoints, including validation of
email and phone format on create and update.
"""

import pytest


# =============================================================================
# Create Speaker – validation
# =============================================================================

class TestCreateSpeakerValidation:
    """Validate API rejects faulty email and phone on POST /api/speakers."""

    def test_create_speaker_rejects_faulty_email(self, authenticated_executive_client, test_university):
        """POST with invalid email format returns 400 and error message."""
        payload = {
            'name': 'Dr. Jane Doe',
            'position': 'Professor of AI',
            'email': 'not-an-email',
            'linkedinUrl': 'https://linkedin.com/in/janedoe',
        }
        response = authenticated_executive_client.post(
            '/api/speakers',
            json=payload,
            content_type='application/json',
        )
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'email' in data['error'].lower()

    def test_create_speaker_rejects_faulty_phone(self, authenticated_executive_client, test_university):
        """POST with invalid phone format returns 400 and error message."""
        payload = {
            'name': 'Dr. Jane Doe',
            'position': 'Professor of AI',
            'phone': 'abc',
            'linkedinUrl': 'https://linkedin.com/in/janedoe',
        }
        response = authenticated_executive_client.post(
            '/api/speakers',
            json=payload,
            content_type='application/json',
        )
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'phone' in data['error'].lower()
