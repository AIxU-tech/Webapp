"""
Events Routes

API endpoints for university club events.

Endpoints:
- GET /api/universities/<id>/events - List events for a university
- POST /api/universities/<id>/events - Create event (executive+ of THIS university)
- GET /api/events/<id> - Get single event with attendees
- PUT /api/events/<id> - Update event (executive+ at event's university, or site admin)
- DELETE /api/events/<id> - Delete event (executive+ at event's university, or site admin)
- POST /api/events/<id>/rsvp - Toggle RSVP

Permission Logic:
- Event creation: Must be executive or president at the specific university, OR site admin
- Event editing: Must be executive+ at the event's university, OR site admin
- Event deletion: Must be executive+ at the event's university, OR site admin
- RSVP: Any authenticated user can RSVP to events
"""

import os
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from sqlalchemy import func, and_, or_
from backend.extensions import db
from backend.models import Event, EventAttendee, University, UniversityRole, EventAttendance
from backend.constants import UniversityRoles
from backend.utils.permissions import can_manage_university_members
from backend.utils.email import send_event_created_email, send_event_cancelled_email, generate_secure_token
from backend.routes_v2.events.helpers import send_bulk_email, validate_event_times_not_in_past

_DEV_MODE = os.environ.get('DEV_MODE')
_APP_URL = "http://localhost:8000" if _DEV_MODE else "https://aixu.tech"

events_bp = Blueprint('events', __name__)


def _get_member_recipients(university):
    """Return a list of (email, first_name) for all members."""
    return [
        (m['user'].email, m['user'].first_name)
        for m in university.get_members()
    ]


def _format_event_date(start_time, end_time=None):
    """Format event start/end into a readable string."""
    fmt = "%B %d, %Y at %I:%M %p UTC"
    text = start_time.strftime(fmt)
    if end_time:
        text += f" — {end_time.strftime('%I:%M %p UTC')}"
    return text


# =============================================================================
# List Events for University
# =============================================================================

@events_bp.route('/api/universities/<int:university_id>/events', methods=['GET'])
def get_university_events(university_id):
    """
    Get events for a university.

    Query Parameters:
        - upcoming: If 'true', only return future events (default: true)
        - limit: Max number of events to return (default: 20)

    Returns:
        JSON object with events array
    """
    # Verify university exists
    uni = University.query.get(university_id)
    if not uni:
        return jsonify({'error': 'University not found'}), 404

    upcoming_only = request.args.get('upcoming', 'true').lower() == 'true'
    limit = request.args.get('limit', 20, type=int)

    base_filter = Event.university_id == university_id
    if upcoming_only:
        # Use explicit UTC (naive) to match DB TIMESTAMP WITHOUT TIME ZONE storage
        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        start_of_today_utc = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
        # Include: (1) events with no end_time that start today or later, OR
        #          (2) events with end_time that haven't ended yet (ongoing or future)
        upcoming_filter = or_(
            and_(Event.end_time.is_(None), Event.start_time >= start_of_today_utc),
            and_(Event.end_time.isnot(None), Event.end_time >= now_utc),
        )
        base_filter = and_(base_filter, upcoming_filter)

    if current_user.is_authenticated:
        # Single query with LEFT JOIN to get events + isAttending in one round-trip
        rows = (
            db.session.query(Event, EventAttendee.id.label('rsvp_id'))
            .outerjoin(
                EventAttendee,
                and_(
                    EventAttendee.event_id == Event.id,
                    EventAttendee.user_id == current_user.id,
                )
            )
            .filter(base_filter)
            .order_by(Event.start_time.asc() if upcoming_only else Event.start_time.desc())
            .limit(limit)
            .all()
        )
        event_ids = [e.id for e, _ in rows]
        attendee_counts = dict(
            db.session.query(EventAttendee.event_id, func.count(EventAttendee.id))
            .filter(EventAttendee.event_id.in_(event_ids))
            .group_by(EventAttendee.event_id)
            .all()
        ) if event_ids else {}
        events_data = [
            {**event.to_dict(attendee_count=attendee_counts.get(event.id, 0)), 'isAttending': rsvp_id is not None}
            for event, rsvp_id in rows
        ]
    else:
        events = (
            Event.query.filter(base_filter)
            .order_by(Event.start_time.asc() if upcoming_only else Event.start_time.desc())
            .limit(limit)
            .all()
        )
        event_ids = [e.id for e in events]
        attendee_counts = dict(
            db.session.query(EventAttendee.event_id, func.count(EventAttendee.id))
            .filter(EventAttendee.event_id.in_(event_ids))
            .group_by(EventAttendee.event_id)
            .all()
        ) if event_ids else {}
        events_data = [
            {**e.to_dict(attendee_count=attendee_counts.get(e.id, 0)), 'isAttending': False}
            for e in events
        ]

    # Include attendance counts for executives+
    if current_user.is_authenticated:
        is_exec = current_user.is_site_admin() or \
            UniversityRole.get_role_level(current_user.id, university_id) >= UniversityRoles.EXECUTIVE
        if is_exec:
            event_ids = [e['id'] for e in events_data]
            if event_ids:
                counts = dict(
                    db.session.query(EventAttendance.event_id, func.count(EventAttendance.id))
                    .filter(EventAttendance.event_id.in_(event_ids))
                    .group_by(EventAttendance.event_id)
                    .all()
                )
                for event_dict in events_data:
                    event_dict['attendanceCount'] = counts.get(event_dict['id'], 0)

    return jsonify({
        'events': events_data
    })


# =============================================================================
# Create Event
# =============================================================================

@events_bp.route('/api/universities/<int:university_id>/events', methods=['POST'])
@login_required
def create_event(university_id):
    """
    Create a new event for a university.

    Authorization: Must be executive or president at THIS university, OR site admin.

    Request Body:
        {
            "title": "Event Title" (required),
            "description": "Optional description",
            "location": "Room 101 or Virtual (Zoom)",
            "startTime": "2025-01-15T15:00:00Z" (required),
            "endTime": "2025-01-15T17:00:00Z" (optional)
        }

    Returns:
        201: Created event
        400: Missing required fields or invalid data
        403: Not authorized
        404: University not found
    """
    # Verify university exists
    uni = University.query.get(university_id)
    if not uni:
        return jsonify({'error': 'University not found'}), 404

    # Check authorization: executive+ at THIS university, or site admin
    if not current_user.is_site_admin():
        role_level = UniversityRole.get_role_level(current_user.id, university_id)
        if role_level < UniversityRoles.EXECUTIVE:
            return jsonify({'error': 'Not authorized to create events for this university'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    # Validate required fields
    if not data.get('title'):
        return jsonify({'error': 'Title is required'}), 400
    if not data.get('startTime'):
        return jsonify({'error': 'Start time is required'}), 400

    # Validate field lengths
    if len(data['title'].strip()) > 200:
        return jsonify({'error': 'Title must be 200 characters or fewer'}), 400
    if data.get('location') and len(data['location'].strip()) > 300:
        return jsonify({'error': 'Location must be 300 characters or fewer'}), 400

    # Parse times
    try:
        start_time = datetime.fromisoformat(data['startTime'].replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        return jsonify({'error': 'Invalid start time format'}), 400

    end_time = None
    if data.get('endTime'):
        try:
            end_time = datetime.fromisoformat(data['endTime'].replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return jsonify({'error': 'Invalid end time format'}), 400

        # Validate that start time is before end time
        if start_time >= end_time:
            return jsonify({'error': 'Start time must be before end time'}), 400

    err = validate_event_times_not_in_past(start_time, end_time)
    if err:
        return jsonify({'error': err[0]}), err[1]

    # Create event with pre-generated attendance token
    event = Event(
        university_id=university_id,
        title=data['title'].strip(),
        description=data.get('description', '').strip() or None,
        location=data.get('location', '').strip() or None,
        start_time=start_time,
        end_time=end_time,
        created_by_id=current_user.id,
        attendance_token=generate_secure_token(32),
    )

    db.session.add(event)
    db.session.commit()

    # Notify all club members about the new event (non-blocking)
    recipients = _get_member_recipients(uni)
    if recipients:
        rsvp_url = f"{_APP_URL}/app/universities/{university_id}"
        send_bulk_email(
            current_app._get_current_object(),
            recipients,
            send_event_created_email,
            club_name=uni.clubName,
            event_title=event.title,
            event_date=_format_event_date(event.start_time, event.end_time),
            event_location=event.location,
            event_description=event.description,
            rsvp_url=rsvp_url,
        )

    return jsonify(event.to_dict()), 201


# =============================================================================
# Get Single Event
# =============================================================================

@events_bp.route('/api/events/<int:event_id>', methods=['GET'])
def get_event(event_id):
    """
    Get a single event with attendees.

    Returns:
        JSON object with event details and attendee list
    """
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    event_dict = event.to_dict(include_attendees=True)

    # Check if current user is attending
    if current_user.is_authenticated:
        attendee = EventAttendee.query.filter_by(
            event_id=event_id,
            user_id=current_user.id
        ).first()
        event_dict['isAttending'] = attendee is not None
        event_dict['attendeeStatus'] = attendee.status if attendee else None

        # Include attendance data for executives+
        is_exec = current_user.is_site_admin() or \
            UniversityRole.get_role_level(current_user.id, event.university_id) >= UniversityRoles.EXECUTIVE
        if is_exec:
            event_dict['attendanceToken'] = event.attendance_token
            event_dict['attendanceCount'] = EventAttendance.query.filter_by(event_id=event.id).count()
    else:
        event_dict['isAttending'] = False
        event_dict['attendeeStatus'] = None

    return jsonify(event_dict)


# =============================================================================
# Delete Event
# =============================================================================

@events_bp.route('/api/events/<int:event_id>', methods=['DELETE'])
@login_required
def delete_event(event_id):
    """
    Delete an event.

    Authorization:
        - Executive+ at the event's university
        - Site admin

    Returns:
        200: Success
        403: Not authorized
        404: Event not found
    """
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    # Check authorization: executive+ at the event's university, or site admin
    if not current_user.is_site_admin():
        role_level = UniversityRole.get_role_level(current_user.id, event.university_id)
        if role_level < UniversityRoles.EXECUTIVE:
            return jsonify({'error': 'Not authorized to delete this event'}), 403

    # Capture details before deletion for the cancellation email
    uni = event.university
    event_title = event.title
    event_date = _format_event_date(event.start_time, event.end_time)
    club_name = uni.clubName
    recipients = _get_member_recipients(uni)

    db.session.delete(event)
    db.session.commit()

    # Notify all club members about the cancellation (non-blocking)
    if recipients:
        send_bulk_email(
            current_app._get_current_object(),
            recipients,
            send_event_cancelled_email,
            club_name=club_name,
            event_title=event_title,
            event_date=event_date,
        )

    return jsonify({'success': True, 'message': 'Event deleted successfully'})


# =============================================================================
# Update Event
# =============================================================================

@events_bp.route('/api/events/<int:event_id>', methods=['PUT'])
@login_required
def update_event(event_id):
    """
    Update an existing event.

    Authorization: Must be executive+ at the event's university, OR site admin.

    Request Body:
        {
            "title": "Updated Title" (required),
            "description": "Updated description",
            "location": "New Room 202",
            "startTime": "2025-01-15T15:00:00Z" (required),
            "endTime": "2025-01-15T17:00:00Z" (optional)
        }

    Returns:
        200: Updated event
        400: Missing required fields or invalid data
        403: Not authorized
        404: Event not found
    """
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    # Check authorization: executive+ at the event's university, or site admin
    if not current_user.is_site_admin():
        role_level = UniversityRole.get_role_level(current_user.id, event.university_id)
        if role_level < UniversityRoles.EXECUTIVE:
            return jsonify({'error': 'Not authorized to edit this event'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    # Validate required fields
    if not data.get('title'):
        return jsonify({'error': 'Title is required'}), 400
    if not data.get('startTime'):
        return jsonify({'error': 'Start time is required'}), 400

    # Validate field lengths
    if len(data['title'].strip()) > 200:
        return jsonify({'error': 'Title must be 200 characters or fewer'}), 400
    if data.get('location') and len(data['location'].strip()) > 300:
        return jsonify({'error': 'Location must be 300 characters or fewer'}), 400

    # Parse times
    try:
        start_time = datetime.fromisoformat(data['startTime'].replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        return jsonify({'error': 'Invalid start time format'}), 400

    end_time = None
    if data.get('endTime'):
        try:
            end_time = datetime.fromisoformat(data['endTime'].replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return jsonify({'error': 'Invalid end time format'}), 400

        # Validate that start time is before end time
        if start_time >= end_time:
            return jsonify({'error': 'Start time must be before end time'}), 400

    err = validate_event_times_not_in_past(start_time, end_time)
    if err:
        return jsonify({'error': err[0]}), err[1]

    # Update event fields
    event.title = data['title'].strip()
    event.description = data.get('description', '').strip() or None
    event.location = data.get('location', '').strip() or None
    event.start_time = start_time
    event.end_time = end_time

    db.session.commit()

    return jsonify(event.to_dict()), 200


# =============================================================================
# Toggle RSVP
# =============================================================================

@events_bp.route('/api/events/<int:event_id>/rsvp', methods=['POST'])
@login_required
def toggle_rsvp(event_id):
    """
    Toggle RSVP for an event.

    Any authenticated user can RSVP to events.

    Request Body (optional):
        {
            "status": "attending" | "maybe" | "declined"
        }

    If no body provided, toggles between attending and not attending.

    Returns:
        JSON with updated attendance status
    """
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    data = request.get_json() or {}
    status = data.get('status', 'attending')

    if status not in ('attending', 'maybe', 'declined'):
        return jsonify({'error': 'Invalid status. Must be attending, maybe, or declined'}), 400

    # Check for existing RSVP
    existing = EventAttendee.query.filter_by(
        event_id=event_id,
        user_id=current_user.id
    ).first()

    if existing:
        # If same status or no status specified, toggle off (remove RSVP)
        if not data.get('status') or existing.status == status:
            db.session.delete(existing)
            db.session.commit()
            return jsonify({
                'success': True,
                'isAttending': False,
                'attendeeCount': len(event.attendees)
            })
        else:
            # Update status
            existing.status = status
            db.session.commit()
            return jsonify({
                'success': True,
                'isAttending': True,
                'status': status,
                'attendeeCount': len(event.attendees)
            })
    else:
        # Create new RSVP
        attendee = EventAttendee(
            event_id=event_id,
            user_id=current_user.id,
            status=status
        )
        db.session.add(attendee)
        db.session.commit()
        return jsonify({
            'success': True,
            'isAttending': True,
            'status': status,
            'attendeeCount': len(event.attendees)
        })
