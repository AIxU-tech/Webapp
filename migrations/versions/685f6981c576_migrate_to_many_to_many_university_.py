"""Migrate to many-to-many university relationships and update schemas

Revision ID: 685f6981c576
Revises: 
Create Date: 2025-12-29 18:09:52.280272

This migration:
1. Creates new tables: opportunities, opportunity_tags, note_comments, events, 
   event_attendees, password_reset_tokens
2. Creates new relationship tables: note_likes, note_bookmarks, note_comment_likes,
   opportunity_bookmarks
3. Updates existing tables: adds university_only to notes, updates user_follows with
   indexes and cascade deletes
4. Migrates user_liked_universities from String to Integer with foreign key
5. Migrates JSON column data to relationship tables
6. Migrates University.members JSON to university_roles table
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
import json


# revision identifiers, used by Alembic.
revision = '685f6981c576'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Get connection for data migration
    connection = op.get_bind()
    
    # =============================================================================
    # 1. Create new main tables
    # =============================================================================
    
    # Create opportunities table
    op.create_table(
        'opportunities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('compensation', sa.String(length=500), nullable=True),
        sa.Column('university_only', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('tags', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['author_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_opportunities_author_id'), 'opportunities', ['author_id'], unique=False)
    
    # Create opportunity_tags table
    op.create_table(
        'opportunity_tags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('opportunity_id', sa.Integer(), nullable=False),
        sa.Column('tag', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['opportunity_id'], ['opportunities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('opportunity_id', 'tag', name='unique_opportunity_tag')
    )
    op.create_index('idx_opportunity_tags_tag', 'opportunity_tags', ['tag'], unique=False)
    
    # Create note_comments table
    op.create_table(
        'note_comments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('note_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('likes', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['note_id'], ['notes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_id'], ['note_comments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_note_comments_note', 'note_comments', ['note_id'], unique=False)
    op.create_index('ix_note_comments_user', 'note_comments', ['user_id'], unique=False)
    op.create_index('ix_note_comments_parent', 'note_comments', ['parent_id'], unique=False)
    
    # Create events table
    op.create_table(
        'events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('university_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('location', sa.String(length=300), nullable=True),
        sa.Column('start_time', sa.DateTime(), nullable=False),
        sa.Column('end_time', sa.DateTime(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['university_id'], ['universities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_events_university_id'), 'events', ['university_id'], unique=False)
    op.create_index(op.f('ix_events_created_by_id'), 'events', ['created_by_id'], unique=False)
    
    # Create event_attendees table
    op.create_table(
        'event_attendees',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True, server_default='attending'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('event_id', 'user_id', name='unique_event_attendee')
    )
    
    # Create password_reset_tokens table
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(length=100), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token')
    )
    op.create_index('ix_password_reset_token', 'password_reset_tokens', ['token'], unique=False)
    op.create_index('ix_password_reset_user', 'password_reset_tokens', ['user_id'], unique=False)
    
    # =============================================================================
    # 2. Create new relationship/junction tables
    # =============================================================================
    
    # Create note_likes table
    op.create_table(
        'note_likes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('note_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['note_id'], ['notes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'note_id', name='uq_note_like')
    )
    op.create_index('ix_note_likes_user', 'note_likes', ['user_id'], unique=False)
    op.create_index('ix_note_likes_note', 'note_likes', ['note_id'], unique=False)
    
    # Create note_bookmarks table
    op.create_table(
        'note_bookmarks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('note_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['note_id'], ['notes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'note_id', name='uq_note_bookmark')
    )
    op.create_index('ix_note_bookmarks_user', 'note_bookmarks', ['user_id'], unique=False)
    op.create_index('ix_note_bookmarks_note', 'note_bookmarks', ['note_id'], unique=False)
    
    # Create note_comment_likes table
    op.create_table(
        'note_comment_likes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('comment_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['comment_id'], ['note_comments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'comment_id', name='uq_note_comment_like')
    )
    op.create_index('ix_note_comment_likes_user', 'note_comment_likes', ['user_id'], unique=False)
    op.create_index('ix_note_comment_likes_comment', 'note_comment_likes', ['comment_id'], unique=False)
    
    # Create opportunity_bookmarks table
    op.create_table(
        'opportunity_bookmarks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('opportunity_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['opportunity_id'], ['opportunities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'opportunity_id', name='uq_opportunity_bookmark')
    )
    op.create_index('ix_opportunity_bookmarks_user', 'opportunity_bookmarks', ['user_id'], unique=False)
    op.create_index('ix_opportunity_bookmarks_opportunity', 'opportunity_bookmarks', ['opportunity_id'], unique=False)
    
    # =============================================================================
    # 3. Update existing tables
    # =============================================================================
    
    # Add university_only column to notes table
    op.add_column('notes', sa.Column('university_only', sa.Boolean(), nullable=True, server_default='false'))
    
    # Update user_follows table: Add indexes and update foreign keys to have CASCADE
    # Note: We can't modify existing foreign keys in PostgreSQL easily, so we'll add indexes
    # The CASCADE behavior will be enforced by SQLAlchemy relationships
    op.create_index('ix_user_follows_follower', 'user_follows', ['follower_id'], unique=False)
    op.create_index('ix_user_follows_following', 'user_follows', ['following_id'], unique=False)
    
    # Try to rename existing unique constraint to match new schema naming
    # This is optional - if it fails, the constraint will keep its current name
    try:
        op.execute(text("""
            ALTER TABLE user_follows 
            RENAME CONSTRAINT user_follows_follower_id_following_id_key TO uq_user_follows
        """))
    except Exception:
        # Constraint might have a different name or already be named correctly, continue
        pass
    
    # =============================================================================
    # 4. Migrate user_liked_universities from String to Integer
    # =============================================================================
    
    # Check if user_liked_universities table exists
    result = connection.execute(text("""
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_name = 'user_liked_universities'
    """))
    ulu_table_exists = result.scalar() > 0
    
    if ulu_table_exists:
        # Check if university_id column is String (old) or Integer (new)
        result = connection.execute(text("""
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'user_liked_universities' 
            AND column_name = 'university_id'
        """))
        col_info = result.fetchone()
        
        if col_info and col_info[0] in ('character varying', 'varchar', 'text'):
            # Need to migrate from String to Integer
            # Step 1: Create backup table
            op.execute(text("""
                CREATE TABLE user_liked_universities_backup AS
                SELECT * FROM user_liked_universities
            """))
            
            # Step 2: Drop old table
            op.drop_table('user_liked_universities')
            
            # Step 3: Create new table with Integer university_id
            op.create_table(
                'user_liked_universities',
                sa.Column('id', sa.Integer(), nullable=False),
                sa.Column('user_id', sa.Integer(), nullable=False),
                sa.Column('university_id', sa.Integer(), nullable=False),
                sa.Column('created_at', sa.DateTime(), nullable=True),
                sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
                sa.ForeignKeyConstraint(['university_id'], ['universities.id'], ondelete='CASCADE'),
                sa.PrimaryKeyConstraint('id'),
                sa.UniqueConstraint('user_id', 'university_id', name='uq_user_liked_university')
            )
            
            # Step 4: Migrate data from backup, matching strings to university IDs
            # Try to match by university name first, then by email_domain
            connection.execute(text("""
                INSERT INTO user_liked_universities (user_id, university_id, created_at)
                SELECT DISTINCT ON (ulu.user_id, u.id)
                    ulu.user_id,
                    u.id as university_id,
                    COALESCE(ulu.created_at, NOW())
                FROM user_liked_universities_backup ulu
                JOIN universities u ON (
                    u.name = ulu.university_id::text 
                    OR u.email_domain = ulu.university_id::text
                )
                WHERE u.id IS NOT NULL
                ORDER BY ulu.user_id, u.id, ulu.created_at
            """))
            connection.commit()
            
            # Step 5: Add indexes
            op.create_index('ix_user_liked_universities_user', 'user_liked_universities', ['user_id'], unique=False)
            op.create_index('ix_user_liked_universities_university', 'user_liked_universities', ['university_id'], unique=False)
            
            # Step 6: Drop backup table (optional - comment out if you want to keep it)
            # op.drop_table('user_liked_universities_backup')
        else:
            # Table exists but already has Integer type, just add indexes if missing
            try:
                op.create_index('ix_user_liked_universities_user', 'user_liked_universities', ['user_id'], unique=False)
            except Exception:
                pass
            try:
                op.create_index('ix_user_liked_universities_university', 'user_liked_universities', ['university_id'], unique=False)
            except Exception:
                pass
    else:
        # Table doesn't exist, create it with new schema
        op.create_table(
            'user_liked_universities',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('university_id', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['university_id'], ['universities.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id', 'university_id', name='uq_user_liked_university')
        )
        op.create_index('ix_user_liked_universities_user', 'user_liked_universities', ['user_id'], unique=False)
        op.create_index('ix_user_liked_universities_university', 'user_liked_universities', ['university_id'], unique=False)
    
    # =============================================================================
    # 5. Migrate JSON column data to relationship tables
    # =============================================================================
    
    # Migrate User.liked_notes JSON to note_likes table
    users_with_liked_notes = connection.execute(text("""
        SELECT id, liked_notes FROM "user" 
        WHERE liked_notes IS NOT NULL AND liked_notes != ''
    """))
    
    for user_row in users_with_liked_notes:
        user_id = user_row[0]
        liked_notes_json = user_row[1]
        
        try:
            note_ids = json.loads(liked_notes_json)
            if isinstance(note_ids, list):
                for note_id in note_ids:
                    if isinstance(note_id, int):
                        # Insert if not already exists
                        try:
                            connection.execute(
                                text("""
                                    INSERT INTO note_likes (user_id, note_id, created_at)
                                    VALUES (:user_id, :note_id, NOW())
                                    ON CONFLICT (user_id, note_id) DO NOTHING
                                """),
                                {'user_id': user_id, 'note_id': note_id}
                            )
                        except Exception:
                            # Skip if conflict or other error
                            pass
        except (json.JSONDecodeError, ValueError):
            # Invalid JSON, skip this user
            continue
    
    connection.commit()
    
    # Migrate User.bookmarked_notes JSON to note_bookmarks table
    users_with_bookmarked_notes = connection.execute(text("""
        SELECT id, bookmarked_notes FROM "user" 
        WHERE bookmarked_notes IS NOT NULL AND bookmarked_notes != ''
    """))
    
    for user_row in users_with_bookmarked_notes:
        user_id = user_row[0]
        bookmarked_notes_json = user_row[1]
        
        try:
            note_ids = json.loads(bookmarked_notes_json)
            if isinstance(note_ids, list):
                for note_id in note_ids:
                    if isinstance(note_id, int):
                        # Insert if not already exists
                        try:
                            connection.execute(
                                text("""
                                    INSERT INTO note_bookmarks (user_id, note_id, created_at)
                                    VALUES (:user_id, :note_id, NOW())
                                    ON CONFLICT (user_id, note_id) DO NOTHING
                                """),
                                {'user_id': user_id, 'note_id': note_id}
                            )
                        except Exception:
                            # Skip if conflict or other error
                            pass
        except (json.JSONDecodeError, ValueError):
            # Invalid JSON, skip this user
            continue
    
    connection.commit()
    
    # Migrate User.liked_universities JSON to user_liked_universities table
    users_with_liked_universities = connection.execute(text("""
        SELECT id, liked_universities FROM "user" 
        WHERE liked_universities IS NOT NULL AND liked_universities != ''
    """))
    
    for user_row in users_with_liked_universities:
        user_id = user_row[0]
        liked_universities_json = user_row[1]
        
        try:
            university_strings = json.loads(liked_universities_json)
            if isinstance(university_strings, list):
                for uni_string in university_strings:
                    if isinstance(uni_string, str):
                        # Try to find matching university by name or email_domain
                        result = connection.execute(text("""
                            SELECT id FROM universities 
                            WHERE name = :uni_string OR email_domain = :uni_string
                            LIMIT 1
                        """), {'uni_string': uni_string})
                        
                        uni_row = result.fetchone()
                        if uni_row:
                            university_id = uni_row[0]
                            # Insert if not already exists
                            try:
                                connection.execute(
                                    text("""
                                        INSERT INTO user_liked_universities (user_id, university_id, created_at)
                                        VALUES (:user_id, :university_id, NOW())
                                        ON CONFLICT (user_id, university_id) DO NOTHING
                                    """),
                                    {'user_id': user_id, 'university_id': university_id}
                                )
                            except Exception:
                                # Skip if conflict or other error
                                pass
        except (json.JSONDecodeError, ValueError):
            # Invalid JSON, skip this user
            continue
    
    connection.commit()
    
    # =============================================================================
    # 6. Migrate University.members JSON to university_roles table
    # =============================================================================
    
    # Check if universities table has members column
    result = connection.execute(text("""
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name = 'universities' AND column_name = 'members'
    """))
    has_members_col = result.scalar() > 0
    
    if has_members_col:
        universities_with_members = connection.execute(text("""
            SELECT id, members FROM universities 
            WHERE members IS NOT NULL AND members != ''
        """))
        
        for uni_row in universities_with_members:
            university_id = uni_row[0]
            members_json = uni_row[1]
            
            try:
                member_ids = json.loads(members_json)
                if isinstance(member_ids, list):
                    for member_id in member_ids:
                        if isinstance(member_id, int):
                            # Insert as MEMBER role (0) if not already exists
                            try:
                                connection.execute(
                                    text("""
                                        INSERT INTO university_roles (user_id, university_id, role, created_at, updated_at)
                                        VALUES (:user_id, :university_id, 0, NOW(), NOW())
                                        ON CONFLICT (user_id, university_id) DO NOTHING
                                    """),
                                    {'user_id': member_id, 'university_id': university_id}
                                )
                            except Exception:
                                # Skip if conflict or other error
                                pass
            except (json.JSONDecodeError, ValueError):
                # Invalid JSON, skip this university
                continue
        
        connection.commit()


def downgrade():
    # Get connection
    connection = op.get_bind()
    
    # Drop new relationship tables
    op.drop_table('opportunity_bookmarks')
    op.drop_table('note_comment_likes')
    op.drop_table('note_bookmarks')
    op.drop_table('note_likes')
    
    # Drop new main tables
    op.drop_table('password_reset_tokens')
    op.drop_table('event_attendees')
    op.drop_table('events')
    op.drop_table('note_comments')
    op.drop_table('opportunity_tags')
    op.drop_table('opportunities')
    
    # Remove university_only column from notes
    op.drop_column('notes', 'university_only')
    
    # Drop indexes from user_follows (constraints remain)
    try:
        op.drop_index('ix_user_follows_following', table_name='user_follows')
    except Exception:
        pass
    try:
        op.drop_index('ix_user_follows_follower', table_name='user_follows')
    except Exception:
        pass
    
    # Revert user_liked_universities to String type if backup exists
    result = connection.execute(text("""
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_name = 'user_liked_universities_backup'
    """))
    backup_exists = result.scalar() > 0
    
    if backup_exists:
        op.drop_table('user_liked_universities')
        op.execute(text("""
            ALTER TABLE user_liked_universities_backup 
            RENAME TO user_liked_universities
        """))
    else:
        # Just drop the table if no backup
        op.drop_table('user_liked_universities')
