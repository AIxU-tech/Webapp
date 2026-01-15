"""
Content Moderation Service

Provides content moderation functionality using better-profanity library
to detect inappropriate language in user-generated content.
"""

from better_profanity import profanity


def moderate_content(content: str) -> bool:
    """
    Check if content contains inappropriate language.
    
    Args:
        content: The text content to check
        
    Returns:
        True if content is clean (no profanity), False if profanity detected.
        Returns True for empty or None content.
    """
    if not content:
        return True
    
    # Check if content contains profanity
    return not profanity.contains_profanity(content)