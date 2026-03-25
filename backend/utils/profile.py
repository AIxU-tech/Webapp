"""
Profile utility functions.

Helpers for auto-populating profile data when users are created.
"""

from backend.extensions import db
from backend.models.profile_sections import Education


def create_initial_education(user, university):
    """
    Auto-create an Education entry from a user's university affiliation.

    Called during registration and account creation flows when the user
    is matched to a university. Sets institution name; the user fills
    in dates and other details later.

    Args:
        user: The User object (must already be flushed with an id)
        university: The University object (must have .name)
    """
    if not university or not user:
        return

    entry = Education(
        user_id=user.id,
        institution=university.name,
        degree='Student',
    )
    db.session.add(entry)
