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
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from flask import current_app


def send_email(subject: str, body: str, reply_to: str = None,
               to_email_override: str = None, html: str = None) -> bool:
    smtp_host = current_app.config.get('SMTP_HOST')
    smtp_port = current_app.config.get('SMTP_PORT', 587)
    smtp_user = current_app.config.get('SMTP_USER')
    smtp_pass = current_app.config.get('SMTP_PASS')
    to_email = to_email_override or current_app.config.get('ADMIN_EMAIL')

    if not smtp_host or not smtp_user or not smtp_pass:
        # In testing mode, skip email sending and return success
        if current_app.config.get('TESTING'):
            current_app.logger.info(
                'SMTP not configured - skipping email in test mode')
            return True
        current_app.logger.error('SMTP configuration is missing')
        return False

    if html:
        msg = MIMEMultipart('alternative')
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        msg.attach(MIMEText(html, 'html', 'utf-8'))
    else:
        msg = MIMEText(body, 'plain', 'utf-8')

    msg['Subject'] = subject
    msg['From'] = formataddr(('AIxU Website', smtp_user)
                             )  # must match Zoho login
    msg['To'] = to_email

    if reply_to:
        msg['Reply-To'] = reply_to  # lets admin reply to sender

    current_app.logger.info(f"SMTP_USER: {smtp_user}")
    current_app.logger.info(
        f"From header: {formataddr(('AIxU Website', smtp_user))}")

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


def _wrap_html(body_content: str) -> str:
    """Wrap email body content in a minimal HTML template."""
    return f"""\
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.5; max-width: 600px; margin: 0 auto; padding: 20px;">
{body_content}
<p style="color: #666; margin-top: 30px; font-size: 14px;">Best regards,<br>The AIxU Team</p>
</body>
</html>"""


def _link_button(url: str, label: str) -> str:
    """Generate an HTML button-style link."""
    return (
        f'<a href="{url}" style="display: inline-block; background: #6366f1; '
        f'color: #ffffff; text-decoration: none; padding: 12px 28px; '
        f'border-radius: 6px; font-weight: 600; margin: 16px 0;">{label}</a>'
    )


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

    html = _wrap_html(f"""\
<p>Hi {first_name},</p>
<p>Great news! Your request to add <strong>{university_name}</strong> to AIxU has been approved!</p>
<p>{university_name} is now live on our platform. Complete your account setup below:</p>
<p>{_link_button(account_creation_url, "Complete Your Account")}</p>
<p><strong>Important:</strong></p>
<ul>
<li>This link is unique to you and will expire in 7 days</li>
<li>You only need to create a password (your email is already verified)</li>
<li>Do not share this link with anyone</li>
</ul>
<p>Once your account is created, you'll be the founding member of {university_name}'s AIxU community!</p>
<p>If you have any questions or didn't request this, please contact us.</p>""")

    return send_email(subject, body, to_email_override=email, html=html)


def send_attendance_account_email(
    email: str,
    first_name: str,
    event_title: str,
    club_name: str,
    account_creation_url: str
) -> bool:
    """
    Send account creation email after QR attendance check-in.

    Sent when a non-registered user checks in to an event with their email.
    Contains a secure link to complete account setup (password only).

    Args:
        email: Recipient's email address
        first_name: Attendee's first name for personalization
        event_title: Title of the event they attended
        club_name: Name of the AI club hosting the event
        account_creation_url: Full URL with secure token for account creation

    Returns:
        True if email sent successfully, False otherwise
    """
    subject = "Complete Your AIxU Account"
    body = f"""Hi {first_name},

Thanks for using AIxU to mark your attendance!

You can create your AIxU account to autofill attendance, connect with other members, and stay updated on future events:

Complete Your Account:
{account_creation_url}

We hope to see you on there!

Best regards,
The AIxU Team"""

    html = _wrap_html(f"""\
<p>Hi {first_name},</p>
<p>Thanks for using AIxU to mark your attendance!</p>
<p>Create your AIxU account to autofill attendance, connect with other members, and stay updated on future events:</p>
<p>{_link_button(account_creation_url, "Complete Your Account")}</p>
<p>We hope to see you on there!</p>""")

    return send_email(subject, body, to_email_override=email, html=html)


def send_reset_password_email(email: str, reset_url: str, first_name: str = None) -> bool:
    """
    Send password reset email with secure reset link.

    Args:
        email: Recipient's email address
        reset_url: Full URL with secure token for password reset
        first_name: Optional first name for personalization

    Returns:
        True if email sent successfully, False otherwise
    """
    greeting = f"Hi {first_name}" if first_name else "Hi"
    html_greeting = f"Hi {first_name}," if first_name else "Hi,"
    subject = "Password Reset Request - AIxU"
    body = f"""{greeting},

We received a request to reset your password for your AIxU account.

Click the link below to reset your password:
{reset_url}

Important:
- This link will expire in 1 hour
- If you didn't request this, you can safely ignore this email
- Your password won't change unless you click the link above

If you have any questions, feel free to reply to this email.

Best regards,
The AIxU Team"""

    html = _wrap_html(f"""\
<p>{html_greeting}</p>
<p>We received a request to reset your password for your AIxU account.</p>
<p>{_link_button(reset_url, "Reset Your Password")}</p>
<p><strong>Important:</strong></p>
<ul>
<li>This link will expire in 1 hour</li>
<li>If you didn't request this, you can safely ignore this email</li>
<li>Your password won't change unless you click the link above</li>
</ul>
<p>If you have any questions, feel free to reply to this email.</p>""")

    return send_email(subject, body, to_email_override=email, html=html)

def send_password_reset_confirmation(email: str):

    subject = "Password Changed"
    body = "Your password was successfully reset."

    return send_email(subject, body, to_email_override=email)


def send_new_conversation_email(
    recipient_email: str,
    recipient_first_name: str,
    sender_name: str,
    messages_url: str,
) -> bool:
    """
    Notify a user that someone has started a new conversation with them.

    Sent only for the very first message between two users so the
    recipient knows to check their inbox.

    Args:
        recipient_email: Email address of the message recipient.
        recipient_first_name: Recipient's first name for personalization.
        sender_name: Full name of the person who sent the message.
        messages_url: Direct link to the messages page.

    Returns:
        True if the email was sent successfully, False otherwise.
    """
    greeting = f"Hi {recipient_first_name}" if recipient_first_name else "Hi there"
    html_greeting = f"Hi {recipient_first_name}," if recipient_first_name else "Hi there,"
    subject = f"You have a new message on AIxU"
    body = f"""{greeting},

{sender_name} sent you a message on AIxU. Open your inbox to read and reply:

{messages_url}

Best regards,
The AIxU Team"""

    html = _wrap_html(f"""\
<p>{html_greeting}</p>
<p><strong>{sender_name}</strong> sent you a message on AIxU.</p>
<p>{_link_button(messages_url, "Open Your Inbox")}</p>""")

    return send_email(subject, body, to_email_override=recipient_email, html=html)


def send_event_created_email(
    recipient_email: str,
    recipient_first_name: str,
    club_name: str,
    event_title: str,
    event_date: str,
    event_location: str,
    event_description: str,
    rsvp_url: str,
) -> bool:
    """
    Notify a club member that a new event has been created.

    Args:
        recipient_email: Member's email address.
        recipient_first_name: Member's first name for personalization.
        club_name: Name of the club hosting the event.
        event_title: Title of the new event.
        event_date: Human-readable date/time string.
        event_location: Event location (or None).
        event_description: Event description (or None).
        rsvp_url: Link to the university page where the member can RSVP.

    Returns:
        True if the email was sent successfully, False otherwise.
    """
    greeting = f"Hi {recipient_first_name}" if recipient_first_name else "Hi there"
    html_greeting = f"Hi {recipient_first_name}," if recipient_first_name else "Hi there,"
    subject = f"New Event: {event_title} — {club_name}"

    details = f"Date: {event_date}"
    if event_location:
        details += f"\nLocation: {event_location}"
    if event_description:
        details += f"\n\n{event_description}"

    body = f"""{greeting},

{club_name} just posted a new event:

{event_title}
{details}

RSVP on AIxU:
{rsvp_url}

Best regards,
The AIxU Team"""

    html_details = f"<li><strong>Date:</strong> {event_date}</li>"
    if event_location:
        html_details += f"\n<li><strong>Location:</strong> {event_location}</li>"
    html_desc = f"<p>{event_description}</p>" if event_description else ""

    html = _wrap_html(f"""\
<p>{html_greeting}</p>
<p><strong>{club_name}</strong> just posted a new event:</p>
<h2 style="margin: 0 0 8px 0; font-size: 20px;">{event_title}</h2>
<ul style="list-style: none; padding: 0;">{html_details}</ul>
{html_desc}
<p>{_link_button(rsvp_url, "RSVP on AIxU")}</p>""")

    return send_email(subject, body, to_email_override=recipient_email, html=html)


def send_event_cancelled_email(
    recipient_email: str,
    recipient_first_name: str,
    club_name: str,
    event_title: str,
    event_date: str,
) -> bool:
    """
    Notify a club member that an event has been cancelled.

    Args:
        recipient_email: Member's email address.
        recipient_first_name: Member's first name for personalization.
        club_name: Name of the club that hosted the event.
        event_title: Title of the cancelled event.
        event_date: Human-readable date/time the event was scheduled for.

    Returns:
        True if the email was sent successfully, False otherwise.
    """
    greeting = f"Hi {recipient_first_name}" if recipient_first_name else "Hi there"
    subject = f"Event Cancelled: {event_title} — {club_name}"
    body = f"""{greeting},

The following event from {club_name} has been cancelled:

{event_title}
Date: {event_date}

If you have any questions, please reach out to your club's executive team on AIxU.

Best regards,
The AIxU Team"""

    return send_email(subject, body, to_email_override=recipient_email)