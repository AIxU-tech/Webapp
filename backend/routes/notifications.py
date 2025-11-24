from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from datetime import datetime, timedelta
from backend.models import Note, University

notifications_bp = Blueprint('notifications', __name__)


# API endpoint to get university posts for notifications
@notifications_bp.route('/api/notifications/university-posts')
@login_required
def get_university_notifications():
    try:
        # Check if user belongs to a university
        if not current_user.university:
            return jsonify({
                'success': True,
                'posts': [],
                'message': 'You are not part of a university yet'
            })

        # Get university
        university = University.query.filter_by(name=current_user.university).first()
        if not university:
            return jsonify({
                'success': True,
                'posts': [],
                'message': 'University not found'
            })

        # Get all member IDs from the university
        member_ids = university.get_members_list()
        if not member_ids:
            return jsonify({
                'success': True,
                'posts': []
            })

        # Get recent posts from university members (last 10, excluding own posts)
        recent_posts = Note.query.filter(
            Note.author_id.in_(member_ids),
            Note.author_id != current_user.id  # Exclude own posts
        ).order_by(Note.created_at.desc()).limit(10).all()

        # Convert posts to dict format
        posts_data = []
        for post in recent_posts:
            post_dict = post.to_dict()
            post_dict['created_at'] = post.created_at.isoformat()  # Add ISO format for JS
            posts_data.append(post_dict)

        return jsonify({
            'success': True,
            'posts': posts_data
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# API endpoint to check if there are new notifications
@notifications_bp.route('/api/notifications/check-new')
@login_required
def check_new_notifications():
    try:
        # Check if user belongs to a university
        if not current_user.university:
            return jsonify({'hasNew': False})

        # Get university
        university = University.query.filter_by(name=current_user.university).first()
        if not university:
            return jsonify({'hasNew': False})

        # Get member IDs
        member_ids = university.get_members_list()
        if not member_ids:
            return jsonify({'hasNew': False})

        # Get timestamp from request (last time user checked)
        last_checked = request.args.get('lastChecked', None)
        if last_checked:
            try:
                last_checked_time = datetime.fromisoformat(last_checked.replace('Z', '+00:00'))
            except:
                last_checked_time = datetime.utcnow() - timedelta(hours=24)
        else:
            last_checked_time = datetime.utcnow() - timedelta(hours=24)

        # Check if there are any new posts since last check
        new_posts_count = Note.query.filter(
            Note.author_id.in_(member_ids),
            Note.author_id != current_user.id,
            Note.created_at > last_checked_time
        ).count()

        return jsonify({
            'hasNew': new_posts_count > 0,
            'count': new_posts_count
        })

    except Exception as e:
        return jsonify({'hasNew': False}), 500
