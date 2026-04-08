from flask import session
import time
import hashlib
from backend.extensions import db
from backend.models import User, University
from backend.utils.profile import create_initial_education


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


def hash_text(code):
    """Hash a verification code using SHA-256.

    This prevents the plain code from being exposed in the session cookie,
    which is readable (though not modifiable) by the client.
    """
    return hashlib.sha256(code.encode()).hexdigest()


def setup_registration_session(email, password, first_name, last_name, university, verification_code):
    """Store registration data and hashed verification code in session.

    Note: The verification code is hashed before storage to prevent
    users from reading it by decoding the session cookie.
    """
    session['pending_registration'] = {
        'email': email,
        'password': password,
        'first_name': first_name,
        'last_name': last_name,
        'university_id': str(university.id) if university else None,
        'timestamp': time.time()
    }
    # Store hashed code - the plain code is only sent via email
    session['verification_code_hash'] = hash_text(
        verification_code)
    session['verification_timestamp'] = time.time()


def create_db_user(reg_data):
    """Create a new user (or upgrade a partial account) and enroll in university.

    If a partial account exists for the email (created via QR attendance),
    it is upgraded to a full account, preserving the user ID, university
    role, and events_attended_count.

    Returns:
        User: The newly created or upgraded user object
    """
    # Get the university for auto-enrollment
    # University ID was determined during registration based on email domain
    university_id = reg_data.get('university_id')
    university = University.query.get(
        int(university_id)) if university_id else None

    # Check for existing partial account to upgrade
    existing = User.query.filter_by(email=reg_data['email']).first()

    if existing and existing.is_partial:
        # Upgrade partial account — preserves id, university role, attendance counts
        existing.first_name = reg_data['first_name']
        existing.last_name = reg_data['last_name']
        existing.university = university.name if university else None
        existing.is_partial = False
        existing.set_password(reg_data['password'])
        existing.clear_account_token()
        user = existing
    else:
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

    # Add user to university members list and auto-populate education
    # add_member is idempotent — no-op if the partial account was already enrolled
    if university:
        university.add_member(user.id)
        create_initial_education(user, university)
        db.session.commit()

    return user
