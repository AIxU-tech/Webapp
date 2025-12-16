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
