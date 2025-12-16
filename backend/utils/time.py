"""
Time Utilities

Common time formatting functions used across the application.
Provides consistent time-ago strings and date formatting.
"""

from datetime import datetime


def get_time_ago(dt: datetime) -> str:
    """
    Calculate a human-readable "time ago" string from a datetime.

    Args:
        dt: The datetime to calculate the difference from (should be UTC)

    Returns:
        A human-readable string like "Just now", "5 minutes ago", "2 hours ago", "3 days ago"
    """
    if dt is None:
        return "Unknown"

    now = datetime.utcnow()
    diff = now - dt

    if diff.days > 0:
        if diff.days == 1:
            return "1 day ago"
        return f"{diff.days} days ago"
    elif diff.seconds >= 3600:
        hours = diff.seconds // 3600
        if hours == 1:
            return "1 hour ago"
        return f"{hours} hours ago"
    elif diff.seconds >= 60:
        minutes = diff.seconds // 60
        if minutes == 1:
            return "1 minute ago"
        return f"{minutes} minutes ago"
    else:
        return "Just now"


def format_date(dt: datetime, format_str: str = "%B %d, %Y") -> str:
    """
    Format a datetime with a given format string.

    Args:
        dt: The datetime to format
        format_str: strftime format string (default: "December 25, 2024")

    Returns:
        Formatted date string or "Unknown" if dt is None
    """
    if dt is None:
        return "Unknown"
    return dt.strftime(format_str)


def format_join_date(dt: datetime) -> str:
    """
    Format a join date as "Month Year" (e.g., "December 2024").

    Args:
        dt: The datetime to format

    Returns:
        Formatted string or "Unknown" if dt is None
    """
    return format_date(dt, "%B %Y")


def format_full_date(dt: datetime) -> str:
    """
    Format a date as "Month Day, Year" (e.g., "December 25, 2024").

    Args:
        dt: The datetime to format

    Returns:
        Formatted string or "Unknown" if dt is None
    """
    return format_date(dt, "%B %d, %Y")


def to_iso(dt: datetime) -> str | None:
    """
    Convert a datetime to ISO format string.

    Args:
        dt: The datetime to convert

    Returns:
        ISO format string or None if dt is None
    """
    if dt is None:
        return None
    return dt.isoformat()
