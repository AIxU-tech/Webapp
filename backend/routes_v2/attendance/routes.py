"""
Attendance Routes

API endpoints for event attendance tracking via QR code check-in.

Endpoints:
- GET /api/events/<id>/attendance-token - Get attendance token, generate if missing (executive+)
- GET /api/attendance/<token> - Get event info by attendance token (public)
- POST /api/attendance/<token> - Submit attendance (public)
- GET /api/events/<id>/attendance - Get attendance records (executive+)
"""

import re
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from sqlalchemy.exc import IntegrityError
from backend.extensions import db
from backend.models.event import Event
from backend.models.event_attendance import EventAttendance
from backend.models.user import User
from backend.models.university import University
from backend.models.university_role import UniversityRole
from backend.constants import UniversityRoles
from backend.utils.email import generate_secure_token, send_attendance_account_email
from backend.utils.validation import validate_edu_email, is_whitelisted_domain
from backend.services.content_moderator import moderate_content

attendance_bp = Blueprint('attendance', __name__)

EMAIL_REGEX = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def _is_event_past(event):
    """Check if an event has ended."""
    reference_time = event.end_time or event.start_time
    return datetime.utcnow() > reference_time


def _can_manage_event_attendance(user, event):
    """Check if user can manage attendance for an event."""
    if user.is_site_admin():
        return True
    role_level = UniversityRole.get_role_level(user.id, event.university_id)
    return role_level >= UniversityRoles.EXECUTIVE


def _datetime_to_iso_utc(dt):
    """Serialize a datetime for JSON as UTC."""
    if dt is None:
        return None
    s = dt.isoformat()
    if dt.tzinfo is None:
        return s + 'Z'
    return s


# =============================================================================
# Generate Attendance Token
# =============================================================================

@attendance_bp.route('/api/events/<int:event_id>/attendance-token', methods=['GET'])
@login_required
def generate_attendance_token(event_id):
    """
    Get the attendance QR token for an event. Generates one if it doesn't exist.

    Authorization: Executive+ at the event's university, or site admin.

    Returns:
        200: { token: string }
        403: Not authorized
        404: Event not found
    """
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    if not _can_manage_event_attendance(current_user, event):
        return jsonify({'error': 'Not authorized to manage attendance for this event'}), 403

    if not event.attendance_token:
        event.attendance_token = generate_secure_token(32)
        db.session.commit()

    return jsonify({
        'token': event.attendance_token,
    })


# =============================================================================
# Get Event by Attendance Token (Public)
# =============================================================================

@attendance_bp.route('/api/attendance/<token>', methods=['GET'])
def get_event_by_token(token):
    """
    Look up event info by attendance token.

    Public endpoint. If the requester is logged in, includes autofill data
    and whether they have already checked in.

    Returns:
        200: Event info
        404: Invalid token
    """
    event = Event.query.filter_by(attendance_token=token).first()
    if not event:
        return jsonify({'error': 'Invalid attendance link'}), 404

    university = University.query.get(event.university_id)

    response = {
        'event': {
            'id': event.id,
            'title': event.title,
            'startTime': _datetime_to_iso_utc(event.start_time),
            'endTime': _datetime_to_iso_utc(event.end_time),
            'location': event.location,
            'universityName': university.name if university else None,
            'universityId': university.id if university else None,
            'universityHasLogo': bool(university.logo_gcs_path) if university else False,
            'universityLogoUrl': university.get_logo_url() if university else None,
            'isPast': _is_event_past(event),
        }
    }

    if current_user.is_authenticated:
        full_name = f'{current_user.first_name} {current_user.last_name}'.strip()
        response['autoFill'] = {
            'name': full_name,
            'email': current_user.email,
        }
        existing = EventAttendance.find_existing(event.id, user_id=current_user.id)
        response['alreadyCheckedIn'] = existing is not None

    return jsonify(response)


# =============================================================================
# Submit Attendance (Public)
# =============================================================================

@attendance_bp.route('/api/attendance/<token>', methods=['POST'])
def submit_attendance(token):
    """
    Submit attendance for an event via QR code check-in.

    Public endpoint. Accepts name (required) and optional email.
    Deduplicates by user_id (if logged in) or by email.

    Returns:
        201: Attendance recorded
        400: Validation error
        404: Invalid token
    """
    event = Event.query.filter_by(attendance_token=token).first()
    if not event:
        return jsonify({'error': 'Invalid attendance link'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    if len(name) > 200:
        return jsonify({'error': 'Name must be 200 characters or fewer'}), 400

    if not moderate_content(name):
        return jsonify({'error': 'Name contains inappropriate content'}), 400

    email = (data.get('email') or '').strip() or None
    if email:
        if not EMAIL_REGEX.match(email):
            return jsonify({'error': 'Invalid email format'}), 400

        # Validate .edu email and find associated university
        if not is_whitelisted_domain(email):
            is_valid, err_msg, _ = validate_edu_email(email)
            if not is_valid:
                return jsonify({'error': err_msg}), 400

            email_university = University.find_by_email_domain(email)
            if not email_university:
                return jsonify({'error': 'No university matches your email domain'}), 400
        else:
            email_university = None

    # Resolve user: logged-in session, email match, or create partial account
    user_id = current_user.id if current_user.is_authenticated else None

    if not user_id and email:
        matched_user = User.query.filter(
            db.func.lower(User.email) == email.lower()
        ).first()

        if not matched_user:
            # Create a partial account so attendance accumulates across events
            name_parts = name.split(None, 1)
            matched_user = User(
                email=email.lower(),
                first_name=name_parts[0],
                last_name=name_parts[1] if len(name_parts) > 1 else '',
                university=email_university.name if email_university else None,
                is_partial=True,
                password_hash='!partial',
            )
            db.session.add(matched_user)
            db.session.flush()

            # Enroll partial user in their university (from email domain)
            if email_university:
                email_university.add_member(matched_user.id)

            # Commit user + enrollment before generating token
            db.session.commit()

        # Send account creation email for partial accounts without a token
        if matched_user.is_partial and not matched_user.account_creation_token:
            acct_token = matched_user.generate_account_creation_token()
            db.session.commit()

            base_url = request.host_url.rstrip('/')
            account_url = f"{base_url}/app/complete-account?token={acct_token}"
            club_name = email_university.clubName if email_university else 'AIxU'
            try:
                send_attendance_account_email(
                    email=email,
                    first_name=matched_user.first_name,
                    event_title=event.title,
                    club_name=club_name,
                    account_creation_url=account_url,
                )
            except Exception:
                pass  # Email failure is non-blocking

        user_id = matched_user.id

    # Deduplication: check by resolved user_id and also by email
    # (covers the case where an old anonymous record exists for this email)
    existing = None
    if user_id:
        existing = EventAttendance.query.filter_by(
            event_id=event.id, user_id=user_id
        ).first()
    if not existing and email:
        existing = EventAttendance.query.filter_by(
            event_id=event.id, email=email, user_id=None
        ).first()
        if existing and user_id:
            # Retroactively link old anonymous record to resolved user
            existing.user_id = user_id
            db.session.commit()
    if existing:
        return jsonify({'success': True, 'alreadyCheckedIn': True, 'eventId': event.id}), 200

    record = EventAttendance(
        event_id=event.id,
        name=name,
        email=email,
        user_id=user_id,
        checked_in_via='qr_scan',
    )
    db.session.add(record)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        existing = EventAttendance.find_existing(event.id, user_id=user_id, email=email)
        if existing:
            return jsonify({'success': True, 'alreadyCheckedIn': True, 'eventId': event.id}), 200
        return jsonify({'error': 'Failed to record attendance'}), 500

    # Increment events_attended_count if user is a member of this university
    if user_id:
        db.session.query(UniversityRole).filter_by(
            user_id=user_id,
            university_id=event.university_id,
        ).update(
            {UniversityRole.events_attended_count: UniversityRole.events_attended_count + 1},
            synchronize_session=False,
        )
        db.session.commit()

    return jsonify({
        'success': True,
        'alreadyCheckedIn': False,
        'eventId': event.id,
        'attendance': record.to_dict(),
    }), 201


# =============================================================================
# Get Attendance Records
# =============================================================================

@attendance_bp.route('/api/events/<int:event_id>/attendance', methods=['GET'])
@login_required
def get_attendance_records(event_id):
    """
    Get attendance records for an event.

    Authorization: Executive+ at the event's university, or site admin.

    Returns:
        200: Attendance records with count
        403: Not authorized
        404: Event not found
    """
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    if not _can_manage_event_attendance(current_user, event):
        return jsonify({'error': 'Not authorized to view attendance records'}), 403

    records = (
        EventAttendance.query
        .filter_by(event_id=event_id)
        .order_by(EventAttendance.checked_in_at.asc())
        .all()
    )

    return jsonify({
        'attendance': [r.to_dict() for r in records],
        'count': len(records),
    })
