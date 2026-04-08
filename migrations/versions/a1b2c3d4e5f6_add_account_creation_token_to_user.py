"""add account_creation_token to user

Revision ID: a1b2c3d4e5f6
Revises: f1a2b3c4d5e7
Create Date: 2026-04-07 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'f1a2b3c4d5e7'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user', sa.Column('account_creation_token', sa.String(64), nullable=True))
    op.create_unique_constraint('uq_user_account_creation_token', 'user', ['account_creation_token'])
    op.create_index('ix_user_account_creation_token', 'user', ['account_creation_token'])


def downgrade():
    op.drop_index('ix_user_account_creation_token', table_name='user')
    op.drop_constraint('uq_user_account_creation_token', 'user', type_='unique')
    op.drop_column('user', 'account_creation_token')
