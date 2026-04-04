#!/usr/bin/env python3
"""
Cleanup Orphaned GCS Files Script

Finds and removes files in GCS that are not associated with any database record.
Covers two categories:

  Phase 1 - Uploads:  files under uploads/ not linked to any NoteAttachment
  Phase 2 - Images:   files under images/ not linked to any User, University, or Speaker

Usage:
    # Dry run against production (default) - shows what would be deleted
    python scripts/cleanup_orphaned_uploads.py

    # Dry run against local Docker database
    python scripts/cleanup_orphaned_uploads.py --local

    # Actually delete orphaned files (production)
    python scripts/cleanup_orphaned_uploads.py --delete

    # Actually delete orphaned files (local Docker)
    python scripts/cleanup_orphaned_uploads.py --local --delete

    # Custom grace period (default: 60 minutes)
    python scripts/cleanup_orphaned_uploads.py --grace-period 120

    # Verbose output (show all file paths)
    python scripts/cleanup_orphaned_uploads.py --verbose

    # Combine options
    python scripts/cleanup_orphaned_uploads.py --local --delete --grace-period 30 --verbose

Environment:
    Requires DATABASE_URL (or DEV_DATABASE_URL_LOCAL with --local) and GCS
    environment variables to be set. Run from the Webapp directory.
"""

import argparse
import sys
import os
from datetime import datetime, timedelta, timezone

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Clean up orphaned files in GCS that have no database record.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python scripts/cleanup_orphaned_uploads.py              # Dry run (production)
    python scripts/cleanup_orphaned_uploads.py --local      # Dry run (local Docker)
    python scripts/cleanup_orphaned_uploads.py --delete     # Actually delete (production)
    python scripts/cleanup_orphaned_uploads.py --local -v   # Verbose local dry run
    python scripts/cleanup_orphaned_uploads.py --local --delete --grace-period 120
        """
    )
    parser.add_argument(
        '--local',
        action='store_true',
        help='Use local Docker database (DEV_DATABASE_URL_LOCAL) instead of production'
    )
    parser.add_argument(
        '--delete',
        action='store_true',
        help='Actually delete orphaned files (default: dry run only)'
    )
    parser.add_argument(
        '--grace-period',
        type=int,
        default=60,
        metavar='MINUTES',
        help='Skip files created within this many minutes (default: 60)'
    )
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Show all orphaned file paths'
    )
    return parser.parse_args()


def format_size(size_bytes):
    """Format bytes as human-readable string."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"


def find_and_clean_orphans(bucket, gcs_prefix, db_paths, grace_period_minutes, delete, verbose, label):
    """
    Find orphaned files under a GCS prefix and optionally delete them.

    Args:
        bucket: GCS bucket object
        gcs_prefix: GCS prefix to scan (e.g., 'uploads/' or 'images/')
        db_paths: Set of known GCS paths from the database
        grace_period_minutes: Skip files newer than this
        delete: Whether to actually delete files
        verbose: Whether to show individual file paths
        label: Display label for this phase (e.g., 'Uploads', 'Images')

    Returns:
        Tuple of (orphan_count, deleted_count, failed_count, total_size)
    """
    print(f"Listing files in GCS under {gcs_prefix}...")
    gcs_blobs = {}
    for blob in bucket.list_blobs(prefix=gcs_prefix):
        gcs_blobs[blob.name] = blob
    print(f"  Found {len(gcs_blobs)} files in GCS")

    # Find orphaned files (in GCS but not in DB)
    orphaned_paths = set(gcs_blobs.keys()) - db_paths
    print(f"  Found {len(orphaned_paths)} orphaned files (in GCS but not in DB)")

    if not orphaned_paths:
        print(f"  No orphaned {label.lower()} found.")
        return 0, 0, 0, 0

    # Filter by grace period
    grace_cutoff = datetime.now(timezone.utc) - timedelta(minutes=grace_period_minutes)

    files_to_delete = []
    files_skipped_grace = []
    total_size = 0

    for path in orphaned_paths:
        blob = gcs_blobs[path]
        if blob.time_created and blob.time_created > grace_cutoff:
            files_skipped_grace.append((path, blob))
        else:
            files_to_delete.append((path, blob))
            total_size += blob.size or 0

    print()
    print(f"  {label} Analysis:")
    print(f"    Within grace period (skipped): {len(files_skipped_grace)}")
    print(f"    Eligible for deletion: {len(files_to_delete)}")
    print(f"    Size to reclaim: {format_size(total_size)}")

    if verbose and files_skipped_grace:
        print()
        print(f"  {label} skipped (within grace period):")
        for path, blob in files_skipped_grace:
            age_minutes = (datetime.now(timezone.utc) - blob.time_created).total_seconds() / 60
            print(f"    {path} ({format_size(blob.size or 0)}, {age_minutes:.0f}m old)")

    if verbose and files_to_delete:
        print()
        print(f"  {label} to delete:")
        for path, blob in files_to_delete:
            created = blob.time_created.strftime('%Y-%m-%d %H:%M') if blob.time_created else 'unknown'
            print(f"    {path} ({format_size(blob.size or 0)}, created {created})")

    if not files_to_delete:
        return len(orphaned_paths), 0, 0, 0

    # Delete or report
    deleted_count = 0
    failed_count = 0

    if delete:
        for path, blob in files_to_delete:
            try:
                blob.delete()
                deleted_count += 1
                if verbose:
                    print(f"    Deleted: {path}")
            except Exception as e:
                failed_count += 1
                print(f"    FAILED to delete {path}: {e}")

    return len(orphaned_paths), deleted_count, failed_count, total_size


def main():
    args = parse_args()

    # Override DATABASE_URL if --local flag is used
    if args.local:
        local_db_url = os.environ.get('DEV_DATABASE_URL_LOCAL')
        if not local_db_url:
            print("ERROR: --local flag requires DEV_DATABASE_URL_LOCAL in .env")
            print("Expected format: postgresql://user:pass@localhost:5433/dbname")
            sys.exit(1)
        # Override DATABASE_URL so Flask app uses the local Docker database
        os.environ['DATABASE_URL'] = local_db_url
        db_label = "LOCAL (Docker)"
    else:
        db_label = "PRODUCTION"
        # Safety check: warn if about to modify production
        if args.delete:
            print("=" * 60)
            print("WARNING: You are about to DELETE files using PRODUCTION database!")
            print("=" * 60)
            print("If you meant to use your local Docker database, add --local flag.")
            print()
            response = input("Type 'yes' to continue with PRODUCTION: ")
            if response.lower() != 'yes':
                print("Aborted.")
                sys.exit(0)
            print()

    # Import Flask app and create context
    # (Must import AFTER setting DATABASE_URL override)
    try:
        from app import app
    except ImportError as e:
        print(f"ERROR: Could not import Flask app. Run from the Webapp directory.")
        print(f"Details: {e}")
        sys.exit(1)

    with app.app_context():
        from backend.extensions import db
        from backend.models import NoteAttachment, User, University, Speaker
        from backend.services.storage import _get_bucket, is_gcs_configured
        from flask import current_app

        # Check GCS configuration
        if not is_gcs_configured():
            print("ERROR: GCS is not configured. Check GCS_BUCKET_NAME in your environment.")
            sys.exit(1)

        # Show which database we're using
        db_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
        # Mask password in display
        if '@' in db_uri:
            parts = db_uri.split('@')
            masked_uri = parts[0].rsplit(':', 1)[0] + ':***@' + parts[1]
        else:
            masked_uri = db_uri

        env_prefix = current_app.config.get('GCS_PATH_PREFIX', '')

        print("=" * 60)
        print("GCS Orphaned File Cleanup")
        print("=" * 60)
        print(f"Database: {db_label}")
        print(f"  URI: {masked_uri}")
        print(f"Mode: {'DELETE' if args.delete else 'DRY RUN (no files will be deleted)'}")
        print(f"Grace period: {args.grace_period} minutes")
        if env_prefix:
            print(f"GCS path prefix: {env_prefix}")
        print()

        bucket = _get_bucket()
        total_deleted = 0
        total_failed = 0
        total_size = 0

        # =================================================================
        # Phase 1: Orphaned note attachment uploads
        # =================================================================
        print("-" * 60)
        print("Phase 1: Note Attachment Uploads")
        print("-" * 60)

        print("Fetching attachment records from database...")
        upload_db_paths = set(
            row[0] for row in
            db.session.query(NoteAttachment.gcs_path).all()
        )
        print(f"  Found {len(upload_db_paths)} attachments in database")

        uploads_prefix = f"{env_prefix}/uploads/" if env_prefix else "uploads/"
        _, deleted, failed, size = find_and_clean_orphans(
            bucket, uploads_prefix, upload_db_paths,
            args.grace_period, args.delete, args.verbose, "Uploads"
        )
        total_deleted += deleted
        total_failed += failed
        total_size += size

        # =================================================================
        # Phase 2: Orphaned image files
        # =================================================================
        print()
        print("-" * 60)
        print("Phase 2: Image Files (profiles, banners, logos, speakers)")
        print("-" * 60)

        print("Fetching image records from database...")
        image_db_paths = set()

        for col in [User.profile_picture_gcs_path, User.banner_image_gcs_path]:
            for (path,) in db.session.query(col).filter(col.isnot(None)).all():
                image_db_paths.add(path)

        for col in [University.logo_gcs_path, University.banner_gcs_path]:
            for (path,) in db.session.query(col).filter(col.isnot(None)).all():
                image_db_paths.add(path)

        for (path,) in db.session.query(Speaker.image_gcs_path).filter(
            Speaker.image_gcs_path.isnot(None)
        ).all():
            image_db_paths.add(path)

        print(f"  Found {len(image_db_paths)} image paths in database")

        images_prefix = f"{env_prefix}/images/" if env_prefix else "images/"
        _, deleted, failed, size = find_and_clean_orphans(
            bucket, images_prefix, image_db_paths,
            args.grace_period, args.delete, args.verbose, "Images"
        )
        total_deleted += deleted
        total_failed += failed
        total_size += size

        # =================================================================
        # Summary
        # =================================================================
        print()
        print("=" * 60)
        if args.delete:
            print("Cleanup Complete")
            print("=" * 60)
            print(f"  Total files deleted: {total_deleted}")
            print(f"  Total files failed: {total_failed}")
            print(f"  Total storage reclaimed: {format_size(total_size)}")
        else:
            print("DRY RUN - No files were deleted")
            print("=" * 60)
            print(f"  Total reclaimable: {format_size(total_size)}")
            print()
            print("To actually delete these files, run with --delete flag:")
            print(f"    python scripts/cleanup_orphaned_uploads.py --delete")
            if not args.verbose:
                print()
                print("To see the list of files, add --verbose flag:")
                print(f"    python scripts/cleanup_orphaned_uploads.py --verbose")


if __name__ == '__main__':
    main()
