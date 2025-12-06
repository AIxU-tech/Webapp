"""
Validation Utilities

Common validation functions used across the application.
Extracted to avoid code duplication in routes.
"""

from __future__ import annotations


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
