"""
AI News API Routes

Provides REST API endpoints for fetching AI news stories and admin operations.
"""

from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user

from backend.services.ai_news import (
    fetch_top_ai_stories,
    get_latest_stories,
    get_story_by_id,
    get_all_batches,
    cleanup_old_batches
)
from backend.constants import ADMIN


news_bp = Blueprint('news', __name__)


# =============================================================================
# Public Endpoints
# =============================================================================

@news_bp.route('/api/news', methods=['GET'])
def get_news():
    """Get the latest AI news stories, ordered by rank."""
    limit = request.args.get('limit', default=10, type=int)
    limit = max(1, min(limit, 20))  # Clamp to reasonable bounds

    stories = get_latest_stories(limit=limit)
    batch_id = stories[0]['batchId'] if stories else None

    return jsonify({
        'success': True,
        'stories': stories,
        'count': len(stories),
        'batchId': batch_id
    })


@news_bp.route('/api/news/<int:story_id>', methods=['GET'])
def get_single_story(story_id: int):
    """Get a single AI news story by ID."""
    story = get_story_by_id(story_id)

    if not story:
        return jsonify({'success': False, 'error': 'Story not found'}), 404

    return jsonify({'success': True, 'story': story})


# =============================================================================
# Admin Endpoints
# =============================================================================

def require_admin():
    """Check if current user has admin privileges. Returns (is_admin, error_response)."""
    if not current_user.is_authenticated:
        return False, (jsonify({'success': False, 'error': 'Authentication required'}), 401)

    if current_user.permission_level < ADMIN:
        return False, (jsonify({'success': False, 'error': 'Admin privileges required'}), 403)

    return True, None


@news_bp.route('/api/news/refresh', methods=['POST'])
@login_required
def refresh_news():
    """Manually trigger a refresh of AI news stories. Admin only."""
    is_admin, error_response = require_admin()
    if not is_admin:
        return error_response

    print(f"[AI News] Manual refresh triggered by user {current_user.id}")

    result = fetch_top_ai_stories()

    if result['success']:
        return jsonify({
            'success': True,
            'message': result['message'],
            'batchId': result['batch_id'],
            'storiesCount': result['stories_count'],
            'stories': result['stories']
        })
    else:
        return jsonify({
            'success': False,
            'error': result.get('error', 'Unknown error occurred'),
            'batchId': result.get('batch_id')
        }), 500


@news_bp.route('/api/news/batches', methods=['GET'])
@login_required
def get_batches():
    """Get list of all news fetch batches. Admin only."""
    is_admin, error_response = require_admin()
    if not is_admin:
        return error_response

    batches = get_all_batches()

    return jsonify({
        'success': True,
        'batches': batches,
        'count': len(batches)
    })


@news_bp.route('/api/news/cleanup', methods=['POST'])
@login_required
def cleanup_batches():
    """Clean up old news batches. Admin only. Body: {keepCount: int}"""
    is_admin, error_response = require_admin()
    if not is_admin:
        return error_response

    data = request.get_json() or {}
    keep_count = max(1, min(data.get('keepCount', 7), 30))

    deleted_count = cleanup_old_batches(keep_count=keep_count)

    return jsonify({
        'success': True,
        'deletedCount': deleted_count,
        'message': f'Cleaned up {deleted_count} old batches'
    })
