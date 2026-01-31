"""
Community Route Helpers

Helper functions for community-related routes (notes, comments, likes, bookmarks).
"""

from datetime import datetime
from flask_login import current_user
from sqlalchemy.orm import Query
from backend.extensions import db
from backend.models import Note, NoteComment, User, University, NoteLike, NoteBookmark, NoteCommentLike
from sqlalchemy import func


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


def get_db_notes(filter_user_id=None, search_query=None, university_id=None):
    """
    Fetch notes from the database with optional filtering.

    Args:
        filter_user_id: If provided, only return notes by this user
        search_query: If provided, search in title, content, and author name
        university_id: If provided, only return notes by members of this university

    Returns:
        List of Note objects, ordered by creation date (most recent first)
    """
    if university_id:
        # Get member IDs for this university
        from backend.models import UniversityRole
        member_ids = [r.user_id for r in
                      UniversityRole.query.filter_by(university_id=university_id).all()]
        if not member_ids:
            return []
        db_notes = Note.query.filter(Note.author_id.in_(member_ids)).order_by(
            Note.created_at.desc(), Note.id.desc()).all()
    elif filter_user_id:
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

def _apply_visibility_filter(query: Query, user) -> Query:
    """
    Apply visibility rules based on user authentication status.
    
    Visibility rules:
    - Public notes (university_only=False): visible to everyone
    - University-only notes (university_only=True): 
      * Visible to site admins
      * Visible to authenticated users from the same university
      * Not visible to anonymous users
    
    Args:
        query: SQLAlchemy query object
        user: Current user (authenticated or anonymous)
    
    Returns:
        Query with visibility filters applied
    """
    if hasattr(user, 'is_authenticated') and user.is_authenticated:
        if user.is_site_admin():
            # Site admins see everything - no filter needed
            return query
        else:
            # Authenticated users: public OR same university
            return query.filter(
                db.or_(
                    Note.university_only == False,
                    db.and_(
                        Note.university_only == True,
                        Note.author.has(User.university == user.university)
                    )
                )
            )
    else:
        # Anonymous users: only public notes
        return query.filter(Note.university_only == False)


def _apply_bookmarked_filter(query: Query, user_id: int) -> Query:
    """
    Apply bookmarked filter to query.
    
    Returns notes that are bookmarked by the current user.
    
    Uses EXISTS subquery for better performance - stops after finding first match
    and avoids potential duplicate rows from JOIN.
    
    Args:
        query: SQLAlchemy query object
        user_id: User ID to filter by
    
    Returns:
        Query with bookmarked filter applied
    """
    if not user_id:
        return query
    
    # Use EXISTS subquery instead of JOIN for better performance
    # EXISTS stops after finding one match and avoids row multiplication
    return query.filter(
        db.exists().where(
            db.and_(
                NoteBookmark.note_id == Note.id,
                NoteBookmark.user_id == user_id
            )
        )
    )


def _apply_search_filter(query: Query, search_query: str) -> Query:
    """
    Apply search filter to query.
    
    Searches in:
    - Note title
    - Note content
    - Author name (first_name, last_name, email)
    
    Args:
        query: SQLAlchemy query object
        search_query: Search string
    
    Returns:
        Query with search filters applied
    """
    if not search_query:
        return query
    
    # Find users matching the search query
    matching_users = User.query.filter(
        db.or_(
            User.first_name.ilike(f'%{search_query}%'),
            User.last_name.ilike(f'%{search_query}%'),
            User.email.ilike(f'%{search_query}%')
        )
    ).with_entities(User.id).all()
    matching_user_ids = [user.id for user in matching_users]
    
    # Search in note title, content, or author
    conditions = [
        Note.title.ilike(f'%{search_query}%'),
        Note.content.ilike(f'%{search_query}%')
    ]
    
    if matching_user_ids:
        conditions.append(Note.author_id.in_(matching_user_ids))
    
    return query.filter(db.or_(*conditions))


def _apply_university_filter(query: Query, university_id: int) -> Query:
    """
    Apply university filter to query.
    
    Returns notes from all members of the specified university.
    
    Uses EXISTS subquery for better performance - executes as a single query
    and short-circuits after finding the first match.
    
    Args:
        query: SQLAlchemy query object
        university_id: University ID to filter by
    
    Returns:
        Query with university filter applied
    """
    from backend.models import UniversityRole
    
    return query.filter(
        db.exists().where(
            db.and_(
                UniversityRole.user_id == Note.author_id,
                UniversityRole.university_id == university_id
            )
        )
    )


def _apply_tag_filter(query: Query, tag: str) -> Query:
    """
    Apply tag filter to query (case-insensitive).
    
    Filters notes that contain the specified tag in their tags array.
    Since tags are stored as a JSON string (e.g., '["NLP", "Deep Learning"]'),
    we use a simple case-insensitive string search for the tag.
    
    Args:
        query: SQLAlchemy query object
        tag: Tag name to filter by (case-insensitive)
    
    Returns:
        Query with tag filter applied
    """
    if not tag:
        return query
    
    # Tags are stored as JSON string like '["NLP", "Deep Learning"]'
    # Search for the tag as a JSON string element (with quotes) for whole-tag matching
    # Use ilike for case-insensitive matching
    tag_pattern = f'"{tag}"'
    
    # Only apply filter if tags column is not NULL and not empty
    return query.filter(
        Note.tags.isnot(None),
        Note.tags != '',
        Note.tags != '[]',
        func.lower(Note.tags).contains(func.lower(tag_pattern))
    )


def build_notes_query(query_dict: dict, user) -> Query:
    """
    Build a query with all filters and visibility rules applied.
    
    This function consolidates all filtering logic into a single place:
    - Visibility filtering (based on user authentication and university_only flag)
    - Search filtering (title, content, author name)
    - User filtering (notes by specific user)
    - University filtering (notes from university members)
    - Tag filtering (notes containing specific tag)
    - Ordering (created_at desc, id desc)
    
    Note: Pagination is NOT applied here. Use get_paginated_notes() which
    calls this function and then applies pagination.
    
    Args:
        query_dict: Dictionary with optional keys:
            - search: Search query string
            - user: User ID to filter by
            - university_id: University ID to filter by
            - tag: Tag name to filter by
        user: Current user (authenticated or anonymous)
    
    Returns:
        SQLAlchemy Query object (not executed)
    """
    query = Note.query
    
    # 1. Apply visibility filter FIRST (before other filters)
    query = _apply_visibility_filter(query, user)
    
    # 2. Apply search filter
    if query_dict.get('search'):
        query = _apply_search_filter(query, query_dict['search'])
    
    # 3. Apply user filter
    if query_dict.get('user'):
        query = query.filter(Note.author_id == query_dict['user'])
    
    # 4. Apply university filter
    if query_dict.get('university_id'):
        query = _apply_university_filter(query, query_dict['university_id'])
    
    # 5. Apply tag filter
    if query_dict.get('tag'):
        query = _apply_tag_filter(query, query_dict['tag'])
    
    # 6. Apply bookmarked filter
    if query_dict.get('bookmarked'):
        query = _apply_bookmarked_filter(query, user.id)
        
    # 7. Always apply ordering (most recent first)
    query = query.order_by(Note.created_at.desc(), Note.id.desc())
    
    return query


def get_paginated_notes(query_dict: dict, user):
    """
    Get notes with optional pagination.
    
    This function:
    1. Builds the base query with all filters and visibility rules
    2. Applies pagination if page/page_size are provided
    3. Converts notes to dictionaries with user interactions
    4. Returns appropriate response format
    
    Args:
        query_dict: Dictionary with optional keys:
            - page: Page number (1-indexed)
            - page_size: Number of items per page
            - search: Search query string
            - user: User ID to filter by
            - university_id: University ID to filter by
        user: Current user (authenticated or anonymous)
    
    Returns:
        Tuple of (notes_list, pagination_dict):
        - If pagination params provided: (notes_list, pagination_dict)
        - If no pagination: (notes_list, None)
    
    Example:
        notes, pagination = get_paginated_notes({
            'page': 1,
            'page_size': 20,
            'search': 'AI'
        }, current_user)
    """
    # Build base query with all filters
    base_query = build_notes_query(query_dict, user)
    
    # Check if pagination requested
    page = query_dict.get('page')
    page_size = query_dict.get('page_size')
    
    if page is not None and page_size is not None:
        # Paginated mode
        # Get total count BEFORE applying limit/offset
        total = base_query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        db_notes = base_query.limit(page_size).offset(offset).all()
        
        # Convert to dictionaries
        notes = notes_to_dict(db_notes, user)
        
        # Build pagination metadata
        pagination = {
            'page': page,
            'pageSize': page_size,
            'total': total,
            'totalPages': (total + page_size - 1) // page_size if total > 0 else 0,
            'hasMore': page * page_size < total
        }
        
        return notes, pagination
    else:
        # Non-paginated mode (backward compatible)
        db_notes = base_query.all()
        notes = notes_to_dict(db_notes, user)
        return notes, None

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


def notes_to_dict(db_notes, current_user, include_attachments=True):
    """
    Convert a list of Note objects to dictionaries with user-specific data.

    Enriches each note with isLiked and isBookmarked flags based on
    the current user's relationship with each note.

    Note: Visibility filtering is now handled at the query level in
    build_notes_query(). This function only handles serialization and
    interaction flags.

    Uses batch queries to avoid N+1 query problem - fetches all like/bookmark
    status in 2 queries total regardless of number of notes.

    Args:
        db_notes: List of Note objects (already filtered for visibility)
        current_user: The current authenticated user (or anonymous)
        include_attachments: Whether to include attachment data (default True)

    Returns:
        List of note dictionaries ready for JSON serialization
    """
    if not db_notes:
        return []

    # Pre-fetch all interactions in 2 queries (instead of 2N queries)
    liked_ids = set()
    bookmarked_ids = set()

    if current_user.is_authenticated:
        note_ids = [note.id for note in db_notes]
        liked_ids, bookmarked_ids = get_user_note_interactions(current_user.id, note_ids)

    # Pre-fetch attachments for all notes in one query if needed
    attachments_by_note = {}
    if include_attachments:
        attachments_by_note = get_attachments_for_notes([n.id for n in db_notes])

    # Build response with O(1) lookups
    notes = []
    for note in db_notes:
        note_dict = note.to_dict()

        if current_user.is_authenticated:
            note_dict['isLiked'] = note.id in liked_ids
            note_dict['isBookmarked'] = note.id in bookmarked_ids

        # Add attachments
        if include_attachments:
            note_dict['attachments'] = attachments_by_note.get(note.id, [])

        notes.append(note_dict)

    return notes


def get_attachments_for_notes(note_ids: list[int]) -> dict[int, list[dict]]:
    """
    Fetch all attachments for multiple notes in a single query.
    
    Args:
        note_ids: List of note IDs
        
    Returns:
        Dictionary mapping note_id to list of attachment dicts with download URLs
    """
    if not note_ids:
        return {}
    
    from backend.models import NoteAttachment
    from backend.services.storage import is_gcs_configured, generate_download_url
    
    attachments = NoteAttachment.query.filter(
        NoteAttachment.note_id.in_(note_ids)
    ).order_by(NoteAttachment.created_at).all()
    
    # Group by note_id
    result = {note_id: [] for note_id in note_ids}
    gcs_configured = is_gcs_configured()
    
    for attachment in attachments:
        if gcs_configured:
            try:
                download_url = generate_download_url(attachment.gcs_path)
                result[attachment.note_id].append(
                    attachment.to_dict(include_download_url=True, download_url=download_url)
                )
            except Exception:
                # If URL generation fails, include attachment without URL
                result[attachment.note_id].append(attachment.to_dict())
        else:
            result[attachment.note_id].append(attachment.to_dict())
    
    return result


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