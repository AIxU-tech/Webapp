"""
Opportunities Helpers

Helper functions for opportunity-related operations.
Keeps route handlers clean by extracting reusable logic.
"""

import json
from flask_login import current_user
from sqlalchemy.orm import joinedload
from backend.extensions import db
from backend.models import Opportunity, User
from backend.models.opportunity_tag import OpportunityTag
from backend.models.relationships import OpportunityBookmark


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
    query = Opportunity.query.options(joinedload(Opportunity.author))

    # Filter by specific university (by membership in UniversityRole)
    if university_id:
        from backend.models import UniversityRole
        member_ids = [r.user_id for r in
                      UniversityRole.query.filter_by(university_id=university_id).all()]
        if not member_ids:
            return []
        query = query.filter(Opportunity.author_id.in_(member_ids))

    if search_query:
        matching_user_subquery = db.session.query(User.id).filter(
            db.or_(
                User.first_name.ilike(f'%{search_query}%'),
                User.last_name.ilike(f'%{search_query}%'),
                User.email.ilike(f'%{search_query}%')
            )
        ).subquery()

        query = query.filter(
            db.or_(
                Opportunity.title.ilike(f'%{search_query}%'),
                Opportunity.description.ilike(f'%{search_query}%'),
                Opportunity.author_id.in_(matching_user_subquery)
            )
        )

    if my_university and current_user.is_authenticated and current_user.university:
        same_uni_subquery = db.session.query(User.id).filter(
            User.university == current_user.university
        ).subquery()
        query = query.filter(Opportunity.author_id.in_(same_uni_subquery))

    # Tag filtering at database level using subqueries
    if location_filter:
        location_subquery = db.session.query(OpportunityTag.opportunity_id).filter(
            OpportunityTag.tag == location_filter
        ).subquery()
        query = query.filter(Opportunity.id.in_(location_subquery))

    if paid_filter:
        tag_to_match = 'Paid' if paid_filter.lower() == 'true' else 'Unpaid'
        paid_subquery = db.session.query(OpportunityTag.opportunity_id).filter(
            OpportunityTag.tag == tag_to_match
        ).subquery()
        query = query.filter(Opportunity.id.in_(paid_subquery))

    if tags_filter:
        filter_tags = [t.strip() for t in tags_filter.split(',') if t.strip()]
        for tag in filter_tags:
            tag_subquery = db.session.query(OpportunityTag.opportunity_id).filter(
                OpportunityTag.tag == tag
            ).subquery()
            query = query.filter(Opportunity.id.in_(tag_subquery))

    return query.order_by(
        Opportunity.created_at.desc(),
        Opportunity.id.desc()
    ).all()


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
