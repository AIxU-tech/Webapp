"""
Validation Utilities

Common validation functions used across the application.
Extracted to avoid code duplication in routes.
"""

from __future__ import annotations


# =============================================================================
# TEMPORARY: Whitelisted non-.edu domains for testing
# Remove this list and related code when no longer needed
# =============================================================================
WHITELISTED_DOMAINS = [
    'peekz.com',
]
# =============================================================================


def is_whitelisted_domain(email: str) -> bool:
    """Check if email domain is in the temporary whitelist."""
    if not email or '@' not in email:
        return False
    domain = email.split('@')[1].lower()
    return domain in WHITELISTED_DOMAINS


def validate_edu_email(email: str) -> tuple[bool, str | None, str | None]:
    """
    Validate that an email is a valid .edu email address.

    Args:
        email: The email address to validate

    Returns:
        Tuple of (is_valid, error_message, domain_identifier)
        - is_valid: True if email is valid .edu format
        - error_message: Error message if invalid, None if valid
        - domain_identifier: The subdomain (e.g., "uoregon" from "user@uoregon.edu")
    """
    if not email or '@' not in email:
        return False, 'Please enter a valid email address', None

    parts = email.split('@')
    if len(parts) != 2:
        return False, 'Please enter a valid email address', None

    domain = parts[1].lower()
    if not domain.endswith('.edu'):
        return False, 'Please use your university .edu email address', None

    # Extract domain identifier (e.g., "uoregon" from "uoregon.edu")
    domain_identifier = domain[:-4]  # Remove ".edu"

    return True, None, domain_identifier


def validate_url(url: str) -> bool:
    """
    Validate that a URL is properly formed with scheme and domain.

    Args:
        url: The URL to validate

    Returns:
        True if URL is valid, False otherwise
    """
    if not url:
        return False
    from urllib.parse import urlparse
    try:
        result = urlparse(url)
        # Must have scheme (http/https) and netloc (domain)
        return result.scheme in ('http', 'https') and bool(result.netloc)
    except Exception:
        return False


def validate_social_links(social_links: list | None) -> tuple[bool, str | None]:
    """
    Validate social links array format and URLs.

    Args:
        social_links: List of social link dicts with 'type' and 'url' keys

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not social_links:
        return True, None

    if not isinstance(social_links, list):
        return False, 'socialLinks must be an array'

    for link in social_links:
        if not isinstance(link, dict) or 'type' not in link or 'url' not in link:
            return False, 'Each social link must have type and url'

        url = link.get('url', '')
        if url and not validate_url(url):
            return False, f'Invalid URL: {url}'

    return True, None


def validate_required_fields(data: dict, fields: list) -> tuple[bool, str | None]:
    """
    Validate that all required fields are present and non-empty.

    Args:
        data: Dictionary of field values
        fields: List of required field names

    Returns:
        Tuple of (is_valid, error_message)
    """
    for field in fields:
        value = data.get(field, '')
        if isinstance(value, str):
            value = value.strip()
        if not value:
            # Convert camelCase to readable format
            readable_name = field.replace('_', ' ').replace('firstName', 'first name').replace('lastName', 'last name')
            return False, f'{readable_name.capitalize()} is required'

    return True, None
