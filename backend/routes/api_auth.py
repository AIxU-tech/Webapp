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
from backend.models import User, University
from backend.utils.email import generate_verification_code, send_verification_email
from backend.utils.validation import is_whitelisted_domain

api_auth_bp = Blueprint('api_auth', __name__, url_prefix='/api/auth')


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
        # Get JSON data from request
        data = request.get_json()

        # Validate required fields
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
        # Get JSON data from request
        data = request.get_json()

        # Extract and validate required fields
        email = data.get('email', '').strip()
        password = data.get('password', '')
        first_name = data.get('firstName', '').strip()
        last_name = data.get('lastName', '').strip()

        # Validate all required fields are present
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        if not first_name:
            return jsonify({'error': 'First name is required'}), 400

        if not last_name:
            return jsonify({'error': 'Last name is required'}), 400

        # Validate email format - must be a .edu email (or whitelisted domain)
        if '@' not in email:
            return jsonify({'error': 'Please enter a valid email address'}), 400

        email_domain = email.split('@')[1].lower()
        is_whitelisted = is_whitelisted_domain(email)

        if not email_domain.endswith('.edu') and not is_whitelisted:
            return jsonify({'error': 'Please use your university .edu email address'}), 400

        # Find university matching the email domain
        # This uses the University.find_by_email_domain() class method
        # Whitelisted domains bypass university requirement
        university = University.find_by_email_domain(email)
        if not university and not is_whitelisted:
            return jsonify({
                'error': 'No university found for your email domain. Please contact support if you believe this is an error.'
            }), 400

        # Check if email already exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 409

        # Store registration data in session for verification
        # University ID is determined automatically from email domain (None for whitelisted domains)
        session['pending_registration'] = {
            'email': email,
            'password': password,
            'first_name': first_name,
            'last_name': last_name,
            'university_id': str(university.id) if university else None,
            'timestamp': time.time()
        }

        # Generate and send verification code
        verification_code = generate_verification_code()
        session['verification_code'] = verification_code
        session['verification_timestamp'] = time.time()

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
            session.pop('verification_code', None)
            session.pop('verification_timestamp', None)
            return jsonify({'error': 'Failed to send verification email. Please try again.'}), 500

    except Exception as e:
        # Handle any unexpected errors
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
        if 'pending_registration' not in session or 'verification_code' not in session:
            return jsonify({'error': 'No pending registration found. Please register first.'}), 400

        # Get verification code from request
        data = request.get_json()
        entered_code = data.get('code', '').strip()

        if not entered_code:
            return jsonify({'error': 'Verification code is required'}), 400

        # Check if code has expired (180 seconds = 3 minutes)
        if time.time() - session.get('verification_timestamp', 0) > 180:
            # Clean up expired session data
            session.pop('verification_code', None)
            session.pop('verification_timestamp', None)
            session.pop('pending_registration', None)
            return jsonify({'error': 'Verification code has expired. Please register again.'}), 401

        # Verify the code
        # In development mode (DEV_MODE=true), accept any 6-digit code for easier testing
        is_dev_mode = current_app.config.get('DEV_MODE', False)
        is_valid_dev_code = is_dev_mode and len(entered_code) == 6 and entered_code.isdigit()
        if entered_code == session.get('verification_code') or is_valid_dev_code:
            reg_data = session['pending_registration']

            # Check if user already exists (shouldn't happen, but be safe)
            user = User.query.filter_by(email=reg_data['email']).first()
            if user is None:
                # Get the university for auto-enrollment
                # University ID was determined during registration based on email domain
                university_id = reg_data.get('university_id')
                university = University.query.get(int(university_id)) if university_id else None

                # Create new user with university already set
                user = User(
                    email=reg_data['email'],
                    first_name=reg_data['first_name'],
                    last_name=reg_data['last_name'],
                    university=university.name if university else None
                )
                user.set_password(reg_data['password'])
                db.session.add(user)
                db.session.commit()

                # Add user to university members list (automatic enrollment)
                if university:
                    university.add_member(user.id)
                    db.session.commit()

            # Clean up session
            session.pop('pending_registration', None)
            session.pop('verification_code', None)
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

        # Generate new verification code
        verification_code = generate_verification_code()
        session['verification_code'] = verification_code
        session['verification_timestamp'] = time.time()

        # Send verification email
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
