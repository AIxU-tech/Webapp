"""add speaker image columns

Revision ID: c4e8a1b37d92
Revises: fa05723205c6
Create Date: 2026-03-25 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c4e8a1b37d92'
down_revision = 'fa05723205c6'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('speakers', schema=None) as batch_op:
        batch_op.add_column(sa.Column('image_gcs_path', sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column('image_filename', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('image_content_type', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('image_size_bytes', sa.Integer(), nullable=True))


def downgrade():
    with op.batch_alter_table('speakers', schema=None) as batch_op:
        batch_op.drop_column('image_size_bytes')
        batch_op.drop_column('image_content_type')
        batch_op.drop_column('image_filename')
        batch_op.drop_column('image_gcs_path')
