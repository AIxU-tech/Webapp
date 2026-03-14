"""
Opportunities Routes

API endpoints for the job/opportunities board feature.
Handles creating, listing, bookmarking, and deleting opportunities.

RESTful Endpoints:
- POST /api/opportunities - Create new opportunity
- GET /api/opportunities - List opportunities with optional filters
- POST /api/opportunities/<id>/bookmark - Toggle bookmark status
- DELETE /api/opportunities/<id> - Delete opportunity
"""

import time

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from backend.extensions import db
from backend.models import Opportunity
from backend.routes_v2.opportunities.helpers import (
    create_db_opportunity,
    get_db_opportunities,
    get_paginated_opportunities,
    opportunities_to_dict,
    toggle_bookmark_status
)
from backend.services.content_moderator import moderate_content

opportunities_bp = Blueprint('opportunities', __name__)


@opportunities_bp.route('/api/opportunities', methods=['POST'])
@login_required
def create_opportunity():
    """
    Create a new opportunity posting.

    Request body:
        - title (required): Opportunity title
        - description (required): Full description
        - compensation (optional): Compensation details
        - universityOnly (optional): Boolean to restrict to same university
        - tags (optional): Array of tag strings

    Returns:
        201: Created opportunity
        400: Missing required fields
        500: Server error
    """
    try:
        data = request.get_json()

        # Validate required fields
        if not data.get('title') or not data.get('description'):
            return jsonify({
                'success': False,
                'error': 'Title and description are required'
            }), 400

        # Content moderation - check title first, then description, then compensation
        title = data.get('title', '').strip()
        if not moderate_content(title):
            return jsonify({'success': False, 'error': 'Content contains inappropriate language'}), 400
        
        description = data.get('description', '').strip()
        if not moderate_content(description):
            return jsonify({'success': False, 'error': 'Content contains inappropriate language'}), 400
        
        compensation = data.get('compensation', '').strip() if data.get('compensation') else ''
        if compensation and not moderate_content(compensation):
            return jsonify({'success': False, 'error': 'Content contains inappropriate language'}), 400

        # Create opportunity using helper
        opportunity = create_db_opportunity(data)

        return jsonify({
            'success': True,
            'opportunity': opportunity.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@opportunities_bp.route('/api/opportunities')
def list_opportunities():
    """
    Get all opportunities with optional filtering and pagination.

    Query parameters:
        - search: Search in title, description, or author name
        - location: Filter by location tag (Remote, Hybrid, On-site)
        - paid: Filter by 'true' for Paid or 'false' for Unpaid
        - myUniversity: If 'true', only show opportunities from same university
        - university_id: Filter by specific university (returns opportunities from members)
        - tags: Comma-separated list of tags to filter by
        - tag: Single tag to filter by (alternative to tags)
        - bookmarked: Filter to only bookmarked opportunities (requires authentication)
        - page: Page number (1-indexed, optional - enables pagination)
        - page_size: Number of items per page (optional, default 20 when page is provided)

    Response format:
        - If pagination params provided: { opportunities: [...], pagination: {...} }
        - If no pagination: [...opportunities] (backward compatible flat array)

    Returns:
        Array of opportunity objects with author info and bookmark status.

    Visibility rules:
        - Opportunities with university_only=True are only shown to:
          - Users from the same university as the author
          - Site admins
    """
    if current_app.config.get('DEV_MODE', False):
        time.sleep(1.5)
    # Bookmarked filter requires authentication
    if request.args.get('bookmarked') and not current_user.is_authenticated:
        return jsonify({'error': 'Authentication required to view bookmarked opportunities'}), 401

    # Extract query parameters
    query_dict = {
        'page': request.args.get('page', type=int),
        'page_size': request.args.get('page_size', type=int),
        'search': request.args.get('search', '').strip() or None,
        'my_university': request.args.get('myUniversity', '').lower() == 'true',
        'location_filter': request.args.get('location', '').strip() or None,
        'paid_filter': request.args.get('paid', '').strip() or None,
        'tags_filter': request.args.get('tags', '').strip() or request.args.get('tag', '').strip() or None,
        'university_id': request.args.get('university_id', type=int),
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
    
    # Get opportunities (with or without pagination)
    opportunities, pagination = get_paginated_opportunities(query_dict, current_user)
    
    # Return appropriate response format
    if pagination:
        # Paginated response
        return jsonify({
            'opportunities': opportunities,
            'pagination': pagination
        })
    else:
        # Non-paginated response (backward compatible)
        return jsonify(opportunities)


@opportunities_bp.route('/api/opportunities/<int:opportunity_id>/bookmark', methods=['POST'])
@login_required
def toggle_bookmark(opportunity_id):
    """
    Toggle bookmark status for an opportunity.

    Returns:
        200: Success with updated bookmark status
        404: Opportunity not found
        500: Server error
    """
    try:
        opportunity = Opportunity.query.get(opportunity_id)
        if not opportunity:
            return jsonify({'success': False, 'error': 'Opportunity not found'}), 404

        # Toggle bookmark using helper
        is_bookmarked = toggle_bookmark_status(current_user, opportunity)

        return jsonify({
            'success': True,
            'isBookmarked': is_bookmarked
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@opportunities_bp.route('/api/opportunities/<int:opportunity_id>', methods=['DELETE'])
@login_required
def delete_opportunity(opportunity_id):
    """
    Delete an opportunity.

    Only the author or site admins can delete opportunities.

    Returns:
        200: Success
        403: Unauthorized (not author or admin)
        404: Opportunity not found
        500: Server error
    """
    try:
        opportunity = Opportunity.query.get(opportunity_id)

        if not opportunity:
            return jsonify({'success': False, 'error': 'Opportunity not found'}), 404

        # Check authorization: author or site admin
        if opportunity.author_id != current_user.id and not current_user.is_site_admin():
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        # Delete the opportunity
        db.session.delete(opportunity)
        db.session.commit()

        return jsonify({'success': True}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
