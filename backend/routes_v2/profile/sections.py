"""
Profile Sections Routes

CRUD endpoints for profile sections: Education, Experience, and Projects.
All write operations require authentication and verify ownership.

Endpoints:
- POST   /api/profile/education          - Add education entry
- PUT    /api/profile/education/<id>     - Update education entry
- DELETE /api/profile/education/<id>     - Delete education entry
- POST   /api/profile/experience         - Add experience entry
- PUT    /api/profile/experience/<id>    - Update experience entry
- DELETE /api/profile/experience/<id>    - Delete experience entry
- POST   /api/profile/projects           - Add project entry
- PUT    /api/profile/projects/<id>      - Update project entry
- DELETE /api/profile/projects/<id>      - Delete project entry
"""

import json
from datetime import date
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from backend.extensions import db
from backend.models.profile_sections import Education, Experience, Project

profile_sections_bp = Blueprint('profile_sections', __name__)


# =============================================================================
# Section Configuration
# =============================================================================

SECTION_CONFIGS = {
    'education': {
        'model': Education,
        'required_fields': ['institution', 'degree'],
        'required_error': 'Institution and degree are required',
        'require_start_date': True,
        'string_fields': ['institution', 'degree', 'field_of_study', 'description'],
        'has_gpa': True,
        'has_technologies': False,
        'label': 'education',
    },
    'experience': {
        'model': Experience,
        'required_fields': ['title', 'company'],
        'required_error': 'Title and company are required',
        'require_start_date': True,
        'string_fields': ['title', 'company', 'location', 'description'],
        'has_gpa': False,
        'has_technologies': False,
        'label': 'experience',
    },
    'projects': {
        'model': Project,
        'required_fields': ['title'],
        'required_error': 'Title is required',
        'require_start_date': False,
        'string_fields': ['title', 'description', 'url'],
        'has_gpa': False,
        'has_technologies': True,
        'label': 'project',
    },
}


# =============================================================================
# Validation Helpers
# =============================================================================

def _parse_date(value):
    """Parse an ISO date string (YYYY-MM-DD) to a date object, or None."""
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def _validate_date_range(start, end):
    """Return error string if end_date is before start_date, else None."""
    if start and end and end < start:
        return 'End date cannot be before start date'
    return None


def _validate_gpa(value):
    """Validate GPA is a number in [0.0, 5.0]. Returns (float|None, error)."""
    if value is None or value == '':
        return None, None
    try:
        gpa = float(value)
    except (ValueError, TypeError):
        return None, 'GPA must be a number'
    if gpa < 0.0 or gpa > 5.0:
        return None, 'GPA must be between 0.0 and 5.0'
    return round(gpa, 2), None


def _clamp_display_order(value):
    """Clamp display_order to [0, 999]."""
    try:
        v = int(value)
    except (ValueError, TypeError):
        return 0
    return max(0, min(v, 999))


# =============================================================================
# Generic CRUD Helpers
# =============================================================================

def _create_section_entry(config, data):
    """Create a profile section entry. Returns (response_dict, status_code)."""
    for field in config['required_fields']:
        val = data.get(field)
        if not val or (isinstance(val, str) and not val.strip()):
            return {'error': config['required_error']}, 400

    start = _parse_date(data.get('start_date'))
    if config['require_start_date'] and not start:
        return {'error': 'Start date is required'}, 400

    end = _parse_date(data.get('end_date'))
    date_err = _validate_date_range(start, end)
    if date_err:
        return {'error': date_err}, 400

    kwargs = {
        'user_id': current_user.id,
        'start_date': start,
        'end_date': end,
        'display_order': _clamp_display_order(data.get('display_order', 0)),
    }

    for field in config['string_fields']:
        val = data.get(field)
        val = val.strip() if isinstance(val, str) else ''
        if field in config['required_fields']:
            kwargs[field] = val
        else:
            kwargs[field] = val or None

    if config['has_gpa']:
        gpa, gpa_err = _validate_gpa(data.get('gpa'))
        if gpa_err:
            return {'error': gpa_err}, 400
        kwargs['gpa'] = gpa

    if config['has_technologies']:
        techs = data.get('technologies')
        kwargs['technologies'] = json.dumps(techs) if isinstance(techs, list) else None

    entry = config['model'](**kwargs)
    db.session.add(entry)
    db.session.commit()
    return {'success': True, 'entry': entry.to_dict()}, 201


def _update_section_entry(config, entry_id, data):
    """Update a profile section entry. Returns (response_dict, status_code)."""
    entry = db.session.get(config['model'], entry_id)
    if not entry or entry.user_id != current_user.id:
        return {'error': 'Not found'}, 404

    for field in config['string_fields']:
        if field in data:
            val = data[field]
            val = val.strip() if isinstance(val, str) else ''
            if field in config['required_fields'] and not val:
                return {'error': config['required_error']}, 400
            setattr(entry, field, val if field in config['required_fields'] else (val or None))

    if 'start_date' in data:
        parsed = _parse_date(data['start_date'])
        if config['require_start_date'] and not parsed:
            return {'error': 'Invalid start date'}, 400
        entry.start_date = parsed
    if 'end_date' in data:
        entry.end_date = _parse_date(data['end_date'])

    date_err = _validate_date_range(entry.start_date, entry.end_date)
    if date_err:
        return {'error': date_err}, 400

    if 'display_order' in data:
        entry.display_order = _clamp_display_order(data['display_order'])

    if config['has_gpa'] and 'gpa' in data:
        gpa, gpa_err = _validate_gpa(data['gpa'])
        if gpa_err:
            return {'error': gpa_err}, 400
        entry.gpa = gpa

    if config['has_technologies'] and 'technologies' in data:
        techs = data['technologies']
        entry.technologies = json.dumps(techs) if isinstance(techs, list) else None

    db.session.commit()
    return {'success': True, 'entry': entry.to_dict()}, 200


def _delete_section_entry(model, entry_id):
    """Delete a profile section entry. Returns (response_dict, status_code)."""
    entry = db.session.get(model, entry_id)
    if not entry or entry.user_id != current_user.id:
        return {'error': 'Not found'}, 404

    db.session.delete(entry)
    db.session.commit()
    return {'success': True}, 200


# =============================================================================
# Education Routes
# =============================================================================

@profile_sections_bp.route('/api/profile/education', methods=['POST'])
@login_required
def create_education():
    try:
        body, status = _create_section_entry(SECTION_CONFIGS['education'], request.json)
        return jsonify(body), status
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to create education entry'}), 400


@profile_sections_bp.route('/api/profile/education/<int:entry_id>', methods=['PUT'])
@login_required
def update_education(entry_id):
    try:
        body, status = _update_section_entry(SECTION_CONFIGS['education'], entry_id, request.json)
        return jsonify(body), status
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to update education entry'}), 400


@profile_sections_bp.route('/api/profile/education/<int:entry_id>', methods=['DELETE'])
@login_required
def delete_education(entry_id):
    try:
        body, status = _delete_section_entry(Education, entry_id)
        return jsonify(body), status
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete education entry'}), 400


# =============================================================================
# Experience Routes
# =============================================================================

@profile_sections_bp.route('/api/profile/experience', methods=['POST'])
@login_required
def create_experience():
    try:
        body, status = _create_section_entry(SECTION_CONFIGS['experience'], request.json)
        return jsonify(body), status
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to create experience entry'}), 400


@profile_sections_bp.route('/api/profile/experience/<int:entry_id>', methods=['PUT'])
@login_required
def update_experience(entry_id):
    try:
        body, status = _update_section_entry(SECTION_CONFIGS['experience'], entry_id, request.json)
        return jsonify(body), status
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to update experience entry'}), 400


@profile_sections_bp.route('/api/profile/experience/<int:entry_id>', methods=['DELETE'])
@login_required
def delete_experience(entry_id):
    try:
        body, status = _delete_section_entry(Experience, entry_id)
        return jsonify(body), status
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete experience entry'}), 400


# =============================================================================
# Projects Routes
# =============================================================================

@profile_sections_bp.route('/api/profile/projects', methods=['POST'])
@login_required
def create_project():
    try:
        body, status = _create_section_entry(SECTION_CONFIGS['projects'], request.json)
        return jsonify(body), status
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to create project entry'}), 400


@profile_sections_bp.route('/api/profile/projects/<int:entry_id>', methods=['PUT'])
@login_required
def update_project(entry_id):
    try:
        body, status = _update_section_entry(SECTION_CONFIGS['projects'], entry_id, request.json)
        return jsonify(body), status
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to update project entry'}), 400


@profile_sections_bp.route('/api/profile/projects/<int:entry_id>', methods=['DELETE'])
@login_required
def delete_project(entry_id):
    try:
        body, status = _delete_section_entry(Project, entry_id)
        return jsonify(body), status
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete project entry'}), 400
