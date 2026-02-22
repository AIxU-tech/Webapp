from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from backend.extensions import db
from backend.models import Note, NoteComment, User, University, NoteAttachment
from backend.routes_v2.community.helpers import (
    create_db_note,
    get_paginated_notes,
    notes_to_dict,
    toggle_like_status,
    toggle_bookmark_status,
    get_comments_for_note,
    create_comment,
    resolve_parent_id,
    update_comment,
    delete_comment,
    toggle_comment_like_status,
    remove_note_attachments,
    delete_gcs_files_parallel,
    get_note_likers,
)
from backend.services.content_moderator import moderate_content
from backend.constants import MAX_ATTACHMENTS_PER_NOTE

community_bp = Blueprint('community', __name__)


# Route for creating a new note
# RESTful: POST to collection creates a new resource
@community_bp.route('/api/notes', methods=['POST'])
@login_required
def create_note():
    """
    Create a new note with optional attachments.

    Request body:
        - title (required): Note title
        - content (optional if attachments exist): Note content
        - tags (optional): Array of tag strings
        - universityOnly (optional): Boolean for visibility
        - attachments (optional): Array of attachment objects with:
            - gcsPath: GCS storage path
            - filename: Original filename
            - contentType: MIME type
            - sizeBytes: File size

    Returns:
        - success: Boolean
        - note: Created note object (with attachments)
    """
    try:
        data = request.get_json()

        # Extract and validate fields
        title = data.get('title', '').strip()
        content = data.get('content', '').strip()
        attachments_data = data.get('attachments', [])

        # Validate attachment count
        if len(attachments_data) > MAX_ATTACHMENTS_PER_NOTE:
            return jsonify({
                'success': False,
                'error': f'Maximum {MAX_ATTACHMENTS_PER_NOTE} attachments per note'
            }), 400

        # Validate required fields - title always required, content required only if no attachments
        if not title:
            return jsonify({'success': False, 'error': 'Title is required'}), 400

        if not content and not attachments_data:
            return jsonify({'success': False, 'error': 'Content or attachments are required'}), 400

        # Content moderation
        if not moderate_content(title):
            return jsonify({'success': False, 'error': 'Title contains inappropriate language'}), 400

        if content and not moderate_content(content):
            return jsonify({'success': False, 'error': 'Content contains inappropriate language'}), 400

        # Create note and attachments atomically
        note = create_db_note(data)

        # Create attachment records
        if attachments_data:
            NoteAttachment.create_for_note(
                note_id=note.id,
                user_id=current_user.id,
                attachments_data=attachments_data,
            )

        db.session.commit()

        # Increment user's post count
        current_user.increment_post_count()

        # Update university post count if user belongs to a university
        if current_user.university:
            university = current_user.get_university()
            if university:
                university.update_post_count()

        # Return note with attachments and interaction flags (same shape as feed)
        note_dict = notes_to_dict([note], current_user, include_attachments=True)[0]

        return jsonify({
            'success': True,
            'note': note_dict
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


# Route for updating a note
# RESTful: PUT to resource updates it
@community_bp.route('/api/notes/<int:note_id>', methods=['PUT'])
@login_required
def update_note(note_id):
    """
    Update a note. Only the author can edit their note.

    Request body:
        - title (required): Note title
        - content (optional if attachments exist): Note content
        - tags (optional): Array of tag strings
        - universityOnly (optional): Boolean for visibility
        - attachments (optional): Array of NEW attachment objects to add
        - attachmentIdsToRemove (optional): Array of attachment IDs to remove

    Returns:
        - success: Boolean
        - note: Updated note object (with attachments)
    """
    try:
        note = Note.query.get(note_id)

        if not note:
            return jsonify({'success': False, 'error': 'Note not found'}), 404

        # Check if current user is the author
        if note.author_id != current_user.id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        data = request.get_json()

        # Extract fields
        title = data.get('title', '').strip()
        content = data.get('content', '').strip()
        new_attachments_data = data.get('attachments', [])
        attachment_ids_to_remove = data.get('attachmentIdsToRemove', [])

        # Count existing attachments
        existing_count = NoteAttachment.count_for_note(note_id)
        remove_count = len(attachment_ids_to_remove) if attachment_ids_to_remove else 0
        new_count = len(new_attachments_data)

        # Total attachments after update (existing - removed + new)
        total_attachments = existing_count - remove_count + new_count

        if total_attachments > MAX_ATTACHMENTS_PER_NOTE:
            return jsonify({
                'success': False,
                'error': f'Maximum {MAX_ATTACHMENTS_PER_NOTE} attachments per note'
            }), 400

        # Validate required fields - title always required, content required only if no attachments
        if not title:
            return jsonify({'success': False, 'error': 'Title is required'}), 400

        if not content and total_attachments == 0:
            return jsonify({'success': False, 'error': 'Content or attachments are required'}), 400

        # Content moderation
        if not moderate_content(title):
            return jsonify({'success': False, 'error': 'Title contains inappropriate language'}), 400

        if content and not moderate_content(content):
            return jsonify({'success': False, 'error': 'Content contains inappropriate language'}), 400

        # Update note fields
        note.title = title
        note.content = content or None

        # Update tags if provided
        if 'tags' in data:
            tags = data.get('tags', [])
            note.set_tags_list(tags)

        # Update university_only if provided
        if 'universityOnly' in data:
            note.university_only = data.get('universityOnly', False)

        # Remove attachments marked for deletion
        if attachment_ids_to_remove:
            remove_note_attachments(note_id, attachment_ids_to_remove)

        # Add new attachments
        if new_attachments_data:
            NoteAttachment.create_for_note(
                note_id=note_id,
                user_id=current_user.id,
                attachments_data=new_attachments_data,
            )

        db.session.commit()

        # Return note with attachments and interaction flags (same shape as feed)
        note_dict = notes_to_dict([note], current_user, include_attachments=True)[0]

        return jsonify({
            'success': True,
            'note': note_dict
        }), 200

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
        if note.author_id != current_user.id and not current_user.is_site_admin():
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        # Clean up GCS files for this note's attachments (parallel deletion)
        attachments = NoteAttachment.get_for_note(note_id)
        gcs_paths = [a.gcs_path for a in attachments]
        delete_gcs_files_parallel(gcs_paths)

        # Delete the note (cascades to attachments table)
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
    Get notes as JSON with optional filtering and pagination.

    Query parameters:
    - search: Search in title, content, or author name
    - user: Filter by specific user ID
    - university_id: Filter by university (returns notes from all members)
    - tag: Filter by tag name (case-insensitive)
    - bookmarked: Filter to only bookmarked notes (requires authentication)
    - page: Page number (1-indexed, optional - enables pagination)
    - page_size: Number of items per page (optional, default 20 when page is provided)

    Response format:
    - If pagination params provided: { notes: [...], pagination: {...} }
    - If no pagination: [...notes] (backward compatible flat array)

    Returns note objects with author info, likes, bookmarks, etc.
    Visibility rules are applied automatically (university_only notes filtered).
    """
    # Bookmarked filter requires authentication
    if request.args.get('bookmarked') and not current_user.is_authenticated:
        return jsonify({'error': 'Authentication required to view bookmarked notes'}), 401

    # Extract query parameters
    query_dict = {
        'page': request.args.get('page', type=int),
        'page_size': request.args.get('page_size', type=int),
        'search': request.args.get('search', '').strip(),
        'user': request.args.get('user', type=int),
        'university_id': request.args.get('university_id', type=int),
        'tag': request.args.get('tag', '').strip(),
        'bookmarked': request.args.get('bookmarked', type=bool),
    }

    # Validate pagination parameters if provided
    if query_dict['page'] is not None:
        if query_dict['page'] < 1:
            return jsonify({'error': 'page must be >= 1'}), 400

        # Set default page_size if page is provided but page_size is not
        if query_dict['page_size'] is None:
            query_dict['page_size'] = 20
        elif query_dict['page_size'] < 1:
            return jsonify({'error': 'page_size must be >= 1'}), 400

    # Get notes (with or without pagination)
    notes, pagination = get_paginated_notes(query_dict, current_user)

    # Return appropriate response format
    if pagination:
        # Paginated response
        return jsonify({
            'notes': notes,
            'pagination': pagination
        })
    else:
        # Non-paginated response (backward compatible)
        return jsonify(notes)

@community_bp.route('/api/notes/<int:note_id>', methods=['GET'])
@login_required
def get_note(note_id):
    try:
        note = Note.query.get(note_id)
        if not note:
            return jsonify({'success': False, 'error': 'Note not found'}), 404
        else:
            notes_dict = notes_to_dict([note], current_user)
            return jsonify({
                'success': True,
                'note': notes_dict[0]
            })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


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


# Route to get users who liked a note
@community_bp.route('/api/notes/<int:note_id>/likes', methods=['GET'])
def get_likes(note_id):
    """
    Get users who liked a note.
    
    Query parameters:
        - limit: Max number of users to return (default 50)
        - offset: Number of users to skip for pagination
    
    Returns:
        - success: Boolean
        - users: Array of user objects with id, name, avatar
        - total: Total number of likes on the note
    """
    try:
        note = Note.query.get(note_id)
        if not note:
            return jsonify({'success': False, 'error': 'Note not found'}), 404

        # Get pagination params
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        # Get users who liked this note
        users = get_note_likers(note_id, limit=limit, offset=offset)

        return jsonify({
            'success': True,
            'users': users,
            'total': note.likes
        })

    except Exception as e:
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

        # Content moderation
        if not moderate_content(text):
            return jsonify({'success': False, 'error': 'Content contains inappropriate language'}), 400

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

        # Content moderation
        if not moderate_content(text):
            return jsonify({'success': False, 'error': 'Content contains inappropriate language'}), 400

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
        if comment.user_id != current_user.id and not current_user.is_site_admin():
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
