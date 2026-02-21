"""Merge migration heads

Revision ID: 60ae66ce1d4d
Revises: 4cfa98948ed4, b86fc1a6d062
Create Date: 2026-02-21 13:05:53.578231

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '60ae66ce1d4d'
down_revision = ('4cfa98948ed4', 'b86fc1a6d062')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
