"""
Upload Routes

Handles file upload operations for note attachments using signed URLs.

Simplified flow:
1. Frontend requests signed upload URL
2. Frontend uploads directly to GCS
3. Frontend sends note data + attachment info to create_note endpoint
4. Backend creates Note and NoteAttachments atomically

Endpoints:
- POST /api/uploads/request-url - Request a signed URL for uploading
- DELETE /api/uploads/attachments/<id> - Delete an attachment
- GET /api/notes/<note_id>/attachments - Get all attachments for a note
"""

from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user

from backend.extensions import db
from backend.models import Note, NoteAttachment
from backend.services.storage import (
    is_gcs_configured,
    generate_upload_url,
    generate_download_url,
    delete_file,
    validate_content_type,
    validate_file_extension,
)
from backend.constants import MAX_ATTACHMENT_SIZE_BYTES


uploads_bp = Blueprint('uploads', __name__)


@uploads_bp.route('/api/uploads/request-url', methods=['POST'])
@login_required
def request_upload_url():
    """
    Request a signed URL for uploading a file to GCS.

    Request body:
        - filename (str): Original filename
        - contentType (str): MIME type
        - sizeBytes (int): File size in bytes

    Returns:
        JSON with uploadUrl, gcsPath, expiresIn on success
    """
    if not is_gcs_configured():
        return jsonify({
            'success': False,
            'error': 'File storage is not configured'
        }), 503

    data = request.get_json()
    if not data:
        return jsonify({
            'success': False,
            'error': 'Request body required'
        }), 400

    required_fields = ['filename', 'contentType', 'sizeBytes']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'error': f'Missing required field: {field}'
            }), 400

    filename = data['filename']
    content_type = data['contentType']
    size_bytes = data['sizeBytes']

    if not validate_file_extension(filename):
        return jsonify({
            'success': False,
            'error': 'File type not allowed'
        }), 400

    if not validate_content_type(content_type):
        return jsonify({
            'success': False,
            'error': f'Content type "{content_type}" is not allowed'
        }), 400

    if size_bytes > MAX_ATTACHMENT_SIZE_BYTES:
        max_mb = MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024)
        return jsonify({
            'success': False,
            'error': f'File size exceeds maximum of {max_mb:.0f} MB'
        }), 400

    if size_bytes <= 0:
        return jsonify({
            'success': False,
            'error': 'Invalid file size'
        }), 400

    try:
        result = generate_upload_url(
            user_id=current_user.id,
            filename=filename,
            content_type=content_type,
        )
        return jsonify({
            'success': True,
            'uploadUrl': result['uploadUrl'],
            'gcsPath': result['gcsPath'],
            'expiresIn': result['expiresIn'],
        })
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception:
        return jsonify({
            'success': False,
            'error': 'Failed to generate upload URL'
        }), 500


@uploads_bp.route('/api/uploads/attachments/<int:attachment_id>', methods=['DELETE'])
@login_required
def delete_attachment(attachment_id):
    """
    Delete an attachment.

    Only the note author can delete attachments.

    Returns:
        JSON with success status
    """
    attachment = NoteAttachment.query.get(attachment_id)
    if not attachment:
        return jsonify({
            'success': False,
            'error': 'Attachment not found'
        }), 404

    # Check ownership via the note
    note = Note.query.get(attachment.note_id)
    if not note or note.author_id != current_user.id:
        return jsonify({
            'success': False,
            'error': 'You can only delete your own attachments'
        }), 403

    try:
        # Delete from GCS
        if is_gcs_configured():
            delete_file(attachment.gcs_path)

        # Delete database record
        db.session.delete(attachment)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Attachment deleted'
        })

    except Exception:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to delete attachment'
        }), 500


@uploads_bp.route('/api/notes/<int:note_id>/attachments', methods=['GET'])
def get_note_attachments(note_id):
    """
    Get all attachments for a note with download URLs.

    Returns:
        JSON with attachments array
    """
    note = Note.query.get(note_id)
    if not note:
        return jsonify({
            'success': False,
            'error': 'Note not found'
        }), 404

    attachments = NoteAttachment.get_for_note(note_id)

    result = []
    for attachment in attachments:
        if is_gcs_configured():
            try:
                download_url = generate_download_url(attachment.gcs_path)
                result.append(attachment.to_dict(
                    include_download_url=True,
                    download_url=download_url
                ))
            except Exception:
                result.append(attachment.to_dict())
        else:
            result.append(attachment.to_dict())

    return jsonify({
        'success': True,
        'attachments': result
    })
