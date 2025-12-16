"""
Model Unit Tests

Direct tests for model methods and behaviors:
- User model: password hashing, JSON fields, profile pictures
- University model: email domain matching, member management
- Note model: tags, time_ago formatting
- UniversityRole model: role management
"""

import pytest
import json
from datetime import datetime, timedelta
from backend.models import User, University, Note, Message, UniversityRole
from backend.extensions import db
from backend.constants import UniversityRoles


class TestUserModel:
    """Tests for User model methods"""

    def test_user_password_hashing(self, app):
        """Test that password is properly hashed"""
        with app.app_context():
            user = User(email='hashtest@example.edu')
            user.set_password('mypassword123')

            # Password should be hashed, not stored as plaintext
            assert user.password_hash != 'mypassword123'
            assert user.check_password('mypassword123') is True

    def test_user_password_wrong_fails(self, app):
        """Test that wrong password returns False"""
        with app.app_context():
            user = User(email='wrongpass@example.edu')
            user.set_password('correctpassword')

            assert user.check_password('wrongpassword') is False

    def test_user_get_full_name_both(self, app):
        """Test full name with both first and last name"""
        with app.app_context():
            user = User(
                email='fullname@example.edu',
                first_name='John',
                last_name='Doe'
            )
            assert user.get_full_name() == 'John Doe'

    def test_user_get_full_name_first_only(self, app):
        """Test full name with only first name"""
        with app.app_context():
            user = User(
                email='firstname@example.edu',
                first_name='John'
            )
            assert user.get_full_name() == 'John'

    def test_user_skills_json_roundtrip(self, app):
        """Test that skills are properly stored and retrieved as JSON"""
        with app.app_context():
            user = User(email='skills@example.edu')
            skills = ['Python', 'Machine Learning', 'TensorFlow']
            user.set_skills_list(skills)

            retrieved = user.get_skills_list()
            assert retrieved == skills

    def test_user_skills_empty_list(self, app):
        """Test that empty skills returns empty list"""
        with app.app_context():
            user = User(email='noskills@example.edu')
            assert user.get_skills_list() == []

    def test_user_interests_json_roundtrip(self, app):
        """Test that interests are properly stored and retrieved"""
        with app.app_context():
            user = User(email='interests@example.edu')
            interests = ['NLP', 'Computer Vision']
            user.set_interests_list(interests)

            retrieved = user.get_interests_list()
            assert retrieved == interests

    def test_user_to_dict_complete(self, app):
        """Test that to_dict includes all expected fields"""
        with app.app_context():
            user = User(
                email='todict@example.edu',
                first_name='Test',
                last_name='User',
                university='Test University',
                location='Test City'
            )
            user.set_password('password')
            user.set_skills_list(['Python'])
            db.session.add(user)
            db.session.commit()

            user_dict = user.to_dict()

            assert 'id' in user_dict
            assert 'email' in user_dict
            assert 'first_name' in user_dict
            assert 'last_name' in user_dict
            assert 'full_name' in user_dict
            assert 'university' in user_dict
            assert 'skills' in user_dict
            assert 'interests' in user_dict
            assert 'post_count' in user_dict
            assert 'follower_count' in user_dict
            assert 'following_count' in user_dict
            assert 'profile_picture_url' in user_dict

    def test_user_profile_picture_size_limit(self, app, large_image_data):
        """Test that profile picture over 5MB raises ValueError"""
        with app.app_context():
            user = User(email='bigimage@example.edu')
            user.set_password('testpassword')
            db.session.add(user)
            db.session.commit()

            with pytest.raises(ValueError) as exc_info:
                user.set_profile_picture(large_image_data, 'big.jpg', 'image/jpeg')

            assert '5MB' in str(exc_info.value)

    def test_user_profile_picture_valid(self, app, sample_image_data):
        """Test that valid profile picture is stored"""
        with app.app_context():
            user = User(email='validimage@example.edu')
            user.set_password('testpassword')
            db.session.add(user)
            db.session.commit()

            user.set_profile_picture(sample_image_data, 'test.jpg', 'image/jpeg')
            db.session.commit()

            assert user.profile_picture is not None
            assert user.profile_picture_filename == 'test.jpg'
            assert user.profile_picture_mimetype == 'image/jpeg'

    def test_user_delete_profile_picture(self, app, sample_image_data):
        """Test deleting profile picture"""
        with app.app_context():
            user = User(email='deleteimage@example.edu')
            user.set_password('testpassword')
            db.session.add(user)
            db.session.commit()

            user.set_profile_picture(sample_image_data, 'test.jpg', 'image/jpeg')
            db.session.commit()

            user.delete_profile_picture()
            db.session.commit()

            assert user.profile_picture is None
            assert user.profile_picture_filename is None

    def test_user_increment_post_count(self, app):
        """Test incrementing post count"""
        with app.app_context():
            user = User(email='postcount@example.edu')
            user.set_password('password')
            db.session.add(user)
            db.session.commit()

            assert user.post_count == 0
            user.increment_post_count()
            assert user.post_count == 1

    def test_user_follower_count_operations(self, app):
        """Test follower count increment/decrement"""
        with app.app_context():
            user = User(email='followers@example.edu')
            user.set_password('password')
            db.session.add(user)
            db.session.commit()

            assert user.follower_count == 0
            user.increment_follower_count()
            assert user.follower_count == 1
            user.decrement_follower_count()
            assert user.follower_count == 0
            # Should not go below 0
            user.decrement_follower_count()
            assert user.follower_count == 0


class TestUniversityModel:
    """Tests for University model methods"""

    def test_find_by_email_domain_exact(self, app):
        """Test finding university by exact email domain"""
        with app.app_context():
            university = University(
                name='Oregon University',
                email_domain='uoregon',
                clubName='Oregon AI Club'
            )
            db.session.add(university)
            db.session.commit()

            found = University.find_by_email_domain('student@uoregon.edu')
            assert found is not None
            assert found.name == 'Oregon University'

    def test_find_by_email_domain_subdomain(self, app):
        """Test finding university by subdomain email"""
        with app.app_context():
            university = University(
                name='Stanford University',
                email_domain='stanford',
                clubName='Stanford AI Club'
            )
            db.session.add(university)
            db.session.commit()

            found = University.find_by_email_domain('student@cs.stanford.edu')
            assert found is not None
            assert found.name == 'Stanford University'

    def test_find_by_email_domain_non_edu(self, app):
        """Test that non-.edu emails return None"""
        with app.app_context():
            university = University(
                name='Test Uni',
                email_domain='test',
                clubName='Test Club'
            )
            db.session.add(university)
            db.session.commit()

            found = University.find_by_email_domain('user@test.com')
            assert found is None

    def test_find_by_email_domain_no_match(self, app):
        """Test that unknown domain returns None"""
        with app.app_context():
            found = University.find_by_email_domain('user@unknownuni.edu')
            assert found is None

    def test_find_by_email_domain_invalid_email(self, app):
        """Test handling of invalid email formats"""
        with app.app_context():
            assert University.find_by_email_domain('invalid') is None
            assert University.find_by_email_domain('') is None
            assert University.find_by_email_domain(None) is None

    def test_add_member_increments_count(self, app):
        """Test that adding member updates count"""
        with app.app_context():
            university = University(
                name='Member Test',
                email_domain='membertest',
                clubName='Member Club'
            )
            db.session.add(university)
            db.session.commit()

            assert university.member_count == 0
            university.add_member(1)
            db.session.commit()
            assert university.member_count == 1
            assert 1 in university.get_members_list()

    def test_remove_member_decrements_count(self, app):
        """Test that removing member updates count"""
        with app.app_context():
            university = University(
                name='Remove Test',
                email_domain='removetest',
                clubName='Remove Club'
            )
            db.session.add(university)
            db.session.commit()

            university.add_member(1)
            university.add_member(2)
            db.session.commit()
            assert university.member_count == 2

            university.remove_member(1)
            db.session.commit()
            assert university.member_count == 1
            assert 1 not in university.get_members_list()

    def test_add_member_idempotent(self, app):
        """Test that adding member twice doesn't duplicate"""
        with app.app_context():
            university = University(
                name='Idempotent Test',
                email_domain='idempotent',
                clubName='Idempotent Club'
            )
            db.session.add(university)
            db.session.commit()

            university.add_member(1)
            university.add_member(1)  # Add same member again
            db.session.commit()

            assert university.member_count == 1
            members = university.get_members_list()
            assert members.count(1) == 1

    def test_university_to_dict(self, app):
        """Test university serialization"""
        with app.app_context():
            university = University(
                name='Dict Test',
                email_domain='dicttest',
                clubName='Dict Club',
                location='Test City'
            )
            db.session.add(university)
            db.session.commit()

            uni_dict = university.to_dict()
            assert 'id' in uni_dict
            assert 'name' in uni_dict
            assert 'emailDomain' in uni_dict
            assert 'memberCount' in uni_dict
            assert 'members' in uni_dict


class TestNoteModel:
    """Tests for Note model methods"""

    def test_note_time_ago_just_now(self, app, test_user):
        """Test time_ago for recently created note"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            note = Note(
                title='Just Now',
                content='Content',
                author_id=user.id,
                created_at=datetime.utcnow()
            )
            db.session.add(note)
            db.session.commit()

            assert note.get_time_ago() == 'Just now'

    def test_note_time_ago_minutes(self, app, test_user):
        """Test time_ago for notes created minutes ago"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            note = Note(
                title='Minutes Ago',
                content='Content',
                author_id=user.id,
                created_at=datetime.utcnow() - timedelta(minutes=5)
            )
            db.session.add(note)
            db.session.commit()

            assert '5 minutes ago' in note.get_time_ago()

    def test_note_time_ago_hours(self, app, test_user):
        """Test time_ago for notes created hours ago"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            note = Note(
                title='Hours Ago',
                content='Content',
                author_id=user.id,
                created_at=datetime.utcnow() - timedelta(hours=3)
            )
            db.session.add(note)
            db.session.commit()

            assert '3 hours ago' in note.get_time_ago()

    def test_note_time_ago_days(self, app, test_user):
        """Test time_ago for notes created days ago"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            note = Note(
                title='Days Ago',
                content='Content',
                author_id=user.id,
                created_at=datetime.utcnow() - timedelta(days=7)
            )
            db.session.add(note)
            db.session.commit()

            assert '7 days ago' in note.get_time_ago()

    def test_note_tags_json_roundtrip(self, app, test_user):
        """Test that tags are properly stored and retrieved"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            note = Note(
                title='Tagged',
                content='Content',
                author_id=user.id
            )
            tags = ['python', 'ml', 'test']
            note.set_tags_list(tags)
            db.session.add(note)
            db.session.commit()

            retrieved = note.get_tags_list()
            assert retrieved == tags

    def test_note_tags_empty(self, app, test_user):
        """Test that empty tags returns empty list"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            note = Note(
                title='No Tags',
                content='Content',
                author_id=user.id
            )
            db.session.add(note)
            db.session.commit()

            assert note.get_tags_list() == []

    def test_note_to_dict(self, app, test_user):
        """Test note serialization"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            note = Note(
                title='Dict Test',
                content='Content here',
                author_id=user.id
            )
            note.set_tags_list(['test'])
            db.session.add(note)
            db.session.commit()

            note_dict = note.to_dict()
            assert 'id' in note_dict
            assert 'title' in note_dict
            assert 'content' in note_dict
            assert 'author' in note_dict
            assert 'tags' in note_dict
            assert 'likes' in note_dict
            assert 'timeAgo' in note_dict


class TestUniversityRoleModel:
    """Tests for UniversityRole model methods"""

    def test_set_role_creates_if_not_exists(self, app, test_user, test_university):
        """Test that set_role creates new role if none exists"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            university = db.session.get(University, test_university.id)

            role = UniversityRole.set_role(
                user.id,
                university.id,
                UniversityRoles.EXECUTIVE
            )

            assert role is not None
            assert role.role == UniversityRoles.EXECUTIVE

    def test_set_role_updates_if_exists(self, app, test_user, test_university):
        """Test that set_role updates existing role"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            university = db.session.get(University, test_university.id)

            # Create initial role
            UniversityRole.set_role(user.id, university.id, UniversityRoles.MEMBER)

            # Update to executive
            role = UniversityRole.set_role(
                user.id,
                university.id,
                UniversityRoles.EXECUTIVE
            )

            assert role.role == UniversityRoles.EXECUTIVE
            # Should only be one role record
            count = UniversityRole.query.filter_by(
                user_id=user.id,
                university_id=university.id
            ).count()
            assert count == 1

    def test_set_role_invalid_value_raises(self, app, test_user, test_university):
        """Test that invalid role value raises ValueError"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            university = db.session.get(University, test_university.id)

            with pytest.raises(ValueError):
                UniversityRole.set_role(user.id, university.id, 99)

    def test_get_role_level_default_member(self, app, test_user, test_university):
        """Test that no role returns MEMBER level"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            university = db.session.get(University, test_university.id)

            level = UniversityRole.get_role_level(user.id, university.id)
            assert level == UniversityRoles.MEMBER

    def test_remove_role_returns_true(self, app, test_user, test_university):
        """Test removing existing role returns True"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            university = db.session.get(University, test_university.id)

            # Create role first
            UniversityRole.set_role(user.id, university.id, UniversityRoles.EXECUTIVE)

            # Remove it
            result = UniversityRole.remove_role(user.id, university.id)
            assert result is True

    def test_remove_role_nonexistent_returns_false(self, app, test_user, test_university):
        """Test removing non-existent role returns False"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            university = db.session.get(University, test_university.id)

            result = UniversityRole.remove_role(user.id, university.id)
            assert result is False

    def test_role_name_property(self, app, test_user, test_university):
        """Test role_name property returns correct name"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            university = db.session.get(University, test_university.id)

            role = UniversityRole.set_role(
                user.id,
                university.id,
                UniversityRoles.PRESIDENT
            )

            assert role.role_name == 'President'

    def test_is_executive_or_higher(self, app, test_user, test_university):
        """Test is_executive_or_higher check"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            university = db.session.get(University, test_university.id)

            # No role - should be False
            assert UniversityRole.is_executive_or_higher(user.id, university.id) is False

            # Set as executive
            UniversityRole.set_role(user.id, university.id, UniversityRoles.EXECUTIVE)
            assert UniversityRole.is_executive_or_higher(user.id, university.id) is True

    def test_is_president(self, app, test_user, test_university):
        """Test is_president check"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            university = db.session.get(University, test_university.id)

            # Executive is not president
            UniversityRole.set_role(user.id, university.id, UniversityRoles.EXECUTIVE)
            assert UniversityRole.is_president(user.id, university.id) is False

            # President is president
            UniversityRole.set_role(user.id, university.id, UniversityRoles.PRESIDENT)
            assert UniversityRole.is_president(user.id, university.id) is True
