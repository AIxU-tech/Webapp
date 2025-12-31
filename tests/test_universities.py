"""
Universities API Tests

Tests for university-related endpoints:
- GET /api/universities - List all universities
- GET /api/universities/<id> - Get university details
- DELETE /api/universities/<id>/members/<user_id> - Remove member
- DELETE /api/universities/<id> - Delete university
"""

import pytest
from backend.models import User, University, UniversityRole
from backend.extensions import db
from backend.constants import ADMIN, UniversityRoles


class TestUniversityListing:
    """Tests for university listing endpoints"""

    def test_list_universities_returns_all(self, client, test_university, second_university, app):
        """Test that list endpoint returns all universities"""
        with app.app_context():
            response = client.get('/api/universities')

            assert response.status_code == 200
            data = response.get_json()
            assert 'universities' in data
            assert len(data['universities']) == 2

    def test_list_universities_sorted_by_name(self, client, app):
        """Test that universities are returned sorted alphabetically"""
        with app.app_context():
            # Create universities with different names
            uni_z = University(
                name='ZZZ University',
                email_domain='zulu',
                clubName='ZZZ AI Club'
            )
            uni_a = University(
                name='AAA University',
                email_domain='alpha',
                clubName='AAA AI Club'
            )
            db.session.add_all([uni_z, uni_a])
            db.session.commit()

            response = client.get('/api/universities')
            data = response.get_json()

            names = [u['name'] for u in data['universities']]
            assert names == sorted(names)

    def test_list_universities_includes_stats(self, client, test_university, app):
        """Test that university list includes member count and stats"""
        with app.app_context():
            response = client.get('/api/universities')
            data = response.get_json()

            uni = data['universities'][0]
            assert 'memberCount' in uni
            assert 'recentPosts' in uni
            assert 'tags' in uni
            assert 'emailDomain' in uni


class TestUniversityDetail:
    """Tests for university detail endpoint"""

    def test_university_detail_success(self, client, test_university, app):
        """Test getting university details by ID"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            response = client.get(f'/api/universities/{university.id}')

            assert response.status_code == 200
            data = response.get_json()
            assert data['name'] == 'Test University'
            assert data['clubName'] == 'Test AI Club'

    def test_university_detail_not_found(self, client, app):
        """Test getting non-existent university returns 404"""
        response = client.get('/api/universities/99999')

        assert response.status_code == 404
        data = response.get_json()
        assert 'error' in data

    def test_university_detail_includes_members(self, client, test_university, test_user_with_university, app):
        """Test that university detail includes member list"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            response = client.get(f'/api/universities/{university.id}')

            assert response.status_code == 200
            data = response.get_json()
            assert 'members' in data
            assert len(data['members']) > 0
            # Check member has expected fields
            member = data['members'][0]
            assert 'id' in member
            assert 'name' in member
            assert 'email' in member

    def test_university_detail_shows_membership_status(
        self, authenticated_client, test_university, test_user, app
    ):
        """Test that detail shows if current user is a member"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            user = db.session.get(User, test_user.id)

            # Add user to university
            user.university = university.name
            university.add_member(user.id)
            db.session.commit()

            response = authenticated_client.get(f'/api/universities/{university.id}')
            data = response.get_json()

            assert data['isMember'] is True

    def test_university_detail_includes_permissions(
        self, authenticated_admin_client, test_university, admin_user, app
    ):
        """Test that detail includes user permissions"""
        with app.app_context():
            university = db.session.get(University, test_university.id)

            response = authenticated_admin_client.get(f'/api/universities/{university.id}')
            data = response.get_json()

            assert 'permissions' in data
            # Admin should have management permissions
            assert data['permissions']['isSiteAdmin'] is True


class TestMemberManagement:
    """Tests for removing members from universities"""

    def test_remove_member_as_site_admin(
        self, authenticated_admin_client, test_university, member_user, admin_user, app
    ):
        """Test that site admin can remove any member"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            member = db.session.get(User, member_user.id)

            # Verify member is in university
            assert member.id in university.get_members_list()

            response = authenticated_admin_client.delete(
                f'/api/universities/{university.id}/members/{member.id}'
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True

            # Verify member is removed
            db.session.refresh(university)
            assert member.id not in university.get_members_list()

    def test_remove_member_as_executive(
        self, authenticated_executive_client, test_university, member_user, executive_user, app
    ):
        """Test that executive can remove member"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            member = db.session.get(User, member_user.id)

            response = authenticated_executive_client.delete(
                f'/api/universities/{university.id}/members/{member.id}'
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True

    def test_remove_member_as_president(
        self, authenticated_president_client, test_university, member_user, president_user, app
    ):
        """Test that president can remove member"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            member = db.session.get(User, member_user.id)

            response = authenticated_president_client.delete(
                f'/api/universities/{university.id}/members/{member.id}'
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True

    def test_remove_member_as_regular_member_fails(
        self, authenticated_member_client, test_university, app
    ):
        """Test that regular member cannot remove others"""
        with app.app_context():
            university = db.session.get(University, test_university.id)

            # Create another member to try to remove
            other_user = User(
                email='other@example.edu',
                first_name='Other',
                last_name='User',
                university=university.name
            )
            other_user.set_password('password123')
            db.session.add(other_user)
            db.session.commit()
            university.add_member(other_user.id)
            db.session.commit()

            response = authenticated_member_client.delete(
                f'/api/universities/{university.id}/members/{other_user.id}'
            )

            assert response.status_code == 403
            data = response.get_json()
            assert 'error' in data

            # Member should still be in university
            db.session.refresh(university)
            assert other_user.id in university.get_members_list()

    def test_remove_member_not_in_university(
        self, authenticated_admin_client, test_university, second_user, admin_user, app
    ):
        """Test removing user who is not a member"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            user = db.session.get(User, second_user.id)

            # Verify user is NOT in university
            assert user.id not in university.get_members_list()

            response = authenticated_admin_client.delete(
                f'/api/universities/{university.id}/members/{user.id}'
            )

            assert response.status_code == 404
            data = response.get_json()
            assert 'error' in data

    def test_cannot_remove_president(
        self, authenticated_admin_client, test_university, president_user, admin_user, app
    ):
        """Test that president cannot be removed without transferring first"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            president = db.session.get(User, president_user.id)

            response = authenticated_admin_client.delete(
                f'/api/universities/{university.id}/members/{president.id}'
            )

            assert response.status_code == 400
            data = response.get_json()
            assert 'error' in data

            # President should still be in university
            db.session.refresh(university)
            assert president.id in university.get_members_list()


class TestUniversityDeletion:
    """Tests for deleting universities"""

    def test_delete_university_as_site_admin(
        self, authenticated_admin_client, test_university, admin_user, app
    ):
        """Test that site admin can delete university"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            uni_id = university.id

            response = authenticated_admin_client.delete(
                f'/api/universities/{uni_id}'
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True

            # Verify university is deleted
            deleted_uni = db.session.get(University, uni_id)
            assert deleted_uni is None

    def test_delete_university_as_president_fails(
        self, authenticated_president_client, test_university, president_user, app
    ):
        """Test that president cannot delete university"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            uni_id = university.id

            response = authenticated_president_client.delete(
                f'/api/universities/{uni_id}'
            )

            assert response.status_code == 403
            data = response.get_json()
            assert 'error' in data

            # University should still exist
            still_exists = db.session.get(University, uni_id)
            assert still_exists is not None

    def test_delete_university_as_regular_user_fails(
        self, authenticated_client, test_university, test_user, app
    ):
        """Test that regular user cannot delete university"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            uni_id = university.id

            response = authenticated_client.delete(
                f'/api/universities/{uni_id}'
            )

            assert response.status_code == 403
            data = response.get_json()
            assert 'error' in data

            # University should still exist
            still_exists = db.session.get(University, uni_id)
            assert still_exists is not None

    def test_delete_university_removes_roles(
        self, authenticated_admin_client, test_university, president_user, executive_user, admin_user, app
    ):
        """Test that deleting university removes all associated roles"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            uni_id = university.id

            # Verify roles exist
            roles_before = UniversityRole.query.filter_by(university_id=uni_id).count()
            assert roles_before > 0

            # Delete university
            response = authenticated_admin_client.delete(f'/api/universities/{uni_id}')
            assert response.status_code == 200

            # Verify roles are deleted
            roles_after = UniversityRole.query.filter_by(university_id=uni_id).count()
            assert roles_after == 0

    def test_delete_nonexistent_university(
        self, authenticated_admin_client, admin_user, app
    ):
        """Test deleting non-existent university"""
        response = authenticated_admin_client.delete('/api/universities/99999')

        assert response.status_code == 404
        data = response.get_json()
        assert 'error' in data

    def test_delete_university_unauthenticated(self, client, test_university, app):
        """Test that unauthenticated user cannot delete university"""
        with app.app_context():
            university = db.session.get(University, test_university.id)

            response = client.delete(f'/api/universities/{university.id}')

            # Should redirect to login or return 401
            assert response.status_code in [302, 401]
