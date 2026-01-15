"""
Opportunities Helpers

Helper functions for opportunity-related operations.
Keeps route handlers clean by extracting reusable logic.
"""

import json
from flask_login import current_user
from sqlalchemy.orm import Query, joinedload
from sqlalchemy import select
from backend.extensions import db
from backend.models import Opportunity, User
from backend.models.opportunity_tag import OpportunityTag
from backend.models.relationships import OpportunityBookmark


# =============================================================================
# Filter Helper Functions
# =============================================================================

def _apply_university_filter(query: Query, university_id: int) -> Query:
    if not university_id:
        return query
    
    from backend.models import UniversityRole
    return query.filter(
        db.exists().where(
            db.and_(
                UniversityRole.user_id == Opportunity.author_id,
                UniversityRole.university_id == university_id
            )
        )
    )


def _apply_search_filter(query: Query, search_query: str) -> Query:
    if not search_query:
        return query
    
    # Find users matching the search query
    matching_user_subquery = select(User.id).filter(
        db.or_(
            User.first_name.ilike(f'%{search_query}%'),
            User.last_name.ilike(f'%{search_query}%'),
            User.email.ilike(f'%{search_query}%')
        )
    )
    
    # Search in opportunity title, description, or author
    return query.filter(
        db.or_(
            Opportunity.title.ilike(f'%{search_query}%'),
            Opportunity.description.ilike(f'%{search_query}%'),
            Opportunity.author_id.in_(matching_user_subquery)
        )
    )


def _apply_my_university_filter(query: Query, user) -> Query:
    if not (hasattr(user, 'is_authenticated') and user.is_authenticated and user.university):
        return query
    
    same_uni_subquery = select(User.id).filter(
        User.university == user.university
    )
    return query.filter(Opportunity.author_id.in_(same_uni_subquery))


def _apply_location_filter(query: Query, location_filter: str) -> Query:
    if not location_filter:
        return query
    
    location_subquery = select(OpportunityTag.opportunity_id).filter(
        OpportunityTag.tag == location_filter
    )
    return query.filter(Opportunity.id.in_(location_subquery))


def _apply_paid_filter(query: Query, paid_filter: str) -> Query:
    if not paid_filter:
        return query
    
    tag_to_match = 'Paid' if paid_filter.lower() == 'true' else 'Unpaid'
    paid_subquery = select(OpportunityTag.opportunity_id).filter(
        OpportunityTag.tag == tag_to_match
    )
    return query.filter(Opportunity.id.in_(paid_subquery))


def _apply_additional_tags_filter(query: Query, tags_filter: str) -> Query:
    if not tags_filter:
        return query
    
    filter_tags = [t.strip() for t in tags_filter.split(',') if t.strip()]
    
    for tag in filter_tags:
        tag_subquery = select(OpportunityTag.opportunity_id).filter(
            OpportunityTag.tag == tag
        )
        query = query.filter(Opportunity.id.in_(tag_subquery))
    
    return query


def _apply_bookmarked_filter(query: Query, user_id: int) -> Query:
    """
    Apply bookmarked filter to query.
    
    Returns opportunities that are bookmarked by the current user.
    
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
                OpportunityBookmark.opportunity_id == Opportunity.id,
                OpportunityBookmark.user_id == user_id
            )
        )
    )


def build_opportunities_query(query_dict: dict, user) -> Query:
    """
    Build a query with all filters applied.
    
    This function consolidates all filtering logic into a single place:
    - University filtering (by university_id)
    - Search filtering (title, description, author name)
    - My university filtering (current user's university)
    - Location filtering (by location tag)
    - Paid filtering (Paid/Unpaid tag)
    - Additional tags filtering (comma-separated tags)
    - Bookmarked filtering (opportunities bookmarked by current user)
    - Ordering (created_at desc, id desc)
    
    Args:
        query_dict: Dictionary with optional keys:
            - search: Search query string
            - my_university: Boolean flag to filter by current user's university
            - location_filter: Location tag to filter by
            - paid_filter: 'true' or 'false' for Paid/Unpaid
            - tags_filter: Comma-separated list of additional tags
            - university_id: University ID to filter by
            - bookmarked: Boolean flag to filter to only bookmarked opportunities
        user: Current user (authenticated or anonymous)
    
    Returns:
        SQLAlchemy Query object (not executed)
    """
    # Base query with author eager loading
    query = Opportunity.query.options(joinedload(Opportunity.author))
    
    # 1. Apply university filter (by university_id)
    if query_dict.get('university_id'):
        query = _apply_university_filter(query, query_dict['university_id'])
    
    # 2. Apply search filter
    if query_dict.get('search'):
        query = _apply_search_filter(query, query_dict['search'])
    
    # 3. Apply my university filter
    if query_dict.get('my_university'):
        query = _apply_my_university_filter(query, user)
    
    # 4. Apply location filter
    if query_dict.get('location_filter'):
        query = _apply_location_filter(query, query_dict['location_filter'])
    
    # 5. Apply paid filter
    if query_dict.get('paid_filter'):
        query = _apply_paid_filter(query, query_dict['paid_filter'])
    
    # 6. Apply additional tags filter
    if query_dict.get('tags_filter'):
        query = _apply_additional_tags_filter(query, query_dict['tags_filter'])
    
    # 7. Apply bookmarked filter
    if query_dict.get('bookmarked'):
        if hasattr(user, 'is_authenticated') and user.is_authenticated:
            query = _apply_bookmarked_filter(query, user.id)
    
    # 8. Always apply ordering (most recent first)
    query = query.order_by(Opportunity.created_at.desc(), Opportunity.id.desc())
    
    return query


# =============================================================================
# Main Helper Functions
# =============================================================================

def create_db_opportunity(data):
    """
    Create a new opportunity in the database.

    Args:
        data: Dictionary containing opportunity data
            - title (required)
            - description (required)
            - compensation (optional)
            - universityOnly (optional)
            - tags (optional)

    Returns:
        Opportunity: The created opportunity instance
    """
    opportunity = Opportunity(
        title=data['title'].strip(),
        description=data['description'].strip(),
        compensation=data.get('compensation', '').strip() or None,
        university_only=data.get('universityOnly', False),
        author_id=current_user.id
    )

    # Set tags if provided
    tags = data.get('tags', [])
    if tags:
        opportunity.set_tags_list(tags)

    db.session.add(opportunity)
    db.session.commit()

    return opportunity


def get_db_opportunities(search_query=None, my_university=False,
                         location_filter=None, paid_filter=None, tags_filter=None,
                         university_id=None):
    """
    Get opportunities from the database with optional filtering.

    Args:
        search_query: Optional search string for title, description, or author
        my_university: If True, filter to current user's university members
        location_filter: Optional location tag (Remote, Hybrid, On-site)
        paid_filter: Optional 'true' or 'false' for Paid/Unpaid
        tags_filter: Optional comma-separated list of additional tags
        university_id: If provided, filter to members of this specific university

    Returns:
        list: List of Opportunity objects matching criteria
    """
    # Build query dictionary from parameters
    query_dict = {
        'search': search_query,
        'my_university': my_university,
        'location_filter': location_filter,
        'paid_filter': paid_filter,
        'tags_filter': tags_filter,
        'university_id': university_id,
    }
    
    # Build and execute query
    query = build_opportunities_query(query_dict, current_user)
    return query.all()


def get_paginated_opportunities(query_dict: dict, user):
    """
    Get opportunities with optional pagination.
    
    This function:
    1. Builds the base query with all filters
    2. Applies pagination if page/page_size are provided
    3. Converts opportunities to dictionaries with user interactions
    4. Returns appropriate response format
    
    Args:
        query_dict: Dictionary with optional keys:
            - page: Page number (1-indexed)
            - page_size: Number of items per page
            - search: Search query string
            - my_university: Boolean flag to filter by current user's university
            - location_filter: Location tag to filter by
            - paid_filter: 'true' or 'false' for Paid/Unpaid
            - tags_filter: Comma-separated list of additional tags
            - university_id: University ID to filter by
        user: Current user (authenticated or anonymous)
    
    Returns:
        Tuple of (opportunities_list, pagination_dict):
        - If pagination params provided: (opportunities_list, pagination_dict)
        - If no pagination: (opportunities_list, None)
    
    Example:
        opportunities, pagination = get_paginated_opportunities({
            'page': 1,
            'page_size': 20,
            'search': 'AI'
        }, current_user)
    """
    # Build base query with all filters
    base_query = build_opportunities_query(query_dict, user)
    
    # Check if pagination requested
    page = query_dict.get('page')
    page_size = query_dict.get('page_size')
    
    if page is not None and page_size is not None:
        # Paginated mode
        # Get total count BEFORE applying limit/offset
        total = base_query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        db_opportunities = base_query.limit(page_size).offset(offset).all()
        
        # Convert to dictionaries
        opportunities = opportunities_to_dict(db_opportunities, user)
        
        # Build pagination metadata
        pagination = {
            'page': page,
            'pageSize': page_size,
            'total': total,
            'totalPages': (total + page_size - 1) // page_size if total > 0 else 0,
            'hasMore': page * page_size < total
        }
        
        return opportunities, pagination
    else:
        # Non-paginated mode (backward compatible)
        db_opportunities = base_query.all()
        opportunities = opportunities_to_dict(db_opportunities, user)
        return opportunities, None


def check_opportunity_visibility(opportunity, user):
    """
    Check if a user can view a university_only opportunity.

    Args:
        opportunity: Opportunity instance
        user: User instance (or anonymous user proxy)

    Returns:
        bool: True if user can view, False otherwise
    """
    if not opportunity.university_only:
        return True

    # Site admins can always see
    if hasattr(user, 'is_authenticated') and user.is_authenticated:
        if user.is_site_admin():
            return True

        # Same university users can see
        if (user.university and
            opportunity.author.university and
                user.university == opportunity.author.university):
            return True

    return False


def opportunities_to_dict(opportunities, user):
    """
    Convert opportunities to dictionaries with user-specific data.

    Args:
        opportunities: List of Opportunity objects
        user: Current user for bookmark status

    Returns:
        list: List of opportunity dictionaries
    """
    result = []

    # Pre-parse bookmarks for O(1) lookups
    bookmarked_set = set()
    if hasattr(user, 'is_authenticated') and user.is_authenticated:
        try:
            bookmarked = OpportunityBookmark.get_bookmarked_opportunities(user.id)
            bookmarked_set = {b.opportunity_id for b in bookmarked}
        except Exception:
            pass

    for opp in opportunities:
        # Skip if user can't view this opportunity
        if not check_opportunity_visibility(opp, user):
            continue

        opp_dict = opp.to_dict()
        opp_dict['isBookmarked'] = opp.id in bookmarked_set

        result.append(opp_dict)

    return result


def toggle_bookmark_status(user, opportunity):
    """
    Toggle bookmark status for an opportunity.

    Args:
        user: User instance
        opportunity: Opportunity instance

    Returns:
        bool: New bookmark status (True if now bookmarked)
    """

    is_bookmarked = opportunity.toggle_bookmark(user.id)
    db.session.commit()

    return is_bookmarked


def migrate_json_tags_to_table():
    """
    One-time migration from JSON tags column to OpportunityTag table.
    Run this once after deploying the new tag system.
    """
    migrated = 0
    for opp in Opportunity.query.all():
        if opp.tags:
            try:
                tags = json.loads(opp.tags)
                for tag in tags:
                    if tag and tag.strip():
                        existing = OpportunityTag.query.filter_by(
                            opportunity_id=opp.id, tag=tag.strip()
                        ).first()
                        if not existing:
                            db.session.add(OpportunityTag(
                                opportunity_id=opp.id, tag=tag.strip()
                            ))
                            migrated += 1
            except (json.JSONDecodeError, TypeError):
                continue
    db.session.commit()
    return migrated
