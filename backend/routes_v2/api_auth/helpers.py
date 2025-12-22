from flask import Blueprint, request, jsonify, session, current_app
from flask_login import login_user, logout_user, login_required
import time
from backend.extensions import db
from backend.models import User, University, UniversityRequest
from backend.utils.email import generate_verification_code, send_verification_email
from backend.utils.validation import is_whitelisted_domain
from backend.routes_v2.api_auth.helpers import setup_registration_session, validate_registration_data


def validate_registration_data(data):
    """Validate registration request data."""
    email = data.get('email', '').strip()
    password = data.get('password', '')
    first_name = data.get('firstName', '').strip()
    last_name = data.get('lastName', '').strip()

    if not email or not password:
        return None, ('Email and password are required', 400)
    if not first_name:
        return None, ('First name is required', 400)
    if not last_name:
        return None, ('Last name is required', 400)
    if '@' not in email:
        return None, ('Please enter a valid email address', 400)

    return {
        'email': email,
        'password': password,
        'first_name': first_name,
        'last_name': last_name
    }, None


def setup_registration_session(email, password, first_name, last_name, university, verification_code):
    """Store registration data and verification code in session."""

    session['pending_registration'] = {
        'email': email,
        'password': password,
        'first_name': first_name,
        'last_name': last_name,
        'university_id': str(university.id) if university else None,
        'timestamp': time.time()
    }
    session['verification_code'] = verification_code
    session['verification_timestamp'] = time.time()


def create_db_user(reg_data):
    # Get the university for auto-enrollment
    # University ID was determined during registration based on email domain
    university_id = reg_data.get('university_id')
    university = University.query.get(
        int(university_id)) if university_id else None

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
