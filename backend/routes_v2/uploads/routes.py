"""
Upload Routes

Handles file upload operations for note attachments using signed URLs.

Optimized flow:
1. Frontend requests signed upload URLs (batch for multiple files)
2. Frontend uploads directly to GCS in parallel
3. Frontend sends note data + attachment info to create_note endpoint
4. Backend creates Note and NoteAttachments atomically

Endpoints:
- POST /api/uploads/request-url - Request a signed URL for uploading a single file
- POST /api/uploads/request-urls - Request signed URLs for multiple files (batch)
- DELETE /api/uploads/attachments/<id> - Delete an attachment
- GET /api/notes/<note_id>/attachments - Get all attachments for a note
"""

from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user

from backend.extensions import db
from backend.models import Note, NoteAttachment
from backend.services.storage import (
    generate_upload_url,
    generate_image_upload_url,
    generate_download_url,
    delete_file,
)
from backend.constants import IMAGE_GCS_PREFIXES, MAX_ATTACHMENT_SIZE_BYTES
from backend.utils.permissions import can_manage_university_members
from backend.routes_v2.uploads.helpers import _validate_file_upload

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
    data = request.get_json()
    if not data:
        return jsonify({
            'success': False,
            'error': 'Request body required'
        }), 400

    is_valid, error = _validate_file_upload(data)
    if not is_valid:
        return jsonify({
            'success': False,
            'error': error
        }), 400

    try:
        result = generate_upload_url(
            user_id=current_user.id,
            filename=data['filename'],
            content_type=data['contentType'],
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


@uploads_bp.route('/api/uploads/request-urls', methods=['POST'])
@login_required
def request_upload_urls():
    """
    Request signed URLs for uploading multiple files to GCS in a single request.

    This is more efficient than calling request-url multiple times as it:
    - Reduces HTTP round-trips from N to 1
    - Allows the frontend to parallelize actual file uploads

    Request body:
        - files (array): Array of file objects, each containing:
            - filename (str): Original filename
            - contentType (str): MIME type
            - sizeBytes (int): File size in bytes

    Returns:
        JSON with:
            - success (bool): Whether all URLs were generated
            - uploads (array): Array of upload info objects, each containing:
                - uploadUrl: Signed PUT URL
                - gcsPath: Path where file will be stored
                - expiresIn: Seconds until URL expires
                - index: Original index in the request array
    """
    data = request.get_json()
    if not data:
        return jsonify({
            'success': False,
            'error': 'Request body required'
        }), 400

    files = data.get('files')
    if not files:
        return jsonify({
            'success': False,
            'error': 'Missing required field: files'
        }), 400

    if not isinstance(files, list):
        return jsonify({
            'success': False,
            'error': 'files must be an array'
        }), 400

    if len(files) == 0:
        return jsonify({
            'success': False,
            'error': 'files array cannot be empty'
        }), 400

    # Reasonable limit to prevent abuse
    max_files = 20
    if len(files) > max_files:
        return jsonify({
            'success': False,
            'error': f'Cannot upload more than {max_files} files at once'
        }), 400

    # Validate all files first before generating any URLs
    for i, file_data in enumerate(files):
        if not isinstance(file_data, dict):
            return jsonify({
                'success': False,
                'error': f'File {i}: must be an object'
            }), 400

        is_valid, error = _validate_file_upload(file_data, index=i)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': error
            }), 400

    # Generate all signed URLs
    uploads = []
    try:
        for i, file_data in enumerate(files):
            result = generate_upload_url(
                user_id=current_user.id,
                filename=file_data['filename'],
                content_type=file_data['contentType'],
            )
            uploads.append({
                'uploadUrl': result['uploadUrl'],
                'gcsPath': result['gcsPath'],
                'expiresIn': result['expiresIn'],
                'index': i,
            })

        return jsonify({
            'success': True,
            'uploads': uploads,
        })

    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception:
        return jsonify({
            'success': False,
            'error': 'Failed to generate upload URLs'
        }), 500


@uploads_bp.route('/api/uploads/request-image-url', methods=['POST'])
@login_required
def request_image_upload_url():
    """
    Request a signed URL for uploading an image to GCS.

    Uses IMAGE_GCS_PREFIXES to place images under the correct path prefix.

    Request body:
        - imageType (str): Key in IMAGE_GCS_PREFIXES
        - entityId (int, optional): Entity ID for path. Defaults to current user ID.
        - filename (str): Original filename
        - contentType (str): MIME type (must start with image/)
        - sizeBytes (int): File size in bytes
    """
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Request body required'}), 400

    image_type = data.get('imageType')
    if not image_type or image_type not in IMAGE_GCS_PREFIXES:
        return jsonify({
            'success': False,
            'error': f'Invalid imageType. Must be one of: {", ".join(IMAGE_GCS_PREFIXES.keys())}'
        }), 400

    filename = data.get('filename')
    content_type = data.get('contentType')
    size_bytes = data.get('sizeBytes')

    if not filename or not content_type or not size_bytes:
        return jsonify({'success': False, 'error': 'Missing required fields: filename, contentType, sizeBytes'}), 400

    if not content_type.startswith('image/'):
        return jsonify({'success': False, 'error': 'contentType must be an image type'}), 400

    if not isinstance(size_bytes, (int, float)) or size_bytes <= 0:
        return jsonify({'success': False, 'error': 'Invalid file size'}), 400

    max_size = 10 * 1024 * 1024  # 10MB
    if size_bytes > max_size:
        return jsonify({'success': False, 'error': 'File size must be less than 10MB'}), 400

    entity_id = data.get('entityId')
    if image_type in ('university_logo', 'university_banner'):
        if not entity_id:
            return jsonify({'success': False, 'error': 'entityId is required for university images'}), 400
        if not can_manage_university_members(current_user, entity_id):
            return jsonify({'success': False, 'error': 'Not authorized to upload images for this university'}), 403
    else:
        entity_id = entity_id or current_user.id

    try:
        result = generate_image_upload_url(
            image_type=image_type,
            entity_id=entity_id,
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
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception:
        return jsonify({'success': False, 'error': 'Failed to generate upload URL'}), 500


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
        try:
            download_url = generate_download_url(attachment.gcs_path)
            result.append(attachment.to_dict(
                include_download_url=True,
                download_url=download_url
            ))
        except Exception:
            result.append(attachment.to_dict())

    return jsonify({
        'success': True,
        'attachments': result
    })
