from flask import Blueprint, request, flash, redirect, url_for, session, jsonify
from flask_login import logout_user, login_required
from datetime import datetime, timedelta
from backend.utils.email import generate_verification_code, send_email

auth_bp = Blueprint('auth', __name__)


@auth_bp.route("/resend_verification", methods=["POST"])
def resend_verification():
    email = session.get("pending_registration", {}).get("email")
    if not email:
        return jsonify(success=False, message="No email to verify.")

    # Generate new code + expiry
    code = generate_verification_code()
    expiry = datetime.utcnow() + timedelta(seconds=180)

    session["verification_code"] = code
    session["code_expiry"] = expiry.isoformat()
    session.modified = True  # ensure session updates

    # Send email
    if not send_email(
        subject="Your verification code",
        body=f"Your new verification code is: {code}\n\nIt expires in 3 minutes.",
        to_email_override=email,
    ):
        return jsonify(success=False, message="Error sending email.")

    # Return new remaining time
    return jsonify(success=True, message="New verification code sent!", remaining_time=180)


#Logout button on the profile.html page
@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()  # This clears the session
    flash('You have been logged out.')
    return redirect(url_for('public.index'))  # Fixed redirect
