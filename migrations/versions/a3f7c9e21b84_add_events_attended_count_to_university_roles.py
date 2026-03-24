"""add events_attended_count to university_roles

Revision ID: a3f7c9e21b84
Revises: 5b4866388cd0
Create Date: 2026-03-23 00:00:00.000000

Add events_attended_count column to university_roles table
for tracking how many events a member has checked into via QR code.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a3f7c9e21b84'
down_revision = '5b4866388cd0'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('university_roles', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('events_attended_count', sa.Integer(), nullable=False, server_default='0')
        )


def downgrade():
    with op.batch_alter_table('university_roles', schema=None) as batch_op:
        batch_op.drop_column('events_attended_count')
