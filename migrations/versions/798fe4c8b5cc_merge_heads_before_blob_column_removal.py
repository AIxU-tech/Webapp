"""merge heads before blob column removal

Revision ID: 798fe4c8b5cc
Revises: a3f7c2d91e45, a3f7c9e21b84, c4e8a1b37d92
Create Date: 2026-03-27 21:12:58.199341

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '798fe4c8b5cc'
down_revision = ('a3f7c2d91e45', 'a3f7c9e21b84', 'c4e8a1b37d92')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
