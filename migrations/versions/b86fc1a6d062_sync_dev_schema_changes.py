"""sync dev schema changes

Revision ID: b86fc1a6d062
Revises: 336e87389d8d
Create Date: 2026-02-08 12:00:00.000000

Syncs production schema with dev branch models:
- note_attachments: add user_id column, index, and unique constraint on gcs_path
- notes: make content nullable
- staging_uploads: drop orphaned table (model was removed)
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b86fc1a6d062'
down_revision = '336e87389d8d'
branch_labels = None
depends_on = None


def upgrade():
    # Add user_id column to note_attachments (table is empty, safe to add NOT NULL)
    with op.batch_alter_table('note_attachments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=False))
        batch_op.create_foreign_key(
            'fk_note_attachments_user_id',
            'user',
            ['user_id'],
            ['id'],
            ondelete='CASCADE'
        )
        batch_op.create_index('ix_note_attachments_user_id', ['user_id'])
        batch_op.create_unique_constraint('uq_note_attachments_gcs_path', ['gcs_path'])

    # Make notes.content nullable
    with op.batch_alter_table('notes', schema=None) as batch_op:
        batch_op.alter_column('content',
                              existing_type=sa.Text(),
                              nullable=True)

    # Drop orphaned staging_uploads table (model was removed)
    op.drop_table('staging_uploads')


def downgrade():
    # Recreate staging_uploads table
    op.create_table(
        'staging_uploads',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('session_id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('gcs_path', sa.String(length=500), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('content_type', sa.String(length=100), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_staging_uploads_session_id', 'staging_uploads', ['session_id'])
    op.create_index('ix_staging_uploads_user_id', 'staging_uploads', ['user_id'])

    # Make notes.content NOT NULL again
    with op.batch_alter_table('notes', schema=None) as batch_op:
        batch_op.alter_column('content',
                              existing_type=sa.Text(),
                              nullable=False)

    # Remove user_id column, index, and constraints from note_attachments
    with op.batch_alter_table('note_attachments', schema=None) as batch_op:
        batch_op.drop_constraint('uq_note_attachments_gcs_path', type_='unique')
        batch_op.drop_index('ix_note_attachments_user_id')
        batch_op.drop_constraint('fk_note_attachments_user_id', type_='foreignkey')
        batch_op.drop_column('user_id')
