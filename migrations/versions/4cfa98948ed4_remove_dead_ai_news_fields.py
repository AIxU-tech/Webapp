"""remove dead ai news fields

Revision ID: 4cfa98948ed4
Revises: 336e87389d8d
Create Date: 2026-02-07 10:51:07.421066

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4cfa98948ed4'
down_revision = '336e87389d8d'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('ai_news_sources', schema=None) as batch_op:
        batch_op.drop_column('article_title')
        batch_op.drop_column('excerpt')

    with op.batch_alter_table('ai_news_stories', schema=None) as batch_op:
        batch_op.drop_column('significance')
        batch_op.drop_column('categories')
        batch_op.drop_column('rank')

    with op.batch_alter_table('ai_research_papers', schema=None) as batch_op:
        batch_op.drop_column('rank')
        batch_op.drop_column('significance')
        batch_op.drop_column('key_findings')
        batch_op.drop_column('categories')
        batch_op.drop_column('publication_date')
        batch_op.drop_column('image_url')


def downgrade():
    with op.batch_alter_table('ai_research_papers', schema=None) as batch_op:
        batch_op.add_column(sa.Column('image_url', sa.VARCHAR(length=2000), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('publication_date', sa.DATE(), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('categories', sa.TEXT(), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('key_findings', sa.TEXT(), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('significance', sa.TEXT(), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('rank', sa.INTEGER(), server_default=sa.text('0'), autoincrement=False, nullable=False))

    with op.batch_alter_table('ai_news_stories', schema=None) as batch_op:
        batch_op.add_column(sa.Column('rank', sa.INTEGER(), server_default=sa.text('0'), autoincrement=False, nullable=False))
        batch_op.add_column(sa.Column('categories', sa.TEXT(), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('significance', sa.TEXT(), server_default=sa.text("''"), autoincrement=False, nullable=False))

    with op.batch_alter_table('ai_news_sources', schema=None) as batch_op:
        batch_op.add_column(sa.Column('excerpt', sa.TEXT(), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('article_title', sa.VARCHAR(length=500), autoincrement=False, nullable=True))
