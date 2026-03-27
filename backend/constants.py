# Allowed file extensions for profile pictures
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


# =============================================================================
# Note Attachment Constants
# =============================================================================

# Maximum file size for note attachments (10 MB)
MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024

# Maximum number of attachments per note
MAX_ATTACHMENTS_PER_NOTE = 5

# Allowed MIME types for note attachments (Option C: most common file types)
ALLOWED_ATTACHMENT_TYPES = {
    # Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    
    # Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # .docx
    'application/vnd.oasis.opendocument.text',  # .odt
    
    # Spreadsheets
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # .xlsx
    'text/csv',
    
    # Presentations
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',  # .pptx
    
    # Text/Code files
    'text/plain',
    'text/markdown',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/xml',
    'text/xml',
    
    # Archives (common for sharing code/data)
    'application/zip',
    'application/gzip',
    'application/x-tar',
}

# File extension to MIME type mapping (for validation)
EXTENSION_TO_MIME = {
    # Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    
    # Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'odt': 'application/vnd.oasis.opendocument.text',
    
    # Spreadsheets
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'csv': 'text/csv',
    
    # Presentations
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    # Text/Code
    'txt': 'text/plain',
    'md': 'text/markdown',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    'py': 'text/plain',
    'java': 'text/plain',
    'c': 'text/plain',
    'cpp': 'text/plain',
    'h': 'text/plain',
    'rs': 'text/plain',
    'go': 'text/plain',
    'rb': 'text/plain',
    'ts': 'text/plain',
    'tsx': 'text/plain',
    'jsx': 'text/plain',
    
    # Archives
    'zip': 'application/zip',
    'gz': 'application/gzip',
    'tar': 'application/x-tar',
}


# =============================================================================
# Resume Constants
# =============================================================================

MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

ALLOWED_RESUME_TYPES = {
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

RESUME_EXTENSION_TO_MIME = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}


# =============================================================================
# Image Upload Constants (profile pictures, banners, logos)
# =============================================================================

# Maximum raw image upload size before server-side compression
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

# Allowed image MIME types for profile pictures, banners, and logos
ALLOWED_IMAGE_TYPES = {
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
}

# GCS path prefixes for each image entity type
IMAGE_GCS_PREFIXES = {
    'profile': 'images/profiles',
    'banner': 'images/banners',
    'university_logo': 'images/university-logos',
    'university_banner': 'images/university-banners',
    'speaker': 'images/speakers',
}


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


# =============================================================================
# Speaker Image Constants
# =============================================================================

MAX_SPEAKER_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

ALLOWED_SPEAKER_IMAGE_TYPES = {
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
}
