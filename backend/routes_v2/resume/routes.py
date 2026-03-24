"""
Resume Routes

API endpoints for uploading, retrieving, and deleting user resumes.

Endpoints:
- POST /api/profile/resume              - Confirm resume upload (replace if exists)
- GET  /api/users/<id>/resume           - Get a user's resume (authenticated only)
- DELETE /api/profile/resume            - Delete own resume
- POST /api/profile/resume/parse        - Start AI-powered resume parsing
- GET  /api/profile/resume/parse-status - Check parsing status
- DELETE /api/profile/resume/parse-status - Clear parsing status
"""

from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, current_user

from backend.extensions import db
from backend.models import Resume
from backend.constants import ALLOWED_RESUME_TYPES, MAX_RESUME_SIZE_BYTES
from backend.services.storage import (
    is_gcs_configured,
    generate_download_url,
    delete_file,
)
from backend.services.resume_parser import (
    get_parse_status,
    clear_parse_status,
    download_file_from_gcs,
    start_resume_parse,
)

resume_bp = Blueprint('resume', __name__)


@resume_bp.route('/api/profile/resume', methods=['POST'])
@login_required
def confirm_resume_upload():
    """
    Confirm a resume upload after the file has been uploaded to GCS
    via the existing /api/uploads/request-url flow.

    If the user already has a resume, the old file is deleted from
    GCS and the database record is replaced.

    Request Body:
        {
            "gcsPath": "uploads/123/abc_resume.pdf",
            "filename": "my_resume.pdf",
            "contentType": "application/pdf",
            "sizeBytes": 204800
        }
    """
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Request body required'}), 400

    gcs_path = data.get('gcsPath')
    filename = data.get('filename')
    content_type = data.get('contentType')
    size_bytes = data.get('sizeBytes')

    if not all([gcs_path, filename, content_type, size_bytes]):
        return jsonify({'success': False, 'error': 'Missing required fields: gcsPath, filename, contentType, sizeBytes'}), 400

    if content_type not in ALLOWED_RESUME_TYPES:
        return jsonify({'success': False, 'error': 'Only PDF and Word documents are accepted'}), 400

    if not isinstance(size_bytes, (int, float)) or size_bytes <= 0:
        return jsonify({'success': False, 'error': 'Invalid file size'}), 400

    max_mb = MAX_RESUME_SIZE_BYTES / (1024 * 1024)
    if size_bytes > MAX_RESUME_SIZE_BYTES:
        return jsonify({'success': False, 'error': f'File size exceeds maximum of {max_mb:.0f} MB'}), 400

    try:
        existing = Resume.query.filter_by(user_id=current_user.id).first()
        old_gcs_path = existing.gcs_path if existing else None
        if existing:
            db.session.delete(existing)
            db.session.flush()

        resume = Resume(
            user_id=current_user.id,
            gcs_path=gcs_path,
            filename=filename,
            content_type=content_type,
            size_bytes=int(size_bytes),
        )
        db.session.add(resume)
        db.session.commit()

        # Delete old GCS file only after successful commit
        if old_gcs_path and is_gcs_configured():
            try:
                delete_file(old_gcs_path)
            except Exception:
                pass  # Orphaned file is better than data loss

        download_url = None
        if is_gcs_configured():
            try:
                download_url = generate_download_url(resume.gcs_path)
            except Exception:
                pass

        return jsonify({
            'success': True,
            'resume': resume.to_dict(download_url=download_url),
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@resume_bp.route('/api/users/<int:user_id>/resume', methods=['GET'])
@login_required
def get_user_resume(user_id):
    """
    Get a user's resume metadata and a signed download URL.

    Only authenticated users can view resumes.
    """
    resume = Resume.query.filter_by(user_id=user_id).first()
    if not resume:
        return jsonify({'success': True, 'resume': None})

    download_url = None
    if is_gcs_configured():
        try:
            download_url = generate_download_url(resume.gcs_path)
        except Exception:
            pass

    return jsonify({
        'success': True,
        'resume': resume.to_dict(download_url=download_url),
    })


@resume_bp.route('/api/profile/resume', methods=['DELETE'])
@login_required
def delete_resume():
    """Delete the current user's resume from GCS and the database."""
    resume = Resume.query.filter_by(user_id=current_user.id).first()
    if not resume:
        return jsonify({'success': False, 'error': 'No resume found'}), 404

    try:
        gcs_path = resume.gcs_path
        db.session.delete(resume)
        db.session.commit()

        # Delete GCS file only after successful commit
        if is_gcs_configured():
            try:
                delete_file(gcs_path)
            except Exception:
                pass  # Orphaned file is better than data loss

        return jsonify({'success': True, 'message': 'Resume deleted'})

    except Exception:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Failed to delete resume'}), 500


# =============================================================================
# Resume Parsing Endpoints
# =============================================================================

@resume_bp.route('/api/profile/resume/parse', methods=['POST'])
@login_required
def start_parse():
    """
    Start AI-powered resume parsing in the background.

    Downloads the resume from GCS and sends it to Claude to extract
    structured profile data (education, experience, projects, skills, etc.).
    Results are auto-applied to the user's profile when parsing completes.

    Returns immediately with status 'parsing'. Frontend polls parse-status.
    """
    resume = Resume.query.filter_by(user_id=current_user.id).first()
    if not resume:
        return jsonify({'success': False, 'error': 'No resume found'}), 404

    # Check if already parsing
    status = get_parse_status(current_user.id)
    if status and status['status'] == 'parsing':
        return jsonify({'success': True, 'status': 'parsing'})

    if not is_gcs_configured():
        return jsonify({'success': False, 'error': 'File storage not configured'}), 500

    # Download file while we have Flask app context
    try:
        file_bytes = download_file_from_gcs(resume.gcs_path)
    except Exception:
        return jsonify({'success': False, 'error': 'Could not download resume'}), 500

    # Start background parsing thread
    start_resume_parse(
        app=current_app._get_current_object(),
        user_id=current_user.id,
        file_bytes=file_bytes,
        content_type=resume.content_type,
    )

    return jsonify({'success': True, 'status': 'parsing'})


@resume_bp.route('/api/profile/resume/parse-status', methods=['GET'])
@login_required
def parse_status():
    """
    Check the current resume parsing status.

    Returns:
        - null status if no parsing has been started
        - 'parsing' while in progress
        - 'complete' when finished (profile has been updated)
        - 'error' if parsing failed
    """
    status = get_parse_status(current_user.id)
    if not status:
        return jsonify({'success': True, 'status': None})

    return jsonify({'success': True, **status})


@resume_bp.route('/api/profile/resume/parse-status', methods=['DELETE'])
@login_required
def clear_status():
    """Clear the parsing status for the current user."""
    clear_parse_status(current_user.id)
    return jsonify({'success': True})
