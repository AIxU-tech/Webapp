from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
import json
from backend.extensions import db
from backend.models import Note, User, University

community_bp = Blueprint('community', __name__)


#Route for creating a new note
@community_bp.route('/api/notes/create', methods=['POST'])
@login_required
def create_note():
    try:
        data = request.get_json()

        # Validate required fields
        if not data.get('title') or not data.get('content'):
            return jsonify({'success': False, 'error': 'Title and content are required'}), 400

        # Create new note
        note = Note(
            title=data['title'].strip(),
            content=data['content'].strip(),
            author_id=current_user.id
        )

        # Set tags if provided
        tags = data.get('tags', [])
        if tags:
            note.set_tags_list(tags)

        # Save to database
        db.session.add(note)
        db.session.commit()

        # Increment user's post count
        current_user.increment_post_count()

        # Update university post count if user belongs to a university
        if current_user.university:
            university = University.query.filter_by(name=current_user.university).first()
            if university:
                university.update_post_count()

        return jsonify({
            'success': True,
            'note': note.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


#Route for deleting a note
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
            university = University.query.filter_by(name=current_user.university).first()
            if university:
                university.update_post_count()

        return jsonify({'success': True}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


#Route to get notes as JSON (for React frontend)
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

    if filter_user_id:
        # Fetch only notes from this user
        db_notes = Note.query.filter_by(author_id=filter_user_id).order_by(Note.created_at.desc()).all()
    elif search_query:
        # Search in note title, content, and author name
        matching_users = User.query.filter(
            db.or_(
                User.first_name.ilike(f'%{search_query}%'),
                User.last_name.ilike(f'%{search_query}%'),
                User.username.ilike(f'%{search_query}%')
            )
        ).all()
        matching_user_ids = [user.id for user in matching_users]

        # Search for notes by title, content, or author
        db_notes = Note.query.filter(
            db.or_(
                Note.title.ilike(f'%{search_query}%'),
                Note.content.ilike(f'%{search_query}%'),
                Note.author_id.in_(matching_user_ids) if matching_user_ids else False
            )
        ).order_by(Note.created_at.desc()).all()
    else:
        # Fetch all notes from database
        db_notes = Note.query.order_by(Note.created_at.desc()).all()

    # Convert to dictionaries and update isLiked/isBookmarked for current user
    notes = []
    for note in db_notes:
        note_dict = note.to_dict()

        if current_user.is_authenticated:
            # Check if user liked this note
            liked_notes = current_user.liked_notes
            if liked_notes:
                try:
                    liked_list = json.loads(liked_notes)
                    note_dict['isLiked'] = note.id in liked_list
                except:
                    note_dict['isLiked'] = False

            # Check if user bookmarked this note
            bookmarked_notes = current_user.bookmarked_notes
            if bookmarked_notes:
                try:
                    bookmarked_list = json.loads(bookmarked_notes)
                    note_dict['isBookmarked'] = note.id in bookmarked_list
                except:
                    note_dict['isBookmarked'] = False

        notes.append(note_dict)

    return jsonify(notes)


#Route to toggle like on a note
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


#Route to toggle bookmark on a note
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
