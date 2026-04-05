import logging
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from datetime import datetime, timedelta
from sqlalchemy.orm import joinedload
from backend.extensions import db
from backend.models import Note, University
from backend.models.notification import Notification

logger = logging.getLogger(__name__)

notifications_bp = Blueprint('notifications', __name__)


# =========================================================================
# Notification REST Endpoints
# =========================================================================

@notifications_bp.route('/api/notifications')
@login_required
def get_notifications():
    """
    Get notifications for the current user, ordered by updated_at DESC.

    Query params:
        limit  – max rows to return (default 20, 0 or absent → 20).
                 Pass a large value (e.g. 1000) for the full-page view.
        offset – number of rows to skip (default 0). Enables simple pagination.
    """
    try:
        limit = max(1, int(request.args.get('limit', 20)))
    except (TypeError, ValueError):
        limit = 20

    try:
        offset = max(0, int(request.args.get('offset', 0)))
    except (TypeError, ValueError):
        offset = 0

    query = (
        Notification.query
        .filter_by(recipient_id=current_user.id)
        .order_by(Notification.updated_at.desc())
    )

    total = query.count()
    notifications = query.offset(offset).limit(limit).all()

    return jsonify({
        'notifications': [n.to_dict() for n in notifications],
        'total': total,
    })


@notifications_bp.route('/api/notifications/count')
@login_required
def get_unread_count():
    """Get the count of unread notifications for the current user."""
    count = Notification.query.filter_by(
        recipient_id=current_user.id,
        is_read=False,
    ).count()
    return jsonify({'count': count})


@notifications_bp.route('/api/notifications/<int:notification_id>/read', methods=['PATCH'])
@login_required
def mark_read(notification_id):
    """Mark a single notification as read."""
    notif = Notification.query.filter_by(
        id=notification_id,
        recipient_id=current_user.id,
    ).first()

    if not notif:
        return jsonify({'success': False, 'error': 'Notification not found'}), 404

    notif.is_read = True
    db.session.commit()
    return jsonify({'success': True})


@notifications_bp.route('/api/notifications/read-all', methods=['PATCH'])
@login_required
def mark_all_read():
    """Mark all of the current user's notifications as read."""
    Notification.query.filter_by(
        recipient_id=current_user.id,
        is_read=False,
    ).update({'is_read': True})
    db.session.commit()
    return jsonify({'success': True})


# =========================================================================
# Legacy / University-Post Notification Endpoints
# =========================================================================

@notifications_bp.route('/api/notifications/university-posts')
@login_required
def get_university_notifications():
    try:
        if not current_user.university:
            return jsonify({
                'success': True,
                'posts': [],
                'message': 'You are not part of a university yet'
            })

        university = University.query.filter_by(
            name=current_user.university).first()
        if not university:
            return jsonify({
                'success': True,
                'posts': [],
                'message': 'University not found'
            })

        member_ids = university.get_members_list()
        if not member_ids:
            return jsonify({
                'success': True,
                'posts': []
            })

        recent_posts = Note.query.options(joinedload(Note.author)).filter(
            Note.author_id.in_(member_ids),
            Note.author_id != current_user.id
        ).order_by(Note.created_at.desc()).limit(10).all()

        posts_data = []
        for post in recent_posts:
            post_dict = post.to_dict()
            post_dict['created_at'] = post.created_at.isoformat()
            posts_data.append(post_dict)

        return jsonify({
            'success': True,
            'posts': posts_data
        })

    except Exception:
        logger.exception('Error fetching university posts')
        return jsonify({
            'success': False,
            'error': 'An unexpected error occurred'
        }), 500


@notifications_bp.route('/api/notifications/check-new')
@login_required
def check_new_notifications():
    try:
        if not current_user.university:
            return jsonify({'hasNew': False})

        university = University.query.filter_by(
            name=current_user.university).first()
        if not university:
            return jsonify({'hasNew': False})

        member_ids = university.get_members_list()
        if not member_ids:
            return jsonify({'hasNew': False})

        last_checked = request.args.get('lastChecked', None)
        if last_checked:
            try:
                last_checked_time = datetime.fromisoformat(
                    last_checked.replace('Z', '+00:00'))
            except (ValueError, TypeError):
                last_checked_time = datetime.utcnow() - timedelta(hours=24)
        else:
            last_checked_time = datetime.utcnow() - timedelta(hours=24)

        new_posts_count = Note.query.filter(
            Note.author_id.in_(member_ids),
            Note.author_id != current_user.id,
            Note.created_at > last_checked_time
        ).count()

        return jsonify({
            'hasNew': new_posts_count > 0,
            'count': new_posts_count
        })

    except Exception:
        logger.exception('Error checking new notifications')
        return jsonify({'hasNew': False}), 500
