"""
Community Route Helpers

Helper functions for community-related routes (notes, likes, bookmarks).
"""

from flask_login import current_user
from backend.extensions import db
from backend.models import Note, User, University, NoteLike, NoteBookmark


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


def get_user_note_interactions(user_id: int, note_ids: list[int]) -> tuple[set[int], set[int]]:
    """
    Fetch all likes and bookmarks for a user across multiple notes in 2 queries.
    
    Args:
        user_id: The user's ID
        note_ids: List of note IDs to check
        
    Returns:
        Tuple of (liked_note_ids, bookmarked_note_ids) as sets
    """
    if not note_ids:
        return set(), set()
    
    # Single query to get all liked note IDs for this user from the given notes
    liked_note_ids = {
        row.note_id for row in 
        NoteLike.query.filter(
            NoteLike.user_id == user_id,
            NoteLike.note_id.in_(note_ids)
        ).with_entities(NoteLike.note_id).all()
    }
    
    # Single query to get all bookmarked note IDs for this user from the given notes
    bookmarked_note_ids = {
        row.note_id for row in 
        NoteBookmark.query.filter(
            NoteBookmark.user_id == user_id,
            NoteBookmark.note_id.in_(note_ids)
        ).with_entities(NoteBookmark.note_id).all()
    }
    
    return liked_note_ids, bookmarked_note_ids


def notes_to_dict(db_notes, current_user):
    """
    Convert a list of Note objects to dictionaries with user-specific data.
    
    Enriches each note with isLiked and isBookmarked flags based on
    the current user's relationship with each note.
    
    Uses batch queries to avoid N+1 query problem - fetches all like/bookmark
    status in 2 queries total regardless of number of notes.
    
    Args:
        db_notes: List of Note objects
        current_user: The current authenticated user (or anonymous)
        
    Returns:
        List of note dictionaries ready for JSON serialization
    """
    # Pre-fetch all interactions in 2 queries (instead of 2N queries)
    liked_ids = set()
    bookmarked_ids = set()
    
    if current_user.is_authenticated and db_notes:
        note_ids = [note.id for note in db_notes]
        liked_ids, bookmarked_ids = get_user_note_interactions(current_user.id, note_ids)
    
    # Build response with O(1) lookups
    notes = []
    for note in db_notes:
        note_dict = note.to_dict()

        if current_user.is_authenticated:
            note_dict['isLiked'] = note.id in liked_ids
            note_dict['isBookmarked'] = note.id in bookmarked_ids

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