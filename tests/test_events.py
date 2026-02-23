"""
Events API Tests

Tests for event-related endpoints:
- GET /api/universities/<id>/events - List events for a university
- POST /api/universities/<id>/events - Create event
- GET /api/events/<id> - Get single event
- PUT /api/events/<id> - Update event
- DELETE /api/events/<id> - Delete event
- POST /api/events/<id>/rsvp - Toggle RSVP
"""

import pytest
from datetime import datetime, timedelta
from backend.models import User, Event, EventAttendee, University, UniversityRole
from backend.constants import UniversityRoles
from backend.extensions import db


# =============================================================================
# Helper to create an event directly in the database
# =============================================================================

def _create_event(app, university_id, created_by_id, **overrides):
    """Create an event in the database and return it."""
    with app.app_context():
        future = datetime.utcnow() + timedelta(days=7)
        defaults = dict(
            university_id=university_id,
            title='Test Event',
            description='A test event description',
            location='Room 101',
            start_time=future,
            end_time=future + timedelta(hours=2),
            created_by_id=created_by_id,
        )
        defaults.update(overrides)
        event = Event(**defaults)
        db.session.add(event)
        db.session.commit()
        db.session.refresh(event)
        return event


# =============================================================================
# List Events
# =============================================================================

class TestListEvents:
    """Tests for GET /api/universities/<id>/events"""

    def test_list_events_success(self, client, app, test_university, executive_user):
        """Test listing events for a university returns events array"""
        _create_event(app, test_university.id, executive_user.id, title='Event A')
        _create_event(app, test_university.id, executive_user.id, title='Event B')

        response = client.get(f'/api/universities/{test_university.id}/events?upcoming=false')
        assert response.status_code == 200
        data = response.get_json()
        assert 'events' in data
        assert len(data['events']) == 2

    def test_list_events_empty(self, client, app, test_university):
        """Test listing events for university with no events"""
        response = client.get(f'/api/universities/{test_university.id}/events')
        assert response.status_code == 200
        data = response.get_json()
        assert data['events'] == []

    def test_list_events_university_not_found(self, client, app):
        """Test listing events for nonexistent university returns 404"""
        response = client.get('/api/universities/99999/events')
        assert response.status_code == 404

    def test_list_events_upcoming_filter(self, client, app, test_university, executive_user):
        """Test that upcoming=true filters out past events"""
        past = datetime.utcnow() - timedelta(days=7)
        future = datetime.utcnow() + timedelta(days=7)

        _create_event(app, test_university.id, executive_user.id,
                       title='Past Event', start_time=past, end_time=past + timedelta(hours=1))
        _create_event(app, test_university.id, executive_user.id,
                       title='Future Event', start_time=future, end_time=future + timedelta(hours=1))

        # Default (upcoming=true) should only return future event
        response = client.get(f'/api/universities/{test_university.id}/events')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['events']) == 1
        assert data['events'][0]['title'] == 'Future Event'

    def test_list_events_upcoming_false_returns_all(self, client, app, test_university, executive_user):
        """Test that upcoming=false returns past events too"""
        past = datetime.utcnow() - timedelta(days=7)
        future = datetime.utcnow() + timedelta(days=7)

        _create_event(app, test_university.id, executive_user.id,
                       title='Past Event', start_time=past, end_time=past + timedelta(hours=1))
        _create_event(app, test_university.id, executive_user.id,
                       title='Future Event', start_time=future, end_time=future + timedelta(hours=1))

        response = client.get(f'/api/universities/{test_university.id}/events?upcoming=false')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['events']) == 2

    def test_list_events_limit(self, client, app, test_university, executive_user):
        """Test that limit parameter restricts results"""
        for i in range(5):
            future = datetime.utcnow() + timedelta(days=i + 1)
            _create_event(app, test_university.id, executive_user.id,
                           title=f'Event {i}', start_time=future, end_time=future + timedelta(hours=1))

        response = client.get(f'/api/universities/{test_university.id}/events?limit=2')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['events']) == 2

    def test_list_events_includes_rsvp_status(self, app, test_university, executive_user):
        """Test that authenticated user sees their RSVP status"""
        event = _create_event(app, test_university.id, executive_user.id)

        with app.app_context():
            attendee = EventAttendee(
                event_id=event.id,
                user_id=executive_user.id,
                status='attending'
            )
            db.session.add(attendee)
            db.session.commit()

        # Login as the executive user
        client = app.test_client()
        client.post('/api/auth/login', json={
            'email': 'executive@example.edu',
            'password': 'executivepass123'
        })

        response = client.get(f'/api/universities/{test_university.id}/events?upcoming=false')
        assert response.status_code == 200
        data = response.get_json()
        assert data['events'][0]['isAttending'] is True


# =============================================================================
# Create Event
# =============================================================================

class TestCreateEvent:
    """Tests for POST /api/universities/<id>/events"""

    def test_create_event_as_executive(self, authenticated_executive_client, app, test_university):
        """Test that an executive can create an event"""
        response = authenticated_executive_client.post(
            f'/api/universities/{test_university.id}/events',
            json={
                'title': 'AI Workshop',
                'description': 'Learn about neural networks',
                'location': 'Room 101',
                'startTime': '2026-06-15T15:00:00Z',
                'endTime': '2026-06-15T17:00:00Z',
            }
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data['title'] == 'AI Workshop'
        assert data['description'] == 'Learn about neural networks'
        assert data['location'] == 'Room 101'

    def test_create_event_as_president(self, authenticated_president_client, app, test_university):
        """Test that a president can create an event"""
        response = authenticated_president_client.post(
            f'/api/universities/{test_university.id}/events',
            json={
                'title': 'President Event',
                'startTime': '2026-06-15T15:00:00Z',
            }
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data['title'] == 'President Event'

    def test_create_event_as_admin(self, authenticated_admin_client, app, test_university):
        """Test that a site admin can create an event for any university"""
        response = authenticated_admin_client.post(
            f'/api/universities/{test_university.id}/events',
            json={
                'title': 'Admin Event',
                'startTime': '2026-06-15T15:00:00Z',
            }
        )
        assert response.status_code == 201

    def test_create_event_as_member_forbidden(self, authenticated_member_client, app, test_university):
        """Test that a regular member cannot create an event"""
        response = authenticated_member_client.post(
            f'/api/universities/{test_university.id}/events',
            json={
                'title': 'Member Event',
                'startTime': '2026-06-15T15:00:00Z',
            }
        )
        assert response.status_code == 403

    def test_create_event_unauthenticated(self, client, app, test_university):
        """Test that unauthenticated users cannot create events"""
        response = client.post(
            f'/api/universities/{test_university.id}/events',
            json={
                'title': 'Anon Event',
                'startTime': '2026-06-15T15:00:00Z',
            }
        )
        assert response.status_code == 401

    def test_create_event_university_not_found(self, authenticated_admin_client, app):
        """Test creating event for nonexistent university returns 404"""
        response = authenticated_admin_client.post(
            '/api/universities/99999/events',
            json={
                'title': 'Ghost Event',
                'startTime': '2026-06-15T15:00:00Z',
            }
        )
        assert response.status_code == 404

    def test_create_event_missing_title(self, authenticated_executive_client, app, test_university):
        """Test that missing title returns 400"""
        response = authenticated_executive_client.post(
            f'/api/universities/{test_university.id}/events',
            json={
                'startTime': '2026-06-15T15:00:00Z',
            }
        )
        assert response.status_code == 400
        assert 'Title is required' in response.get_json()['error']

    def test_create_event_empty_title(self, authenticated_executive_client, app, test_university):
        """Test that empty title returns 400"""
        response = authenticated_executive_client.post(
            f'/api/universities/{test_university.id}/events',
            json={
                'title': '',
                'startTime': '2026-06-15T15:00:00Z',
            }
        )
        assert response.status_code == 400

    def test_create_event_missing_start_time(self, authenticated_executive_client, app, test_university):
        """Test that missing start time returns 400"""
        response = authenticated_executive_client.post(
            f'/api/universities/{test_university.id}/events',
            json={
                'title': 'No Start Time Event',
            }
        )
        assert response.status_code == 400
        assert 'Start time is required' in response.get_json()['error']

    def test_create_event_invalid_start_time_format(self, authenticated_executive_client, app, test_university):
        """Test that an invalid start time format returns 400"""
        response = authenticated_executive_client.post(
            f'/api/universities/{test_university.id}/events',
            json={
                'title': 'Bad Time Event',
                'startTime': 'not-a-date',
            }
        )
        assert response.status_code == 400
        assert 'Invalid start time format' in response.get_json()['error']

    def test_create_event_invalid_end_time_format(self, authenticated_executive_client, app, test_university):
        """Test that an invalid end time format returns 400"""
        response = authenticated_executive_client.post(
            f'/api/universities/{test_university.id}/events',
            json={
                'title': 'Bad End Time',
                'startTime': '2026-06-15T15:00:00Z',
                'endTime': 'not-a-date',
            }
        )
        assert response.status_code == 400
        assert 'Invalid end time format' in response.get_json()['error']

    def test_create_event_end_before_start(self, authenticated_executive_client, app, test_university):
        """Test that end time before start time returns 400"""
        response = authenticated_executive_client.post(
            f'/api/universities/{test_university.id}/events',
            json={
                'title': 'Backwards Event',
                'startTime': '2026-06-15T17:00:00Z',
                'endTime': '2026-06-15T15:00:00Z',
            }
        )
        assert response.status_code == 400
        assert 'Start time must be before end time' in response.get_json()['error']

    def test_create_event_start_equals_end(self, authenticated_executive_client, app, test_university):
        """Test that start time equal to end time returns 400"""
        response = authenticated_executive_client.post(
            f'/api/universities/{test_university.id}/events',
            json={
                'title': 'Zero Duration Event',
                'startTime': '2026-06-15T15:00:00Z',
                'endTime': '2026-06-15T15:00:00Z',
            }
        )
        assert response.status_code == 400

    def test_create_event_no_body(self, authenticated_executive_client, app, test_university):
        """Test that missing request body returns 400"""
        response = authenticated_executive_client.post(
            f'/api/universities/{test_university.id}/events',
            content_type='application/json',
            data='',
        )
        assert response.status_code == 400

    def test_create_event_optional_fields_omitted(self, authenticated_executive_client, app, test_university):
        """Test creating event with only required fields succeeds"""
        response = authenticated_executive_client.post(
            f'/api/universities/{test_university.id}/events',
            json={
                'title': 'Minimal Event',
                'startTime': '2026-06-15T15:00:00Z',
            }
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data['title'] == 'Minimal Event'
        assert data['description'] is None
        assert data['location'] is None
        assert data['endTime'] is None

    def test_create_event_whitespace_title_stripped(self, authenticated_executive_client, app, test_university):
        """Test that title whitespace is stripped"""
        response = authenticated_executive_client.post(
            f'/api/universities/{test_university.id}/events',
            json={
                'title': '  Spaced Title  ',
                'startTime': '2026-06-15T15:00:00Z',
            }
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data['title'] == 'Spaced Title'

    def test_create_event_executive_wrong_university(self, app, test_university, second_university, executive_user):
        """Test that an executive at one university cannot create events at another"""
        # executive_user is executive of test_university, not second_university
        client = app.test_client()
        client.post('/api/auth/login', json={
            'email': 'executive@example.edu',
            'password': 'executivepass123'
        })

        response = client.post(
            f'/api/universities/{second_university.id}/events',
            json={
                'title': 'Cross-Uni Event',
                'startTime': '2026-06-15T15:00:00Z',
            }
        )
        assert response.status_code == 403


# =============================================================================
# Get Single Event
# =============================================================================

class TestGetEvent:
    """Tests for GET /api/events/<id>"""

    def test_get_event_success(self, client, app, test_university, executive_user):
        """Test getting a single event returns full details"""
        event = _create_event(app, test_university.id, executive_user.id, title='Detail Event')

        response = client.get(f'/api/events/{event.id}')
        assert response.status_code == 200
        data = response.get_json()
        assert data['title'] == 'Detail Event'
        assert data['id'] == event.id
        assert 'attendees' in data
        assert data['isAttending'] is False

    def test_get_event_not_found(self, client, app):
        """Test getting nonexistent event returns 404"""
        response = client.get('/api/events/99999')
        assert response.status_code == 404

    def test_get_event_includes_attendance_for_authenticated_user(
        self, app, test_university, executive_user
    ):
        """Test that authenticated user sees their attendance status"""
        event = _create_event(app, test_university.id, executive_user.id)

        with app.app_context():
            attendee = EventAttendee(
                event_id=event.id,
                user_id=executive_user.id,
                status='attending'
            )
            db.session.add(attendee)
            db.session.commit()

        client = app.test_client()
        client.post('/api/auth/login', json={
            'email': 'executive@example.edu',
            'password': 'executivepass123'
        })

        response = client.get(f'/api/events/{event.id}')
        assert response.status_code == 200
        data = response.get_json()
        assert data['isAttending'] is True
        assert data['attendeeStatus'] == 'attending'


# =============================================================================
# Update Event
# =============================================================================

class TestUpdateEvent:
    """Tests for PUT /api/events/<id>"""

    def test_update_event_as_executive(self, authenticated_executive_client, app, test_university, executive_user):
        """Test that an executive can update an event"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_executive_client.put(
            f'/api/events/{event.id}',
            json={
                'title': 'Updated Title',
                'description': 'Updated description',
                'location': 'New Room 202',
                'startTime': '2026-07-01T10:00:00Z',
                'endTime': '2026-07-01T12:00:00Z',
            }
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['title'] == 'Updated Title'
        assert data['description'] == 'Updated description'
        assert data['location'] == 'New Room 202'

    def test_update_event_as_president(self, authenticated_president_client, app, test_university, executive_user):
        """Test that a president can update an event created by someone else"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_president_client.put(
            f'/api/events/{event.id}',
            json={
                'title': 'President Updated',
                'startTime': '2026-07-01T10:00:00Z',
            }
        )
        assert response.status_code == 200
        assert response.get_json()['title'] == 'President Updated'

    def test_update_event_as_admin(self, authenticated_admin_client, app, test_university, executive_user):
        """Test that a site admin can update any event"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_admin_client.put(
            f'/api/events/{event.id}',
            json={
                'title': 'Admin Updated',
                'startTime': '2026-07-01T10:00:00Z',
            }
        )
        assert response.status_code == 200

    def test_update_event_as_member_forbidden(self, authenticated_member_client, app, test_university, executive_user):
        """Test that a regular member cannot update an event"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_member_client.put(
            f'/api/events/{event.id}',
            json={
                'title': 'Member Updated',
                'startTime': '2026-07-01T10:00:00Z',
            }
        )
        assert response.status_code == 403

    def test_update_event_unauthenticated(self, client, app, test_university, executive_user):
        """Test that unauthenticated users cannot update events"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = client.put(
            f'/api/events/{event.id}',
            json={
                'title': 'Anon Updated',
                'startTime': '2026-07-01T10:00:00Z',
            }
        )
        assert response.status_code == 401

    def test_update_event_not_found(self, authenticated_admin_client, app):
        """Test updating nonexistent event returns 404"""
        response = authenticated_admin_client.put(
            '/api/events/99999',
            json={
                'title': 'Ghost',
                'startTime': '2026-07-01T10:00:00Z',
            }
        )
        assert response.status_code == 404

    def test_update_event_missing_title(self, authenticated_executive_client, app, test_university, executive_user):
        """Test that missing title returns 400"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_executive_client.put(
            f'/api/events/{event.id}',
            json={
                'startTime': '2026-07-01T10:00:00Z',
            }
        )
        assert response.status_code == 400
        assert 'Title is required' in response.get_json()['error']

    def test_update_event_missing_start_time(self, authenticated_executive_client, app, test_university, executive_user):
        """Test that missing start time returns 400"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_executive_client.put(
            f'/api/events/{event.id}',
            json={
                'title': 'No Start',
            }
        )
        assert response.status_code == 400
        assert 'Start time is required' in response.get_json()['error']

    def test_update_event_invalid_start_time(self, authenticated_executive_client, app, test_university, executive_user):
        """Test that invalid start time format returns 400"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_executive_client.put(
            f'/api/events/{event.id}',
            json={
                'title': 'Bad Time',
                'startTime': 'not-a-date',
            }
        )
        assert response.status_code == 400

    def test_update_event_invalid_end_time(self, authenticated_executive_client, app, test_university, executive_user):
        """Test that invalid end time format returns 400"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_executive_client.put(
            f'/api/events/{event.id}',
            json={
                'title': 'Bad End',
                'startTime': '2026-07-01T10:00:00Z',
                'endTime': 'garbage',
            }
        )
        assert response.status_code == 400

    def test_update_event_end_before_start(self, authenticated_executive_client, app, test_university, executive_user):
        """Test that end time before start time returns 400"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_executive_client.put(
            f'/api/events/{event.id}',
            json={
                'title': 'Backwards',
                'startTime': '2026-07-01T17:00:00Z',
                'endTime': '2026-07-01T10:00:00Z',
            }
        )
        assert response.status_code == 400
        assert 'Start time must be before end time' in response.get_json()['error']

    def test_update_event_clears_optional_fields(self, authenticated_executive_client, app, test_university, executive_user):
        """Test that omitting optional fields clears them"""
        event = _create_event(app, test_university.id, executive_user.id,
                              description='Original', location='Original Room')

        response = authenticated_executive_client.put(
            f'/api/events/{event.id}',
            json={
                'title': 'Cleared',
                'startTime': '2026-07-01T10:00:00Z',
                # description and location omitted
            }
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['description'] is None
        assert data['location'] is None
        assert data['endTime'] is None

    def test_update_event_no_body(self, authenticated_executive_client, app, test_university, executive_user):
        """Test that missing request body returns 400"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_executive_client.put(
            f'/api/events/{event.id}',
            content_type='application/json',
            data='',
        )
        assert response.status_code == 400

    def test_update_event_executive_wrong_university(
        self, app, test_university, second_university, executive_user
    ):
        """Test that an executive cannot update events at a different university"""
        # Create an event on second_university (need an admin to do so)
        with app.app_context():
            admin = User(
                email='helper_admin@example.edu',
                first_name='Helper',
                last_name='Admin',
                permission_level=1
            )
            admin.set_password('helperadmin123')
            db.session.add(admin)
            db.session.commit()
            db.session.refresh(admin)
            admin_id = admin.id

        event = _create_event(app, second_university.id, admin_id, title='Other Uni Event')

        # Login as the executive (who is only exec at test_university)
        client = app.test_client()
        client.post('/api/auth/login', json={
            'email': 'executive@example.edu',
            'password': 'executivepass123'
        })

        response = client.put(
            f'/api/events/{event.id}',
            json={
                'title': 'Hacked',
                'startTime': '2026-07-01T10:00:00Z',
            }
        )
        assert response.status_code == 403


# =============================================================================
# Delete Event
# =============================================================================

class TestDeleteEvent:
    """Tests for DELETE /api/events/<id>"""

    def test_delete_event_as_executive(self, authenticated_executive_client, app, test_university, executive_user):
        """Test that an executive can delete an event"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_executive_client.delete(f'/api/events/{event.id}')
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True

        # Verify it's actually gone
        response = authenticated_executive_client.get(f'/api/events/{event.id}')
        assert response.status_code == 404

    def test_delete_event_as_president(self, authenticated_president_client, app, test_university, executive_user):
        """Test that a president can delete an event created by someone else"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_president_client.delete(f'/api/events/{event.id}')
        assert response.status_code == 200

    def test_delete_event_as_admin(self, authenticated_admin_client, app, test_university, executive_user):
        """Test that a site admin can delete any event"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_admin_client.delete(f'/api/events/{event.id}')
        assert response.status_code == 200

    def test_delete_event_as_member_forbidden(self, authenticated_member_client, app, test_university, executive_user):
        """Test that a regular member cannot delete an event"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_member_client.delete(f'/api/events/{event.id}')
        assert response.status_code == 403

    def test_delete_event_unauthenticated(self, client, app, test_university, executive_user):
        """Test that unauthenticated users cannot delete events"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = client.delete(f'/api/events/{event.id}')
        assert response.status_code == 401

    def test_delete_event_not_found(self, authenticated_admin_client, app):
        """Test deleting nonexistent event returns 404"""
        response = authenticated_admin_client.delete('/api/events/99999')
        assert response.status_code == 404

    def test_delete_event_cascades_attendees(self, authenticated_executive_client, app, test_university, executive_user):
        """Test that deleting an event also removes its attendees"""
        event = _create_event(app, test_university.id, executive_user.id)

        with app.app_context():
            attendee = EventAttendee(
                event_id=event.id,
                user_id=executive_user.id,
                status='attending'
            )
            db.session.add(attendee)
            db.session.commit()

            # Verify attendee exists
            assert EventAttendee.query.filter_by(event_id=event.id).count() == 1

        response = authenticated_executive_client.delete(f'/api/events/{event.id}')
        assert response.status_code == 200

        with app.app_context():
            assert EventAttendee.query.filter_by(event_id=event.id).count() == 0

    def test_delete_event_executive_wrong_university(
        self, app, test_university, second_university, executive_user
    ):
        """Test that an executive cannot delete events at a different university"""
        with app.app_context():
            admin = User(
                email='helper_admin2@example.edu',
                first_name='Helper',
                last_name='Admin',
                permission_level=1
            )
            admin.set_password('helperadmin123')
            db.session.add(admin)
            db.session.commit()
            db.session.refresh(admin)
            admin_id = admin.id

        event = _create_event(app, second_university.id, admin_id)

        client = app.test_client()
        client.post('/api/auth/login', json={
            'email': 'executive@example.edu',
            'password': 'executivepass123'
        })

        response = client.delete(f'/api/events/{event.id}')
        assert response.status_code == 403


# =============================================================================
# Toggle RSVP
# =============================================================================

class TestToggleRsvp:
    """Tests for POST /api/events/<id>/rsvp"""

    def test_rsvp_attending(self, authenticated_client, app, test_university, executive_user):
        """Test RSVP creates attendance record"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_client.post(f'/api/events/{event.id}/rsvp', json={})
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['isAttending'] is True
        assert data['attendeeCount'] == 1

    def test_rsvp_toggle_off(self, authenticated_client, app, test_university, executive_user, test_user):
        """Test RSVP again toggles attendance off"""
        event = _create_event(app, test_university.id, executive_user.id)

        # RSVP on
        authenticated_client.post(f'/api/events/{event.id}/rsvp', json={})

        # RSVP off (toggle)
        response = authenticated_client.post(f'/api/events/{event.id}/rsvp', json={})
        assert response.status_code == 200
        data = response.get_json()
        assert data['isAttending'] is False
        assert data['attendeeCount'] == 0

    def test_rsvp_with_status(self, authenticated_client, app, test_university, executive_user):
        """Test RSVP with explicit status"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_client.post(
            f'/api/events/{event.id}/rsvp',
            json={'status': 'maybe'}
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['isAttending'] is True
        assert data['status'] == 'maybe'

    def test_rsvp_change_status(self, authenticated_client, app, test_university, executive_user):
        """Test changing RSVP status from attending to maybe"""
        event = _create_event(app, test_university.id, executive_user.id)

        # Initially RSVP as attending
        authenticated_client.post(
            f'/api/events/{event.id}/rsvp',
            json={'status': 'attending'}
        )

        # Change to maybe
        response = authenticated_client.post(
            f'/api/events/{event.id}/rsvp',
            json={'status': 'maybe'}
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['isAttending'] is True
        assert data['status'] == 'maybe'



    def test_rsvp_declined_status(self, authenticated_client, app, test_university, executive_user):
        """Test RSVP with declined status"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_client.post(
            f'/api/events/{event.id}/rsvp',
            json={'status': 'declined'}
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'declined'

    def test_rsvp_invalid_status(self, authenticated_client, app, test_university, executive_user):
        """Test RSVP with invalid status returns 400"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_client.post(
            f'/api/events/{event.id}/rsvp',
            json={'status': 'invalid'}
        )
        assert response.status_code == 400
        assert 'Invalid status' in response.get_json()['error']

    def test_rsvp_event_not_found(self, authenticated_client, app):
        """Test RSVP on nonexistent event returns 404"""
        response = authenticated_client.post('/api/events/99999/rsvp', json={})
        assert response.status_code == 404

    def test_rsvp_unauthenticated(self, client, app, test_university, executive_user):
        """Test that unauthenticated users cannot RSVP"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = client.post(f'/api/events/{event.id}/rsvp', json={})
        assert response.status_code == 401


# =============================================================================
# Input Length Validation
# =============================================================================

class TestEventInputLengthValidation:
    """Tests for input length validation on create and update endpoints"""

    def test_create_event_title_too_long(self, authenticated_executive_client, app, test_university):
        """Test that a title exceeding 200 characters returns 400"""
        response = authenticated_executive_client.post(
            f'/api/universities/{test_university.id}/events',
            json={
                'title': 'A' * 201,
                'startTime': '2026-06-15T15:00:00Z',
            }
        )
        assert response.status_code == 400
        assert '200' in response.get_json()['error']

    def test_create_event_location_too_long(self, authenticated_executive_client, app, test_university):
        """Test that a location exceeding 300 characters returns 400"""
        response = authenticated_executive_client.post(
            f'/api/universities/{test_university.id}/events',
            json={
                'title': 'Valid Title',
                'location': 'L' * 301,
                'startTime': '2026-06-15T15:00:00Z',
            }
        )
        assert response.status_code == 400
        assert '300' in response.get_json()['error']

    def test_update_event_title_too_long(self, authenticated_executive_client, app, test_university, executive_user):
        """Test that updating with a title exceeding 200 characters returns 400"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_executive_client.put(
            f'/api/events/{event.id}',
            json={
                'title': 'A' * 201,
                'startTime': '2026-07-01T10:00:00Z',
            }
        )
        assert response.status_code == 400
        assert '200' in response.get_json()['error']

    def test_update_event_location_too_long(self, authenticated_executive_client, app, test_university, executive_user):
        """Test that updating with a location exceeding 300 characters returns 400"""
        event = _create_event(app, test_university.id, executive_user.id)

        response = authenticated_executive_client.put(
            f'/api/events/{event.id}',
            json={
                'title': 'Valid Title',
                'location': 'L' * 301,
                'startTime': '2026-07-01T10:00:00Z',
            }
        )
        assert response.status_code == 400
        assert '300' in response.get_json()['error']
