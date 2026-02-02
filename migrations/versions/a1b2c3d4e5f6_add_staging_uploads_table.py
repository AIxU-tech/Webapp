"""Add staging_uploads table for upload-first note creation flow

Revision ID: a1b2c3d4e5f6
Revises: 336e87389d8d
Create Date: 2026-02-01

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '336e87389d8d'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'staging_uploads',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('gcs_path', sa.String(length=500), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('content_type', sa.String(length=100), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_staging_uploads_session_id'), 'staging_uploads', ['session_id'], unique=False)
    op.create_index(op.f('ix_staging_uploads_user_id'), 'staging_uploads', ['user_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_staging_uploads_user_id'), table_name='staging_uploads')
    op.drop_index(op.f('ix_staging_uploads_session_id'), table_name='staging_uploads')
    op.drop_table('staging_uploads')
