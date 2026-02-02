"""
Staging Commit Service

Orchestrates committing staging uploads to a newly created note: copy files from
staging/ to notes/{note_id}/, create NoteAttachment records, and clean up staging.
Used by the "upload media first, then create post" flow.
"""

import uuid
from backend.extensions import db
from backend.models import StagingUpload, NoteAttachment
from backend.services.storage import copy_blob, delete_file, sanitize_filename


def commit_staging_attachments_to_note(session_id: str, note_id: int, user_id: int) -> None:
    """
    Move all staging uploads for this session to the note and create attachment records.

    For each StagingUpload: copy blob from staging path to notes/{note_id}/...,
    create NoteAttachment, delete staging blob and StagingUpload row.

    Args:
        session_id: Staging session ID (from client)
        note_id: ID of the newly created note
        user_id: ID of the user (must own the staging uploads)

    Raises:
        ValueError: If no staging uploads found for session/user
        Exception: On copy or DB failure (caller should roll back the note)
    """
    records = StagingUpload.get_for_session(session_id, user_id)
    if not records:
        raise ValueError("No attachments found for this session")

    for rec in records:
        unique_id = str(uuid.uuid4())[:8]
        safe_filename = sanitize_filename(rec.filename)
        dest_path = f"notes/{note_id}/{unique_id}_{safe_filename}"

        copy_blob(rec.gcs_path, dest_path)

        attachment = NoteAttachment(
            note_id=note_id,
            gcs_path=dest_path,
            filename=rec.filename,
            content_type=rec.content_type,
            size_bytes=rec.size_bytes,
        )
        db.session.add(attachment)
        db.session.flush()  # Get attachment ID if needed

        delete_file(rec.gcs_path)
        db.session.delete(rec)

    db.session.commit()
