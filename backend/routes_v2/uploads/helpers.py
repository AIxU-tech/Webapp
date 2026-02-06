from backend.constants import MAX_ATTACHMENT_SIZE_BYTES
from backend.services.storage import validate_file_extension, validate_content_type


def _validate_file_upload(file_data, index=None):
    """
    Validate a single file's upload parameters.

    Args:
        file_data: Dict with filename, contentType, sizeBytes
        index: Optional index for error messages (for batch requests)

    Returns:
        tuple: (is_valid, error_message or None)
    """
    prefix = f"File {index}: " if index is not None else ""

    required_fields = ['filename', 'contentType', 'sizeBytes']
    for field in required_fields:
        if field not in file_data:
            return False, f"{prefix}Missing required field: {field}"

    filename = file_data['filename']
    content_type = file_data['contentType']
    size_bytes = file_data['sizeBytes']

    if not isinstance(filename, str) or not filename.strip():
        return False, f"{prefix}Invalid filename"

    if not validate_file_extension(filename):
        return False, f"{prefix}File type not allowed for '{filename}'"

    if not validate_content_type(content_type):
        return False, f"{prefix}Content type '{content_type}' is not allowed"

    if not isinstance(size_bytes, (int, float)) or size_bytes <= 0:
        return False, f"{prefix}Invalid file size"

    if size_bytes > MAX_ATTACHMENT_SIZE_BYTES:
        max_mb = MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024)
        return False, f"{prefix}File size exceeds maximum of {max_mb:.0f} MB"

    return True, None