"""
Upload Routes

Handles file upload operations for note attachments.
Uses signed URLs for secure, direct browser-to-GCS uploads.

Simplified flow (no staging area):
1. Client requests upload URL with sessionId
2. Client uploads directly to GCS at uploads/{user_id}/{uuid}_{filename}
3. Client confirms upload - creates NoteAttachment record with note_id=NULL
4. When note is created, note_id is set via UPDATE in the community routes

Endpoints:
- POST /api/uploads/request-url - Request a signed URL for uploading
- POST /api/uploads/confirm - Confirm upload completion and create attachment record
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
from backend.constants import (
    MAX_ATTACHMENT_SIZE_BYTES,
    MAX_ATTACHMENTS_PER_NOTE,
)


uploads_bp = Blueprint('uploads', __name__)


@uploads_bp.route('/api/uploads/request-url', methods=['POST'])
@login_required
def request_upload_url():
    """
    Request a signed URL for uploading a file.

    Files are uploaded to a permanent location (uploads/{user_id}/{uuid}_{filename}).
    The sessionId groups uploads together so they can be associated with a note later.

    Request body:
        - sessionId (str): Client-generated session ID for grouping uploads
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

    required_fields = ['sessionId', 'filename', 'contentType', 'sizeBytes']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'error': f'Missing required field: {field}'
            }), 400

    session_id = data['sessionId']
    filename = data['filename']
    content_type = data['contentType']
    size_bytes = data['sizeBytes']

    # Validate session_id format (should be a UUID)
    if not session_id or len(session_id) > 64:
        return jsonify({
            'success': False,
            'error': 'Invalid sessionId'
        }), 400

    # Check how many uploads already exist for this session
    current_count = NoteAttachment.count_for_session(session_id, current_user.id)
    if current_count >= MAX_ATTACHMENTS_PER_NOTE:
        return jsonify({
            'success': False,
            'error': f'Maximum {MAX_ATTACHMENTS_PER_NOTE} attachments per post'
        }), 400

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
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to generate upload URL'
        }), 500


@uploads_bp.route('/api/uploads/confirm', methods=['POST'])
@login_required
def confirm_upload():
    """
    Confirm that a file was uploaded and create the attachment record.

    Creates a NoteAttachment with note_id=NULL. The note_id will be set
    when the note is created (via NoteAttachment.associate_with_note).

    Request body:
        - sessionId (str): Same session ID used in request-url
        - gcsPath (str): GCS path returned from request-url
        - filename (str): Original filename
        - contentType (str): MIME type
        - sizeBytes (int): File size in bytes

    Returns:
        JSON with success status and attachment ID
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

    required_fields = ['sessionId', 'gcsPath', 'filename', 'contentType', 'sizeBytes']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'error': f'Missing required field: {field}'
            }), 400

    session_id = data['sessionId']
    gcs_path = data['gcsPath']
    filename = data['filename']
    content_type = data['contentType']
    size_bytes = data['sizeBytes']

    # Security: verify the gcsPath belongs to this user
    expected_prefix = f"uploads/{current_user.id}/"
    if not gcs_path.startswith(expected_prefix):
        return jsonify({
            'success': False,
            'error': 'Invalid GCS path for this user'
        }), 400

    # Check for duplicate (same gcs_path already confirmed)
    existing = NoteAttachment.query.filter_by(gcs_path=gcs_path).first()
    if existing:
        return jsonify({
            'success': False,
            'error': 'Upload already confirmed'
        }), 400

    # Check session limit
    current_count = NoteAttachment.count_for_session(session_id, current_user.id)
    if current_count >= MAX_ATTACHMENTS_PER_NOTE:
        # Clean up the uploaded file since we can't track it
        delete_file(gcs_path)
        return jsonify({
            'success': False,
            'error': f'Maximum {MAX_ATTACHMENTS_PER_NOTE} attachments per post'
        }), 400

    try:
        attachment = NoteAttachment(
            note_id=None,  # Will be set when note is created
            user_id=current_user.id,
            session_id=session_id,
            gcs_path=gcs_path,
            filename=filename,
            content_type=content_type,
            size_bytes=size_bytes,
        )
        db.session.add(attachment)
        db.session.commit()

        return jsonify({
            'success': True,
            'attachmentId': attachment.id,
            'message': 'Upload confirmed'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to save upload record'
        }), 500


@uploads_bp.route('/api/uploads/attachments/<int:attachment_id>', methods=['DELETE'])
@login_required
def delete_attachment(attachment_id):
    """
    Delete an attachment.

    Can delete:
    - Pending uploads (note_id=NULL) owned by the user
    - Attachments on notes owned by the user

    Returns:
        JSON with success status
    """
    attachment = NoteAttachment.query.get(attachment_id)
    if not attachment:
        return jsonify({
            'success': False,
            'error': 'Attachment not found'
        }), 404

    # Check ownership - either direct ownership or via note
    if attachment.note_id:
        # Attachment is associated with a note - check note ownership
        note = Note.query.get(attachment.note_id)
        if not note or note.author_id != current_user.id:
            return jsonify({
                'success': False,
                'error': 'You can only delete your own attachments'
            }), 403
    else:
        # Pending attachment - check direct ownership
        if attachment.user_id != current_user.id:
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

    except Exception as e:
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
        JSON array of attachment objects with download URLs
    """
    note = Note.query.get(note_id)
    if not note:
        return jsonify({
            'success': False,
            'error': 'Note not found'
        }), 404

    attachments = NoteAttachment.get_for_note(note_id)

    # Generate download URLs if GCS is configured
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
                # If URL generation fails, include attachment without URL
                result.append(attachment.to_dict())
        else:
            result.append(attachment.to_dict())

    return jsonify({
        'success': True,
        'attachments': result
    })


@uploads_bp.route('/api/uploads/session/<session_id>', methods=['GET'])
@login_required
def get_session_uploads(session_id):
    """
    Get all pending uploads for a session (not yet associated with a note).

    Useful for the frontend to show what files have been uploaded during
    the current create/edit session.

    Returns:
        JSON array of attachment objects with download URLs
    """
    attachments = NoteAttachment.get_for_session(session_id, current_user.id)

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


@uploads_bp.route('/api/uploads/session/<session_id>', methods=['DELETE'])
@login_required
def delete_session_uploads(session_id):
    """
    Delete all pending uploads for a session.

    Useful when the user cancels creating a note - cleans up orphaned uploads.

    Returns:
        JSON with success status and count of deleted attachments
    """
    attachments = NoteAttachment.get_for_session(session_id, current_user.id)

    if not attachments:
        return jsonify({
            'success': True,
            'deleted': 0,
            'message': 'No pending uploads to delete'
        })

    deleted_count = 0
    for attachment in attachments:
        try:
            # Delete from GCS
            if is_gcs_configured():
                delete_file(attachment.gcs_path)
            # Delete database record
            db.session.delete(attachment)
            deleted_count += 1
        except Exception:
            # Continue with other attachments
            pass

    db.session.commit()

    return jsonify({
        'success': True,
        'deleted': deleted_count,
        'message': f'Deleted {deleted_count} pending upload(s)'
    })
