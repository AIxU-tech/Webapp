"""
AI News & Research API Routes

Provides REST API endpoints for:
- Fetching AI news stories and research papers
- Interactive chat about news content with Claude
- Admin operations for content refresh and cleanup

Endpoints:
- GET /api/news - Get latest news stories
- GET /api/papers - Get latest research papers
- GET /api/ai-content - Get both stories and papers
- POST /api/news/refresh - Trigger content refresh (admin)
- POST /api/news/<id>/chat - Chat about a news story
- POST /api/papers/<id>/chat - Chat about a research paper
- GET /api/chat/<session_id>/history - Get chat history
- DELETE /api/chat/<session_id> - Clear chat history
"""

from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user

from backend.services.ai_news import (
    fetch_top_ai_stories,
    get_latest_stories,
    get_latest_papers,
    get_latest_content,
    get_story_by_id,
    get_paper_by_id,
    get_all_batches,
    cleanup_old_batches,
    chat_with_story,
    chat_with_paper,
    get_chat_history,
    clear_chat_history
)
from backend.constants import ADMIN


news_bp = Blueprint('news', __name__)


# =============================================================================
# Public Endpoints - News Stories
# =============================================================================

@news_bp.route('/api/news', methods=['GET'])
def get_news():
    """
    Get the latest AI news stories, ordered by rank.

    Query Parameters:
        limit (int): Maximum number of stories to return (1-20, default 10)

    Returns:
        JSON response with stories array, count, and batch ID
    """
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
    """
    Get a single AI news story by ID.

    Args:
        story_id: The database ID of the story

    Returns:
        JSON response with story data or 404 error
    """
    story = get_story_by_id(story_id)

    if not story:
        return jsonify({'success': False, 'error': 'Story not found'}), 404

    return jsonify({'success': True, 'story': story})


# =============================================================================
# Public Endpoints - Research Papers
# =============================================================================

@news_bp.route('/api/papers', methods=['GET'])
def get_papers():
    """
    Get the latest AI research papers, ordered by rank.

    Query Parameters:
        limit (int): Maximum number of papers to return (1-10, default 3)

    Returns:
        JSON response with papers array, count, and batch ID
    """
    limit = request.args.get('limit', default=3, type=int)
    limit = max(1, min(limit, 10))  # Clamp to reasonable bounds

    papers = get_latest_papers(limit=limit)
    batch_id = papers[0]['batchId'] if papers else None

    return jsonify({
        'success': True,
        'papers': papers,
        'count': len(papers),
        'batchId': batch_id
    })


@news_bp.route('/api/papers/<int:paper_id>', methods=['GET'])
def get_single_paper(paper_id: int):
    """
    Get a single AI research paper by ID.

    Args:
        paper_id: The database ID of the paper

    Returns:
        JSON response with paper data or 404 error
    """
    paper = get_paper_by_id(paper_id)

    if not paper:
        return jsonify({'success': False, 'error': 'Paper not found'}), 404

    return jsonify({'success': True, 'paper': paper})


# =============================================================================
# Public Endpoints - Combined Content
# =============================================================================

@news_bp.route('/api/ai-content', methods=['GET'])
def get_ai_content():
    """
    Get the latest AI news stories AND research papers combined.

    This is the primary endpoint for the News page, returning both
    content types in a single API call for optimal performance.

    Query Parameters:
        stories_limit (int): Max stories to return (1-10, default 3)
        papers_limit (int): Max papers to return (1-10, default 3)

    Returns:
        JSON response with stories, papers, counts, and batch ID
    """
    stories_limit = request.args.get('stories_limit', default=3, type=int)
    papers_limit = request.args.get('papers_limit', default=3, type=int)
    stories_limit = max(1, min(stories_limit, 10))
    papers_limit = max(1, min(papers_limit, 10))

    content = get_latest_content(
        stories_limit=stories_limit, papers_limit=papers_limit)
    stories = content['stories']
    papers = content['papers']

    batch_id = stories[0]['batchId'] if stories else (
        papers[0]['batchId'] if papers else None)

    return jsonify({
        'success': True,
        'stories': stories,
        'papers': papers,
        'storiesCount': len(stories),
        'papersCount': len(papers),
        'batchId': batch_id
    })


# =============================================================================
# Admin Endpoints
# =============================================================================

def require_admin():
    """
    Check if current user has admin privileges.

    Returns:
        Tuple of (is_admin: bool, error_response: tuple or None)
    """
    if not current_user.is_authenticated:
        return False, (jsonify({'success': False, 'error': 'Authentication required'}), 401)

    if current_user.permission_level < ADMIN:
        return False, (jsonify({'success': False, 'error': 'Admin privileges required'}), 403)

    return True, None


@news_bp.route('/api/news/refresh', methods=['POST'])
def refresh_news():
    """
    Trigger a refresh of AI news stories and research papers.

    Access control:
    - Admins can always trigger a refresh
    - Non-admins can only trigger a refresh if no content exists (initial load)
    - This allows automatic fetching on first visit while preventing abuse

    Returns:
        JSON response with new content or error
    """
    # Check if content already exists
    content = get_latest_content(stories_limit=1, papers_limit=1)
    has_existing_content = len(
        content['stories']) > 0 or len(content['papers']) > 0

    # If content exists, require admin privileges
    if has_existing_content:
        if not current_user.is_authenticated:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        if current_user.permission_level < ADMIN:
            return jsonify({'success': False, 'error': 'Admin privileges required'}), 403

    user_id = current_user.id if current_user.is_authenticated else 'anonymous'
    print(
        f"[AI News] Refresh triggered by user {user_id} (has_existing_content={has_existing_content})")

    result = fetch_top_ai_stories()

    if result['success']:
        return jsonify({
            'success': True,
            'message': result['message'],
            'batchId': result['batch_id'],
            'storiesCount': result.get('stories_count', 0),
            'papersCount': result.get('papers_count', 0),
            'stories': result.get('stories', []),
            'papers': result.get('papers', [])
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
    """
    Get list of all news fetch batches. Admin only.

    Returns:
        JSON response with batch metadata
    """
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
    """
    Clean up old news batches. Admin only.

    Request Body:
        keepCount (int): Number of recent batches to keep (1-30, default 7)

    Returns:
        JSON response with deletion count
    """
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


@news_bp.route('/api/news/scheduler', methods=['GET'])
@login_required
def get_scheduler_info():
    """
    Get the status of the background news refresh scheduler. Admin only.

    Returns:
        JSON response with scheduler status and job information
    """
    is_admin, error_response = require_admin()
    if not is_admin:
        return error_response

    from backend.services.scheduler import get_scheduler_status
    status = get_scheduler_status()

    return jsonify({
        'success': True,
        'scheduler': status
    })


# =============================================================================
# Chat Endpoints
# =============================================================================

@news_bp.route('/api/news/<int:story_id>/chat', methods=['POST'])
def chat_about_story(story_id: int):
    """
    Send a chat message about a specific news story.

    Users can ask questions about news stories and receive AI-generated
    responses that are contextually aware of the story's content.

    Request Body:
        message (str): The user's question or message
        sessionId (str, optional): Session ID for conversation continuity

    Args:
        story_id: The database ID of the news story

    Returns:
        JSON response with:
        - response: Claude's answer
        - sessionId: Session ID for follow-up messages
        - userMessage: The stored user message object
        - assistantMessage: The stored assistant message object
    """
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'error': 'Request body required'}), 400

    message = data.get('message', '').strip()
    if not message:
        return jsonify({'success': False, 'error': 'Message is required'}), 400

    session_id = data.get('sessionId', '')
    if not session_id:
        # Generate a new session ID if not provided
        import uuid
        session_id = str(uuid.uuid4())

    result = chat_with_story(story_id, session_id, message)

    if result['success']:
        return jsonify({
            'success': True,
            'response': result['response'],
            'sessionId': session_id,
            'userMessage': result['userMessage'],
            'assistantMessage': result['assistantMessage']
        })
    else:
        status_code = 404 if 'not found' in result.get(
            'error', '').lower() else 500
        return jsonify({
            'success': False,
            'error': result.get('error', 'Unknown error')
        }), status_code


@news_bp.route('/api/papers/<int:paper_id>/chat', methods=['POST'])
def chat_about_paper(paper_id: int):
    """
    Send a chat message about a specific research paper.

    Users can ask questions about research papers and receive AI-generated
    responses that explain the paper's methodology, findings, and significance.

    Request Body:
        message (str): The user's question or message
        sessionId (str, optional): Session ID for conversation continuity

    Args:
        paper_id: The database ID of the research paper

    Returns:
        JSON response with:
        - response: Claude's answer
        - sessionId: Session ID for follow-up messages
        - userMessage: The stored user message object
        - assistantMessage: The stored assistant message object
    """
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'error': 'Request body required'}), 400

    message = data.get('message', '').strip()
    if not message:
        return jsonify({'success': False, 'error': 'Message is required'}), 400

    session_id = data.get('sessionId', '')
    if not session_id:
        # Generate a new session ID if not provided
        import uuid
        session_id = str(uuid.uuid4())

    result = chat_with_paper(paper_id, session_id, message)

    if result['success']:
        return jsonify({
            'success': True,
            'response': result['response'],
            'sessionId': session_id,
            'userMessage': result['userMessage'],
            'assistantMessage': result['assistantMessage']
        })
    else:
        status_code = 404 if 'not found' in result.get(
            'error', '').lower() else 500
        return jsonify({
            'success': False,
            'error': result.get('error', 'Unknown error')
        }), status_code


@news_bp.route('/api/chat/<session_id>/history', methods=['GET'])
def get_session_history(session_id: str):
    """
    Get the chat history for a specific session.

    Returns all messages in the conversation ordered by creation time,
    allowing users to resume conversations.

    Args:
        session_id: The UUID session identifier

    Returns:
        JSON response with messages array and count
    """
    messages = get_chat_history(session_id)

    return jsonify({
        'success': True,
        'sessionId': session_id,
        'messages': messages,
        'count': len(messages)
    })


@news_bp.route('/api/chat/<session_id>', methods=['DELETE'])
def delete_session_history(session_id: str):
    """
    Delete all messages in a chat session.

    This clears the conversation history, allowing a fresh start
    on a topic without prior context.

    Args:
        session_id: The UUID session identifier

    Returns:
        JSON response with deletion count
    """
    deleted_count = clear_chat_history(session_id)

    return jsonify({
        'success': True,
        'sessionId': session_id,
        'deletedCount': deleted_count,
        'message': f'Cleared {deleted_count} messages'
    })
