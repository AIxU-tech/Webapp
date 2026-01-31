"""
Upload Routes

Handles file upload operations for note attachments.
Uses signed URLs for secure, direct browser-to-GCS uploads.

Endpoints:
- POST /api/uploads/request-url - Request a signed URL for uploading
- POST /api/uploads/confirm - Confirm upload completion and create attachment record
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
    Request a signed URL for uploading a file to GCS.
    
    Request body:
        - noteId (int): ID of the note to attach file to
        - filename (str): Original filename
        - contentType (str): MIME type of the file
        - sizeBytes (int): File size in bytes
        
    Returns:
        JSON with uploadUrl, gcsPath, and expiresIn on success
        
    Error codes:
        400: Invalid request (missing fields, invalid type, size too large)
        403: User doesn't own the note
        404: Note not found
        503: GCS not configured
    """
    # Check if GCS is configured
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
    
    # Validate required fields
    required_fields = ['noteId', 'filename', 'contentType', 'sizeBytes']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'error': f'Missing required field: {field}'
            }), 400
    
    note_id = data['noteId']
    filename = data['filename']
    content_type = data['contentType']
    size_bytes = data['sizeBytes']
    
    # Validate note exists and user owns it
    note = Note.query.get(note_id)
    if not note:
        return jsonify({
            'success': False,
            'error': 'Note not found'
        }), 404
    
    if note.author_id != current_user.id:
        return jsonify({
            'success': False,
            'error': 'You can only add attachments to your own notes'
        }), 403
    
    # Check attachment limit
    current_count = NoteAttachment.count_for_note(note_id)
    if current_count >= MAX_ATTACHMENTS_PER_NOTE:
        return jsonify({
            'success': False,
            'error': f'Maximum {MAX_ATTACHMENTS_PER_NOTE} attachments per note'
        }), 400
    
    # Validate file extension
    if not validate_file_extension(filename):
        return jsonify({
            'success': False,
            'error': 'File type not allowed'
        }), 400
    
    # Validate content type
    if not validate_content_type(content_type):
        return jsonify({
            'success': False,
            'error': f'Content type "{content_type}" is not allowed'
        }), 400
    
    # Validate file size
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
        # Generate signed upload URL
        result = generate_upload_url(
            note_id=note_id,
            filename=filename,
            content_type=content_type,
            user_id=current_user.id,
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
            'error': 'Failed to generate upload URL: ' + str(e)
        }), 500


@uploads_bp.route('/api/uploads/confirm', methods=['POST'])
@login_required
def confirm_upload():
    """
    Confirm that a file was uploaded and create the attachment record.
    
    Called by frontend after successfully uploading to GCS.
    
    Request body:
        - noteId (int): ID of the note
        - gcsPath (str): GCS path returned from request-url
        - filename (str): Original filename
        - contentType (str): MIME type
        - sizeBytes (int): File size
        
    Returns:
        JSON with the created attachment object
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
    
    required_fields = ['noteId', 'gcsPath', 'filename', 'contentType', 'sizeBytes']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'error': f'Missing required field: {field}'
            }), 400
    
    note_id = data['noteId']
    gcs_path = data['gcsPath']
    filename = data['filename']
    content_type = data['contentType']
    size_bytes = data['sizeBytes']
    
    # Validate note exists and user owns it
    note = Note.query.get(note_id)
    if not note:
        return jsonify({
            'success': False,
            'error': 'Note not found'
        }), 404
    
    if note.author_id != current_user.id:
        return jsonify({
            'success': False,
            'error': 'You can only add attachments to your own notes'
        }), 403
    
    # Verify the gcsPath matches the expected pattern for this note
    expected_prefix = f"notes/{note_id}/"
    if not gcs_path.startswith(expected_prefix):
        return jsonify({
            'success': False,
            'error': 'Invalid GCS path'
        }), 400
    
    # Check if attachment already exists (prevent duplicates)
    existing = NoteAttachment.query.filter_by(gcs_path=gcs_path).first()
    if existing:
        return jsonify({
            'success': False,
            'error': 'Attachment already exists'
        }), 400
    
    # Check attachment limit again (race condition protection)
    current_count = NoteAttachment.count_for_note(note_id)
    if current_count >= MAX_ATTACHMENTS_PER_NOTE:
        # Clean up the uploaded file
        delete_file(gcs_path)
        return jsonify({
            'success': False,
            'error': f'Maximum {MAX_ATTACHMENTS_PER_NOTE} attachments per note'
        }), 400
    
    try:
        # Create attachment record
        attachment = NoteAttachment(
            note_id=note_id,
            gcs_path=gcs_path,
            filename=filename,
            content_type=content_type,
            size_bytes=size_bytes,
        )
        db.session.add(attachment)
        db.session.commit()
        
        # Generate download URL for response
        download_url = generate_download_url(gcs_path)
        
        return jsonify({
            'success': True,
            'attachment': attachment.to_dict(
                include_download_url=True,
                download_url=download_url
            )
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to save attachment'
        }), 500


@uploads_bp.route('/api/uploads/attachments/<int:attachment_id>', methods=['DELETE'])
@login_required
def delete_attachment(attachment_id):
    """
    Delete an attachment from a note.
    
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
            download_url = generate_download_url(attachment.gcs_path)
            result.append(attachment.to_dict(
                include_download_url=True,
                download_url=download_url
            ))
        else:
            result.append(attachment.to_dict())
    
    return jsonify({
        'success': True,
        'attachments': result
    })
