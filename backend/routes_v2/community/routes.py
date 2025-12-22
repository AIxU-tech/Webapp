from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
import json
from backend.extensions import db
from backend.models import Note, User, University
from backend.routes_v2.community.helpers import create_db_note, get_db_notes, notes_to_dict

community_bp = Blueprint('community', __name__)


# Route for creating a new note
@community_bp.route('/api/notes/create', methods=['POST'])
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
@community_bp.route('/api/notes/<int:note_id>/delete', methods=['DELETE'])
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
    Updates user's liked_notes list and note's like count.
    """
    try:
        note = Note.query.get(note_id)
        if not note:
            return jsonify({'success': False, 'error': 'Note not found'}), 404

        # Get user's liked notes list
        liked_notes = current_user.liked_notes
        if liked_notes:
            try:
                liked_list = json.loads(liked_notes)
            except:
                liked_list = []
        else:
            liked_list = []

        # Toggle like
        if note_id in liked_list:
            # Unlike
            liked_list.remove(note_id)
            note.likes = max(0, note.likes - 1)
            is_liked = False
        else:
            # Like
            liked_list.append(note_id)
            note.likes += 1
            is_liked = True

        # Save updated list
        current_user.liked_notes = json.dumps(liked_list)
        db.session.commit()

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
    Updates user's bookmarked_notes list.
    """
    try:
        note = Note.query.get(note_id)
        if not note:
            return jsonify({'success': False, 'error': 'Note not found'}), 404

        # Get user's bookmarked notes list
        bookmarked_notes = current_user.bookmarked_notes
        if bookmarked_notes:
            try:
                bookmarked_list = json.loads(bookmarked_notes)
            except:
                bookmarked_list = []
        else:
            bookmarked_list = []

        # Toggle bookmark
        if note_id in bookmarked_list:
            # Remove bookmark
            bookmarked_list.remove(note_id)
            is_bookmarked = False
        else:
            # Add bookmark
            bookmarked_list.append(note_id)
            is_bookmarked = True

        # Save updated list
        current_user.bookmarked_notes = json.dumps(bookmarked_list)
        db.session.commit()

        return jsonify({
            'success': True,
            'isBookmarked': is_bookmarked
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
