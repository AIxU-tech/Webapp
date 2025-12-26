"""
Community Route Helpers

Helper functions for community-related routes (notes, likes, bookmarks).
"""

from flask_login import current_user
from backend.extensions import db
from backend.models import Note, User, University


def create_db_note(data):
    """
    Create a new note in the database.
    
    Args:
        data: Dictionary containing 'title', 'content', and optional 'tags'
        
    Returns:
        The newly created Note object
    """
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

    return note


def get_db_notes(filter_user_id, search_query):
    """
    Fetch notes from the database with optional filtering.
    
    Args:
        filter_user_id: If provided, only return notes by this user
        search_query: If provided, search in title, content, and author name
        
    Returns:
        List of Note objects, ordered by creation date (most recent first)
    """
    if filter_user_id:
        # Fetch only notes from this user
        db_notes = Note.query.filter_by(author_id=filter_user_id).order_by(
            Note.created_at.desc(), Note.id.desc()).all()
    elif search_query:
        # Search in note title, content, and author name
        matching_users = User.query.filter(
            db.or_(
                User.first_name.ilike(f'%{search_query}%'),
                User.last_name.ilike(f'%{search_query}%'),
                User.email.ilike(f'%{search_query}%')
            )
        ).all()
        matching_user_ids = [user.id for user in matching_users]

        # Search for notes by title, content, or author
        db_notes = Note.query.filter(
            db.or_(
                Note.title.ilike(f'%{search_query}%'),
                Note.content.ilike(f'%{search_query}%'),
                Note.author_id.in_(
                    matching_user_ids) if matching_user_ids else False
            )
        ).order_by(Note.created_at.desc(), Note.id.desc()).all()
    else:
        # Fetch all notes from database
        db_notes = Note.query.order_by(
            Note.created_at.desc(), Note.id.desc()).all()

    return db_notes


def notes_to_dict(db_notes, current_user):
    """
    Convert a list of Note objects to dictionaries with user-specific data.
    
    Enriches each note with isLiked and isBookmarked flags based on
    the current user's relationship with each note.
    
    Args:
        db_notes: List of Note objects
        current_user: The current authenticated user (or anonymous)
        
    Returns:
        List of note dictionaries ready for JSON serialization
    """
    notes = []
    for note in db_notes:
        note_dict = note.to_dict()

        if current_user.is_authenticated:
            note_dict['isLiked'] = note.is_liked_by(current_user.id)
            note_dict['isBookmarked'] = note.is_bookmarked_by(current_user.id)

        notes.append(note_dict)

    return notes


def toggle_like_status(current_user, note):
    """
    Toggle the like status for a note.
    
    Updates both the NoteLike relationship and the denormalized likes counter.
    
    Args:
        current_user: The user toggling the like
        note: The Note object to like/unlike
        
    Returns:
        True if the note is now liked, False if now unliked
    """
    is_liked = note.toggle_like(current_user.id)
    db.session.commit()
    return is_liked


def toggle_bookmark_status(current_user, note):
    """
    Toggle the bookmark status for a note.
    
    Args:
        current_user: The user toggling the bookmark
        note: The Note object to bookmark/unbookmark
        
    Returns:
        True if the note is now bookmarked, False if now unbookmarked
    """
    is_bookmarked = note.toggle_bookmark(current_user.id)
    db.session.commit()
    return is_bookmarked