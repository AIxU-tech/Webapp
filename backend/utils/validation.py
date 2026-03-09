"""
Validation Utilities

Common validation functions used across the application.
Extracted to avoid code duplication in routes.
"""

from __future__ import annotations

import re


# =============================================================================
# TEMPORARY: Whitelisted non-.edu domains for testing
# Remove this list and related code when no longer needed
# =============================================================================
WHITELISTED_DOMAINS = [
    'peekz.com',
]
# =============================================================================

# =============================================================================
# Known Social Link Types
# =============================================================================
# Social link types that allow only one entry per profile/university.
# Unknown types (including 'website') are treated as plain websites and allow multiple.
KNOWN_SOCIAL_TYPES = {
    'linkedin',
    'x',
    'instagram',
    'github',
    'discord',
    'youtube',
}
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


# Simplified email format: local@domain.tld, reasonable length (RFC allows longer; we cap for safety)
_EMAIL_FORMAT_RE = re.compile(
    r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$',
    re.IGNORECASE,
)
_EMAIL_MAX_LEN = 254


def validate_email_format(email: str) -> tuple[bool, str | None]:
    """
    Validate that a string is a well-formed email address (format only).
    Use for optional contact email fields; empty string is considered valid (field not required).

    Args:
        email: The email string to validate (can be empty)

    Returns:
        Tuple of (is_valid, error_message). error_message is None when valid.
    """
    if not email or not email.strip():
        return True, None
    s = email.strip()
    if len(s) > _EMAIL_MAX_LEN:
        return False, 'Email address is too long'
    if not _EMAIL_FORMAT_RE.match(s):
        return False, 'Please enter a valid email address'
    return True, None


def validate_phone_format(phone: str) -> tuple[bool, str | None]:
    """
    Validate that a string is a well-formed phone number (digits, optional + prefix,
    optional spaces/dashes/parens). Allows international formats; requires 7–15 digits.

    Args:
        phone: The phone string to validate (can be empty)

    Returns:
        Tuple of (is_valid, error_message). error_message is None when valid.
    """
    if not phone or not phone.strip():
        return True, None
    s = phone.strip()
    digits = ''.join(c for c in s if c.isdigit())
    if not digits:
        return False, 'Please enter a valid phone number (digits only, with optional +, spaces, or dashes)'
    if len(digits) < 7 or len(digits) > 15:
        return False, 'Phone number must be between 7 and 15 digits'
    return True, None


def validate_social_links(social_links: list | None) -> tuple[bool, str | None]:
    """
    Validate social links array format and URLs.

    Validates:
    - socialLinks is a list (or None/empty)
    - Each link is a dict with 'type' and 'url' keys
    - 'type' is present and non-empty
    - 'url' is present and non-empty
    - 'url' is a valid URL format
    - Known social types (linkedin, x, instagram, github, discord, youtube)
      can only appear once (duplicates are not allowed)
    - Unknown types (including 'website') are treated as plain websites
      and can appear multiple times

    Args:
        social_links: List of social link dicts with 'type' and 'url' keys

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not social_links:
        return True, None

    if not isinstance(social_links, list):
        return False, 'socialLinks must be an array'

    # First pass: validate structure and format of each link
    for i, link in enumerate(social_links):
        # Check link is not None
        if link is None:
            return False, f'Social link at index {i} cannot be null'

        # Check link is a dict
        if not isinstance(link, dict):
            return False, f'Social link at index {i} must be an object'

        # Check 'type' key exists
        if 'type' not in link:
            return False, f'Social link at index {i} is missing required field: type'

        # Check 'url' key exists
        if 'url' not in link:
            return False, f'Social link at index {i} is missing required field: url'

        # Get and validate type (must be non-empty)
        link_type = link.get('type')
        if not link_type or (isinstance(link_type, str) and not link_type.strip()):
            return False, f'Social link at index {i} has an empty type field'

        # Get and validate url (must be non-empty)
        url = link.get('url')
        if url is None:
            return False, f'Social link at index {i} has a null URL'
        
        # Convert to string if not already, then strip
        if isinstance(url, str):
            url = url.strip()
        else:
            url = str(url).strip()
        
        if not url:
            return False, f'Social link at index {i} has an empty URL'

        # Validate URL format
        if not validate_url(url):
            return False, f'Invalid URL at index {i}: {url}'

    # Second pass: check for duplicate known social types
    # (Unknown types like 'website' are allowed multiple times)
    seen_known_types: dict[str, int] = {}  # type -> first occurrence index
    
    for i, link in enumerate(social_links):
        link_type = link.get('type')
        if not isinstance(link_type, str):
            continue  # Already validated above, but defensive check
        
        # Normalize type to lowercase for case-insensitive comparison
        normalized_type = link_type.strip().lower()
        
        # Check if this is a known social type
        if normalized_type in KNOWN_SOCIAL_TYPES:
            # Check for duplicates
            if normalized_type in seen_known_types:
                first_index = seen_known_types[normalized_type]
                # Use original case for error message
                original_type = link_type.strip()
                return False, (
                    f'Cannot have multiple {original_type} links.'
                )
            seen_known_types[normalized_type] = i

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
