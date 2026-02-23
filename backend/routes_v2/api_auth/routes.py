"""
API Authentication Routes

Handles user authentication flows for the React frontend:
- Login: Authenticate existing users
- Registration: Create new accounts with email verification
- Email Verification: Confirm email ownership with 6-digit codes
- Logout: End user sessions

Auto-Enrollment:
During registration, users are automatically enrolled in a university
based on their .edu email domain. For example, a user registering with
"student@uoregon.edu" will be automatically enrolled in the University
of Oregon if it exists in the database with email_domain="uoregon".
"""

from flask import Blueprint, request, jsonify, session, current_app
from flask_login import login_user, logout_user, login_required
import time
from backend.extensions import db
from backend.models import User, University, UniversityRequest, PasswordResetToken
from backend.utils.email import generate_verification_code, send_verification_email, send_reset_password_email, send_password_reset_confirmation
from backend.utils.validation import is_whitelisted_domain
from backend.utils.profile import create_initial_education
from backend.routes_v2.api_auth.helpers import (
    setup_registration_session,
    validate_registration_data,
    create_db_user,
    hash_text
)
import secrets
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
load_dotenv()


api_auth_bp = Blueprint('api_auth', __name__, url_prefix='/api/auth')

REQUIRED_PASSWORD_LENGTH = 6

DEV_MODE = os.environ.get('DEV_MODE')

APP_URL = "http://localhost:8000" if DEV_MODE else "https://aixu.tech"


# API endpoint for login (used by React frontend)
@api_auth_bp.route('/login', methods=['POST'])
def api_login():
    """
    API endpoint for user login

    Request body (JSON):
    {
        "email": "user@example.com",
        "password": "password123"
    }

    Returns:
    - 200: Success, user logged in
    - 400: Missing email or password
    - 401: Invalid credentials
    """
    try:
        data = request.get_json()

        email = data.get('email', '').strip()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        # Find user by email
        user = User.query.filter_by(email=email).first()

        # Check if user exists and password is correct
        if user and user.check_password(password):
            # Log the user in (creates Flask-Login session)
            login_user(user)

            # Return success with user data
            return jsonify({
                'success': True,
                'message': 'Logged in successfully',
                'user': user.to_dict()
            }), 200
        else:
            # Invalid credentials
            return jsonify({'error': 'Invalid email or password'}), 401

    except Exception as e:
        # Handle any unexpected errors
        return jsonify({'error': f'Server error: {str(e)}'}), 500


# API endpoint for registration (used by React frontend)
@api_auth_bp.route('/register', methods=['POST'])
def api_register():
    """
    API endpoint for user registration with automatic university enrollment.

    Users are automatically enrolled in a university based on their .edu email
    domain. No manual university selection is required or allowed.

    Request body (JSON):
    {
        "email": "user@uoregon.edu",
        "password": "password123",
        "firstName": "John",
        "lastName": "Doe"
    }

    Auto-Enrollment Process:
    1. User provides a .edu email address
    2. System extracts the email domain (e.g., "uoregon" from "@uoregon.edu")
    3. System finds a university with matching email_domain field
    4. If found, user is automatically enrolled upon verification

    Returns:
    - 200: Success with university info (if matched), verification email sent
    - 400: Missing required fields, invalid email format, or no matching university
    - 409: Email already exists
    """
    try:
        data = request.get_json()

        user_object, error = validate_registration_data(data)

        if error:
            message, code = error
            return jsonify({'error': message}), code

        email = user_object.get('email')
        password = user_object.get('password')
        first_name = user_object.get('first_name')
        last_name = user_object.get('last_name')

        email_domain = email.split('@')[1].lower()
        is_whitelisted = is_whitelisted_domain(email)

        if not email_domain.endswith('.edu') and not is_whitelisted:
            return jsonify({'error': 'Please use your university .edu email address'}), 400

        university = University.find_by_email_domain(email)

        if not university and not is_whitelisted:
            return jsonify({
                'error': 'No university found for your email domain. Please contact support if you believe this is an error.'
            }), 400

        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 409

        verification_code = generate_verification_code()

        # Store registration data in session for verification
        # University ID is determined automatically from email domain (None for whitelisted domains)
        setup_registration_session(
            email, password, first_name, last_name, university, verification_code)

        # Send verification email
        if send_verification_email(email, verification_code):
            response_data = {
                'success': True,
                'message': 'Verification code sent to your email',
                'email': email,
            }
            # Include university info so frontend can display it (if available)
            if university:
                response_data['university'] = {
                    'id': university.id,
                    'name': university.name,
                    'clubName': university.clubName
                }
            return jsonify(response_data), 200
        else:
            # Failed to send email, clean up session
            session.pop('pending_registration', None)
            session.pop('verification_code_hash', None)
            session.pop('verification_timestamp', None)
            return jsonify({'error': 'Failed to send verification email. Please try again.'}), 500

    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


# API endpoint for email verification (used by React frontend)
@api_auth_bp.route('/verify-email', methods=['POST'])
def api_verify_email():
    """
    API endpoint to verify email with verification code and complete registration.

    Upon successful verification:
    1. Creates the user account
    2. Automatically enrolls them in the university matching their email domain
    3. Logs them in

    Request body (JSON):
    {
        "code": "123456"
    }

    Returns:
    - 200: Success, user registered, enrolled in university, and logged in
    - 400: Missing code or no pending registration
    - 401: Invalid or expired code
    """
    try:
        # Check if there's a pending registration
        if 'pending_registration' not in session or 'verification_code_hash' not in session:
            return jsonify({'error': 'No pending registration found. Please register first.'}), 400

        # Get verification code from request
        data = request.get_json()
        entered_code = data.get('code', '').strip()

        if not entered_code:
            return jsonify({'error': 'Verification code is required'}), 400

        # Check if code has expired (180 seconds = 3 minutes)
        if time.time() - session.get('verification_timestamp', 0) > 180:
            # Clean up expired session data
            session.pop('verification_code_hash', None)
            session.pop('verification_timestamp', None)
            session.pop('pending_registration', None)
            return jsonify({'error': 'Verification code has expired. Please register again.'}), 401

        # Verify the code by comparing hashes
        # In development mode (DEV_MODE=true), accept any 6-digit code for easier testing
        is_dev_mode = current_app.config.get('DEV_MODE', False)
        is_valid_dev_code = is_dev_mode and len(
            entered_code) == 6 and entered_code.isdigit()

        entered_code_hash = hash_text(entered_code)
        if entered_code_hash == session.get('verification_code_hash') or is_valid_dev_code:
            reg_data = session['pending_registration']

            # Check if user already exists (shouldn't happen, but be safe)
            user = User.query.filter_by(email=reg_data['email']).first()
            if user is None:
                user = create_db_user(reg_data)

            # Clean up session
            session.pop('pending_registration', None)
            session.pop('verification_code_hash', None)
            session.pop('verification_timestamp', None)

            # Log the user in
            login_user(user)

            return jsonify({
                'success': True,
                'message': 'Registration successful! Welcome to AIxU!',
                'user': user.to_dict()
            }), 200
        else:
            # Invalid code
            return jsonify({'error': 'Invalid verification code. Please try again.'}), 401

    except Exception as e:
        # Handle any unexpected errors
        db.session.rollback()
        return jsonify({'error': f'Server error: {str(e)}'}), 500


# API endpoint to resend verification code (used by React frontend)
@api_auth_bp.route('/resend-verification', methods=['POST'])
def api_resend_verification():
    """
    API endpoint to resend verification code

    Returns:
    - 200: Success, new code sent
    - 400: No pending registration
    - 500: Failed to send email
    """
    try:
        # Check if there's a pending registration
        if 'pending_registration' not in session:
            return jsonify({'error': 'No pending registration found.'}), 400

        email = session['pending_registration'].get('email')
        if not email:
            return jsonify({'error': 'No email found in pending registration.'}), 400

        # Generate new verification code and store hash
        verification_code = generate_verification_code()
        session['verification_code_hash'] = hash_text(
            verification_code)
        session['verification_timestamp'] = time.time()

        # Send verification email (plain code goes to email only)
        if send_verification_email(email, verification_code):
            return jsonify({
                'success': True,
                'message': 'New verification code sent to your email',
                'remainingTime': 180  # 3 minutes in seconds
            }), 200
        else:
            return jsonify({'error': 'Failed to send verification email. Please try again.'}), 500

    except Exception as e:
        # Handle any unexpected errors
        return jsonify({'error': f'Server error: {str(e)}'}), 500


# API endpoint for logout (used by React frontend)
@api_auth_bp.route('/logout', methods=['POST', 'GET'])
@login_required
def api_logout():
    """
    API endpoint for user logout

    Returns:
    - 200: Success, user logged out
    """
    try:
        # Log the user out (clears Flask-Login session)
        logout_user()

        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        }), 200

    except Exception as e:
        # Handle any unexpected errors
        return jsonify({'error': f'Server error: {str(e)}'}), 500


# =============================================================================
# Account Creation from Approved University Request
# =============================================================================

@api_auth_bp.route('/validate-token', methods=['GET'])
def validate_account_token():
    """
    Validate an account creation token from a university approval email.

    This endpoint checks if a token is valid and returns the associated
    request data (name, email, university) so the frontend can display
    the "complete account" form pre-filled with this information.

    Query Parameters:
        token: The account creation token from the approval email

    Returns:
    - 200: Token valid, returns request data
    - 400: Missing token parameter
    - 404: Invalid, expired, or already-used token
    """
    token = request.args.get('token', '').strip()

    if not token:
        return jsonify({'error': 'Token parameter is required'}), 400

    # Find the request by token (validates status, expiry, and unused)
    uni_request = UniversityRequest.find_by_token(token)

    if not uni_request:
        return jsonify({
            'error': 'This link is invalid, has expired, or has already been used.'
        }), 404

    # Find the associated university
    university = University.find_by_email_domain(
        f"user@{uni_request.email_domain}.edu"
    )

    return jsonify({
        'valid': True,
        'firstName': uni_request.requester_first_name,
        'lastName': uni_request.requester_last_name,
        'email': uni_request.requester_email,
        'universityName': uni_request.university_name,
        'university': university.to_dict() if university else None
    }), 200


@api_auth_bp.route('/complete-account', methods=['POST'])
def complete_account():
    """
    Complete account creation using a token from university approval email.

    This endpoint creates a user account without requiring email verification,
    since the email was already verified during the university request process.

    Request body (JSON):
    {
        "token": "secure-token-from-email",
        "password": "user-chosen-password"
    }

    Process:
    1. Validates the token (not expired, not used)
    2. Creates the User account with pre-verified email
    3. Enrolls user in their university
    4. Marks the token as used (one-time use)
    5. Logs the user in

    Returns:
    - 200: Success, account created and logged in
    - 400: Missing required fields or password too short
    - 404: Invalid, expired, or already-used token
    - 409: Email already has an account
    """
    try:
        data = request.get_json() or {}

        token = data.get('token', '').strip()
        password = data.get('password', '')

        # Validate required fields
        if not token:
            return jsonify({'error': 'Token is required'}), 400

        if not password:
            return jsonify({'error': 'Password is required'}), 400

        if len(password) < REQUIRED_PASSWORD_LENGTH:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400

        # Find and validate the request by token
        uni_request = UniversityRequest.find_by_token(token)

        if not uni_request:
            return jsonify({
                'error': 'This link is invalid, has expired, or has already been used.'
            }), 404

        # Check if user already exists
        existing_user = User.query.filter_by(
            email=uni_request.requester_email).first()
        if existing_user:
            return jsonify({
                'error': 'An account with this email already exists. Please log in instead.'
            }), 409

        # Find the associated university
        university = University.find_by_email_domain(
            f"user@{uni_request.email_domain}.edu"
        )

        if not university:
            return jsonify({
                'error': 'Associated university not found. Please contact support.'
            }), 500

        # Create the user account
        user = User(
            email=uni_request.requester_email,
            first_name=uni_request.requester_first_name,
            last_name=uni_request.requester_last_name,
            university=university.name
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()  # Get user.id before commit

        # Add user to university members list and auto-populate education
        university.add_member(user.id)
        create_initial_education(user, university)

        # Mark the request as used (links to user, clears token)
        uni_request.mark_account_created(user.id)

        db.session.commit()

        # Log the user in
        login_user(user)

        return jsonify({
            'success': True,
            'message': 'Account created successfully! Welcome to AIxU!',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.exception(
            'Failed to complete account creation: %s', e)
        return jsonify({'error': f'Server error: {str(e)}'}), 500


# =============================================================================
# Development Auto-Login
# =============================================================================

@api_auth_bp.route('/dev-login', methods=['POST'])
def dev_login():
    """
    Development-only auto-login endpoint.

    Automatically logs in as the dev user (dev@test.edu) without requiring
    credentials. This endpoint is only available when DEV_MODE=true.

    This enables a seamless development experience where developers don't
    need to manually log in after each server restart.

    Security:
    - Only available when DEV_MODE=true in environment
    - Returns 403 Forbidden in production
    - Uses remember=True for persistent session

    Returns:
    - 200: { success: true, user: {...} } - Dev user logged in
    - 403: { error: "..." } - DEV_MODE is not enabled (production)
    - 404: { error: "..." } - Dev user not found (run seed_data)
    """
    # Gate this endpoint behind DEV_MODE for security
    if not current_app.config.get('DEV_MODE', False):
        return jsonify({
            'error': 'Dev login is only available in development mode'
        }), 403

    try:
        # Import the dev user email constant from seed_data
        from backend.seed_data import DEV_USER_EMAIL

        # Find the dev user
        user = User.query.filter_by(email=DEV_USER_EMAIL).first()

        if not user:
            return jsonify({
                'error': 'Dev user not found. Ensure DEV_MODE=true and restart the server.'
            }), 404

        # Log in the dev user with remember=True for persistent session
        login_user(user, remember=True)

        return jsonify({
            'success': True,
            'message': 'Dev auto-login successful',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        current_app.logger.exception('Dev login failed: %s', e)
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@api_auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():

    data = request.get_json()

    email = data.get('email')

    if not email:
        return jsonify({'error': 'An email is required for resetting your password'}), 400

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({'error': 'No account found with that email'}), 400

    token = secrets.token_urlsafe(32)

    # Create reset token with 1 hour expiry
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=1)
    )

    # Delete old unused tokens for the user
    PasswordResetToken.query.filter_by(user_id=user.id, used=False).delete(synchronize_session=False)

    db.session.add(reset_token)
    db.session.commit()

    reset_url = f"{APP_URL}/app/reset-password?token={token}"

    if send_reset_password_email(user.email, reset_url, user.first_name):
        return jsonify({'message': 'If that email exists, reset link sent'}), 200

    else:
        jsonify({'error': 'Failed to send reset password email'}), 500


@api_auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()

    token = data.get('token')
    new_password = data.get('password')

    # Validate required fields
    if not token:
        return jsonify({'error': 'Token is required'}), 400

    if not new_password:
        return jsonify({'error': 'Password is required'}), 400

    if len(new_password) < REQUIRED_PASSWORD_LENGTH:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    reset_token = PasswordResetToken.query.filter_by(
        token=token,
        used=False
    ).first()

    if not reset_token:
        return jsonify({'error': 'Invalid or expired token'}), 400

    if reset_token.expires_at < datetime.utcnow():
        return jsonify({'error': 'Token has expired'}), 400

    user = reset_token.user
    user.set_password(new_password)

    reset_token.used = True

    db.session.commit()

    # Optionally send a reset password email if need be
    # if send_password_reset_confirmation(user.email):
    #     return jsonify({'message': 'Password reset successful'}), 200

    login_user(user)

    return jsonify({'message': 'Password reset successful'}), 200


@api_auth_bp.route('/validate-reset-token', methods=['POST'])
def validate_reset_token():
    data = request.get_json()
    token = data.get('token')

    if not token:
        return jsonify({'error': 'Token required'}), 400

    reset_token = PasswordResetToken.query.filter_by(
        token=token,
        used=False
    ).first()

    if not reset_token:
        return jsonify({'error': 'Invalid or already used token'}), 400

    if reset_token.expires_at < datetime.utcnow():
        return jsonify({'error': 'Token has expired'}), 400

    return jsonify({'message': 'Token is valid'}), 200
