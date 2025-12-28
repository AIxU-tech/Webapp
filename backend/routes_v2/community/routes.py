from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from backend.extensions import db
from backend.models import Note, NoteComment, User, University
from backend.routes_v2.community.helpers import (
    create_db_note,
    get_db_notes,
    notes_to_dict,
    toggle_like_status,
    toggle_bookmark_status,
    get_comments_for_note,
    create_comment,
    resolve_parent_id,
    update_comment,
    delete_comment,
    toggle_comment_like_status,
)

community_bp = Blueprint('community', __name__)


# Route for creating a new note
# RESTful: POST to collection creates a new resource
@community_bp.route('/api/notes', methods=['POST'])
@login_required
def create_note():
    try:
        data = request.get_json()

        # Validate required fields
        if not data.get('title') or not data.get('content'):
            return jsonify({'success': False, 'error': 'Title and content are required'}), 400

        # Create new note
        note = create_db_note(data)

        # Increment user's post count
        current_user.increment_post_count()

        # Update university post count if user belongs to a university
        if current_user.university:
            university = current_user.get_university()
            if university:
                university.update_post_count()

        return jsonify({
            'success': True,
            'note': note.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


# Route for deleting a note
# RESTful: DELETE to resource deletes it
@community_bp.route('/api/notes/<int:note_id>', methods=['DELETE'])
@login_required
def delete_note(note_id):
    try:
        note = Note.query.get(note_id)

        if not note:
            return jsonify({'success': False, 'error': 'Note not found'}), 404

        # Check if current user is the author
        if note.author_id != current_user.id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        # Delete the note
        db.session.delete(note)
        db.session.commit()

        # Decrement user's post count
        if current_user.post_count > 0:
            current_user.post_count -= 1
            db.session.commit()

        # Update university post count if user belongs to a university
        if current_user.university:
            university = current_user.get_university()
            if university:
                university.update_post_count()

        return jsonify({'success': True}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


# Route to get notes as JSON (for React frontend)
@community_bp.route('/api/notes')
def api_notes():
    """
    Get all notes as JSON with optional filtering.

    Query parameters:
    - search: Search in title, content, or author name
    - user: Filter by specific user ID

    Returns array of note objects with author info, likes, bookmarks, etc.
    """
    # Check if filtering by user
    filter_user_id = request.args.get('user', type=int)

    # Check if searching
    search_query = request.args.get('search', '').strip()

    db_notes = get_db_notes(filter_user_id, search_query)

    # Convert to dictionaries and update isLiked/isBookmarked for current user
    notes = notes_to_dict(db_notes, current_user)

    return jsonify(notes)


# Route to toggle like on a note
@community_bp.route('/api/notes/<int:note_id>/like', methods=['POST'])
@login_required
def toggle_like(note_id):
    """
    Toggle like status for a note.
    Uses NoteLike relationship table and updates note's like count.
    """
    try:
        note = Note.query.get(note_id)
        if not note:
            return jsonify({'success': False, 'error': 'Note not found'}), 404


        # Will like or unlike the note, and perform necessary database updates
        is_liked = toggle_like_status(current_user, note)

        return jsonify({
            'success': True,
            'likes': note.likes,
            'isLiked': is_liked
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


# Route to toggle bookmark on a note
@community_bp.route('/api/notes/<int:note_id>/bookmark', methods=['POST'])
@login_required
def toggle_bookmark(note_id):
    """
    Toggle bookmark status for a note.
    Uses NoteBookmark relationship table.
    """
    try:
        note = Note.query.get(note_id)
        if not note:
            return jsonify({'success': False, 'error': 'Note not found'}), 404

        is_bookmarked = toggle_bookmark_status(current_user, note)

        return jsonify({
            'success': True,
            'isBookmarked': is_bookmarked
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


# =============================================================================
# Comment Routes
# =============================================================================

@community_bp.route('/api/notes/<int:note_id>/comments', methods=['GET'])
def get_comments(note_id):
    """
    Get all comments for a note.
    
    Returns array of comment objects with author info, likes, etc.
    """
    note = Note.query.get(note_id)
    if not note:
        return jsonify({'success': False, 'error': 'Note not found'}), 404
    
    comments = get_comments_for_note(note_id, current_user)
    return jsonify(comments)


@community_bp.route('/api/notes/<int:note_id>/comments', methods=['POST'])
@login_required
def add_comment(note_id):
    """
    Create a new comment on a note.
    
    Request body:
        - text (required): The comment text
        - replyToId (optional): ID of comment being replied to
        
    Threading behavior:
        - If replyToId is omitted, creates a top-level comment
        - If replying to a top-level comment, uses that comment's id as parent_id
        - If replying to a reply, uses that reply's parent_id (keeps depth at 1)
    """
    try:
        note = Note.query.get(note_id)
        if not note:
            return jsonify({'success': False, 'error': 'Note not found'}), 404
        
        data = request.get_json()
        text = data.get('text', '').strip()
        reply_to_id = data.get('replyToId')
        
        if not text:
            return jsonify({'success': False, 'error': 'Comment text is required'}), 400
        
        # Resolve the parent_id based on threading rules
        try:
            parent_id = resolve_parent_id(reply_to_id)
        except ValueError as e:
            return jsonify({'success': False, 'error': str(e)}), 400
        
        # Validate that the replied-to comment belongs to this note
        if reply_to_id is not None:
            replied_to = NoteComment.query.get(reply_to_id)
            if replied_to and replied_to.note_id != note_id:
                return jsonify({'success': False, 'error': 'Cannot reply to comment from different note'}), 400
        
        comment = create_comment(note, current_user.id, text, parent_id)
        db.session.commit()
        
        # Get the comment dict with isLiked set correctly
        comment_dict = comment.to_dict()
        comment_dict['isLiked'] = False  # New comment, not liked yet
        
        return jsonify({
            'success': True,
            'comment': comment_dict,
            'commentCount': note.comments
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@community_bp.route('/api/notes/<int:note_id>/comments/<int:comment_id>', methods=['PUT'])
@login_required
def edit_comment(note_id, comment_id):
    """
    Update a comment. Only the author can edit their comment.
    """
    try:
        comment = NoteComment.query.filter_by(id=comment_id, note_id=note_id).first()
        if not comment:
            return jsonify({'success': False, 'error': 'Comment not found'}), 404
        
        # Check authorization
        if comment.user_id != current_user.id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({'success': False, 'error': 'Comment text is required'}), 400
        
        update_comment(comment, text)
        db.session.commit()
        
        comment_dict = comment.to_dict()
        comment_dict['isLiked'] = comment.is_liked_by(current_user.id)
        
        return jsonify({
            'success': True,
            'comment': comment_dict
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@community_bp.route('/api/notes/<int:note_id>/comments/<int:comment_id>', methods=['DELETE'])
@login_required
def remove_comment(note_id, comment_id):
    """
    Delete a comment. Only the author can delete their comment.
    """
    try:
        comment = NoteComment.query.filter_by(id=comment_id, note_id=note_id).first()
        if not comment:
            return jsonify({'success': False, 'error': 'Comment not found'}), 404
        
        # Check authorization
        if comment.user_id != current_user.id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
        note = Note.query.get(note_id)
        delete_comment(comment, note)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'commentCount': note.comments
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@community_bp.route('/api/notes/<int:note_id>/comments/<int:comment_id>/like', methods=['POST'])
@login_required
def toggle_comment_like(note_id, comment_id):
    """
    Toggle like status for a comment.
    Uses NoteCommentLike relationship table and updates comment's like count.
    """
    try:
        comment = NoteComment.query.filter_by(id=comment_id, note_id=note_id).first()
        if not comment:
            return jsonify({'success': False, 'error': 'Comment not found'}), 404
        
        is_liked = toggle_comment_like_status(current_user, comment)
        
        return jsonify({
            'success': True,
            'likes': comment.likes,
            'isLiked': is_liked
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
