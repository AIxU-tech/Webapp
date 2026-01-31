"""
Google Cloud Storage Service

Handles file uploads and downloads for note attachments using signed URLs.
This module provides:
- Signed URL generation for secure browser-direct uploads
- Signed URL generation for temporary download access
- File deletion for cleanup when notes are deleted

The signed URL pattern allows:
1. Backend generates a temporary, permission-scoped URL
2. Frontend uploads/downloads directly to/from GCS
3. No credentials exposed to the client

Credentials are loaded in this order:
1. GCS_CREDENTIALS_JSON env var (base64-encoded service account JSON - for Render)
2. GCS_CREDENTIALS_PATH config (path to service account key file)
3. GOOGLE_APPLICATION_CREDENTIALS env var (set by docker-compose for local dev)
4. Application Default Credentials (fallback)
"""

import base64
import json
import os
import uuid
from datetime import timedelta
from typing import Optional

from flask import current_app
from google.cloud import storage
from google.oauth2 import service_account

from backend.constants import (
    ALLOWED_ATTACHMENT_TYPES,
    MAX_ATTACHMENT_SIZE_BYTES,
    EXTENSION_TO_MIME,
)


# Module-level client (initialized lazily)
_storage_client: Optional[storage.Client] = None
_bucket: Optional[storage.Bucket] = None


def _get_storage_client() -> storage.Client:
    """
    Get or create the GCS client.
    
    Tries credentials in this order:
    1. GCS_CREDENTIALS_JSON env var (base64-encoded JSON - for Render production)
    2. Service account key file (if GCS_CREDENTIALS_PATH is set and file exists)
    3. GOOGLE_APPLICATION_CREDENTIALS env var (for Docker with mounted ADC)
    4. Application Default Credentials (gcloud auth application-default login)
    
    Client is cached at module level for reuse.
    """
    global _storage_client
    
    if _storage_client is None:
        project_id = current_app.config.get('GCS_PROJECT_ID')
        
        # Option 1: Base64-encoded JSON in environment variable (Render production)
        credentials_json_b64 = os.environ.get('GCS_CREDENTIALS_JSON')
        if credentials_json_b64:
            try:
                credentials_json = base64.b64decode(credentials_json_b64).decode('utf-8')
                credentials_info = json.loads(credentials_json)
                credentials = service_account.Credentials.from_service_account_info(
                    credentials_info
                )
                _storage_client = storage.Client(
                    credentials=credentials,
                    project=project_id or credentials_info.get('project_id'),
                )
                return _storage_client
            except Exception as e:
                current_app.logger.warning(f"Failed to load GCS_CREDENTIALS_JSON: {e}")
        
        # Option 2: Service account key file path
        credentials_path = current_app.config.get('GCS_CREDENTIALS_PATH')
        if credentials_path and os.path.exists(credentials_path):
            credentials = service_account.Credentials.from_service_account_file(
                credentials_path
            )
            _storage_client = storage.Client(
                credentials=credentials,
                project=project_id or credentials.project_id,
            )
            return _storage_client
        
        # Option 3 & 4: GOOGLE_APPLICATION_CREDENTIALS or ADC
        # Project must be set explicitly when using ADC (e.g. in Docker)
        if not project_id:
            raise ValueError(
                "GCS_PROJECT_ID must be set when using Application Default Credentials "
                "(e.g. Docker with mounted ADC). Add GCS_PROJECT_ID to your .env."
            )
        _storage_client = storage.Client(project=project_id)
    
    return _storage_client


def _get_bucket() -> storage.Bucket:
    """
    Get the configured GCS bucket.
    
    Bucket reference is cached at module level for reuse.
    """
    global _bucket
    
    if _bucket is None:
        bucket_name = current_app.config.get('GCS_BUCKET_NAME')
        if not bucket_name:
            raise ValueError("GCS_BUCKET_NAME not configured")
        
        client = _get_storage_client()
        _bucket = client.bucket(bucket_name)
    
    return _bucket


def is_gcs_configured() -> bool:
    """Check if GCS is properly configured."""
    bucket_name = current_app.config.get('GCS_BUCKET_NAME')
    return bucket_name is not None and bucket_name != ''


def validate_content_type(content_type: str) -> bool:
    """Check if the content type is allowed for uploads."""
    return content_type in ALLOWED_ATTACHMENT_TYPES


def validate_file_extension(filename: str) -> bool:
    """Check if the file extension is allowed."""
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in EXTENSION_TO_MIME


def get_content_type_from_extension(filename: str) -> Optional[str]:
    """Get the expected MIME type from a file extension."""
    if '.' not in filename:
        return None
    ext = filename.rsplit('.', 1)[1].lower()
    return EXTENSION_TO_MIME.get(ext)


def generate_upload_url(
    note_id: int,
    filename: str,
    content_type: str,
    user_id: int,
) -> dict:
    """
    Generate a signed URL for uploading a file.
    
    The URL is valid for a limited time and scoped to a specific
    file path and content type.
    
    Args:
        note_id: ID of the note this attachment belongs to
        filename: Original filename (for generating unique path)
        content_type: MIME type of the file
        user_id: ID of the uploading user (for path organization)
        
    Returns:
        dict with:
            - uploadUrl: Signed PUT URL for direct upload
            - gcsPath: Path where the file will be stored
            - expiresIn: Seconds until URL expires
            
    Raises:
        ValueError: If content type is not allowed
    """
    if not validate_content_type(content_type):
        raise ValueError(f"Content type '{content_type}' is not allowed")
    
    # Generate unique filename to prevent overwrites
    # Format: notes/{note_id}/{uuid}_{original_filename}
    unique_id = str(uuid.uuid4())[:8]
    safe_filename = _sanitize_filename(filename)
    gcs_path = f"notes/{note_id}/{unique_id}_{safe_filename}"
    
    bucket = _get_bucket()
    blob = bucket.blob(gcs_path)
    
    # Get expiration from config
    expiration_seconds = current_app.config.get('GCS_UPLOAD_URL_EXPIRATION', 900)
    
    # Generate signed URL for PUT request
    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(seconds=expiration_seconds),
        method="PUT",
        content_type=content_type,
    )
    
    return {
        'uploadUrl': url,
        'gcsPath': gcs_path,
        'expiresIn': expiration_seconds,
    }


def generate_download_url(gcs_path: str) -> str:
    """
    Generate a signed URL for downloading a file.
    
    Args:
        gcs_path: Path to the file in GCS
        
    Returns:
        Signed GET URL for downloading the file
    """
    bucket = _get_bucket()
    blob = bucket.blob(gcs_path)
    
    expiration_seconds = current_app.config.get('GCS_DOWNLOAD_URL_EXPIRATION', 3600)
    
    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(seconds=expiration_seconds),
        method="GET",
    )
    
    return url


def delete_file(gcs_path: str) -> bool:
    """
    Delete a file from GCS.
    
    Args:
        gcs_path: Path to the file in GCS
        
    Returns:
        True if deleted successfully, False if file didn't exist
    """
    try:
        bucket = _get_bucket()
        blob = bucket.blob(gcs_path)
        blob.delete()
        return True
    except Exception:
        # File may not exist or other error
        return False


def delete_note_attachments(note_id: int) -> int:
    """
    Delete all attachments for a note from GCS.
    
    Called when a note is deleted to clean up storage.
    
    Args:
        note_id: ID of the note whose attachments to delete
        
    Returns:
        Number of files deleted
    """
    bucket = _get_bucket()
    prefix = f"notes/{note_id}/"
    
    blobs = list(bucket.list_blobs(prefix=prefix))
    deleted_count = 0
    
    for blob in blobs:
        try:
            blob.delete()
            deleted_count += 1
        except Exception:
            # Log but continue deleting others
            pass
    
    return deleted_count


def _sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename for safe storage.
    
    Removes or replaces characters that could cause issues in URLs or paths.
    """
    # Keep only safe characters
    safe_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-_')
    
    # Replace spaces with underscores
    filename = filename.replace(' ', '_')
    
    # Keep only safe characters
    sanitized = ''.join(c if c in safe_chars else '_' for c in filename)
    
    # Ensure we have a valid filename
    if not sanitized or sanitized.startswith('.'):
        sanitized = 'file' + sanitized
    
    # Limit length
    if len(sanitized) > 100:
        # Keep extension
        if '.' in sanitized:
            name, ext = sanitized.rsplit('.', 1)
            sanitized = name[:95] + '.' + ext[:4]
        else:
            sanitized = sanitized[:100]
    
    return sanitized
