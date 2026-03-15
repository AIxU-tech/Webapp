"""
Universities Routes

Handles university-related endpoints for the React frontend API.

Auto-Enrollment System:
Users are automatically enrolled in a university based on their .edu email
domain during registration. Manual joining is not supported - university
membership is determined solely by the user's email domain.

Permission System:
- Site Admins: Can manage any university (remove members, manage executives)
- Club Presidents: Can manage executives and members at their university
- Club Executives: Can remove members at their university
- Members: Standard access

RESTful Endpoints:
- GET /api/universities - List all universities
- POST /api/universities - Create university (site admin only)
- GET /api/universities/<id> - Get university details
- DELETE /api/universities/<id> - Delete university (site admin only)
- DELETE /api/universities/<id>/members/<user_id> - Remove member (executive+)
- GET /api/universities/<id>/roles - Get all roles for a university
- POST /api/universities/<id>/roles/<user_id> - Update user role (president or admin)
- DELETE /api/universities/<id>/roles/<user_id> - Remove user role (president or admin)
"""

from flask import Blueprint, request, jsonify, Response, current_app
from flask_login import login_required, current_user
import hashlib
import json
from backend.extensions import db
from backend.models import University, User, UniversityRole, Event, EventAttendance
from backend.constants import UniversityRoles
from backend.utils.permissions import (
    can_manage_university_members,
    can_manage_executives,
    get_user_university_permissions,
)
from backend.utils.image import allowed_file, compress_image, compress_banner_image
from backend.utils.validation import validate_social_links, validate_url

universities_bp = Blueprint('universities', __name__)


# NOTE: The join_university endpoint has been removed.
# Users are now automatically enrolled in a university based on their
# .edu email domain during registration. See api_auth.py for the
# auto-enrollment implementation.


# =============================================================================
# University CRUD Endpoints
# =============================================================================

# RESTful: GET collection returns list
@universities_bp.route('/api/universities', methods=['GET'])
def list_universities():
    """
    Get list of all universities with full details for React frontend.
    Returns universities with stats, tags, and other information needed for the grid display.
    """
    universities = University.query.order_by(University.name).all()

    universities_data = []
    for uni in universities:
        # NOTE: We use cached recent_posts value instead of calling update_post_count()
        # to avoid N+1 query problem. Post counts are updated when posts are created/deleted.
        universities_data.append({
            'id': uni.id,
            'name': uni.name,
            'clubName': uni.clubName or f"{uni.name} AI Club",
            'location': uni.location or '',
            'description': uni.description or '',
            'memberCount': uni.member_count or 0,
            'recentPosts': uni.recent_posts or 0,
            'upcomingEvents': uni.upcoming_events or 0,
            # Email domain for auto-matching users during registration
            # (e.g., "uoregon" for uoregon.edu emails)
            'emailDomain': uni.email_domain or '',
            'websiteUrl': uni.website_url or '',
            'socialLinks': uni.get_social_links_list(),
            'hasLogo': uni.logo is not None,
        })

    return jsonify({
        'universities': universities_data
    })


# RESTful: POST collection creates new resource
@universities_bp.route('/api/universities', methods=['POST'])
@login_required
def create_university():
    """
    Create a new university (site admin only).

    This endpoint allows site admins to pre-create university pages before
    onboarding calls. Universities start with no president - admin promotes
    a member to president via the Members tab after they register.

    Authorization:
        - Site admin only (permission_level >= ADMIN)

    Request body:
        {
            "name": "University of Oregon",        # Required
            "clubName": "Oregon AI Club",          # Required
            "emailDomain": "uoregon",              # Required, unique
            "location": "Eugene, OR",              # Optional
            "description": "...",                  # Optional
            "websiteUrl": "https://..."            # Optional
        }

    Returns:
        JSON response with created university details
    """
    # Auth: site admin only
    if not current_user.is_site_admin():
        return jsonify({'error': 'Only site admins can create universities'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    # Validate required fields
    name = (data.get('name') or '').strip()
    club_name = (data.get('clubName') or '').strip()
    email_domain = (data.get('emailDomain') or '').strip().lower()

    if not name:
        return jsonify({'error': 'University name is required'}), 400
    if not club_name:
        return jsonify({'error': 'Club name is required'}), 400
    if not email_domain:
        return jsonify({'error': 'Email domain is required'}), 400

    # Check email domain is unique
    existing = University.query.filter(
        db.func.lower(University.email_domain) == email_domain
    ).first()
    if existing:
        return jsonify({'error': 'A university with this email domain already exists'}), 400

    # Validate URL format if provided
    website_url = (data.get('websiteUrl') or '').strip() or None
    if website_url and not validate_url(website_url):
        return jsonify({'error': 'Invalid website URL'}), 400

    # Validate social links if provided
    social_links = data.get('socialLinks', [])
    valid, error = validate_social_links(social_links)
    if not valid:
        return jsonify({'error': error}), 400

    # Create university
    uni = University(
        name=name,
        clubName=club_name,
        email_domain=email_domain,
        location=(data.get('location') or '').strip() or None,
        description=(data.get('description') or '').strip() or None,
        website_url=website_url,
    )

    # Set social links if provided
    if social_links:
        uni.set_social_links_list(social_links)

    db.session.add(uni)
    db.session.commit()

    return jsonify({
        'success': True,
        'university': {
            'id': uni.id,
            'name': uni.name,
            'clubName': uni.clubName,
            'location': uni.location or '',
            'emailDomain': uni.email_domain,
            'websiteUrl': uni.website_url or '',
            'socialLinks': uni.get_social_links_list(),
        }
    }), 201


@universities_bp.route('/api/universities/<int:university_id>', methods=['GET'])
def get_university(university_id: int):
    """
    Get detailed information about a single university for React frontend.

    Returns university information including:
    - Basic info (name, location, description)
    - Statistics (member count, posts, events)
    - Members list with profile information
    - Admin information

    Note: Since users are automatically enrolled based on email domain,
    this endpoint no longer includes join eligibility information.
    Users can only be enrolled during registration.

    Args:
        university_id: ID of the university to retrieve

    Returns:
        JSON object with university details
    """
    # Fetch university from database
    uni = University.query.get(university_id)
    if not uni:
        return jsonify({'error': 'University not found'}), 404

    # Update post count for accuracy
    uni.update_post_count()

    # Get members list with their profile information and roles (single JOIN query)
    members = []
    member_data = uni.get_members()  # Returns list of {'user': User, 'role': UniversityRole}
    for item in member_data:
        m = item['user']
        role = item['role']
        members.append({
            'id': m.id,
            'name': m.get_full_name(),
            'email': m.email,
            'avatar': m.get_profile_picture_url(),
            'location': m.location or '',
            'about': m.about_section or '',
            'skills': m.get_skills_list(),
            'postCount': m.post_count or 0,
            'role': role.role,
            'roleName': role.role_name,
            'eventsAttendedCount': getattr(role, 'events_attended_count', None) or 0,
        })

    # Check if current user is a member (for UI display purposes)
    is_member = current_user.is_authenticated and uni.is_member(current_user.id)

    # Get current user's permissions at this university
    user_permissions = {}
    if current_user.is_authenticated:
        user_permissions = get_user_university_permissions(current_user, university_id)

    # Build response
    detail = {
        'id': uni.id,
        'name': uni.name,
        'location': uni.location or '',
        'clubName': uni.clubName or f"{uni.name} AI Club",
        'emailDomain': uni.email_domain or '',
        'memberCount': uni.member_count or 0,
        'recentPosts': uni.recent_posts or 0,
        'upcomingEvents': uni.upcoming_events or 0,
        'description': uni.description or '',
        'members': members,
        'adminId': uni.admin_id,
        'isMember': is_member,
        'permissions': user_permissions,
        'websiteUrl': uni.website_url or '',
        'socialLinks': uni.get_social_links_list(),
        'hasLogo': uni.logo is not None,
        'hasBanner': uni.banner is not None,
        'bannerUrl': uni.get_banner_url(),
    }
    return jsonify(detail)


# RESTful: DELETE to resource deletes it
@universities_bp.route('/api/universities/<int:university_id>', methods=['DELETE'])
@login_required
def delete_university(university_id: int):
    """
    Delete a university.

    Authorization:
        - Site admin only (permission_level >= ADMIN)

    Note: This is a destructive action. All university data and roles will be deleted.
    Club presidents cannot delete universities - only site admins can.

    Returns:
        JSON response with success status
    """
    uni = University.query.get(university_id)
    if not uni:
        return jsonify({'error': 'University not found'}), 404

    # Only site admin can delete universities
    if not current_user.is_site_admin():
        return jsonify({'error': 'You are not authorized to delete this university.'}), 403

    # Explicitly delete all roles associated with this university
    # Cascade should handle this, but we do this for SQLite compatibility for our tests.
    UniversityRole.query.filter_by(university_id=university_id).delete()

    db.session.delete(uni)
    db.session.commit()
    return jsonify({'success': True, 'message': 'University deleted successfully'})


# =============================================================================
# Member Management Endpoints
# =============================================================================

# RESTful: DELETE to nested resource removes it
@universities_bp.route('/api/universities/<int:university_id>/members/<int:user_id>', methods=['DELETE'])
@login_required
def remove_member(university_id: int, user_id: int):
    """
    Remove a member from a university.

    This endpoint allows authorized users to remove a member from the university.
    The removed user will no longer be associated with the university.

    Note: Removing a member does NOT prevent them from re-enrolling if they
    register again with the same .edu email. To permanently block a user,
    additional measures would be needed.

    Args:
        university_id: ID of the university
        user_id: ID of the user to remove

    Authorization:
        - Site admin (permission_level >= ADMIN)
        - Club president at this university
        - Club executive at this university

    Returns:
        JSON response with success status
    """
    uni = University.query.get(university_id)
    if not uni:
        return jsonify({'error': 'University not found'}), 404

    # Authorization check: site admin, president, or executive can remove members
    if not can_manage_university_members(current_user, university_id):
        return jsonify({'error': 'You are not authorized to remove members.'}), 403

    # Prevent removing the president (must transfer presidency first)
    if uni.is_member_president(user_id):
        return jsonify({'error': 'Cannot remove the club president. Transfer presidency first.'}), 400

    # Check if user is a member
    if not uni.is_member(user_id):
        return jsonify({'error': 'Member not found in this university.'}), 404

    # Remove user from university (this also removes their role)
    uni.remove_member(user_id)

    # Clear the user's university affiliation
    user = User.query.get(user_id)
    if user and user.university == uni.name:
        user.university = None

    db.session.commit()
    return jsonify({'success': True, 'message': 'Member removed successfully'})


@universities_bp.route('/api/universities/<int:university_id>/members/<int:user_id>/attendance', methods=['GET'])
@login_required
def get_member_attendance(university_id: int, user_id: int):
    """
    Get a member's event attendance history at this university.

    Returns events the user checked into (via QR code) at this university's events,
    with event details and check-in times.

    Authorization:
        - Executive+ at this university, or site admin

    Returns:
        200: { events: [{ eventId, eventTitle, eventStartTime, checkedInAt }] }
        403: Not authorized
        404: University or member not found
    """
    uni = University.query.get(university_id)
    if not uni:
        return jsonify({'error': 'University not found'}), 404

    if not can_manage_university_members(current_user, university_id):
        return jsonify({'error': 'Executive or higher permission required'}), 403

    if not uni.is_member(user_id):
        return jsonify({'error': 'Member not found in this university'}), 404

    def _dt_iso(dt):
        if dt is None:
            return None
        s = dt.isoformat()
        return s + 'Z' if (getattr(dt, 'tzinfo', None) is None) else s

    records = (
        db.session.query(EventAttendance, Event)
        .join(Event, EventAttendance.event_id == Event.id)
        .filter(
            EventAttendance.user_id == user_id,
            Event.university_id == university_id,
        )
        .order_by(EventAttendance.checked_in_at.desc())
        .all()
    )

    events_data = [
        {
            'eventId': evt.id,
            'eventTitle': evt.title,
            'eventStartTime': _dt_iso(evt.start_time),
            'checkedInAt': _dt_iso(att.checked_in_at),
        }
        for att, evt in records
    ]

    return jsonify({'events': events_data})


# =============================================================================
# Role Management API Endpoints
# =============================================================================

@universities_bp.route('/api/universities/<int:university_id>/roles', methods=['GET'])
@login_required
def get_university_roles(university_id: int):
    """
    Get all roles for a university.

    Returns a list of all members with their roles at this university.

    Authorization:
        - Any authenticated user can view roles
    """
    uni = University.query.get(university_id)
    if not uni:
        return jsonify({'error': 'University not found'}), 404

    # Single query with JOIN to fetch roles and users together
    results = db.session.query(UniversityRole, User).join(
        User, UniversityRole.user_id == User.id
    ).filter(
        UniversityRole.university_id == university_id
    ).all()

    roles_data = [
        {
            'userId': user.id,
            'userName': user.get_full_name(),
            'userEmail': user.email,
            'userAvatar': user.get_profile_picture_url(),
            'role': role.role,
            'roleName': role.role_name,
        }
        for role, user in results
    ]

    return jsonify({
        'universityId': university_id,
        'roles': roles_data,
    })


@universities_bp.route('/api/universities/<int:university_id>/roles/<int:user_id>', methods=['POST'])
@login_required
def update_user_role(university_id: int, user_id: int):
    """
    Update a user's role at a university.

    Request body:
        {
            "role": 0|1|2  // MEMBER=0, EXECUTIVE=1, PRESIDENT=2
        }

    Authorization:
        - Site admin: Can set any role including president
        - Club president: Can promote to executive or demote to member
        - Club president: Can transfer presidency to an executive

    Business Rules:
        - Cannot demote yourself if you're the only president
        - Transferring presidency demotes the current president to executive
        - Only one president per university at a time
    """
    uni = University.query.get(university_id)
    if not uni:
        return jsonify({'error': 'University not found'}), 404

    # Check authorization
    if not can_manage_executives(current_user, university_id):
        return jsonify({'error': 'Not authorized to manage roles'}), 403

    # Validate request
    data = request.get_json()
    if not data or 'role' not in data:
        return jsonify({'error': 'Role is required'}), 400

    new_role = data['role']
    if not UniversityRoles.is_valid(new_role):
        return jsonify({'error': 'Invalid role value'}), 400

    # Check user exists and is a member
    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({'error': 'User not found'}), 404

    if not uni.is_member(user_id):
        return jsonify({'error': 'User is not a member of this university'}), 400

    # Get current role
    current_role = UniversityRole.get_role_level(user_id, university_id)

    # Handle president transfer/demotion
    if new_role == UniversityRoles.PRESIDENT:
        # Check if there's already a president
        current_president = uni.get_president()
        if current_president and current_president.user_id != user_id:
            # Demote current president to executive
            UniversityRole.set_role(
                current_president.user_id,
                university_id,
                UniversityRoles.EXECUTIVE,
                updated_by_id=current_user.id
            )

    # If demoting the president, ensure it's allowed
    if current_role == UniversityRoles.PRESIDENT and new_role < UniversityRoles.PRESIDENT:
        # Only site admins can demote a president without transferring
        if not current_user.is_site_admin():
            # Check if there will still be a president
            if user_id == current_user.id:
                return jsonify({
                    'error': 'Cannot demote yourself. Transfer presidency to another executive first.'
                }), 400

    # Set the new role
    role = UniversityRole.set_role(
        user_id,
        university_id,
        new_role,
        updated_by_id=current_user.id
    )

    return jsonify({
        'success': True,
        'userId': user_id,
        'role': role.role,
        'roleName': role.role_name,
    })


@universities_bp.route('/api/universities/<int:university_id>/roles/<int:user_id>', methods=['DELETE'])
@login_required
def remove_user_role(university_id: int, user_id: int):
    """
    Remove a user's role at a university (reset to member).

    This effectively demotes the user to a standard member.

    Authorization:
        - Site admin: Can remove any role
        - Club president: Can remove executive roles
    """
    uni = University.query.get(university_id)
    if not uni:
        return jsonify({'error': 'University not found'}), 404

    # Check authorization
    if not can_manage_executives(current_user, university_id):
        return jsonify({'error': 'Not authorized to manage roles'}), 403

    # Cannot remove president role this way
    current_role = UniversityRole.get_role_level(user_id, university_id)
    if current_role == UniversityRoles.PRESIDENT and not current_user.is_site_admin():
        return jsonify({
            'error': 'Cannot remove president role. Use role update to transfer presidency.'
        }), 400

    # Remove the role (or set to member)
    UniversityRole.set_role(
        user_id,
        university_id,
        UniversityRoles.MEMBER,
        updated_by_id=current_user.id
    )

    return jsonify({
        'success': True,
        'userId': user_id,
        'role': UniversityRoles.MEMBER,
        'roleName': 'Member',
    })


# =============================================================================
# University Update Endpoint
# =============================================================================

@universities_bp.route('/api/universities/<int:university_id>', methods=['PATCH'])
@login_required
def update_university(university_id: int):
    """
    Update university details.

    Authorization:
        - Executive or President at THIS university
        - Site admin

    Updateable fields:
        - clubName: Club/organization name
        - description: Club description
        - websiteUrl: Club website URL
        - location: Physical location

    Request body:
        {
            "clubName": "AI Club",
            "description": "We explore AI topics...",
            "websiteUrl": "https://example.com",
            "location": "Portland, OR"
        }

    Returns:
        JSON response with updated university details
    """
    uni = University.query.get(university_id)
    if not uni:
        return jsonify({'error': 'University not found'}), 404

    # Check authorization: executive+ at THIS university, or site admin
    if not can_manage_university_members(current_user, university_id):
        return jsonify({'error': 'Not authorized to update this university'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    # Define allowed fields and their mappings
    allowed_fields = {
        'clubName': 'clubName',
        'description': 'description',
        'location': 'location',
        'websiteUrl': 'website_url',
    }

    # Update each provided field
    for json_field, model_field in allowed_fields.items():
        if json_field in data:
            value = data[json_field]

            if json_field == 'websiteUrl':
                # Validate URL if provided
                if value:
                    value = value.strip()
                    if value and not validate_url(value):
                        return jsonify({'error': 'Invalid website URL'}), 400
                uni.website_url = value or None
            else:
                # Standard string fields
                if isinstance(value, str):
                    setattr(uni, model_field, value.strip() or None)
                elif value is None:
                    setattr(uni, model_field, None)
                else:
                    return jsonify({'error': f'{json_field} must be a string'}), 400

    # Handle social links separately (array field)
    if 'socialLinks' in data:
        social_links = data['socialLinks']
        if social_links is None:
            uni.set_social_links_list([])
        else:
            valid, error = validate_social_links(social_links)
            if not valid:
                return jsonify({'error': error}), 400
            uni.set_social_links_list(social_links)

    db.session.commit()

    # Return updated university data
    return jsonify({
        'success': True,
        'university': {
            'id': uni.id,
            'name': uni.name,
            'clubName': uni.clubName or f"{uni.name} AI Club",
            'location': uni.location or '',
            'description': uni.description or '',
            'websiteUrl': uni.website_url or '',
            'socialLinks': uni.get_social_links_list(),
            'memberCount': uni.member_count or 0,
            'hasLogo': uni.logo is not None,
        }
    })


# =============================================================================
# University Logo Endpoints
# =============================================================================

@universities_bp.route('/api/universities/<int:university_id>/logo', methods=['PUT'])
@login_required
def upload_university_logo(university_id: int):
    """
    Upload or replace university logo.

    Authorization:
        - Executive+ at THIS university, or site admin

    Request:
        multipart/form-data with 'logo' file field

    Returns:
        JSON response with success status
    """
    uni = University.query.get(university_id)
    if not uni:
        return jsonify({'error': 'University not found'}), 404

    # Check authorization
    if not can_manage_university_members(current_user, university_id):
        return jsonify({'error': 'Not authorized to update this university'}), 403

    # Check for file in request
    if 'logo' not in request.files:
        return jsonify({'error': 'No logo file provided'}), 400

    file = request.files['logo']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Validate file type
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: png, jpg, jpeg, gif, webp'}), 400

    # Check Content-Length header first to reject oversized files early
    max_size = 5 * 1024 * 1024  # 5MB
    content_length = request.content_length
    if content_length and content_length > max_size:
        return jsonify({'error': 'File size must be less than 5MB'}), 400

    # Read with size limit to prevent memory exhaustion
    file_data = file.read(max_size + 1)
    if len(file_data) > max_size:
        return jsonify({'error': 'File size must be less than 5MB'}), 400

    try:
        # Compress and resize the image
        compressed_data = compress_image(file_data, max_size=(400, 400), quality=90)

        # Sanitize filename to prevent path traversal or special character issues
        import os
        from urllib.parse import quote
        safe_filename = quote(os.path.basename(file.filename), safe='.-_')

        # Update university logo
        uni.logo = compressed_data
        uni.logo_filename = safe_filename
        uni.logo_mimetype = 'image/jpeg'  # compress_image converts to JPEG

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Logo uploaded successfully',
            'hasLogo': True,
        })

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to process image'}), 500


@universities_bp.route('/university/<int:university_id>/logo', methods=['GET'])
def get_university_logo(university_id: int):
    """
    Serve university logo image.

    This route is public (no authentication required) to allow
    embedding logos in img tags.

    Returns:
        Binary image data with appropriate MIME type, or 404 if no logo
    """
    uni = University.query.get(university_id)
    if not uni:
        return jsonify({'error': 'University not found'}), 404

    if not uni.logo:
        return jsonify({'error': 'No logo available'}), 404

    etag = hashlib.md5(uni.logo).hexdigest()
    if_none_match = request.headers.get('If-None-Match')
    if if_none_match and if_none_match.strip('"') == etag:
        return Response(status=304, headers={'ETag': f'"{etag}"'})

    return Response(
        uni.logo,
        mimetype=uni.logo_mimetype or 'image/jpeg',
        headers={
            'Cache-Control': 'public, max-age=2592000',
            'ETag': f'"{etag}"',
        }
    )


# =============================================================================
# University Banner Endpoints
# =============================================================================

@universities_bp.route('/api/universities/<int:university_id>/banner', methods=['PUT'])
@login_required
def upload_university_banner(university_id: int):
    """
    Upload or replace university banner image.

    Authorization:
        - Executive+ at THIS university, or site admin

    Request:
        multipart/form-data with 'banner' file field

    Images are automatically center-cropped to 5:1 aspect ratio
    and compressed to 1500x300.

    Returns:
        JSON response with success status
    """
    uni = University.query.get(university_id)
    if not uni:
        return jsonify({'error': 'University not found'}), 404

    # Check authorization
    if not can_manage_university_members(current_user, university_id):
        return jsonify({'error': 'Not authorized to update this university'}), 403

    # Check for file in request
    if 'banner' not in request.files:
        return jsonify({'error': 'No banner file provided'}), 400

    file = request.files['banner']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Validate file type
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: png, jpg, jpeg, gif, webp'}), 400

    # Read file data
    file_data = file.read()

    try:
        # Compress and crop to banner dimensions (1500x300, 5:1 ratio)
        compressed_data = compress_banner_image(file_data)

        # Sanitize filename
        import os
        from urllib.parse import quote
        safe_filename = quote(os.path.basename(file.filename), safe='.-_')

        # Update university banner
        uni.banner = compressed_data
        uni.banner_filename = safe_filename
        uni.banner_mimetype = 'image/jpeg'

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Banner uploaded successfully',
            'hasBanner': True,
            'bannerUrl': uni.get_banner_url(),
        })

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to process image'}), 500


@universities_bp.route('/university/<int:university_id>/banner', methods=['GET'])
def get_university_banner(university_id: int):
    """
    Serve university banner image.

    This route is public (no authentication required) to allow
    embedding banners in img tags.

    Returns:
        Binary image data with appropriate MIME type, or 404 if no banner
    """
    uni = University.query.get(university_id)
    if not uni:
        return jsonify({'error': 'University not found'}), 404

    if not uni.banner:
        return jsonify({'error': 'No banner available'}), 404

    etag = hashlib.md5(uni.banner).hexdigest()
    if_none_match = request.headers.get('If-None-Match')
    if if_none_match and if_none_match.strip('"') == etag:
        return Response(status=304, headers={'ETag': f'"{etag}"'})

    return Response(
        uni.banner,
        mimetype=uni.banner_mimetype or 'image/jpeg',
        headers={
            'Cache-Control': 'public, max-age=2592000',
            'ETag': f'"{etag}"',
        }
    )



