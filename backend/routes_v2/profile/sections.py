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
    if value is None or value == '' or value is False:
        return None, None
    try:
        gpa = float(value)
    except (ValueError, TypeError):
        return None, 'GPA must be a number'
    if gpa < 0.0 or gpa > 5.0:
        return None, 'GPA must be between 0.0 and 5.0'
    return round(gpa, 2), None


# =============================================================================
# Education CRUD
# =============================================================================

@profile_sections_bp.route('/api/profile/education', methods=['POST'])
@login_required
def create_education():
    try:
        data = request.json
        if not data.get('institution') or not data.get('degree'):
            return jsonify({'error': 'Institution and degree are required'}), 400

        start = _parse_date(data.get('start_date'))
        if not start:
            return jsonify({'error': 'Start date is required'}), 400

        end = _parse_date(data.get('end_date'))
        date_err = _validate_date_range(start, end)
        if date_err:
            return jsonify({'error': date_err}), 400

        gpa, gpa_err = _validate_gpa(data.get('gpa'))
        if gpa_err:
            return jsonify({'error': gpa_err}), 400

        entry = Education(
            user_id=current_user.id,
            institution=data['institution'].strip(),
            degree=data['degree'].strip(),
            field_of_study=data.get('field_of_study', '').strip() or None,
            start_date=start,
            end_date=end,
            gpa=gpa,
            description=data.get('description', '').strip() or None,
            display_order=data.get('display_order', 0),
        )
        db.session.add(entry)
        db.session.commit()

        return jsonify({'success': True, 'entry': entry.to_dict()}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create education entry', 'details': str(e)}), 400


@profile_sections_bp.route('/api/profile/education/<int:entry_id>', methods=['PUT'])
@login_required
def update_education(entry_id):
    try:
        entry = Education.query.get(entry_id)
        if not entry or entry.user_id != current_user.id:
            return jsonify({'error': 'Not found'}), 404

        data = request.json

        if 'institution' in data:
            entry.institution = data['institution'].strip()
        if 'degree' in data:
            entry.degree = data['degree'].strip()
        if 'field_of_study' in data:
            entry.field_of_study = data['field_of_study'].strip() or None
        if 'start_date' in data:
            parsed = _parse_date(data['start_date'])
            if not parsed:
                return jsonify({'error': 'Invalid start date'}), 400
            entry.start_date = parsed
        if 'end_date' in data:
            entry.end_date = _parse_date(data['end_date'])
        if 'gpa' in data:
            gpa, gpa_err = _validate_gpa(data['gpa'])
            if gpa_err:
                return jsonify({'error': gpa_err}), 400
            entry.gpa = gpa
        if 'description' in data:
            entry.description = data['description'].strip() or None
        if 'display_order' in data:
            entry.display_order = data['display_order']

        start = entry.start_date
        end = entry.end_date
        date_err = _validate_date_range(start, end)
        if date_err:
            return jsonify({'error': date_err}), 400

        db.session.commit()
        return jsonify({'success': True, 'entry': entry.to_dict()})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update education entry', 'details': str(e)}), 400


@profile_sections_bp.route('/api/profile/education/<int:entry_id>', methods=['DELETE'])
@login_required
def delete_education(entry_id):
    try:
        entry = Education.query.get(entry_id)
        if not entry or entry.user_id != current_user.id:
            return jsonify({'error': 'Not found'}), 404

        db.session.delete(entry)
        db.session.commit()
        return jsonify({'success': True})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete education entry', 'details': str(e)}), 400


# =============================================================================
# Experience CRUD
# =============================================================================

@profile_sections_bp.route('/api/profile/experience', methods=['POST'])
@login_required
def create_experience():
    try:
        data = request.json
        if not data.get('title') or not data.get('company'):
            return jsonify({'error': 'Title and company are required'}), 400

        start = _parse_date(data.get('start_date'))
        if not start:
            return jsonify({'error': 'Start date is required'}), 400

        end = _parse_date(data.get('end_date'))
        date_err = _validate_date_range(start, end)
        if date_err:
            return jsonify({'error': date_err}), 400

        entry = Experience(
            user_id=current_user.id,
            title=data['title'].strip(),
            company=data['company'].strip(),
            location=data.get('location', '').strip() or None,
            start_date=start,
            end_date=end,
            description=data.get('description', '').strip() or None,
            display_order=data.get('display_order', 0),
        )
        db.session.add(entry)
        db.session.commit()

        return jsonify({'success': True, 'entry': entry.to_dict()}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create experience entry', 'details': str(e)}), 400


@profile_sections_bp.route('/api/profile/experience/<int:entry_id>', methods=['PUT'])
@login_required
def update_experience(entry_id):
    try:
        entry = Experience.query.get(entry_id)
        if not entry or entry.user_id != current_user.id:
            return jsonify({'error': 'Not found'}), 404

        data = request.json

        if 'title' in data:
            entry.title = data['title'].strip()
        if 'company' in data:
            entry.company = data['company'].strip()
        if 'location' in data:
            entry.location = data['location'].strip() or None
        if 'start_date' in data:
            parsed = _parse_date(data['start_date'])
            if not parsed:
                return jsonify({'error': 'Invalid start date'}), 400
            entry.start_date = parsed
        if 'end_date' in data:
            entry.end_date = _parse_date(data['end_date'])
        if 'description' in data:
            entry.description = data['description'].strip() or None
        if 'display_order' in data:
            entry.display_order = data['display_order']

        date_err = _validate_date_range(entry.start_date, entry.end_date)
        if date_err:
            return jsonify({'error': date_err}), 400

        db.session.commit()
        return jsonify({'success': True, 'entry': entry.to_dict()})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update experience entry', 'details': str(e)}), 400


@profile_sections_bp.route('/api/profile/experience/<int:entry_id>', methods=['DELETE'])
@login_required
def delete_experience(entry_id):
    try:
        entry = Experience.query.get(entry_id)
        if not entry or entry.user_id != current_user.id:
            return jsonify({'error': 'Not found'}), 404

        db.session.delete(entry)
        db.session.commit()
        return jsonify({'success': True})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete experience entry', 'details': str(e)}), 400


# =============================================================================
# Projects CRUD
# =============================================================================

@profile_sections_bp.route('/api/profile/projects', methods=['POST'])
@login_required
def create_project():
    try:
        data = request.json
        if not data.get('title'):
            return jsonify({'error': 'Title is required'}), 400

        start = _parse_date(data.get('start_date'))
        end = _parse_date(data.get('end_date'))
        date_err = _validate_date_range(start, end)
        if date_err:
            return jsonify({'error': date_err}), 400

        techs = data.get('technologies')
        techs_json = json.dumps(techs) if isinstance(techs, list) else None

        entry = Project(
            user_id=current_user.id,
            title=data['title'].strip(),
            description=data.get('description', '').strip() or None,
            url=data.get('url', '').strip() or None,
            start_date=start,
            end_date=end,
            technologies=techs_json,
            display_order=data.get('display_order', 0),
        )
        db.session.add(entry)
        db.session.commit()

        return jsonify({'success': True, 'entry': entry.to_dict()}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create project entry', 'details': str(e)}), 400


@profile_sections_bp.route('/api/profile/projects/<int:entry_id>', methods=['PUT'])
@login_required
def update_project(entry_id):
    try:
        entry = Project.query.get(entry_id)
        if not entry or entry.user_id != current_user.id:
            return jsonify({'error': 'Not found'}), 404

        data = request.json

        if 'title' in data:
            entry.title = data['title'].strip()
        if 'description' in data:
            entry.description = data['description'].strip() or None
        if 'url' in data:
            entry.url = data['url'].strip() or None
        if 'start_date' in data:
            entry.start_date = _parse_date(data['start_date'])
        if 'end_date' in data:
            entry.end_date = _parse_date(data['end_date'])
        if 'technologies' in data:
            techs = data['technologies']
            entry.technologies = json.dumps(techs) if isinstance(techs, list) else None
        if 'display_order' in data:
            entry.display_order = data['display_order']

        date_err = _validate_date_range(entry.start_date, entry.end_date)
        if date_err:
            return jsonify({'error': date_err}), 400

        db.session.commit()
        return jsonify({'success': True, 'entry': entry.to_dict()})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update project entry', 'details': str(e)}), 400


@profile_sections_bp.route('/api/profile/projects/<int:entry_id>', methods=['DELETE'])
@login_required
def delete_project(entry_id):
    try:
        entry = Project.query.get(entry_id)
        if not entry or entry.user_id != current_user.id:
            return jsonify({'error': 'Not found'}), 404

        db.session.delete(entry)
        db.session.commit()
        return jsonify({'success': True})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete project entry', 'details': str(e)}), 400
