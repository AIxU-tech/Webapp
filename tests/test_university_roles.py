"""
University Roles API Tests

Tests for role management endpoints:
- GET /api/universities/<id>/roles - Get roles for a university
- POST /api/universities/<id>/roles/<user_id> - Update user role
- DELETE /api/universities/<id>/roles/<user_id> - Remove user role
"""

import pytest
from backend.models import User, University, UniversityRole
from backend.extensions import db
from backend.constants import ADMIN, UniversityRoles


class TestRoleListing:
    """Tests for getting university roles"""

    def test_get_university_roles_list(
        self, authenticated_client, test_university, president_user, executive_user, app
    ):
        """Test getting list of roles for a university"""
        with app.app_context():
            university = db.session.get(University, test_university.id)

            response = authenticated_client.get(
                f'/api/universities/{university.id}/roles'
            )

            assert response.status_code == 200
            data = response.get_json()
            assert 'roles' in data
            # Should include president and executive
            assert len(data['roles']) >= 2

    def test_get_university_roles_includes_user_info(
        self, authenticated_client, test_university, president_user, app
    ):
        """Test that roles list includes user information"""
        with app.app_context():
            university = db.session.get(University, test_university.id)

            response = authenticated_client.get(
                f'/api/universities/{university.id}/roles'
            )

            data = response.get_json()
            role = data['roles'][0]
            assert 'userId' in role
            assert 'userName' in role
            assert 'userEmail' in role
            assert 'role' in role
            assert 'roleName' in role

    def test_get_roles_nonexistent_university(self, authenticated_client, app):
        """Test getting roles for non-existent university"""
        response = authenticated_client.get('/api/universities/99999/roles')

        assert response.status_code == 404

    def test_get_roles_unauthenticated(self, client, test_university, app):
        """Test that unauthenticated users cannot get roles"""
        with app.app_context():
            university = db.session.get(University, test_university.id)

            response = client.get(f'/api/universities/{university.id}/roles')

            assert response.status_code == 401


class TestRoleAssignment:
    """Tests for updating user roles"""

    def test_set_role_as_site_admin(
        self, authenticated_admin_client, test_university, member_user, admin_user, app
    ):
        """Test that site admin can set any role"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            member = db.session.get(User, member_user.id)

            response = authenticated_admin_client.post(
                f'/api/universities/{university.id}/roles/{member.id}',
                json={'role': UniversityRoles.EXECUTIVE}
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['role'] == UniversityRoles.EXECUTIVE

    def test_set_role_as_president(
        self, authenticated_president_client, test_university, member_user, president_user, app
    ):
        """Test that president can promote member to executive"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            member = db.session.get(User, member_user.id)

            response = authenticated_president_client.post(
                f'/api/universities/{university.id}/roles/{member.id}',
                json={'role': UniversityRoles.EXECUTIVE}
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data['role'] == UniversityRoles.EXECUTIVE

    def test_set_role_as_executive_fails(
        self, authenticated_executive_client, test_university, member_user, executive_user, app
    ):
        """Test that executive cannot promote others"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            member = db.session.get(User, member_user.id)

            response = authenticated_executive_client.post(
                f'/api/universities/{university.id}/roles/{member.id}',
                json={'role': UniversityRoles.EXECUTIVE}
            )

            assert response.status_code == 403

    def test_promote_to_president_demotes_current(
        self, authenticated_admin_client, test_university, executive_user, president_user, admin_user, app
    ):
        """Test that making new president demotes old one"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            executive = db.session.get(User, executive_user.id)
            president = db.session.get(User, president_user.id)

            # Promote executive to president
            response = authenticated_admin_client.post(
                f'/api/universities/{university.id}/roles/{executive.id}',
                json={'role': UniversityRoles.PRESIDENT}
            )

            assert response.status_code == 200

            # Verify old president is now executive
            old_president_role = UniversityRole.get_role_level(president.id, university.id)
            assert old_president_role == UniversityRoles.EXECUTIVE

    def test_president_cannot_demote_self(
        self, authenticated_president_client, test_university, president_user, app
    ):
        """Test that president cannot demote themselves"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            president = db.session.get(User, president_user.id)

            response = authenticated_president_client.post(
                f'/api/universities/{university.id}/roles/{president.id}',
                json={'role': UniversityRoles.MEMBER}
            )

            assert response.status_code == 400
            data = response.get_json()
            assert 'cannot demote yourself' in data['error'].lower()

    def test_invalid_role_value_rejected(
        self, authenticated_admin_client, test_university, member_user, admin_user, app
    ):
        """Test that invalid role values are rejected"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            member = db.session.get(User, member_user.id)

            response = authenticated_admin_client.post(
                f'/api/universities/{university.id}/roles/{member.id}',
                json={'role': 99}  # Invalid role
            )

            assert response.status_code == 400
            data = response.get_json()
            assert 'invalid' in data['error'].lower()

    def test_set_role_missing_role_field(
        self, authenticated_admin_client, test_university, member_user, admin_user, app
    ):
        """Test that missing role field returns error"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            member = db.session.get(User, member_user.id)

            response = authenticated_admin_client.post(
                f'/api/universities/{university.id}/roles/{member.id}',
                json={}
            )

            assert response.status_code == 400

    def test_set_role_user_not_member(
        self, authenticated_admin_client, test_university, second_user, admin_user, app
    ):
        """Test setting role for non-member fails"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            non_member = db.session.get(User, second_user.id)

            response = authenticated_admin_client.post(
                f'/api/universities/{university.id}/roles/{non_member.id}',
                json={'role': UniversityRoles.EXECUTIVE}
            )

            assert response.status_code == 400
            data = response.get_json()
            assert 'not a member' in data['error'].lower()

    def test_set_role_user_not_found(
        self, authenticated_admin_client, test_university, admin_user, app
    ):
        """Test setting role for non-existent user"""
        with app.app_context():
            university = db.session.get(University, test_university.id)

            response = authenticated_admin_client.post(
                f'/api/universities/{university.id}/roles/99999',
                json={'role': UniversityRoles.EXECUTIVE}
            )

            assert response.status_code == 404


class TestRoleRemoval:
    """Tests for removing user roles"""

    def test_remove_role_resets_to_member(
        self, authenticated_admin_client, test_university, executive_user, admin_user, app
    ):
        """Test that removing role sets user to member"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            executive = db.session.get(User, executive_user.id)

            response = authenticated_admin_client.delete(
                f'/api/universities/{university.id}/roles/{executive.id}'
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data['role'] == UniversityRoles.MEMBER

    def test_remove_role_as_president(
        self, authenticated_president_client, test_university, executive_user, president_user, app
    ):
        """Test that president can remove executive role"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            executive = db.session.get(User, executive_user.id)

            response = authenticated_president_client.delete(
                f'/api/universities/{university.id}/roles/{executive.id}'
            )

            assert response.status_code == 200

    def test_cannot_remove_president_role_directly(
        self, authenticated_president_client, test_university, president_user, app
    ):
        """Test that president role cannot be removed directly"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            president = db.session.get(User, president_user.id)

            response = authenticated_president_client.delete(
                f'/api/universities/{university.id}/roles/{president.id}'
            )

            assert response.status_code == 400
            data = response.get_json()
            assert 'president' in data['error'].lower()

    def test_site_admin_can_remove_president_role(
        self, authenticated_admin_client, test_university, president_user, admin_user, app
    ):
        """Test that site admin can remove any role including president"""
        with app.app_context():
            university = db.session.get(University, test_university.id)
            president = db.session.get(User, president_user.id)

            response = authenticated_admin_client.delete(
                f'/api/universities/{university.id}/roles/{president.id}'
            )

            # Site admin should be able to remove any role
            assert response.status_code == 200


class TestPermissionChecks:
    """Tests for permission summary endpoint"""

    def test_user_permissions_at_university(
        self, authenticated_member_client, test_university, member_user, app
    ):
        """Test getting permission summary for user"""
        with app.app_context():
            university = db.session.get(University, test_university.id)

            response = authenticated_member_client.get(
                f'/api/universities/{university.id}'
            )

            data = response.get_json()
            permissions = data['permissions']

            # Regular member should have minimal permissions
            assert permissions['isMember'] is True
            assert permissions['isExecutive'] is False
            assert permissions['isPresident'] is False
            assert permissions['canManageMembers'] is False

    def test_site_admin_has_all_permissions(
        self, authenticated_admin_client, test_university, admin_user, app
    ):
        """Test that site admin has all permissions at any university"""
        with app.app_context():
            university = db.session.get(University, test_university.id)

            response = authenticated_admin_client.get(
                f'/api/universities/{university.id}'
            )

            data = response.get_json()
            permissions = data['permissions']

            assert permissions['isSiteAdmin'] is True
            assert permissions['canManageMembers'] is True
            assert permissions['canManageExecutives'] is True
            assert permissions['canChangePresident'] is True

    def test_president_permissions(
        self, authenticated_president_client, test_university, president_user, app
    ):
        """Test president has appropriate permissions"""
        with app.app_context():
            university = db.session.get(University, test_university.id)

            response = authenticated_president_client.get(
                f'/api/universities/{university.id}'
            )

            data = response.get_json()
            permissions = data['permissions']

            assert permissions['isPresident'] is True
            assert permissions['canManageMembers'] is True
            assert permissions['canManageExecutives'] is True

    def test_executive_permissions(
        self, authenticated_executive_client, test_university, executive_user, app
    ):
        """Test executive has appropriate permissions"""
        with app.app_context():
            university = db.session.get(University, test_university.id)

            response = authenticated_executive_client.get(
                f'/api/universities/{university.id}'
            )

            data = response.get_json()
            permissions = data['permissions']

            assert permissions['isExecutive'] is True
            assert permissions['canManageMembers'] is True
            assert permissions['canManageExecutives'] is False  # Only president
