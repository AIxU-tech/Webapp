"""drop legacy blob image columns

Revision ID: d1a2b3c4d5e6
Revises: 798fe4c8b5cc
Create Date: 2026-03-27 21:15:00.000000

Drops the legacy LargeBinary image columns from user and universities tables.
Images are now stored in GCS with paths in *_gcs_path columns.

PREREQUISITE: scripts/migrate_images_to_gcs.py must have been run first
to migrate any existing blob data to GCS.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd1a2b3c4d5e6'
down_revision = '798fe4c8b5cc'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('profile_picture')
        batch_op.drop_column('profile_picture_filename')
        batch_op.drop_column('profile_picture_mimetype')
        batch_op.drop_column('banner_image')
        batch_op.drop_column('banner_image_filename')
        batch_op.drop_column('banner_image_mimetype')

    with op.batch_alter_table('universities', schema=None) as batch_op:
        batch_op.drop_column('logo')
        batch_op.drop_column('logo_filename')
        batch_op.drop_column('logo_mimetype')
        batch_op.drop_column('banner')
        batch_op.drop_column('banner_filename')
        batch_op.drop_column('banner_mimetype')


def downgrade():
    with op.batch_alter_table('universities', schema=None) as batch_op:
        batch_op.add_column(sa.Column('banner_mimetype', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('banner_filename', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('banner', sa.LargeBinary(), nullable=True))
        batch_op.add_column(sa.Column('logo_mimetype', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('logo_filename', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('logo', sa.LargeBinary(), nullable=True))

    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('banner_image_mimetype', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('banner_image_filename', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('banner_image', sa.LargeBinary(), nullable=True))
        batch_op.add_column(sa.Column('profile_picture_mimetype', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('profile_picture_filename', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('profile_picture', sa.LargeBinary(), nullable=True))
