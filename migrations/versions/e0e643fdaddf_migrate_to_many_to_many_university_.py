"""Migrate to many-to-many university relationships

Revision ID: e0e643fdaddf
Revises: 
Create Date: 2025-12-29 20:28:33.493880

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
import json


# revision identifiers, used by Alembic.
revision = 'e0e643fdaddf'
down_revision = None
branch_labels = None
depends_on = None


def migrate_university_members(connection):
    """Migrate universities.members JSON to university_roles table"""
    try:
        universities_with_members = connection.execute(text("""
            SELECT id, members FROM universities 
            WHERE members IS NOT NULL AND members != ''
        """))

        for uni_row in universities_with_members:
            university_id = uni_row[0]
            members_json = uni_row[1]

            if members_json:
                try:
                    member_ids = json.loads(members_json)
                    if isinstance(member_ids, list):
                        for member_id in member_ids:
                            if isinstance(member_id, int):
                                try:
                                    # Insert as MEMBER role (role = 0)
                                    # Adjust the role value if needed based on your UniversityRole enum
                                    connection.execute(text("""
                                        INSERT INTO university_roles (user_id, university_id, role, created_at, updated_at)
                                        VALUES (:user_id, :university_id, 0, NOW(), NOW())
                                        ON CONFLICT (user_id, university_id) DO NOTHING
                                    """), {'user_id': member_id, 'university_id': university_id})
                                except Exception as e:
                                    print(
                                        f"Could not migrate member for university {university_id}, user {member_id}: {e}")
                except (json.JSONDecodeError, ValueError, TypeError) as e:
                    print(
                        f"Could not parse members for university {university_id}: {e}")

        connection.commit()
        print("✓ Migrated university members data")
    except Exception as e:
        print(f"✗ Error migrating university members: {e}")


def migrate_liked_notes(connection):
    """Migrate user.liked_notes JSON to note_likes table"""
    try:
        users_with_liked_notes = connection.execute(text("""
            SELECT id, liked_notes FROM "user" 
            WHERE liked_notes IS NOT NULL AND liked_notes != ''
        """))

        for user_row in users_with_liked_notes:
            user_id = user_row[0]
            liked_notes_json = user_row[1]

            if liked_notes_json:
                try:
                    note_ids = json.loads(liked_notes_json)
                    if isinstance(note_ids, list):
                        for note_id in note_ids:
                            if isinstance(note_id, int):
                                try:
                                    connection.execute(text("""
                                        INSERT INTO note_likes (user_id, note_id, created_at)
                                        VALUES (:user_id, :note_id, NOW())
                                        ON CONFLICT (user_id, note_id) DO NOTHING
                                    """), {'user_id': user_id, 'note_id': note_id})
                                except Exception as e:
                                    print(
                                        f"Could not migrate liked_note for user {user_id}, note {note_id}: {e}")
                except (json.JSONDecodeError, ValueError, TypeError) as e:
                    print(
                        f"Could not parse liked_notes for user {user_id}: {e}")

        connection.commit()
        print("✓ Migrated liked_notes data")
    except Exception as e:
        print(f"✗ Error migrating liked_notes: {e}")


def migrate_bookmarked_notes(connection):
    """Migrate user.bookmarked_notes JSON to note_bookmarks table"""
    try:
        users_with_bookmarked_notes = connection.execute(text("""
            SELECT id, bookmarked_notes FROM "user" 
            WHERE bookmarked_notes IS NOT NULL AND bookmarked_notes != ''
        """))

        for user_row in users_with_bookmarked_notes:
            user_id = user_row[0]
            bookmarked_notes_json = user_row[1]

            if bookmarked_notes_json:
                try:
                    note_ids = json.loads(bookmarked_notes_json)
                    if isinstance(note_ids, list):
                        for note_id in note_ids:
                            if isinstance(note_id, int):
                                try:
                                    connection.execute(text("""
                                        INSERT INTO note_bookmarks (user_id, note_id, created_at)
                                        VALUES (:user_id, :note_id, NOW())
                                        ON CONFLICT (user_id, note_id) DO NOTHING
                                    """), {'user_id': user_id, 'note_id': note_id})
                                except Exception as e:
                                    print(
                                        f"Could not migrate bookmarked_note for user {user_id}, note {note_id}: {e}")
                except (json.JSONDecodeError, ValueError, TypeError) as e:
                    print(
                        f"Could not parse bookmarked_notes for user {user_id}: {e}")

        connection.commit()
        print("✓ Migrated bookmarked_notes data")
    except Exception as e:
        print(f"✗ Error migrating bookmarked_notes: {e}")


def migrate_liked_universities(connection):
    """Migrate user.liked_universities JSON to user_liked_universities table"""
    try:
        users_with_liked_universities = connection.execute(text("""
            SELECT id, liked_universities FROM "user" 
            WHERE liked_universities IS NOT NULL AND liked_universities != ''
        """))

        for user_row in users_with_liked_universities:
            user_id = user_row[0]
            liked_universities_json = user_row[1]

            if liked_universities_json:
                try:
                    university_strings = json.loads(liked_universities_json)
                    if isinstance(university_strings, list):
                        for uni_string in university_strings:
                            if uni_string:
                                # Try to find matching university by name or email_domain
                                try:
                                    result = connection.execute(text("""
                                        SELECT id FROM universities 
                                        WHERE name = :uni_string OR email_domain = :uni_string
                                        LIMIT 1
                                    """), {'uni_string': str(uni_string)})

                                    uni_row = result.fetchone()
                                    if uni_row:
                                        university_id = uni_row[0]
                                        try:
                                            connection.execute(text("""
                                                INSERT INTO user_liked_universities (user_id, university_id, created_at)
                                                VALUES (:user_id, :university_id, NOW())
                                                ON CONFLICT (user_id, university_id) DO NOTHING
                                            """), {'user_id': user_id, 'university_id': university_id})
                                        except Exception as e:
                                            print(
                                                f"Could not migrate liked_university for user {user_id}, uni {university_id}: {e}")
                                    else:
                                        print(
                                            f"Could not find university matching '{uni_string}' for user {user_id}")
                                except Exception as e:
                                    print(
                                        f"Error looking up university '{uni_string}': {e}")
                except (json.JSONDecodeError, ValueError, TypeError) as e:
                    print(
                        f"Could not parse liked_universities for user {user_id}: {e}")

        connection.commit()
        print("✓ Migrated liked_universities data")
    except Exception as e:
        print(f"✗ Error migrating liked_universities: {e}")


def upgrade():

    connection = op.get_bind()
    # Create new tables
    # ### commands auto generated by Alembic - please adjust! ###

    op.add_column('notes', sa.Column(
        'university_only', sa.Boolean(), nullable=True))
    op.add_column('universities', sa.Column(
        'website_url', sa.String(length=500), nullable=True))
    op.drop_constraint('university_requests_account_creation_token_key',
                       'university_requests', type_='unique')
    op.drop_index('ix_university_requests_account_creation_token',
                  table_name='university_requests')
    op.create_index(op.f('ix_university_requests_account_creation_token'),
                    'university_requests', ['account_creation_token'], unique=True)
    op.drop_constraint('university_roles_user_id_fkey',
                       'university_roles', type_='foreignkey')
    op.drop_constraint('university_roles_university_id_fkey',
                       'university_roles', type_='foreignkey')
    op.create_foreign_key(None, 'university_roles', 'universities', [
                          'university_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key(None, 'university_roles', 'user', [
                          'user_id'], ['id'], ondelete='CASCADE')
    op.alter_column('user', 'profile_picture_filename',
                    existing_type=sa.VARCHAR(length=255),
                    type_=sa.String(length=100),
                    existing_nullable=True)
    op.alter_column('user', 'profile_picture_mimetype',
                    existing_type=sa.VARCHAR(length=100),
                    type_=sa.String(length=50),
                    existing_nullable=True)

    migrate_liked_notes(connection)
    migrate_bookmarked_notes(connection)
    migrate_liked_universities(connection)
    migrate_university_members(connection)

    op.drop_constraint('user_username_key', 'user', type_='unique')
    op.drop_column('user', 'liked_notes')
    op.drop_column('user', 'liked_universities')
    op.drop_column('user', 'username')
    op.drop_column('user', 'bookmarked_notes')
    op.drop_constraint(
        'user_follows_follower_id_following_id_key', 'user_follows', type_='unique')
    op.create_index('ix_user_follows_follower', 'user_follows',
                    ['follower_id'], unique=False)
    op.create_index('ix_user_follows_following', 'user_follows', [
                    'following_id'], unique=False)
    op.create_unique_constraint('uq_user_follows', 'user_follows', [
                                'follower_id', 'following_id'])
    op.drop_constraint('user_follows_follower_id_fkey',
                       'user_follows', type_='foreignkey')
    op.drop_constraint('user_follows_following_id_fkey',
                       'user_follows', type_='foreignkey')
    op.create_foreign_key(None, 'user_follows', 'user', [
                          'follower_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key(None, 'user_follows', 'user', [
                          'following_id'], ['id'], ondelete='CASCADE')
    op.alter_column('user_liked_universities', 'university_id',
                    existing_type=sa.VARCHAR(length=100),
                    type_=sa.Integer(),
                    existing_nullable=False)
    op.drop_constraint('user_liked_universities_user_id_university_id_key',
                       'user_liked_universities', type_='unique')
    op.create_index('ix_user_liked_universities_university',
                    'user_liked_universities', ['university_id'], unique=False)
    op.create_index('ix_user_liked_universities_user',
                    'user_liked_universities', ['user_id'], unique=False)
    op.create_unique_constraint('uq_user_liked_university', 'user_liked_universities', [
                                'user_id', 'university_id'])
    op.drop_constraint('user_liked_universities_user_id_fkey',
                       'user_liked_universities', type_='foreignkey')
    op.create_foreign_key(None, 'user_liked_universities', 'user', [
                          'user_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key(None, 'user_liked_universities', 'universities', [
                          'university_id'], ['id'], ondelete='CASCADE')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'user_liked_universities', type_='foreignkey')
    op.drop_constraint(None, 'user_liked_universities', type_='foreignkey')
    op.create_foreign_key('user_liked_universities_user_id_fkey',
                          'user_liked_universities', 'user', ['user_id'], ['id'])
    op.drop_constraint('uq_user_liked_university',
                       'user_liked_universities', type_='unique')
    op.drop_index('ix_user_liked_universities_user',
                  table_name='user_liked_universities')
    op.drop_index('ix_user_liked_universities_university',
                  table_name='user_liked_universities')
    op.create_unique_constraint('user_liked_universities_user_id_university_id_key',
                                'user_liked_universities', ['user_id', 'university_id'])
    op.alter_column('user_liked_universities', 'university_id',
                    existing_type=sa.Integer(),
                    type_=sa.VARCHAR(length=100),
                    existing_nullable=False)
    op.drop_constraint(None, 'user_follows', type_='foreignkey')
    op.drop_constraint(None, 'user_follows', type_='foreignkey')
    op.create_foreign_key('user_follows_following_id_fkey',
                          'user_follows', 'user', ['following_id'], ['id'])
    op.create_foreign_key('user_follows_follower_id_fkey',
                          'user_follows', 'user', ['follower_id'], ['id'])
    op.drop_constraint('uq_user_follows', 'user_follows', type_='unique')
    op.drop_index('ix_user_follows_following', table_name='user_follows')
    op.drop_index('ix_user_follows_follower', table_name='user_follows')
    op.create_unique_constraint('user_follows_follower_id_following_id_key', 'user_follows', [
                                'follower_id', 'following_id'])
    op.add_column('user', sa.Column('bookmarked_notes',
                  sa.TEXT(), autoincrement=False, nullable=True))
    op.add_column('user', sa.Column('username', sa.VARCHAR(
        length=80), autoincrement=False, nullable=True))
    op.add_column('user', sa.Column('liked_universities',
                  sa.TEXT(), autoincrement=False, nullable=True))
    op.add_column('user', sa.Column('liked_notes', sa.TEXT(),
                  autoincrement=False, nullable=True))
    op.create_unique_constraint('user_username_key', 'user', ['username'])
    op.alter_column('user', 'profile_picture_mimetype',
                    existing_type=sa.String(length=50),
                    type_=sa.VARCHAR(length=100),
                    existing_nullable=True)
    op.alter_column('user', 'profile_picture_filename',
                    existing_type=sa.String(length=100),
                    type_=sa.VARCHAR(length=255),
                    existing_nullable=True)
    op.drop_constraint(None, 'university_roles', type_='foreignkey')
    op.drop_constraint(None, 'university_roles', type_='foreignkey')
    op.create_foreign_key('university_roles_university_id_fkey',
                          'university_roles', 'universities', ['university_id'], ['id'])
    op.create_foreign_key('university_roles_user_id_fkey',
                          'university_roles', 'user', ['user_id'], ['id'])
    op.drop_index(op.f('ix_university_requests_account_creation_token'),
                  table_name='university_requests')
    op.create_index('ix_university_requests_account_creation_token',
                    'university_requests', ['account_creation_token'], unique=False)
    op.create_unique_constraint('university_requests_account_creation_token_key',
                                'university_requests', ['account_creation_token'])
    op.drop_column('universities', 'website_url')
    op.drop_column('notes', 'university_only')
    # ### end Alembic commands ###
