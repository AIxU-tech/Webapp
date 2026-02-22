"""
Speakers Routes

API endpoints for managing guest speaker contacts shared across university AI clubs.

Endpoints:
- GET /api/speakers - List all speakers + user's executive university IDs
- POST /api/speakers - Create speaker
- PUT /api/speakers/<id> - Update speaker (original adder or admin)
- DELETE /api/speakers/<id> - Delete speaker (original adder or admin)

Permission Logic:
- All endpoints require authentication + executive at any university OR site admin
- Edit/delete restricted to the user who added the speaker, or site admin
"""

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from backend.extensions import db
from backend.models import Speaker, UniversityRole, University
from backend.constants import UniversityRoles
from backend.services.content_moderator import moderate_content

speakers_bp = Blueprint('speakers', __name__)


def _check_executive_access():
    """Returns (True, None) if authorized, (False, error_response) otherwise."""
    if current_user.is_site_admin():
        return True, None
    if not UniversityRole.is_executive_anywhere(current_user.id):
        return False, (jsonify({'error': 'Access restricted to club executives'}), 403)
    return True, None


def _get_user_executive_universities(user):
    """Get universities where user is executive+, for the university selector."""
    if user.is_site_admin():
        universities = University.query.order_by(University.name).all()
        return [{'id': u.id, 'name': u.name} for u in universities]

    universities = (
        University.query
        .join(UniversityRole, UniversityRole.university_id == University.id)
        .filter(
            UniversityRole.user_id == user.id,
            UniversityRole.role >= UniversityRoles.EXECUTIVE,
        )
        .order_by(University.name)
        .all()
    )
    return [{'id': u.id, 'name': u.name} for u in universities]


# =============================================================================
# List Speakers
# =============================================================================

@speakers_bp.route('/api/speakers', methods=['GET'])
@login_required
def list_speakers():
    """
    Get all speakers and the current user's executive universities.

    Returns:
        JSON with speakers array and userUniversities array
    """
    authorized, error_response = _check_executive_access()
    if not authorized:
        return error_response

    speakers = Speaker.query.order_by(Speaker.created_at.desc()).all()
    user_universities = _get_user_executive_universities(current_user)

    return jsonify({
        'speakers': [s.to_dict() for s in speakers],
        'userUniversities': user_universities,
    })


# =============================================================================
# Create Speaker
# =============================================================================

@speakers_bp.route('/api/speakers', methods=['POST'])
@login_required
def create_speaker():
    """
    Create a new speaker contact.

    Request Body:
        {
            "name": "Dr. Sarah Chen" (required),
            "position": "Professor of ML" (required),
            "organization": "Stanford University" (optional),
            "email": "s.chen@openai.com" (optional),
            "phone": "(555) 123-4567" (optional),
            "linkedinUrl": "https://linkedin.com/in/schen" (optional),
            "notes": "Excellent for technical audiences" (optional),
            "universityId": 1 (optional - auto-assigned if single university)
        }

    Returns:
        201: Created speaker
        400: Validation error
        403: Not authorized
    """
    authorized, error_response = _check_executive_access()
    if not authorized:
        return error_response

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    # Validate required fields
    name = (data.get('name') or '').strip()
    position = (data.get('position') or '').strip()

    if not name:
        return jsonify({'error': 'Name is required'}), 400
    if not position:
        return jsonify({'error': 'Position is required'}), 400
    if len(name) > 150:
        return jsonify({'error': 'Name must be 150 characters or fewer'}), 400
    if len(position) > 200:
        return jsonify({'error': 'Position must be 200 characters or fewer'}), 400

    # Optional fields
    organization = (data.get('organization') or '').strip() or None
    email = (data.get('email') or '').strip() or None
    phone = (data.get('phone') or '').strip() or None
    linkedin_url = (data.get('linkedinUrl') or '').strip() or None
    notes = (data.get('notes') or '').strip() or None

    if organization and len(organization) > 200:
        return jsonify({'error': 'Organization must be 200 characters or fewer'}), 400
    if notes and len(notes) > 500:
        return jsonify({'error': 'Notes must be 500 characters or fewer'}), 400

    # At least one contact field required
    if not email and not phone and not linkedin_url:
        return jsonify({'error': 'At least one contact method (email, phone, or LinkedIn) is required'}), 400

    # Content moderation
    if not moderate_content(name):
        return jsonify({'error': 'Name contains inappropriate content'}), 400
    if not moderate_content(position):
        return jsonify({'error': 'Position contains inappropriate content'}), 400
    if organization and not moderate_content(organization):
        return jsonify({'error': 'Organization contains inappropriate content'}), 400
    if notes and not moderate_content(notes):
        return jsonify({'error': 'Notes contain inappropriate content'}), 400

    # Determine university
    user_universities = _get_user_executive_universities(current_user)
    university_id = data.get('universityId')

    if university_id:
        # Verify user has executive access at this university (or is admin)
        if not current_user.is_site_admin():
            if not UniversityRole.is_executive_or_higher(current_user.id, university_id):
                return jsonify({'error': 'You are not an executive at this university'}), 403
    else:
        # Auto-assign first executive university
        if not user_universities:
            return jsonify({'error': 'No university association found'}), 400
        university_id = user_universities[0]['id']

    speaker = Speaker(
        name=name,
        position=position,
        organization=organization,
        email=email,
        phone=phone,
        linkedin_url=linkedin_url,
        notes=notes,
        university_id=university_id,
        added_by_id=current_user.id,
    )

    db.session.add(speaker)
    db.session.commit()

    return jsonify(speaker.to_dict()), 201


# =============================================================================
# Update Speaker
# =============================================================================

@speakers_bp.route('/api/speakers/<int:speaker_id>', methods=['PUT'])
@login_required
def update_speaker(speaker_id):
    """
    Update an existing speaker.

    Authorization: Original adder or site admin.

    Returns:
        200: Updated speaker
        400: Validation error
        403: Not authorized
        404: Speaker not found
    """
    authorized, error_response = _check_executive_access()
    if not authorized:
        return error_response

    speaker = Speaker.query.get(speaker_id)
    if not speaker:
        return jsonify({'error': 'Speaker not found'}), 404

    # Only original adder or admin can edit
    if speaker.added_by_id != current_user.id and not current_user.is_site_admin():
        return jsonify({'error': 'Only the person who added this speaker can edit it'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    # Validate required fields
    name = (data.get('name') or '').strip()
    position = (data.get('position') or '').strip()

    if not name:
        return jsonify({'error': 'Name is required'}), 400
    if not position:
        return jsonify({'error': 'Position is required'}), 400
    if len(name) > 150:
        return jsonify({'error': 'Name must be 150 characters or fewer'}), 400
    if len(position) > 200:
        return jsonify({'error': 'Position must be 200 characters or fewer'}), 400

    # Optional fields
    organization = (data.get('organization') or '').strip() or None
    email = (data.get('email') or '').strip() or None
    phone = (data.get('phone') or '').strip() or None
    linkedin_url = (data.get('linkedinUrl') or '').strip() or None
    notes = (data.get('notes') or '').strip() or None

    if organization and len(organization) > 200:
        return jsonify({'error': 'Organization must be 200 characters or fewer'}), 400
    if notes and len(notes) > 500:
        return jsonify({'error': 'Notes must be 500 characters or fewer'}), 400

    # At least one contact field required
    if not email and not phone and not linkedin_url:
        return jsonify({'error': 'At least one contact method (email, phone, or LinkedIn) is required'}), 400

    # Content moderation
    if not moderate_content(name):
        return jsonify({'error': 'Name contains inappropriate content'}), 400
    if not moderate_content(position):
        return jsonify({'error': 'Position contains inappropriate content'}), 400
    if organization and not moderate_content(organization):
        return jsonify({'error': 'Organization contains inappropriate content'}), 400
    if notes and not moderate_content(notes):
        return jsonify({'error': 'Notes contain inappropriate content'}), 400

    # Update fields
    speaker.name = name
    speaker.position = position
    speaker.organization = organization
    speaker.email = email
    speaker.phone = phone
    speaker.linkedin_url = linkedin_url
    speaker.notes = notes

    db.session.commit()

    return jsonify(speaker.to_dict()), 200


# =============================================================================
# Delete Speaker
# =============================================================================

@speakers_bp.route('/api/speakers/<int:speaker_id>', methods=['DELETE'])
@login_required
def delete_speaker(speaker_id):
    """
    Delete a speaker.

    Authorization: Original adder or site admin.

    Returns:
        200: Success
        403: Not authorized
        404: Speaker not found
    """
    authorized, error_response = _check_executive_access()
    if not authorized:
        return error_response

    speaker = Speaker.query.get(speaker_id)
    if not speaker:
        return jsonify({'error': 'Speaker not found'}), 404

    # Only original adder or admin can delete
    if speaker.added_by_id != current_user.id and not current_user.is_site_admin():
        return jsonify({'error': 'Only the person who added this speaker can delete it'}), 403

    db.session.delete(speaker)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Speaker deleted successfully'})
