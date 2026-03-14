"""
Event helpers — bulk email notifications, time validation, etc.
"""

import threading
from datetime import datetime, timezone


def validate_event_times_not_in_past(start_time, end_time=None):
    """
    Validate that event start and end times are not in the past.

    Returns:
        None if valid, or (error_message, status_code) if invalid.
    """
    now_utc = datetime.now(timezone.utc)
    if end_time is not None and end_time < now_utc:
        return ('End time cannot be in the past', 400)
    if start_time < now_utc:
        return ('Start time cannot be in the past', 400)
    return None


from concurrent.futures import ThreadPoolExecutor

MAX_EMAIL_WORKERS = 5


def send_bulk_email(app, recipients, email_fn, **kwargs):
    """
    Send an email to many recipients concurrently using a thread pool.

    Runs entirely in a background thread so the calling request returns
    immediately. Each worker thread gets its own Flask app context.

    Args:
        app: The Flask application object (use current_app._get_current_object()).
        recipients: List of (email, first_name) tuples.
        email_fn: The email helper function to call (e.g. send_event_created_email).
                  Must accept recipient_email and recipient_first_name as the
                  first two positional args, plus any additional **kwargs.
        **kwargs: Extra keyword arguments forwarded to email_fn for every recipient.
    """
    if not recipients:
        return

    def _run():
        def _send_one(email, first_name):
            with app.app_context():
                try:
                    email_fn(
                        recipient_email=email,
                        recipient_first_name=first_name,
                        **kwargs,
                    )
                except Exception as e:
                    app.logger.warning(
                        'Failed to send event email to %s: %s', email, e
                    )

        with ThreadPoolExecutor(max_workers=MAX_EMAIL_WORKERS) as pool:
            for email, first_name in recipients:
                pool.submit(_send_one, email, first_name)

    threading.Thread(target=_run, daemon=True).start()
