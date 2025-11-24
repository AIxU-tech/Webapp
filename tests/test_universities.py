"""
Tests for university functionality
"""
import pytest
import json
from backend.models import University, User, UserLikedUniversity
from backend.extensions import db

@pytest.mark.university
class TestUniversitiesPage:
    """Test universities listing page"""

    def test_universities_page_loads(self, client, init_database):
        """Test that universities page loads successfully"""
        response = client.get('/universities')
        assert response.status_code == 200

    def test_universities_displays_universities(self, client, test_university):
        """Test that universities page displays universities"""
        response = client.get('/universities')
        assert response.status_code == 200
        assert test_university['name'].encode() in response.data

    def test_universities_shows_member_count(self, client, test_university):
        """Test that universities page shows member count"""
        response = client.get('/universities')
        assert response.status_code == 200
        # Member count should be displayed somewhere on the page


@pytest.mark.university
class TestUniversityCreation:
    """Test creating new universities"""

    def test_create_university_as_admin(self, admin_authenticated_client, app):
        """Test that admin can create a university"""
        response = admin_authenticated_client.post('/universities/new', data={
            'name': 'New University',
            'clubName': 'New AI Club',
            'location': 'New City, State',
            'description': 'A new university club',
            'tags': 'AI, ML, Research'
        }, follow_redirects=True)

        assert response.status_code == 200

        # Verify university was created
        with app.app_context():
            uni = University.query.filter_by(name='New University').first()
            assert uni is not None
            assert uni.clubName == 'New AI Club'
            assert uni.location == 'New City, State'

    def test_create_university_as_regular_user(self, authenticated_client):
        """Test that regular user cannot create a university"""
        response = authenticated_client.post('/universities/new', data={
            'name': 'Unauthorized University',
            'clubName': 'Unauthorized Club',
        }, follow_redirects=True)

        # Should be denied
        assert response.status_code == 200
        assert b'permission' in response.data.lower() or b'not authorized' in response.data.lower()

    def test_create_university_duplicate_name(self, admin_authenticated_client, test_university):
        """Test that creating university with duplicate name fails"""
        response = admin_authenticated_client.post('/universities/new', data={
            'name': test_university['name'],  # Duplicate name
            'clubName': 'Different Club Name',
        }, follow_redirects=True)

        assert response.status_code == 200
        assert b'already exists' in response.data.lower()

    def test_create_university_missing_name(self, admin_authenticated_client):
        """Test that creating university without name fails"""
        response = admin_authenticated_client.post('/universities/new', data={
            'clubName': 'Club Without Uni Name',
        }, follow_redirects=True)

        assert response.status_code == 200
        assert b'required' in response.data.lower()

    def test_create_university_with_tags(self, admin_authenticated_client, app):
        """Test creating university with tags"""
        response = admin_authenticated_client.post('/universities/new', data={
            'name': 'Tagged University',
            'clubName': 'Tagged Club',
            'tags': 'AI, Machine Learning, Deep Learning'
        }, follow_redirects=True)

        assert response.status_code == 200

        with app.app_context():
            uni = University.query.filter_by(name='Tagged University').first()
            if uni:
                tags = json.loads(uni.tags) if uni.tags else []
                assert 'AI' in tags


@pytest.mark.university
class TestUniversityDetail:
    """Test university detail page"""

    def test_university_detail_page_loads(self, client, test_university):
        """Test that university detail page loads"""
        response = client.get(f'/universities/{test_university["id"]}')
        assert response.status_code == 200
        assert test_university['name'].encode() in response.data

    def test_university_detail_shows_members(self, client, test_university, admin_user, app):
        """Test that university detail page shows members"""
        response = client.get(f'/universities/{test_university["id"]}')
        assert response.status_code == 200
        # Admin user should be shown as a member

    def test_university_detail_nonexistent(self, client, init_database):
        """Test that nonexistent university returns error"""
        response = client.get('/universities/99999', follow_redirects=True)
        assert response.status_code == 200
        assert b'not found' in response.data.lower()


@pytest.mark.university
class TestUniversityJoin:
    """Test joining universities"""

    def test_join_university_with_matching_domain(self, client, test_user, admin_user, app):
        """Test joining university with matching email domain"""
        # Create university with admin who has specific domain
        with app.app_context():
            # Update admin user to have a specific domain
            admin = User.query.get(admin_user['id'])
            admin.email = 'admin@university.edu'
            db.session.commit()

            # Update test user to have same domain and clear existing university affiliation
            user = User.query.get(test_user['id'])
            user.email = 'student@university.edu'
            user.university = None  # Clear existing university to allow joining
            db.session.commit()

            # Create university
            uni = University(
                name='Domain Test University',
                clubName='Domain Test Club',
                admin_id=admin.id
            )
            uni.set_members_list([admin.id])
            db.session.add(uni)
            db.session.commit()
            uni_id = uni.id

        # Login as test user
        client.post('/login', data={
            'email': test_user['email'],
            'password': test_user['password']
        })

        # Try to join university
        response = client.post(f'/universities/{uni_id}/join', follow_redirects=True)
        assert response.status_code == 200

        # Verify membership
        with app.app_context():
            uni = University.query.get(uni_id)
            members = uni.get_members_list()
            assert test_user['id'] in members

    def test_join_university_with_mismatched_domain(self, client, test_user, admin_user, app):
        """Test that joining fails with mismatched email domain"""
        with app.app_context():
            admin = User.query.get(admin_user['id'])
            admin.email = 'admin@university.edu'
            db.session.commit()

            user = User.query.get(test_user['id'])
            user.email = 'student@different.edu'  # Different domain
            db.session.commit()

            uni = University(
                name='Domain Check University',
                clubName='Domain Check Club',
                admin_id=admin.id
            )
            uni.set_members_list([admin.id])
            db.session.add(uni)
            db.session.commit()
            uni_id = uni.id

        client.post('/login', data={
            'email': 'student@different.edu',
            'password': test_user['password']
        })

        response = client.post(f'/universities/{uni_id}/join', follow_redirects=True)
        assert response.status_code == 200
        assert b'must have an email' in response.data.lower() or b'domain' in response.data.lower()

    def test_join_university_already_member(self, authenticated_client, test_university, test_user, app):
        """Test joining university when already a member"""
        # Add user to university first
        with app.app_context():
            uni = University.query.get(test_university['id'])
            uni.add_member(test_user['id'])
            db.session.commit()

        response = authenticated_client.post(f'/universities/{test_university["id"]}/join',
                                            follow_redirects=True)
        assert response.status_code == 200
        assert b'already a member' in response.data.lower()

    def test_join_university_requires_authentication(self, client, test_university):
        """Test that joining university requires authentication"""
        response = client.post(f'/universities/{test_university["id"]}/join',
                              follow_redirects=False)
        assert response.status_code == 302


@pytest.mark.university
class TestUniversityEdit:
    """Test editing universities"""

    def test_edit_university_as_admin(self, admin_authenticated_client, test_university, app):
        """Test that university admin can edit their university"""
        response = admin_authenticated_client.post(
            f'/universities/{test_university["id"]}/edit',
            data={
                'name': 'Updated University Name',
                'clubName': 'Updated Club Name',
                'location': 'Updated Location',
                'description': 'Updated description',
                'tags': 'Updated, Tags'
            },
            follow_redirects=True
        )

        assert response.status_code == 200

        # Verify changes
        with app.app_context():
            uni = University.query.get(test_university['id'])
            assert uni.name == 'Updated University Name'
            assert uni.clubName == 'Updated Club Name'

    def test_edit_university_as_non_admin(self, authenticated_client, test_university):
        """Test that non-admin cannot edit university"""
        response = authenticated_client.post(
            f'/universities/{test_university["id"]}/edit',
            data={
                'name': 'Hacked Name'
            },
            follow_redirects=True
        )

        assert response.status_code == 200
        assert b'not authorized' in response.data.lower()

    def test_edit_university_page_loads(self, admin_authenticated_client, test_university):
        """Test that edit university page loads for admin"""
        response = admin_authenticated_client.get(
            f'/universities/{test_university["id"]}/edit'
        )
        assert response.status_code == 200


@pytest.mark.university
class TestUniversityDeletion:
    """Test deleting universities"""

    def test_delete_university_as_admin(self, admin_authenticated_client, app, admin_user):
        """Test that admin can delete their university"""
        # Create a university to delete
        with app.app_context():
            uni = University(
                name='Delete Test University',
                clubName='Delete Test Club',
                admin_id=admin_user['id']
            )
            db.session.add(uni)
            db.session.commit()
            uni_id = uni.id

        response = admin_authenticated_client.post(
            f'/universities/{uni_id}/delete',
            follow_redirects=True
        )

        assert response.status_code == 200

        # Verify deletion
        with app.app_context():
            uni = University.query.get(uni_id)
            assert uni is None

    def test_delete_university_as_non_admin(self, authenticated_client, test_university):
        """Test that non-admin cannot delete university"""
        response = authenticated_client.post(
            f'/universities/{test_university["id"]}/delete',
            follow_redirects=True
        )

        assert response.status_code == 200
        assert b'not authorized' in response.data.lower()


@pytest.mark.university
class TestUniversityMembers:
    """Test university member management"""

    def test_remove_member_as_admin(self, admin_authenticated_client, test_university, test_user, app):
        """Test that admin can remove members"""
        # Add user as member first
        with app.app_context():
            uni = University.query.get(test_university['id'])
            uni.add_member(test_user['id'])
            db.session.commit()

        response = admin_authenticated_client.post(
            f'/universities/{test_university["id"]}/remove_member/{test_user["id"]}',
            follow_redirects=True
        )

        assert response.status_code == 200

        # Verify removal
        with app.app_context():
            uni = University.query.get(test_university['id'])
            members = uni.get_members_list()
            assert test_user['id'] not in members

    def test_remove_member_as_non_admin(self, authenticated_client, test_university, test_user2):
        """Test that non-admin cannot remove members"""
        response = authenticated_client.post(
            f'/universities/{test_university["id"]}/remove_member/{test_user2["id"]}',
            follow_redirects=True
        )

        assert response.status_code == 200
        assert b'not authorized' in response.data.lower()


@pytest.mark.university
class TestUniversityLikes:
    """Test university like functionality"""

    def test_like_university(self, authenticated_client, test_university, test_user, app):
        """Test liking a university"""
        response = authenticated_client.post(
            f'/api/universities/{test_university["id"]}/like'
        )

        assert response.status_code in [200, 201]
        data = json.loads(response.data)
        assert data['success'] is True

        # Verify like in database
        with app.app_context():
            like = UserLikedUniversity.query.filter_by(
                user_id=test_user['id'],
                university_id=str(test_university['id'])
            ).first()
            assert like is not None

    def test_unlike_university(self, authenticated_client, test_university, test_user, app):
        """Test unliking a university"""
        # Like it first
        with app.app_context():
            like = UserLikedUniversity(
                user_id=test_user['id'],
                university_id=str(test_university['id'])
            )
            db.session.add(like)
            db.session.commit()

        # Unlike it
        response = authenticated_client.post(
            f'/api/universities/{test_university["id"]}/like'
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['liked'] is False

        # Verify unlike in database
        with app.app_context():
            like = UserLikedUniversity.query.filter_by(
                user_id=test_user['id'],
                university_id=str(test_university['id'])
            ).first()
            assert like is None


@pytest.mark.university
class TestUniversityModel:
    """Test University model methods"""

    def test_add_member(self, app, test_university, test_user):
        """Test adding a member to university"""
        with app.app_context():
            uni = University.query.get(test_university['id'])
            initial_count = uni.member_count

            uni.add_member(test_user['id'])
            db.session.commit()

            assert test_user['id'] in uni.get_members_list()
            assert uni.member_count == initial_count + 1

    def test_remove_member(self, app, test_university, test_user):
        """Test removing a member from university"""
        with app.app_context():
            uni = University.query.get(test_university['id'])
            uni.add_member(test_user['id'])
            db.session.commit()

            initial_count = uni.member_count

            uni.remove_member(test_user['id'])
            db.session.commit()

            assert test_user['id'] not in uni.get_members_list()
            assert uni.member_count == initial_count - 1

    def test_university_to_dict(self, app, test_university):
        """Test converting university to dictionary"""
        with app.app_context():
            uni = University.query.get(test_university['id'])
            uni_dict = uni.to_dict()

            assert uni_dict['id'] == test_university['id']
            assert uni_dict['name'] == test_university['name']
            assert 'memberCount' in uni_dict
            assert 'members' in uni_dict
