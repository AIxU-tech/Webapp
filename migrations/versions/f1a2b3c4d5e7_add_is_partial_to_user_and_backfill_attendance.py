"""add is_partial to user and backfill attendance counts

Revision ID: f1a2b3c4d5e7
Revises: d1a2b3c4d5e6
Create Date: 2026-04-07 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f1a2b3c4d5e7'
down_revision = 'd1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Add is_partial column to user table
    op.add_column('user', sa.Column('is_partial', sa.Boolean(), nullable=False, server_default='false'))

    # 2. Link anonymous attendance records to existing registered users by email.
    #    Skip records where the user already has a linked record for that event
    #    (avoids unique constraint violation on uq_attendance_event_user).
    op.execute("""
        UPDATE event_attendance ea
        SET user_id = u.id
        FROM "user" u
        WHERE LOWER(ea.email) = LOWER(u.email)
          AND ea.user_id IS NULL
          AND ea.email IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM event_attendance ea2
              WHERE ea2.event_id = ea.event_id
                AND ea2.user_id = u.id
          )
    """)

    # 3. Recalculate events_attended_count for all university roles from actual
    #    attendance data. This fixes counts for records we just linked above and
    #    corrects any prior miscounts.
    op.execute("""
        UPDATE university_roles ur
        SET events_attended_count = sub.cnt
        FROM (
            SELECT ea.user_id, e.university_id, COUNT(*) AS cnt
            FROM event_attendance ea
            JOIN events e ON ea.event_id = e.id
            WHERE ea.user_id IS NOT NULL
            GROUP BY ea.user_id, e.university_id
        ) sub
        WHERE ur.user_id = sub.user_id
          AND ur.university_id = sub.university_id
    """)

    # Reset to 0 for roles with no attendance records (in case any were wrongly set)
    op.execute("""
        UPDATE university_roles ur
        SET events_attended_count = 0
        WHERE NOT EXISTS (
            SELECT 1
            FROM event_attendance ea
            JOIN events e ON ea.event_id = e.id
            WHERE ea.user_id = ur.user_id
              AND e.university_id = ur.university_id
        )
        AND ur.events_attended_count != 0
    """)


def downgrade():
    op.drop_column('user', 'is_partial')
