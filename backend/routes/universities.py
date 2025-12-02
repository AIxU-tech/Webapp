"""
Universities Routes

Handles university-related endpoints for both the legacy Flask templates
and the React frontend API.

Auto-Enrollment System:
Users are automatically enrolled in a university based on their .edu email
domain during registration. Manual joining is not supported - university
membership is determined solely by the user's email domain.

Available Endpoints:
- GET /api/universities/list - List all universities
- GET /api/universities/<id> - Get university details
- POST /universities/<id>/remove_member/<user_id> - Remove member (admin only)
- POST /universities/<id>/delete - Delete university (admin only)
"""

from flask import Blueprint, request, flash, redirect, url_for, jsonify
from flask_login import login_required, current_user
from sqlalchemy import func
import json
from backend.extensions import db
from backend.models import University, User
from backend.constants import SUPER_ADMIN

universities_bp = Blueprint('universities', __name__)


# NOTE: The join_university endpoint has been removed.
# Users are now automatically enrolled in a university based on their
# .edu email domain during registration. See api_auth.py for the
# auto-enrollment implementation.


@universities_bp.route('/universities/<int:university_id>/remove_member/<int:user_id>', methods=['POST'])
@login_required
def remove_member(university_id: int, user_id: int):
    """
    Remove a member from a university (admin only).

    This endpoint allows university admins or super admins to remove a member
    from the university. The removed user will no longer be associated with
    the university.

    Note: Removing a member does NOT prevent them from re-enrolling if they
    register again with the same .edu email. To permanently block a user,
    additional measures would be needed.

    Args:
        university_id: ID of the university
        user_id: ID of the user to remove

    Authorization:
        - University admin (admin_id matches current user)
        - Super admin (permission_level >= 2)

    Returns:
        Redirect to university detail page with flash message
    """
    uni = University.query.get(university_id)
    if not uni:
        flash('University not found', 'error')
        return redirect(url_for('universities.universities'))

    # Authorization check: only university admin or super admin can remove members
    if uni.admin_id != current_user.id and current_user.permission_level < SUPER_ADMIN:
        flash('You are not authorized to remove members.', 'error')
        return redirect(url_for('universities.university_detail', university_id=uni.id))

    member_ids = uni.get_members_list()
    if user_id in member_ids:
        # Remove user from university members list
        member_ids.remove(user_id)
        uni.set_members_list(member_ids)

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
    uni = University.query.get(university_id)
    if not uni:
        flash('University not found', 'error')
        return redirect(url_for('universities.universities'))
    # Allow university admin OR super admin (level 2) to delete
    if uni.admin_id != current_user.id and current_user.permission_level < SUPER_ADMIN:
        flash('You are not authorized to delete this university.', 'error')
        return redirect(url_for('universities.university_detail', university_id=uni.id))
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

    # Get members list with their profile information
    members = []
    member_ids = uni.get_members_list()
    if member_ids:
        users = User.query.filter(User.id.in_(member_ids)).all()
        for m in users:
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
            })

    # Check if current user is a member (for UI display purposes)
    is_member = (current_user.is_authenticated and current_user.id in member_ids) if member_ids else False

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
    }
    return jsonify(detail)


