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

Simplified upload flow:
- All uploads go to uploads/{user_id}/{uuid}_{filename}
- No staging area, no file copying
- Files are associated with notes via database UPDATE

Credentials are loaded in this order:
1. GCS_CREDENTIALS_JSON env var (base64-encoded service account JSON - for Render)
2. GCS_CREDENTIALS_PATH config (path to service account key file)
3. GOOGLE_APPLICATION_CREDENTIALS env var (set by docker-compose for local dev)
4. Application Default Credentials (fallback)
"""

import base64
import json
import os
import threading
import time
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


class _TTLCache:
    """Thread-safe in-memory cache with per-entry TTL and bounded size.

    Used to avoid regenerating GCS signed URLs on every API serialization.
    Keys are GCS paths (which include a UUID, so new uploads = automatic cache miss).
    """

    def __init__(self, maxsize: int = 2000):
        self._cache: dict[str, tuple[str, float]] = {}  # key -> (value, expiry)
        self._lock = threading.Lock()
        self._maxsize = maxsize

    def get(self, key: str) -> Optional[str]:
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            value, expiry = entry
            if time.time() >= expiry:
                del self._cache[key]
                return None
            return value

    def set(self, key: str, value: str, ttl: float) -> None:
        with self._lock:
            if len(self._cache) >= self._maxsize:
                now = time.time()
                self._cache = {k: v for k, v in self._cache.items() if v[1] > now}
                if len(self._cache) >= self._maxsize:
                    sorted_keys = sorted(self._cache, key=lambda k: self._cache[k][1])
                    for k in sorted_keys[:len(sorted_keys) // 4]:
                        del self._cache[k]
            self._cache[key] = (value, time.time() + ttl)


_signed_url_cache = _TTLCache(maxsize=2000)


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


def get_public_image_url(gcs_path: str) -> Optional[str]:
    """
    Return a signed URL for an image stored in GCS.

    Uses signed URLs because the bucket's org policy prevents public access.
    URLs are generated with a 7-day expiration and cached in-memory for 1 hour
    to avoid redundant crypto signing on every API serialization.

    Args:
        gcs_path: Path within the bucket (e.g., 'images/profiles/42/abc_photo.jpg')

    Returns:
        Signed URL, or None if GCS is not configured or gcs_path is None/empty
    """
    if not gcs_path:
        return None
    if not is_gcs_configured():
        return None

    cached = _signed_url_cache.get(gcs_path)
    if cached is not None:
        return cached

    bucket = _get_bucket()
    blob = bucket.blob(gcs_path)
    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(days=7),
        method="GET",
    )

    # Cache for 1 hour (URLs valid 7 days, React Query refreshes in minutes)
    _signed_url_cache.set(gcs_path, url, ttl=3600)
    return url


def upload_image_bytes(gcs_path: str, image_data: bytes, content_type: str = 'image/jpeg') -> None:
    """
    Upload pre-processed image bytes directly to GCS (server-side upload).
    Used for profile pictures, banners, logos where the server compresses/crops first.

    Args:
        gcs_path: Destination path in the bucket
        image_data: Compressed image bytes
        content_type: MIME type (default: image/jpeg since compress_image outputs JPEG)

    Raises:
        ValueError: If GCS is not configured
        Exception: On upload failure
    """
    bucket = _get_bucket()
    blob = bucket.blob(gcs_path)
    blob.cache_control = 'public, max-age=31536000, immutable'
    blob.upload_from_string(image_data, content_type=content_type)


def generate_image_gcs_path(prefix: str, entity_id: int, filename: str) -> str:
    """
    Generate a unique GCS path for an image.

    Prepends GCS_PATH_PREFIX (e.g., 'dev') when set, so dev and prod
    uploads stay isolated in the same bucket.

    Args:
        prefix: Path prefix from IMAGE_GCS_PREFIXES (e.g., 'images/profiles')
        entity_id: ID of the entity (user_id, university_id, speaker_id)
        filename: Original filename (will be sanitized)

    Returns:
        GCS path like 'images/profiles/42/a1b2c3d4_photo.jpg'
        or 'dev/images/profiles/42/a1b2c3d4_photo.jpg' in dev
    """
    env_prefix = current_app.config.get('GCS_PATH_PREFIX', '')
    unique_id = str(uuid.uuid4())[:8]
    safe_name = _sanitize_filename(filename)
    base = f'{prefix}/{entity_id}/{unique_id}_{safe_name}'
    return f'{env_prefix}/{base}' if env_prefix else base


def generate_upload_url(user_id: int, filename: str, content_type: str) -> dict:
    """
    Generate a signed URL for uploading a file.

    All files are uploaded to a permanent location: uploads/{user_id}/{uuid}_{filename}
    No staging area, no file copying needed.

    Args:
        user_id: ID of the uploading user (for path organization and ownership)
        filename: Original filename (for generating unique path)
        content_type: MIME type of the file

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
    env_prefix = current_app.config.get('GCS_PATH_PREFIX', '')
    unique_id = str(uuid.uuid4())[:8]
    safe_filename = _sanitize_filename(filename)
    base = f"uploads/{user_id}/{unique_id}_{safe_filename}"
    gcs_path = f"{env_prefix}/{base}" if env_prefix else base

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


def delete_files(gcs_paths: list[str]) -> int:
    """
    Delete multiple files from GCS.

    Args:
        gcs_paths: List of paths to delete

    Returns:
        Number of files successfully deleted
    """
    deleted_count = 0
    for path in gcs_paths:
        if delete_file(path):
            deleted_count += 1
    return deleted_count


def delete_user_uploads(user_id: int) -> int:
    """
    Delete all uploads for a user from GCS.

    Called when a user is deleted to clean up storage.

    Args:
        user_id: ID of the user whose uploads to delete

    Returns:
        Number of files deleted
    """
    bucket = _get_bucket()
    env_prefix = current_app.config.get('GCS_PATH_PREFIX', '')
    base = f"uploads/{user_id}/"
    prefix = f"{env_prefix}/{base}" if env_prefix else base

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


def delete_user_images(user_id: int) -> int:
    """
    Delete all image files for a user from GCS.

    Covers images/profiles/{user_id}/ and images/banners/{user_id}/ prefixes.
    Called during account deletion as belt-and-suspenders cleanup alongside
    explicit path deletion (catches orphans from failed DB commits).

    Args:
        user_id: ID of the user whose images to delete

    Returns:
        Number of files deleted
    """
    bucket = _get_bucket()
    env_prefix = current_app.config.get('GCS_PATH_PREFIX', '')
    deleted_count = 0

    for image_prefix in ['images/profiles', 'images/banners']:
        base = f"{image_prefix}/{user_id}/"
        prefix = f"{env_prefix}/{base}" if env_prefix else base

        for blob in bucket.list_blobs(prefix=prefix):
            try:
                blob.delete()
                deleted_count += 1
            except Exception:
                pass

    return deleted_count


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename for safe storage (public helper for use by other services).
    """
    return _sanitize_filename(filename)


def _sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename for safe storage (internal implementation).

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
