"""
University Request API Routes

Handles requests to add new universities. Uses the same verification
pattern as registration (session-based, 6-digit code, 3-minute expiry).

Flow:
1. /start - Collect info, send verification code (reuses email.py)
2. /verify - Verify code (same pattern as api_auth)
3. /submit - Save request to admin queue

Admin endpoints use existing permission system.
"""

import time
import json
from flask import Blueprint, request, jsonify, session, current_app
from flask_login import login_required, current_user

from backend.extensions import db
from backend.models import User, University, UniversityRequest, RequestStatus
from backend.utils.email import (
    generate_verification_code,
    send_verification_email,
    send_university_request_submitted_email,
    send_university_approved_email
)
from backend.utils.validation import validate_edu_email, validate_required_fields
from backend.constants import ADMIN

university_requests_bp = Blueprint('university_requests', __name__, url_prefix='/api/university-requests')

# Session keys (namespaced to avoid collision with registration flow)
SESSION_PENDING = 'pending_uni_request'
SESSION_CODE = 'uni_request_code'
SESSION_CODE_TIME = 'uni_request_code_time'
SESSION_VERIFIED = 'uni_request_verified'

# Verification expiry (same as registration: 3 minutes)
CODE_EXPIRY_SECONDS = 180


@university_requests_bp.route('/start', methods=['POST'])
def start_request():
    """
    Start university request flow. Validates email and sends verification code.
    Reuses the same email verification infrastructure as registration.
    """
    data = request.get_json() or {}

    # Validate required fields
    valid, error = validate_required_fields(data, ['email', 'firstName', 'lastName'])
    if not valid:
        return jsonify({'error': error}), 400

    email = data['email'].strip().lower()
    first_name = data['firstName'].strip()
    last_name = data['lastName'].strip()

    # Validate .edu email format
    valid, error, domain = validate_edu_email(email)
    if not valid:
        return jsonify({'error': error}), 400

    # Check university doesn't already exist for this domain
    existing = University.find_by_email_domain(email)
    if existing:
        return jsonify({
            'error': f'University already exists: {existing.name}. Please register normally.',
            'universityExists': True,
            'universityName': existing.name
        }), 400

    # Check user doesn't already have an account
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account already exists with this email.'}), 409

    # Check for existing pending request
    if UniversityRequest.has_pending_request(email):
        return jsonify({'error': 'You already have a pending request. Please wait for admin review.'}), 409

    # Store in session (same pattern as api_auth registration)
    session[SESSION_PENDING] = {
        'email': email,
        'first_name': first_name,
        'last_name': last_name,
        'email_domain': domain,
        'timestamp': time.time()
    }

    # Generate and send code (reusing existing infrastructure)
    code = generate_verification_code()
    session[SESSION_CODE] = code
    session[SESSION_CODE_TIME] = time.time()

    if send_verification_email(email, code):
        return jsonify({
            'success': True,
            'message': 'Verification code sent to your email',
            'email': email,
            'emailDomain': domain
        }), 200
    else:
        # Clean up on failure
        session.pop(SESSION_PENDING, None)
        session.pop(SESSION_CODE, None)
        session.pop(SESSION_CODE_TIME, None)
        return jsonify({'error': 'Failed to send verification email. Please try again.'}), 500


@university_requests_bp.route('/verify', methods=['POST'])
def verify_request():
    """
    Verify email code. Same logic as api_auth verify-email endpoint.
    """
    pending = session.get(SESSION_PENDING)
    stored_code = session.get(SESSION_CODE)
    code_time = session.get(SESSION_CODE_TIME, 0)

    if not pending or not stored_code:
        return jsonify({'error': 'No pending request found. Please start again.'}), 400

    data = request.get_json() or {}
    entered_code = data.get('code', '').strip()

    if not entered_code:
        return jsonify({'error': 'Verification code is required'}), 400

    # Check expiry (same 3-minute window as registration)
    if time.time() - code_time > CODE_EXPIRY_SECONDS:
        session.pop(SESSION_CODE, None)
        session.pop(SESSION_CODE_TIME, None)
        return jsonify({'error': 'Verification code has expired. Please request a new one.'}), 401

    # In development mode (DEV_MODE=true), accept any 6-digit code for easier testing
    is_dev_mode = current_app.config.get('DEV_MODE', False)
    is_valid_dev_code = is_dev_mode and len(entered_code) == 6 and entered_code.isdigit()
    if entered_code != stored_code and not is_valid_dev_code:
        return jsonify({'error': 'Invalid verification code. Please try again.'}), 401

    # Mark verified
    session[SESSION_VERIFIED] = time.time()
    session.pop(SESSION_CODE, None)
    session.pop(SESSION_CODE_TIME, None)

    return jsonify({
        'success': True,
        'message': 'Email verified! You can now submit your university details.',
        'email': pending['email'],
        'firstName': pending['first_name'],
        'lastName': pending['last_name'],
        'emailDomain': pending['email_domain']
    }), 200


@university_requests_bp.route('/resend-code', methods=['POST'])
def resend_code():
    """Resend verification code. Same pattern as api_auth resend-verification."""
    pending = session.get(SESSION_PENDING)
    if not pending:
        return jsonify({'error': 'No pending request found. Please start again.'}), 400

    code = generate_verification_code()
    session[SESSION_CODE] = code
    session[SESSION_CODE_TIME] = time.time()

    if send_verification_email(pending['email'], code):
        return jsonify({
            'success': True,
            'message': 'New verification code sent',
            'remainingTime': CODE_EXPIRY_SECONDS
        }), 200
    else:
        return jsonify({'error': 'Failed to send verification email.'}), 500


@university_requests_bp.route('/submit', methods=['POST'])
def submit_request():
    """
    Submit university details after email verification.

    After successful submission, sends a confirmation email to the requester
    explaining the next steps (admin review, approval notification, etc.).
    """
    pending = session.get(SESSION_PENDING)
    verified_at = session.get(SESSION_VERIFIED)

    if not pending:
        return jsonify({'error': 'No pending request found. Please start again.'}), 400

    if not verified_at:
        return jsonify({'error': 'Email not verified. Please verify first.'}), 400

    # Verification valid for 30 minutes
    if time.time() - verified_at > 1800:
        session.pop(SESSION_PENDING, None)
        session.pop(SESSION_VERIFIED, None)
        return jsonify({'error': 'Session expired. Please start again.'}), 401

    data = request.get_json() or {}

    # Validate required university details
    valid, error = validate_required_fields(data, [
        'universityName', 'universityLocation', 'clubName', 'clubDescription'
    ])
    if not valid:
        return jsonify({'error': error}), 400

    university_name = data['universityName'].strip()

    # Create the request
    try:
        uni_request = UniversityRequest(
            requester_email=pending['email'],
            requester_first_name=pending['first_name'],
            requester_last_name=pending['last_name'],
            university_name=university_name,
            university_location=data['universityLocation'].strip(),
            email_domain=pending['email_domain'],
            club_name=data['clubName'].strip(),
            club_description=data['clubDescription'].strip(),
            club_tags=json.dumps(data.get('clubTags', [])) if data.get('clubTags') else None,
            status=RequestStatus.PENDING
        )
        db.session.add(uni_request)
        db.session.commit()

        # Send confirmation email to the requester
        email_sent = send_university_request_submitted_email(
            email=pending['email'],
            first_name=pending['first_name'],
            university_name=university_name
        )

        # Clear session
        session.pop(SESSION_PENDING, None)
        session.pop(SESSION_VERIFIED, None)

        return jsonify({
            'success': True,
            'message': 'Request submitted! An admin will review it shortly.',
            'requestId': uni_request.id,
            'emailSent': email_sent
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.exception('Failed to submit university request: %s', e)
        return jsonify({'error': f'Failed to submit request: {str(e)}'}), 500


# =============================================================================
# Admin Endpoints (reuse existing permission pattern)
# =============================================================================

@university_requests_bp.route('/admin/pending', methods=['GET'])
@login_required
def get_pending():
    """Get pending requests (admin only)."""
    if current_user.permission_level < ADMIN:
        return jsonify({'error': 'Admin permission required'}), 403

    requests = UniversityRequest.get_pending_requests()
    return jsonify({
        'requests': [r.to_dict() for r in requests],
        'count': len(requests)
    }), 200


@university_requests_bp.route('/admin/<int:request_id>/approve', methods=['POST'])
@login_required
def approve(request_id: int):
    """
    Approve request, create university, and send account creation email.

    This endpoint:
    1. Creates the University record
    2. Generates a secure account creation token
    3. Sends an email to the requester with a link to complete their account

    The requester can then create their account using just a password,
    since their email was already verified during the request process.
    """
    if current_user.permission_level < ADMIN:
        return jsonify({'error': 'Admin permission required'}), 403

    uni_request = UniversityRequest.query.get_or_404(request_id)

    if uni_request.status != RequestStatus.PENDING:
        return jsonify({'error': f'Request already {uni_request.status}'}), 400

    # Verify domain still available
    if University.find_by_email_domain(f"user@{uni_request.email_domain}.edu"):
        return jsonify({'error': 'University with this domain already exists'}), 400

    try:
        # Create university
        university = University(
            name=uni_request.university_name,
            location=uni_request.university_location,
            clubName=uni_request.club_name,
            description=uni_request.club_description,
            email_domain=uni_request.email_domain,
            tags=uni_request.club_tags
        )
        db.session.add(university)

        # Generate secure account creation token (valid for 7 days)
        token = uni_request.generate_account_creation_token(expiry_days=7)

        # Approve request (updates status and review info)
        data = request.get_json() or {}
        uni_request.approve(current_user.id, data.get('notes'))

        db.session.commit()

        # Build the account creation URL
        # Use the request's host to generate the correct URL
        base_url = request.host_url.rstrip('/')
        account_creation_url = f"{base_url}/app/complete-account?token={token}"

        # Send approval email with account creation link
        email_sent = send_university_approved_email(
            email=uni_request.requester_email,
            first_name=uni_request.requester_first_name,
            university_name=uni_request.university_name,
            account_creation_url=account_creation_url
        )

        return jsonify({
            'success': True,
            'message': f'University "{university.name}" created. Account creation email sent to requester.',
            'universityId': university.id,
            'emailSent': email_sent
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.exception('Failed to approve university request: %s', e)
        return jsonify({'error': str(e)}), 500


@university_requests_bp.route('/admin/<int:request_id>/reject', methods=['POST'])
@login_required
def reject(request_id: int):
    """Reject request (admin only)."""
    if current_user.permission_level < ADMIN:
        return jsonify({'error': 'Admin permission required'}), 403

    uni_request = UniversityRequest.query.get_or_404(request_id)

    if uni_request.status != RequestStatus.PENDING:
        return jsonify({'error': f'Request already {uni_request.status}'}), 400

    data = request.get_json() or {}
    uni_request.reject(current_user.id, data.get('notes'))

    return jsonify({'success': True, 'message': 'Request rejected'}), 200
