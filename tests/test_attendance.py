"""
Tests for Event Attendance Tracking

Tests the QR code attendance flow:
- Token generation (executive+ only)
- Event lookup by token (public)
- Attendance submission (public, with dedup)
- Attendance record viewing (executive+ only)

Note: The EventAttendance model uses PostgreSQL partial unique indexes for
deduplication (unique on event_id + user_id WHERE user_id IS NOT NULL, and
unique on event_id + email WHERE email IS NOT NULL). These partial indexes
are not supported by SQLite, so deduplication in tests relies on the
application-level find_existing() check rather than database constraints.
"""

import pytest
from datetime import datetime, timedelta
from backend.extensions import db
from backend.models.event import Event
from backend.models.event_attendance import EventAttendance
from backend.utils.email import generate_secure_token


def _set_event_token(app, event):
    """Helper to set an attendance token on an event."""
    with app.app_context():
        evt = db.session.get(Event, event.id)
        evt.attendance_token = generate_secure_token(32)
        db.session.commit()
        return evt.attendance_token


class TestGenerateAttendanceToken:
    """Tests for GET /api/events/<id>/attendance-token"""

    def test_executive_can_generate_token(self, authenticated_executive_client, test_event):
        response = authenticated_executive_client.get(
            f'/api/events/{test_event.id}/attendance-token'
        )
        assert response.status_code == 200
        data = response.get_json()
        assert 'token' in data
        assert len(data['token']) > 0
        assert 'attendanceUrl' not in data

    def test_token_is_idempotent(self, authenticated_executive_client, test_event):
        r1 = authenticated_executive_client.get(
            f'/api/events/{test_event.id}/attendance-token'
        )
        r2 = authenticated_executive_client.get(
            f'/api/events/{test_event.id}/attendance-token'
        )
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.get_json()['token'] == r2.get_json()['token']

    def test_member_cannot_generate_token(self, authenticated_member_client, test_event):
        response = authenticated_member_client.get(
            f'/api/events/{test_event.id}/attendance-token'
        )
        assert response.status_code == 403

    def test_unauthenticated_cannot_generate_token(self, client, test_event):
        response = client.get(
            f'/api/events/{test_event.id}/attendance-token'
        )
        assert response.status_code == 401

    def test_nonexistent_event_returns_404(self, authenticated_executive_client):
        response = authenticated_executive_client.get(
            '/api/events/99999/attendance-token'
        )
        assert response.status_code == 404

    def test_admin_can_generate_token_for_any_event(self, authenticated_admin_client, test_event):
        response = authenticated_admin_client.get(
            f'/api/events/{test_event.id}/attendance-token'
        )
        assert response.status_code == 200
        data = response.get_json()
        assert 'token' in data


class TestGetEventByToken:
    """Tests for GET /api/attendance/<token>"""

    def test_valid_token_returns_event(self, client, app, test_event):
        token = _set_event_token(app, test_event)

        response = client.get(f'/api/attendance/{token}')
        assert response.status_code == 200
        data = response.get_json()
        assert data['event']['title'] == 'Test Event'
        assert data['event']['location'] == 'Room 101'
        assert 'autoFill' not in data

    def test_invalid_token_returns_404(self, client):
        response = client.get('/api/attendance/invalidtoken123')
        assert response.status_code == 404

    def test_logged_in_user_gets_autofill(self, authenticated_client, app, test_event):
        token = _set_event_token(app, test_event)

        response = authenticated_client.get(f'/api/attendance/{token}')
        assert response.status_code == 200
        data = response.get_json()
        assert 'autoFill' in data
        assert data['autoFill']['name'] == 'Test User'
        assert 'alreadyCheckedIn' in data
        assert data['alreadyCheckedIn'] is False

    def test_past_event_shows_is_past(self, client, app, test_university, executive_user):
        with app.app_context():
            past_event = Event(
                university_id=test_university.id,
                title='Past Event',
                start_time=datetime.utcnow() - timedelta(days=1),
                created_by_id=executive_user.id,
                attendance_token=generate_secure_token(32),
            )
            db.session.add(past_event)
            db.session.commit()
            token = past_event.attendance_token

        response = client.get(f'/api/attendance/{token}')
        assert response.status_code == 200
        assert response.get_json()['event']['isPast'] is True


class TestSubmitAttendance:
    """Tests for POST /api/attendance/<token>"""

    def test_submit_valid_attendance(self, client, app, test_event):
        token = _set_event_token(app, test_event)

        response = client.post(
            f'/api/attendance/{token}',
            json={'name': 'John Doe'}
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['alreadyCheckedIn'] is False
        assert data['attendance']['name'] == 'John Doe'

    def test_submit_with_email(self, client, app, test_event):
        token = _set_event_token(app, test_event)

        response = client.post(
            f'/api/attendance/{token}',
            json={'name': 'Jane Doe', 'email': 'jane@test.edu'}
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data['attendance']['email'] == 'jane@test.edu'

    def test_submit_without_name_fails(self, client, app, test_event):
        token = _set_event_token(app, test_event)

        response = client.post(
            f'/api/attendance/{token}',
            json={}
        )
        assert response.status_code == 400

    def test_submit_with_empty_name_fails(self, client, app, test_event):
        token = _set_event_token(app, test_event)

        response = client.post(
            f'/api/attendance/{token}',
            json={'name': '   '}
        )
        assert response.status_code == 400

    def test_submit_with_invalid_email_fails(self, client, app, test_event):
        token = _set_event_token(app, test_event)

        response = client.post(
            f'/api/attendance/{token}',
            json={'name': 'John', 'email': 'not-an-email'}
        )
        assert response.status_code == 400

    def test_duplicate_by_email(self, client, app, test_event):
        token = _set_event_token(app, test_event)

        client.post(
            f'/api/attendance/{token}',
            json={'name': 'John', 'email': 'john@test.edu'}
        )
        r2 = client.post(
            f'/api/attendance/{token}',
            json={'name': 'John', 'email': 'john@test.edu'}
        )
        assert r2.get_json()['alreadyCheckedIn'] is True

    def test_duplicate_by_user_id(self, authenticated_client, app, test_event):
        token = _set_event_token(app, test_event)

        authenticated_client.post(
            f'/api/attendance/{token}',
            json={'name': 'Test User'}
        )
        r2 = authenticated_client.post(
            f'/api/attendance/{token}',
            json={'name': 'Test User'}
        )
        assert r2.get_json()['alreadyCheckedIn'] is True

    def test_name_only_guests_are_not_deduplicated(self, client, app, test_event):
        token = _set_event_token(app, test_event)

        r1 = client.post(
            f'/api/attendance/{token}',
            json={'name': 'Walk In Guest'}
        )
        r2 = client.post(
            f'/api/attendance/{token}',
            json={'name': 'Walk In Guest'}
        )
        # Both should succeed since name-only guests cannot be deduplicated
        assert r1.status_code == 201
        assert r2.status_code == 201

    def test_past_event_rejected(self, client, app, test_university, executive_user):
        with app.app_context():
            past_event = Event(
                university_id=test_university.id,
                title='Past Event',
                start_time=datetime.utcnow() - timedelta(days=1),
                created_by_id=executive_user.id,
                attendance_token=generate_secure_token(32),
            )
            db.session.add(past_event)
            db.session.commit()
            token = past_event.attendance_token

        response = client.post(
            f'/api/attendance/{token}',
            json={'name': 'John'}
        )
        assert response.status_code == 400

    def test_invalid_token_returns_404(self, client):
        response = client.post(
            '/api/attendance/nonexistent',
            json={'name': 'John'}
        )
        assert response.status_code == 404

    def test_name_too_long_rejected(self, client, app, test_event):
        token = _set_event_token(app, test_event)

        response = client.post(
            f'/api/attendance/{token}',
            json={'name': 'A' * 201}
        )
        assert response.status_code == 400

    def test_profane_name_rejected(self, client, app, test_event):
        token = _set_event_token(app, test_event)

        response = client.post(
            f'/api/attendance/{token}',
            json={'name': 'shit'}
        )
        assert response.status_code == 400
        assert 'inappropriate' in response.get_json()['error'].lower()


class TestGetAttendanceRecords:
    """Tests for GET /api/events/<id>/attendance"""

    def test_executive_can_view_records(self, authenticated_executive_client, app, test_event):
        with app.app_context():
            record = EventAttendance(
                event_id=test_event.id,
                name='Test Attendee',
                email='attendee@test.edu'
            )
            db.session.add(record)
            db.session.commit()

        response = authenticated_executive_client.get(
            f'/api/events/{test_event.id}/attendance'
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['count'] == 1
        assert len(data['attendance']) == 1
        assert data['attendance'][0]['name'] == 'Test Attendee'

    def test_member_cannot_view_records(self, authenticated_member_client, test_event):
        response = authenticated_member_client.get(
            f'/api/events/{test_event.id}/attendance'
        )
        assert response.status_code == 403

    def test_unauthenticated_cannot_view_records(self, client, test_event):
        response = client.get(
            f'/api/events/{test_event.id}/attendance'
        )
        assert response.status_code == 401

    def test_nonexistent_event_returns_404(self, authenticated_executive_client):
        response = authenticated_executive_client.get(
            '/api/events/99999/attendance'
        )
        assert response.status_code == 404

    def test_records_ordered_by_checkin_time(self, authenticated_executive_client, app, test_event):
        with app.app_context():
            r1 = EventAttendance(
                event_id=test_event.id,
                name='First',
                checked_in_at=datetime.utcnow() - timedelta(hours=1)
            )
            r2 = EventAttendance(
                event_id=test_event.id,
                name='Second',
                checked_in_at=datetime.utcnow()
            )
            db.session.add_all([r1, r2])
            db.session.commit()

        response = authenticated_executive_client.get(
            f'/api/events/{test_event.id}/attendance'
        )
        data = response.get_json()
        assert data['count'] == 2
        assert data['attendance'][0]['name'] == 'First'
        assert data['attendance'][1]['name'] == 'Second'

    def test_admin_can_view_attendance_records(self, authenticated_admin_client, app, test_event):
        with app.app_context():
            record = EventAttendance(
                event_id=test_event.id,
                name='Admin Visible Attendee',
                email='visible@test.edu'
            )
            db.session.add(record)
            db.session.commit()

        response = authenticated_admin_client.get(
            f'/api/events/{test_event.id}/attendance'
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['count'] == 1
        assert data['attendance'][0]['name'] == 'Admin Visible Attendee'


class TestEventDetailAttendanceFields:
    """Tests that event detail responses include attendance fields for executives."""

    def test_event_detail_includes_attendance_fields_for_executive(
        self, authenticated_executive_client, app, test_event
    ):
        # Set a token and add an attendance record
        with app.app_context():
            evt = db.session.get(Event, test_event.id)
            evt.attendance_token = generate_secure_token(32)
            record = EventAttendance(event_id=test_event.id, name='Attendee')
            db.session.add(record)
            db.session.commit()

        response = authenticated_executive_client.get(
            f'/api/events/{test_event.id}'
        )
        assert response.status_code == 200
        data = response.get_json()
        assert 'attendanceToken' in data
        assert 'attendanceCount' in data
        assert data['attendanceCount'] == 1
