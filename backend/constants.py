# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


# =============================================================================
# Permission System Constants
# =============================================================================
#
# The AIxU platform uses a two-tier permission system:
#
# 1. SITE-LEVEL PERMISSIONS (User.permission_level)
#    - Controls platform-wide administrative capabilities
#    - Stored in the User model's permission_level field
#
# 2. UNIVERSITY-LEVEL ROLES (UniversityRole model)
#    - Controls per-university club management capabilities
#    - Stored in a separate UniversityRole join table
#
# =============================================================================


# -----------------------------------------------------------------------------
# Site-Level Permissions (User.permission_level)
# -----------------------------------------------------------------------------
# These represent platform-wide administrative access levels.
# Higher values grant more permissions (comparison uses >=).

# Standard user with no special site-wide permissions
USER = 0

# Site administrator with elevated privileges across all universities
# Can: remove users from any university, manage club executives anywhere
ADMIN = 1

# Legacy alias for backward compatibility
SUPER_ADMIN = ADMIN


# -----------------------------------------------------------------------------
# University-Level Roles (UniversityRole.role)
# -----------------------------------------------------------------------------
# These represent a user's role within a specific university's AI club.
# Each user can have different roles at different universities.

class UniversityRoles:
    """
    University-specific role constants.

    Hierarchy (higher values have more permissions):
        MEMBER (0) < EXECUTIVE (1) < PRESIDENT (2)

    Role Capabilities:

    MEMBER (0):
        - Standard club member
        - Can view university content
        - Can participate in discussions

    EXECUTIVE (1):
        - Club executive/officer
        - Can remove members from the university
        - Additional permissions to be added in future updates

    PRESIDENT (2):
        - Club president (one per university, typically)
        - All executive permissions
        - Can promote members to executives
        - Can demote executives to members
        - Can transfer presidency to another executive
    """

    # Standard member with no special club permissions
    MEMBER = 0

    # Club executive/officer with member management capabilities
    EXECUTIVE = 1

    # Club president with full club management capabilities
    PRESIDENT = 2

    # Human-readable role names for display
    ROLE_NAMES = {
        MEMBER: 'Member',
        EXECUTIVE: 'Executive',
        PRESIDENT: 'President',
    }

    @classmethod
    def get_name(cls, role: int) -> str:
        """Get human-readable name for a role level."""
        return cls.ROLE_NAMES.get(role, 'Unknown')

    @classmethod
    def is_valid(cls, role: int) -> bool:
        """Check if a role value is valid."""
        return role in cls.ROLE_NAMES
