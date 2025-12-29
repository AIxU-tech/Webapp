"""
Community Route Helpers

Helper functions for community-related routes (notes, comments, likes, bookmarks).
"""

from datetime import datetime
from flask_login import current_user
from backend.extensions import db
from backend.models import Note, NoteComment, User, University, NoteLike, NoteBookmark, NoteCommentLike


def create_db_note(data):
    """
    Create a new note in the database.

    Args:
        data: Dictionary containing 'title', 'content', optional 'tags',
              and optional 'universityOnly'

    Returns:
        The newly created Note object
    """
    note = Note(
        title=data['title'].strip(),
        content=data['content'].strip(),
        author_id=current_user.id,
        university_only=data.get('universityOnly', False)
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


def check_note_visibility(note, user):
    """
    Check if a user can view a university_only note.

    Args:
        note: Note instance
        user: User instance (or anonymous user proxy)

    Returns:
        bool: True if user can view, False otherwise
    """
    if not note.university_only:
        return True

    if hasattr(user, 'is_authenticated') and user.is_authenticated:
        # Site admins can always see
        if user.is_site_admin():
            return True

        # Same university users can see
        if (user.university and
            note.author.university and
            user.university == note.author.university):
            return True

    return False


def notes_to_dict(db_notes, current_user):
    """
    Convert a list of Note objects to dictionaries with user-specific data.

    Enriches each note with isLiked and isBookmarked flags based on
    the current user's relationship with each note.

    Filters out university_only notes that the user cannot view.

    Uses batch queries to avoid N+1 query problem - fetches all like/bookmark
    status in 2 queries total regardless of number of notes.

    Args:
        db_notes: List of Note objects
        current_user: The current authenticated user (or anonymous)

    Returns:
        List of note dictionaries ready for JSON serialization
    """
    # Filter notes by visibility first
    visible_notes = [note for note in db_notes if check_note_visibility(note, current_user)]

    # Pre-fetch all interactions in 2 queries (instead of 2N queries)
    liked_ids = set()
    bookmarked_ids = set()

    if current_user.is_authenticated and visible_notes:
        note_ids = [note.id for note in visible_notes]
        liked_ids, bookmarked_ids = get_user_note_interactions(current_user.id, note_ids)

    # Build response with O(1) lookups
    notes = []
    for note in visible_notes:
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


# =============================================================================
# Comment Helpers
# =============================================================================

def get_comments_for_note(note_id: int, current_user) -> list[dict]:
    """
    Fetch all comments for a note with user-specific like status.
    
    Returns comments ordered oldest-first (ASC) for natural conversation flow.
    Uses batch query to avoid N+1 problem for isLiked status.
    
    Args:
        note_id: The ID of the note to get comments for
        current_user: The current authenticated user (or anonymous)
        
    Returns:
        List of comment dictionaries ready for JSON serialization.
        Each comment includes a parentId field (null for top-level, 
        or the id of the parent comment for replies).
    """
    comments = NoteComment.query.filter_by(note_id=note_id).order_by(
        NoteComment.created_at.asc()
    ).all()
    
    # Pre-fetch all like statuses in one query
    liked_comment_ids = set()
    if current_user.is_authenticated and comments:
        comment_ids = [c.id for c in comments]
        liked_comment_ids = {
            row.comment_id for row in
            NoteCommentLike.query.filter(
                NoteCommentLike.user_id == current_user.id,
                NoteCommentLike.comment_id.in_(comment_ids)
            ).with_entities(NoteCommentLike.comment_id).all()
        }
    
    # Build response with O(1) lookups
    result = []
    for comment in comments:
        comment_dict = comment.to_dict()
        if current_user.is_authenticated:
            comment_dict['isLiked'] = comment.id in liked_comment_ids
        result.append(comment_dict)
    
    return result


def resolve_parent_id(reply_to_id: int | None) -> int | None:
    """
    Resolve the correct parent_id for a new comment based on the comment being replied to.
    
    Threading model (max depth of 1):
    - If replying to a top-level comment (parent_id=NULL), use that comment's id as parent_id
    - If replying to a reply (parent_id!=NULL), use that comment's parent_id (keeps depth at 1)
    - If not replying to anything, return None (top-level comment)
    
    Args:
        reply_to_id: The ID of the comment being replied to, or None for top-level
        
    Returns:
        The parent_id to use for the new comment, or None if top-level
        
    Raises:
        ValueError: If reply_to_id doesn't exist
    """
    if reply_to_id is None:
        return None
    
    replied_to_comment = NoteComment.query.get(reply_to_id)
    if not replied_to_comment:
        raise ValueError(f'Comment {reply_to_id} not found')
    
    # If the replied-to comment is top-level, use its id as parent
    # If it's already a reply, use its parent_id (keeps depth at 1)
    if replied_to_comment.parent_id is None:
        return replied_to_comment.id
    else:
        return replied_to_comment.parent_id


def create_comment(note: Note, user_id: int, text: str, parent_id: int | None = None) -> NoteComment:
    """
    Create a new comment on a note.
    
    Also increments the note's denormalized comment counter.
    Caller must handle db.session.commit().
    
    Args:
        note: The Note object to comment on
        user_id: The ID of the user creating the comment
        text: The comment text
        parent_id: The ID of the parent comment for replies, or None for top-level
        
    Returns:
        The newly created NoteComment object
    """
    comment = NoteComment(
        note_id=note.id,
        user_id=user_id,
        text=text.strip(),
        parent_id=parent_id
    )
    db.session.add(comment)
    
    # Increment denormalized counter
    note.comments += 1
    
    return comment


def update_comment(comment: NoteComment, text: str) -> NoteComment:
    """
    Update a comment's text.
    
    Sets the updated_at timestamp to indicate the comment was edited.
    Caller must handle db.session.commit().
    
    Args:
        comment: The NoteComment object to update
        text: The new comment text
        
    Returns:
        The updated NoteComment object
    """
    comment.text = text.strip()
    comment.updated_at = datetime.utcnow()
    return comment


def delete_comment(comment: NoteComment, note: Note) -> None:
    """
    Delete a comment and its replies (via cascade).
    
    Also decrements the note's denormalized comment counter by the total
    number of comments being deleted (the comment itself plus any replies).
    Caller must handle db.session.commit().
    
    Args:
        comment: The NoteComment object to delete
        note: The Note the comment belongs to
    """
    # Count replies that will be cascade-deleted (only for top-level comments)
    reply_count = len(comment.replies) if comment.parent_id is None else 0
    total_deleted = 1 + reply_count
    
    db.session.delete(comment)
    note.comments = max(0, note.comments - total_deleted)


def toggle_comment_like_status(current_user, comment: NoteComment) -> bool:
    """
    Toggle the like status for a comment.
    
    Updates both the NoteCommentLike relationship and the denormalized likes counter.
    
    Args:
        current_user: The user toggling the like
        comment: The NoteComment object to like/unlike
        
    Returns:
        True if the comment is now liked, False if now unliked
    """
    is_liked = comment.toggle_like(current_user.id)
    db.session.commit()
    return is_liked