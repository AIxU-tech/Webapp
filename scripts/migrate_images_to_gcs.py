"""
Migrate blob-stored images (profile pictures, banners, university logos/banners) to GCS.

Usage:
    python scripts/migrate_images_to_gcs.py [--dry-run] [--entity users|universities|all]

This script:
1. Finds all entities with blob data but no GCS path
2. Uploads each blob to GCS at the standard path
3. Updates the entity's GCS path column
4. Optionally clears the blob column to free DB space

Run with --dry-run first to see what would be migrated.
"""

import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import create_app
from backend.extensions import db
from backend.models.user import User
from backend.models.university import University
from backend.services.storage import upload_image_bytes, generate_image_gcs_path, is_gcs_configured
from backend.constants import IMAGE_GCS_PREFIXES


def migrate_user_profile_pictures(dry_run=False):
    """Migrate user profile pictures from blob to GCS."""
    users = User.query.filter(
        User.profile_picture.isnot(None),
        User.profile_picture_gcs_path.is_(None),
    ).all()

    print(f"Found {len(users)} users with profile pictures to migrate")

    for user in users:
        filename = user.profile_picture_filename or 'profile.jpg'
        gcs_path = generate_image_gcs_path(
            IMAGE_GCS_PREFIXES['profile'], user.id, filename
        )
        mimetype = user.profile_picture_mimetype or 'image/jpeg'

        if dry_run:
            print(f"  [DRY RUN] User {user.id}: would upload to {gcs_path}")
            continue

        try:
            upload_image_bytes(gcs_path, user.profile_picture, mimetype)
            user.profile_picture_gcs_path = gcs_path
            # Clear blob to free DB space
            user.profile_picture = None
            db.session.commit()
            print(f"  Migrated user {user.id} profile picture -> {gcs_path}")
        except Exception as e:
            db.session.rollback()
            print(f"  ERROR migrating user {user.id}: {e}")


def migrate_user_banners(dry_run=False):
    """Migrate user banner images from blob to GCS."""
    users = User.query.filter(
        User.banner_image.isnot(None),
        User.banner_image_gcs_path.is_(None),
    ).all()

    print(f"Found {len(users)} users with banners to migrate")

    for user in users:
        filename = user.banner_image_filename or 'banner.jpg'
        gcs_path = generate_image_gcs_path(
            IMAGE_GCS_PREFIXES['banner'], user.id, filename
        )
        mimetype = user.banner_image_mimetype or 'image/jpeg'

        if dry_run:
            print(f"  [DRY RUN] User {user.id}: would upload to {gcs_path}")
            continue

        try:
            upload_image_bytes(gcs_path, user.banner_image, mimetype)
            user.banner_image_gcs_path = gcs_path
            user.banner_image = None
            db.session.commit()
            print(f"  Migrated user {user.id} banner -> {gcs_path}")
        except Exception as e:
            db.session.rollback()
            print(f"  ERROR migrating user {user.id}: {e}")


def migrate_university_logos(dry_run=False):
    """Migrate university logos from blob to GCS."""
    universities = University.query.filter(
        University.logo.isnot(None),
        University.logo_gcs_path.is_(None),
    ).all()

    print(f"Found {len(universities)} universities with logos to migrate")

    for uni in universities:
        filename = uni.logo_filename or 'logo.jpg'
        gcs_path = generate_image_gcs_path(
            IMAGE_GCS_PREFIXES['university_logo'], uni.id, filename
        )
        mimetype = uni.logo_mimetype or 'image/jpeg'

        if dry_run:
            print(f"  [DRY RUN] University {uni.id}: would upload to {gcs_path}")
            continue

        try:
            upload_image_bytes(gcs_path, uni.logo, mimetype)
            uni.logo_gcs_path = gcs_path
            uni.logo = None
            db.session.commit()
            print(f"  Migrated university {uni.id} logo -> {gcs_path}")
        except Exception as e:
            db.session.rollback()
            print(f"  ERROR migrating university {uni.id}: {e}")


def migrate_university_banners(dry_run=False):
    """Migrate university banners from blob to GCS."""
    universities = University.query.filter(
        University.banner.isnot(None),
        University.banner_gcs_path.is_(None),
    ).all()

    print(f"Found {len(universities)} universities with banners to migrate")

    for uni in universities:
        filename = uni.banner_filename or 'banner.jpg'
        gcs_path = generate_image_gcs_path(
            IMAGE_GCS_PREFIXES['university_banner'], uni.id, filename
        )
        mimetype = uni.banner_mimetype or 'image/jpeg'

        if dry_run:
            print(f"  [DRY RUN] University {uni.id}: would upload to {gcs_path}")
            continue

        try:
            upload_image_bytes(gcs_path, uni.banner, mimetype)
            uni.banner_gcs_path = gcs_path
            uni.banner = None
            db.session.commit()
            print(f"  Migrated university {uni.id} banner -> {gcs_path}")
        except Exception as e:
            db.session.rollback()
            print(f"  ERROR migrating university {uni.id}: {e}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Migrate blob images to GCS')
    parser.add_argument('--dry-run', action='store_true', help='Preview without making changes')
    parser.add_argument('--entity', choices=['users', 'universities', 'all'], default='all')
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        if not is_gcs_configured():
            print("ERROR: GCS is not configured. Set GCS_BUCKET_NAME and credentials.")
            sys.exit(1)

        if args.entity in ('users', 'all'):
            migrate_user_profile_pictures(args.dry_run)
            migrate_user_banners(args.dry_run)

        if args.entity in ('universities', 'all'):
            migrate_university_logos(args.dry_run)
            migrate_university_banners(args.dry_run)

        print("Migration complete!")
