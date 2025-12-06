"""
Permission Utilities

Centralized permission checking functions and decorators for the AIxU platform.

This module provides:
1. Permission check functions for both site-level and university-level access
2. Decorators for protecting routes with permission requirements
3. Utility functions for common authorization patterns

Permission Hierarchy:
    Site Level:
        USER (0)  - Standard user
        ADMIN (1) - Site administrator (full access everywhere)

    University Level (per-university):
        MEMBER (0)    - Standard member
        EXECUTIVE (1) - Can manage members
        PRESIDENT (2) - Can manage executives and transfer leadership

Site admins (permission_level >= ADMIN) bypass all university-level checks.
"""

from functools import wraps
from flask import jsonify
from flask_login import current_user

from backend.constants import ADMIN, UniversityRoles


# =============================================================================
# Permission Check Functions
# =============================================================================

def is_site_admin(user) -> bool:
    """
    Check if a user is a site administrator.

    Site admins have elevated privileges across all universities and can:
    - Remove users from any university
    - Manage club executives at any university
    - Change club presidents at any university

    Args:
        user: User object to check

    Returns:
        True if user is a site admin, False otherwise
    """
    if not user or not hasattr(user, 'permission_level'):
        return False
    return user.permission_level >= ADMIN


def can_manage_university_members(user, university_id: int) -> bool:
    """
    Check if a user can manage members at a specific university.

    A user can manage members if they are:
    - A site admin (can manage any university)
    - An executive or president at that university

    Args:
        user: User object to check
        university_id: ID of the university

    Returns:
        True if user can manage members, False otherwise
    """
    if not user or not user.is_authenticated:
        return False

    # Site admins can manage any university
    if is_site_admin(user):
        return True

    # Check university-level role
    from backend.models.university_role import UniversityRole
    return UniversityRole.is_executive_or_higher(user.id, university_id)


def can_manage_executives(user, university_id: int) -> bool:
    """
    Check if a user can manage executives at a specific university.

    A user can manage executives (promote/demote) if they are:
    - A site admin (can manage any university)
    - The president at that university

    Args:
        user: User object to check
        university_id: ID of the university

    Returns:
        True if user can manage executives, False otherwise
    """
    if not user or not user.is_authenticated:
        return False

    # Site admins can manage any university
    if is_site_admin(user):
        return True

    # Check if user is president
    from backend.models.university_role import UniversityRole
    return UniversityRole.is_president(user.id, university_id)


def can_change_president(user, university_id: int) -> bool:
    """
    Check if a user can change the president at a specific university.

    A user can change the president if they are:
    - A site admin
    - The current president (can transfer to another executive)

    Args:
        user: User object to check
        university_id: ID of the university

    Returns:
        True if user can change president, False otherwise
    """
    if not user or not user.is_authenticated:
        return False

    # Site admins can change any president
    if is_site_admin(user):
        return True

    # Current president can transfer leadership
    from backend.models.university_role import UniversityRole
    return UniversityRole.is_president(user.id, university_id)


def get_user_university_permissions(user, university_id: int) -> dict:
    """
    Get a summary of a user's permissions at a specific university.

    Useful for frontend to determine what actions to show/hide.

    Args:
        user: User object to check
        university_id: ID of the university

    Returns:
        Dictionary with permission flags:
        {
            'isMember': bool,
            'isExecutive': bool,
            'isPresident': bool,
            'isSiteAdmin': bool,
            'canManageMembers': bool,
            'canManageExecutives': bool,
            'canChangePresident': bool,
            'role': int,
            'roleName': str
        }
    """
    from backend.models.university_role import UniversityRole

    if not user or not user.is_authenticated:
        return {
            'isMember': False,
            'isExecutive': False,
            'isPresident': False,
            'isSiteAdmin': False,
            'canManageMembers': False,
            'canManageExecutives': False,
            'canChangePresident': False,
            'role': None,
            'roleName': None,
        }

    role_level = UniversityRole.get_role_level(user.id, university_id)
    site_admin = is_site_admin(user)

    return {
        'isMember': True,  # If they have a role, they're a member
        'isExecutive': role_level >= UniversityRoles.EXECUTIVE,
        'isPresident': role_level >= UniversityRoles.PRESIDENT,
        'isSiteAdmin': site_admin,
        'canManageMembers': site_admin or role_level >= UniversityRoles.EXECUTIVE,
        'canManageExecutives': site_admin or role_level >= UniversityRoles.PRESIDENT,
        'canChangePresident': site_admin or role_level >= UniversityRoles.PRESIDENT,
        'role': role_level,
        'roleName': UniversityRoles.get_name(role_level),
    }


# =============================================================================
# Route Decorators
# =============================================================================

def require_site_admin(f):
    """
    Decorator to require site admin permission for a route.

    Usage:
        @blueprint.route('/admin/action')
        @login_required
        @require_site_admin
        def admin_action():
            ...

    Returns 403 if user is not a site admin.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not is_site_admin(current_user):
            return jsonify({'error': 'Site admin permission required'}), 403
        return f(*args, **kwargs)
    return decorated_function


def require_university_executive(university_id_param: str = 'university_id'):
    """
    Decorator factory to require executive+ permission at a university.

    The university_id is extracted from the route parameters.

    Usage:
        @blueprint.route('/universities/<int:university_id>/manage')
        @login_required
        @require_university_executive('university_id')
        def manage_university(university_id):
            ...

    Args:
        university_id_param: Name of the route parameter containing university ID

    Returns 403 if user is not an executive/president or site admin.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            university_id = kwargs.get(university_id_param)
            if university_id is None:
                return jsonify({'error': 'University ID required'}), 400

            if not can_manage_university_members(current_user, university_id):
                return jsonify({
                    'error': 'Executive or higher permission required for this university'
                }), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_university_president(university_id_param: str = 'university_id'):
    """
    Decorator factory to require president permission at a university.

    Usage:
        @blueprint.route('/universities/<int:university_id>/executives')
        @login_required
        @require_university_president('university_id')
        def manage_executives(university_id):
            ...

    Args:
        university_id_param: Name of the route parameter containing university ID

    Returns 403 if user is not president or site admin.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            university_id = kwargs.get(university_id_param)
            if university_id is None:
                return jsonify({'error': 'University ID required'}), 400

            if not can_manage_executives(current_user, university_id):
                return jsonify({
                    'error': 'President or site admin permission required'
                }), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator
