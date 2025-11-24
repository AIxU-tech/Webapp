from flask import Blueprint, request, flash, redirect, url_for, jsonify
from flask_login import login_required, current_user
from sqlalchemy import func
import json
from backend.extensions import db
from backend.models import University, User
from backend.constants import SUPER_ADMIN

universities_bp = Blueprint('universities', __name__)


@universities_bp.route('/universities/<int:university_id>/join', methods=['POST'])
@login_required
def join_university(university_id: int):
    uni = University.query.get(university_id)
    if not uni:
        flash('University not found', 'error')
        return redirect(url_for('universities.universities'))

    # Check membership
    member_ids = uni.get_members_list()
    if current_user.id in member_ids:
        flash('You are already a member of this university.', 'info')
        return redirect(url_for('universities.university_detail', university_id=uni.id))

    # Prevent joining more than one university
    if current_user.university and current_user.university != uni.name:
        flash('You are already affiliated with another university.', 'error')
        return redirect(url_for('universities.university_detail', university_id=uni.id))

    # Check email domain matches admin's
    admin_user = User.query.get(uni.admin_id) if uni.admin_id else None
    if not admin_user or not admin_user.email or '@' not in admin_user.email:
        flash('This university is not configured for domain-based membership.', 'error')
        return redirect(url_for('universities.university_detail', university_id=uni.id))

    admin_domain = admin_user.email.split('@', 1)[1].lower()
    user_domain = current_user.email.split('@', 1)[1].lower() if current_user.email and '@' in current_user.email else ''

    if admin_domain != user_domain:
        flash(f'You must have an email ending in @{admin_domain} to join this university.', 'error')
        return redirect(url_for('universities.university_detail', university_id=uni.id))

    # Add member
    uni.add_member(current_user.id)
    # Optionally reflect on user's profile
    current_user.university = uni.name
    db.session.commit()
    flash('You have joined the university.', 'success')
    return redirect(url_for('universities.university_detail', university_id=uni.id))


@universities_bp.route('/universities/<int:university_id>/remove_member/<int:user_id>', methods=['POST'])
@login_required
def remove_member(university_id: int, user_id: int):
    uni = University.query.get(university_id)
    if not uni:
        flash('University not found', 'error')
        return redirect(url_for('universities.universities'))
    # Allow university admin OR super admin (level 2) to remove members
    if uni.admin_id != current_user.id and current_user.permission_level < SUPER_ADMIN:
        flash('You are not authorized to remove members.', 'error')
        return redirect(url_for('universities.university_detail', university_id=uni.id))
    member_ids = uni.get_members_list()
    if user_id in member_ids:
        member_ids.remove(user_id)
        uni.set_members_list(member_ids)
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
    Includes members list, stats, tags, and admin information.
    """
    # Fetch university from database
    uni = University.query.get(university_id)
    if not uni:
        return jsonify({'error': 'University not found'}), 404

    # Update post count for accuracy
    uni.update_post_count()

    # Get members list
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

    # Derive required domain from admin email
    admin_user = User.query.get(uni.admin_id) if uni.admin_id else None
    required_domain = None
    if admin_user and admin_user.email and '@' in admin_user.email:
        required_domain = admin_user.email.split('@', 1)[1].lower()

    # Check if current user is a member
    is_member = (current_user.is_authenticated and current_user.id in member_ids) if member_ids else False

    # Build response
    detail = {
        'id': uni.id,
        'name': uni.name,
        'location': uni.location or '',
        'clubName': uni.clubName or f"{uni.name} AI Club",
        'memberCount': uni.member_count or 0,
        'recentPosts': uni.recent_posts or 0,
        'upcomingEvents': uni.upcoming_events or 0,
        'description': uni.description or '',
        'tags': json.loads(uni.tags) if uni.tags else [],
        'members': members,
        'adminId': uni.admin_id,
        'requiredDomain': required_domain,
        'isMember': is_member,
    }
    return jsonify(detail)


