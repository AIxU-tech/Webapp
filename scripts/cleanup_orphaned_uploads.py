#!/usr/bin/env python3
"""
Cleanup Orphaned GCS Uploads Script

Finds and removes files in GCS that are not associated with any NoteAttachment
in the database. This handles the case where files are uploaded but the note
creation fails, leaving orphaned files in storage.

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
        description='Clean up orphaned files in GCS that have no NoteAttachment record.',
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
        from backend.models import NoteAttachment
        from backend.services.storage import _get_bucket, is_gcs_configured

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

        print("=" * 60)
        print("GCS Orphaned Upload Cleanup")
        print("=" * 60)
        print(f"Database: {db_label}")
        print(f"  URI: {masked_uri}")
        print(f"Mode: {'DELETE' if args.delete else 'DRY RUN (no files will be deleted)'}")
        print(f"Grace period: {args.grace_period} minutes")
        print()

        # Step 1: Get all gcs_path values from the database
        print("Fetching attachment records from database...")
        db_paths = set(
            row[0] for row in
            db.session.query(NoteAttachment.gcs_path).all()
        )
        print(f"  Found {len(db_paths)} attachments in database")

        # Step 2: List all blobs in GCS under uploads/
        print("Listing files in GCS bucket...")
        bucket = _get_bucket()
        
        gcs_blobs = {}  # path -> blob object (for metadata access)
        for blob in bucket.list_blobs(prefix='uploads/'):
            gcs_blobs[blob.name] = blob
        
        print(f"  Found {len(gcs_blobs)} files in GCS")

        # Step 3: Find orphaned files (in GCS but not in DB)
        orphaned_paths = set(gcs_blobs.keys()) - db_paths
        print(f"  Found {len(orphaned_paths)} orphaned files (in GCS but not in DB)")

        if not orphaned_paths:
            print()
            print("No orphaned files found. Nothing to clean up.")
            return

        # Step 4: Filter by grace period
        grace_cutoff = datetime.now(timezone.utc) - timedelta(minutes=args.grace_period)
        
        files_to_delete = []
        files_skipped_grace = []
        total_size = 0
        
        for path in orphaned_paths:
            blob = gcs_blobs[path]
            
            # Check if file is within grace period
            # blob.time_created is timezone-aware (UTC)
            if blob.time_created and blob.time_created > grace_cutoff:
                files_skipped_grace.append((path, blob))
            else:
                files_to_delete.append((path, blob))
                total_size += blob.size or 0

        print()
        print("-" * 60)
        print("Analysis Results:")
        print("-" * 60)
        print(f"  Orphaned files within grace period (skipped): {len(files_skipped_grace)}")
        print(f"  Orphaned files eligible for deletion: {len(files_to_delete)}")
        print(f"  Total size to reclaim: {format_size(total_size)}")

        if args.verbose and files_skipped_grace:
            print()
            print("Files skipped (within grace period):")
            for path, blob in files_skipped_grace:
                age_minutes = (datetime.now(timezone.utc) - blob.time_created).total_seconds() / 60
                print(f"    {path} ({format_size(blob.size or 0)}, {age_minutes:.0f}m old)")

        if args.verbose and files_to_delete:
            print()
            print("Files to delete:")
            for path, blob in files_to_delete:
                created = blob.time_created.strftime('%Y-%m-%d %H:%M') if blob.time_created else 'unknown'
                print(f"    {path} ({format_size(blob.size or 0)}, created {created})")

        if not files_to_delete:
            print()
            print("No files eligible for deletion (all within grace period).")
            return

        # Step 5: Delete (or report)
        print()
        if args.delete:
            print("-" * 60)
            print("Deleting orphaned files...")
            print("-" * 60)
            
            deleted_count = 0
            failed_count = 0
            
            for path, blob in files_to_delete:
                try:
                    blob.delete()
                    deleted_count += 1
                    if args.verbose:
                        print(f"  Deleted: {path}")
                except Exception as e:
                    failed_count += 1
                    print(f"  FAILED to delete {path}: {e}")

            print()
            print("=" * 60)
            print("Cleanup Complete")
            print("=" * 60)
            print(f"  Files deleted: {deleted_count}")
            print(f"  Files failed: {failed_count}")
            print(f"  Storage reclaimed: {format_size(total_size)}")
        else:
            print("-" * 60)
            print("DRY RUN - No files were deleted")
            print("-" * 60)
            print()
            print("To actually delete these files, run with --delete flag:")
            print(f"    python scripts/cleanup_orphaned_uploads.py --delete")
            if not args.verbose:
                print()
                print("To see the list of files, add --verbose flag:")
                print(f"    python scripts/cleanup_orphaned_uploads.py --verbose")


if __name__ == '__main__':
    main()
