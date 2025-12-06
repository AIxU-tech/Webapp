"""
Universities Routes

Handles university-related endpoints for both the legacy Flask templates
and the React frontend API.

Auto-Enrollment System:
Users are automatically enrolled in a university based on their .edu email
domain during registration. Manual joining is not supported - university
membership is determined solely by the user's email domain.

Permission System:
- Site Admins: Can manage any university (remove members, manage executives)
- Club Presidents: Can manage executives and members at their university
- Club Executives: Can remove members at their university
- Members: Standard access

Available Endpoints:
- GET /api/universities/list - List all universities
- GET /api/universities/<id> - Get university details
- POST /universities/<id>/remove_member/<user_id> - Remove member (executive+)
- POST /universities/<id>/delete - Delete university (president or admin only)
- POST /api/universities/<id>/roles/<user_id> - Update user role (president or admin)
- GET /api/universities/<id>/roles - Get all roles for a university
"""

from flask import Blueprint, request, flash, redirect, url_for, jsonify
from flask_login import login_required, current_user
from sqlalchemy import func
import json
from backend.extensions import db
from backend.models import University, User, UniversityRole
from backend.constants import ADMIN, UniversityRoles
from backend.utils.permissions import (
    can_manage_university_members,
    can_manage_executives,
    get_user_university_permissions,
)

universities_bp = Blueprint('universities', __name__)


# NOTE: The join_university endpoint has been removed.
# Users are now automatically enrolled in a university based on their
# .edu email domain during registration. See api_auth.py for the
# auto-enrollment implementation.


@universities_bp.route('/universities/<int:university_id>/remove_member/<int:user_id>', methods=['POST'])
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
        Redirect to university detail page with flash message
    """
    uni = University.query.get(university_id)
    if not uni:
        flash('University not found', 'error')
        return redirect(url_for('universities.universities'))

    # Authorization check: site admin, president, or executive can remove members
    if not can_manage_university_members(current_user, university_id):
        flash('You are not authorized to remove members.', 'error')
        return redirect(url_for('universities.university_detail', university_id=uni.id))

    # Prevent removing the president (must transfer presidency first)
    if uni.is_member_president(user_id):
        flash('Cannot remove the club president. Transfer presidency first.', 'error')
        return redirect(url_for('universities.university_detail', university_id=uni.id))

    member_ids = uni.get_members_list()
    if user_id in member_ids:
        # Remove user from university members list
        member_ids.remove(user_id)
        uni.set_members_list(member_ids)

        # Remove user's role at this university
        UniversityRole.remove_role(user_id, university_id)

        # Clear the user's university affiliation
        user = User.query.get(user_id)
        if user and user.university == uni.name:
            user.university = None

        db.session.commit()
        flash('Member removed.', 'success')
    else:
        flash('Member not found in this university.', 'error')

    return redirect(url_for('universities.university_detail', university_id=uni.id))


@universities_bp.route('/universities/<int:university_id>/delete', methods=['POST'])
@login_required
def delete_university(university_id: int):
    """
    Delete a university.

    Authorization:
        - Site admin only (permission_level >= ADMIN)

    Note: This is a destructive action. All university data and roles will be deleted.
    Club presidents cannot delete universities - only site admins can.
    """
    uni = University.query.get(university_id)
    if not uni:
        flash('University not found', 'error')
        return redirect(url_for('universities.universities'))

    # Only site admin can delete universities
    if not current_user.is_site_admin():
        flash('You are not authorized to delete this university.', 'error')
        return redirect(url_for('universities.university_detail', university_id=uni.id))

    # Delete all roles associated with this university
    UniversityRole.query.filter_by(university_id=university_id).delete()

    db.session.delete(uni)
    db.session.commit()
    flash('University deleted successfully', 'success')
    return redirect(url_for('universities.universities'))


# API endpoints
@universities_bp.route('/api/universities/list')
def api_universities_list():
    """
    Get list of all universities with full details for React frontend.
    Returns universities with stats, tags, and other information needed for the grid display.
    """
    universities = University.query.order_by(University.name).all()

    universities_data = []
    for uni in universities:
        # Update post count for accuracy
        uni.update_post_count()

        universities_data.append({
            'id': uni.id,
            'name': uni.name,
            'clubName': uni.clubName or f"{uni.name} AI Club",
            'location': uni.location or '',
            'description': uni.description or '',
            'tags': json.loads(uni.tags) if uni.tags else [],
            'memberCount': uni.member_count or 0,
            'recentPosts': uni.recent_posts or 0,
            'upcomingEvents': uni.upcoming_events or 0,
            # Email domain for auto-matching users during registration
            # (e.g., "uoregon" for uoregon.edu emails)
            'emailDomain': uni.email_domain or '',
        })

    return jsonify({
        'universities': universities_data
    })


@universities_bp.route('/api/universities/<int:university_id>')
def api_university_detail(university_id: int):
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

    # Get members list with their profile information and roles
    members = []
    member_ids = uni.get_members_list()
    if member_ids:
        users = User.query.filter(User.id.in_(member_ids)).all()
        for m in users:
            # Get user's role at this university
            role_level = uni.get_member_role_level(m.id)
            members.append({
                'id': m.id,
                'name': m.get_full_name(),
                'email': m.email,
                'avatar': m.get_profile_picture_url(),
                'location': m.location or '',
                'about': m.about_section or '',
                'skills': m.get_skills_list(),
                'interests': m.get_interests_list(),
                'postCount': m.post_count or 0,
                'role': role_level,
                'roleName': UniversityRoles.get_name(role_level),
            })

    # Check if current user is a member (for UI display purposes)
    is_member = (current_user.is_authenticated and current_user.id in member_ids) if member_ids else False

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
        'tags': json.loads(uni.tags) if uni.tags else [],
        'members': members,
        'adminId': uni.admin_id,
        'isMember': is_member,
        'permissions': user_permissions,
    }
    return jsonify(detail)


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

    # Get all roles for this university
    roles = UniversityRole.query.filter_by(university_id=university_id).all()

    # Build response with user info
    roles_data = []
    for role in roles:
        user = User.query.get(role.user_id)
        if user:
            roles_data.append({
                'userId': user.id,
                'userName': user.get_full_name(),
                'userEmail': user.email,
                'userAvatar': user.get_profile_picture_url(),
                'role': role.role,
                'roleName': role.role_name,
            })

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

    member_ids = uni.get_members_list()
    if user_id not in member_ids:
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


