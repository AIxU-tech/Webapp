"""Add image GCS path columns to user and universities

Revision ID: a3f7c2d91e45
Revises: 5b4866388cd0
Create Date: 2026-03-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a3f7c2d91e45'
down_revision = '5b4866388cd0'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('profile_picture_gcs_path', sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column('banner_image_gcs_path', sa.String(length=500), nullable=True))

    with op.batch_alter_table('universities', schema=None) as batch_op:
        batch_op.add_column(sa.Column('logo_gcs_path', sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column('banner_gcs_path', sa.String(length=500), nullable=True))


def downgrade():
    with op.batch_alter_table('universities', schema=None) as batch_op:
        batch_op.drop_column('banner_gcs_path')
        batch_op.drop_column('logo_gcs_path')

    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('banner_image_gcs_path')
        batch_op.drop_column('profile_picture_gcs_path')
