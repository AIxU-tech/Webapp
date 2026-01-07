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
    """
    Apply university filter to query.
    
    Returns opportunities from all members of the specified university.
    Uses EXISTS subquery for better performance - stops after finding first match.
    
    Args:
        query: SQLAlchemy query object
        university_id: University ID to filter by
    
    Returns:
        Query with university filter applied
    """
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
    """
    Apply search filter to query.
    
    Searches in:
    - Opportunity title
    - Opportunity description
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
    """
    Apply current user's university filter to query.
    
    Returns opportunities from members of the current user's university.
    
    Args:
        query: SQLAlchemy query object
        user: Current user (authenticated or anonymous)
    
    Returns:
        Query with my university filter applied
    """
    if not (hasattr(user, 'is_authenticated') and user.is_authenticated and user.university):
        return query
    
    same_uni_subquery = select(User.id).filter(
        User.university == user.university
    )
    return query.filter(Opportunity.author_id.in_(same_uni_subquery))


def _apply_location_filter(query: Query, location_filter: str) -> Query:
    """
    Apply location tag filter to query.
    
    Filters opportunities that have the specified location tag.
    
    Args:
        query: SQLAlchemy query object
        location_filter: Location tag to filter by (e.g., 'Remote', 'Hybrid', 'On-site')
    
    Returns:
        Query with location filter applied
    """
    if not location_filter:
        return query
    
    location_subquery = select(OpportunityTag.opportunity_id).filter(
        OpportunityTag.tag == location_filter
    )
    return query.filter(Opportunity.id.in_(location_subquery))


def _apply_paid_filter(query: Query, paid_filter: str) -> Query:
    """
    Apply paid/unpaid filter to query.
    
    Filters opportunities that have either 'Paid' or 'Unpaid' tag.
    
    Args:
        query: SQLAlchemy query object
        paid_filter: 'true' for Paid, 'false' for Unpaid
    
    Returns:
        Query with paid filter applied
    """
    if not paid_filter:
        return query
    
    tag_to_match = 'Paid' if paid_filter.lower() == 'true' else 'Unpaid'
    paid_subquery = select(OpportunityTag.opportunity_id).filter(
        OpportunityTag.tag == tag_to_match
    )
    return query.filter(Opportunity.id.in_(paid_subquery))


def _apply_additional_tags_filter(query: Query, tags_filter: str) -> Query:
    """
    Apply additional tags filter to query.
    
    Filters opportunities that have all specified tags (comma-separated).
    Each tag is applied as a separate filter (AND logic).
    
    Args:
        query: SQLAlchemy query object
        tags_filter: Comma-separated list of tags to filter by
    
    Returns:
        Query with additional tags filters applied
    """
    if not tags_filter:
        return query
    
    filter_tags = [t.strip() for t in tags_filter.split(',') if t.strip()]
    
    for tag in filter_tags:
        tag_subquery = select(OpportunityTag.opportunity_id).filter(
            OpportunityTag.tag == tag
        )
        query = query.filter(Opportunity.id.in_(tag_subquery))
    
    return query


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
    - Ordering (created_at desc, id desc)
    
    Args:
        query_dict: Dictionary with optional keys:
            - search: Search query string
            - my_university: Boolean flag to filter by current user's university
            - location_filter: Location tag to filter by
            - paid_filter: 'true' or 'false' for Paid/Unpaid
            - tags_filter: Comma-separated list of additional tags
            - university_id: University ID to filter by
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
    
    # 7. Always apply ordering (most recent first)
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
