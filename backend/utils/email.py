"""
Email Utility Module

Provides email-sending functionality for the AIxU platform including:
- Verification code emails for registration
- University request submission confirmations
- University approval notifications with secure account creation links
- General purpose email sending

All emails are sent via SMTP using configuration from Flask app config.
"""

import smtplib
import secrets
from email.mime.text import MIMEText
from email.utils import formataddr
from flask import current_app


def send_email(subject: str, body: str, reply_to: str = None, to_email_override: str = None) -> bool:
    smtp_host = current_app.config.get('SMTP_HOST')
    smtp_port = current_app.config.get('SMTP_PORT', 587)
    smtp_user = current_app.config.get('SMTP_USER')
    smtp_pass = current_app.config.get('SMTP_PASS')
    to_email = to_email_override or current_app.config.get('ADMIN_EMAIL')

    if not smtp_host or not smtp_user or not smtp_pass:
        # In testing mode, skip email sending and return success
        if current_app.config.get('TESTING'):
            current_app.logger.info('SMTP not configured - skipping email in test mode')
            return True
        current_app.logger.error('SMTP configuration is missing')
        return False

    msg = MIMEText(body, 'plain', 'utf-8')
    msg['Subject'] = subject
    msg['From'] = formataddr(('AIxU Website', smtp_user))  # must match Zoho login
    msg['To'] = to_email

    if reply_to:
        msg['Reply-To'] = reply_to  # lets admin reply to sender

    current_app.logger.info(f"SMTP_USER: {smtp_user}")
    current_app.logger.info(f"From header: {formataddr(('AIxU Website', smtp_user))}")


    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            result = server.sendmail(smtp_user, [to_email], msg.as_string())
            current_app.logger.info(f"Sendmail result: {result}")
        return True
    except Exception as e:
        current_app.logger.exception('Failed to send email: %s', e)
        return False


def generate_verification_code():
    """Generate a 6-digit verification code"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])


def send_verification_email(email: str, code: str) -> bool:
    """Send verification code to user's email"""
    subject = "AIxU Email Verification"
    body = f"""Welcome to AIxU!

Your verification code is: {code}

This code will expire in 180 seconds. Please enter it on the verification page to complete your registration.

If you didn't request this code, please ignore this email.

Best regards,
The AIxU Team"""

    return send_email(subject, body, to_email_override=email)


def generate_secure_token(length: int = 32) -> str:
    """
    Generate a cryptographically secure URL-safe token.

    Uses Python's secrets module for cryptographic randomness.
    The resulting token is URL-safe (uses base64 with - and _ characters).

    Args:
        length: Number of random bytes to generate (default 32 = 256 bits)

    Returns:
        URL-safe token string (approximately 4/3 * length characters)
    """
    return secrets.token_urlsafe(length)


def send_university_request_submitted_email(
    email: str,
    first_name: str,
    university_name: str
) -> bool:
    """
    Send confirmation email when a user submits a university request.

    This email confirms receipt of the request and explains the next steps
    (admin review, approval notification, account creation).

    Args:
        email: Recipient's email address
        first_name: Requester's first name for personalization
        university_name: Name of the requested university

    Returns:
        True if email sent successfully, False otherwise
    """
    subject = "University Request Submitted - AIxU"
    body = f"""Hi {first_name},

Thank you for submitting your request to add {university_name} to AIxU!

Your request has been received and is now in our admin queue for review.

What happens next?
------------------
1. An admin will review your request
2. Once approved, {university_name} will be added to AIxU
3. You'll receive an email with a link to complete your account setup

This usually takes 1-2 business days. We'll notify you by email as soon as your university is approved.

If you have any questions, feel free to reply to this email.

Best regards,
The AIxU Team"""

    return send_email(subject, body, to_email_override=email)


def send_university_approved_email(
    email: str,
    first_name: str,
    university_name: str,
    account_creation_url: str
) -> bool:
    """
    Send approval notification email with secure account creation link.

    This email is sent when an admin approves a university request. It contains
    a secure, time-limited link that allows the requester to complete their
    account setup (just password creation, no email verification needed since
    their email was already verified during the request process).

    Args:
        email: Recipient's email address
        first_name: Requester's first name for personalization
        university_name: Name of the approved university
        account_creation_url: Full URL with secure token for account creation

    Returns:
        True if email sent successfully, False otherwise
    """
    subject = f"{university_name} Approved on AIxU - Complete Your Account"
    body = f"""Hi {first_name},

Great news! Your request to add {university_name} to AIxU has been approved!

{university_name} is now live on our platform, and you can complete your account setup by clicking the link below:

Complete Your Account:
{account_creation_url}

Important:
- This link is unique to you and will expire in 7 days
- You only need to create a password (your email is already verified)
- Do not share this link with anyone

Once your account is created, you'll be the founding member of {university_name}'s AIxU community!

If you have any questions or didn't request this, please contact us.

Best regards,
The AIxU Team"""

    return send_email(subject, body, to_email_override=email)
