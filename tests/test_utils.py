"""
Utility Function Tests

Tests for utility functions:
- validation.py: validate_edu_email, validate_required_fields, is_whitelisted_domain
- image.py: allowed_file, compress_image
- permissions.py: permission check functions
"""

import pytest
from backend.utils.validation import (
    validate_edu_email,
    validate_required_fields,
    is_whitelisted_domain
)
from backend.utils.image import allowed_file, compress_image
from backend.utils.permissions import (
    is_site_admin,
    can_manage_university_members,
    can_manage_executives,
    get_user_university_permissions
)
from backend.models import User
from backend.extensions import db
from backend.constants import ADMIN


class TestValidateEduEmail:
    """Tests for validate_edu_email function"""

    def test_validate_edu_email_valid(self):
        """Test valid .edu email passes"""
        is_valid, error, domain = validate_edu_email('student@uoregon.edu')

        assert is_valid is True
        assert error is None
        assert domain == 'uoregon'

    def test_validate_edu_email_non_edu(self):
        """Test non-.edu email fails"""
        is_valid, error, domain = validate_edu_email('user@gmail.com')

        assert is_valid is False
        assert 'edu' in error.lower()
        assert domain is None

    def test_validate_edu_email_no_at(self):
        """Test email without @ fails"""
        is_valid, error, domain = validate_edu_email('invalidemail')

        assert is_valid is False
        assert error is not None
        assert domain is None

    def test_validate_edu_email_empty(self):
        """Test empty email fails"""
        is_valid, error, domain = validate_edu_email('')

        assert is_valid is False
        assert domain is None

    def test_validate_edu_email_none(self):
        """Test None email fails"""
        is_valid, error, domain = validate_edu_email(None)

        assert is_valid is False
        assert domain is None

    def test_validate_edu_email_extracts_domain(self):
        """Test domain extraction from various formats"""
        # Simple domain
        _, _, domain = validate_edu_email('user@stanford.edu')
        assert domain == 'stanford'

        # Subdomain - should include full subdomain
        _, _, domain = validate_edu_email('user@cs.stanford.edu')
        assert domain == 'cs.stanford'


class TestIsWhitelistedDomain:
    """Tests for is_whitelisted_domain function"""

    def test_is_whitelisted_domain_match(self):
        """Test whitelisted domain returns True"""
        # peekz.com is in the whitelist
        result = is_whitelisted_domain('user@peekz.com')
        assert result is True

    def test_is_whitelisted_domain_no_match(self):
        """Test non-whitelisted domain returns False"""
        result = is_whitelisted_domain('user@gmail.com')
        assert result is False

    def test_is_whitelisted_domain_edu(self):
        """Test .edu domain is not whitelisted (handled separately)"""
        result = is_whitelisted_domain('user@example.edu')
        assert result is False

    def test_is_whitelisted_domain_invalid(self):
        """Test invalid email returns False"""
        assert is_whitelisted_domain('invalid') is False
        assert is_whitelisted_domain('') is False
        assert is_whitelisted_domain(None) is False


class TestValidateRequiredFields:
    """Tests for validate_required_fields function"""

    def test_validate_required_fields_all_present(self):
        """Test that all present fields passes"""
        data = {
            'email': 'user@example.edu',
            'firstName': 'John',
            'lastName': 'Doe'
        }
        is_valid, error = validate_required_fields(data, ['email', 'firstName', 'lastName'])

        assert is_valid is True
        assert error is None

    def test_validate_required_fields_missing(self):
        """Test that missing field fails with field name in error"""
        data = {
            'email': 'user@example.edu',
            'firstName': 'John'
            # lastName missing
        }
        is_valid, error = validate_required_fields(data, ['email', 'firstName', 'lastName'])

        assert is_valid is False
        assert 'name' in error.lower()  # Should mention the field

    def test_validate_required_fields_empty_string(self):
        """Test that whitespace-only field fails"""
        data = {
            'email': 'user@example.edu',
            'firstName': '   ',  # Only whitespace
            'lastName': 'Doe'
        }
        is_valid, error = validate_required_fields(data, ['email', 'firstName', 'lastName'])

        assert is_valid is False
        assert 'first name' in error.lower()

    def test_validate_required_fields_empty_dict(self):
        """Test empty data dictionary fails"""
        is_valid, error = validate_required_fields({}, ['email'])

        assert is_valid is False

    def test_validate_required_fields_none_value(self):
        """Test None value fails"""
        data = {
            'email': None,
            'firstName': 'John'
        }
        is_valid, error = validate_required_fields(data, ['email', 'firstName'])

        assert is_valid is False


class TestAllowedFile:
    """Tests for allowed_file function"""

    def test_allowed_file_valid_extensions(self):
        """Test that valid image extensions are allowed"""
        assert allowed_file('image.png') is True
        assert allowed_file('photo.jpg') is True
        assert allowed_file('picture.jpeg') is True
        assert allowed_file('animation.gif') is True
        assert allowed_file('modern.webp') is True

    def test_allowed_file_invalid_extensions(self):
        """Test that invalid extensions are rejected"""
        assert allowed_file('document.pdf') is False
        assert allowed_file('script.exe') is False
        assert allowed_file('data.json') is False
        assert allowed_file('style.css') is False

    def test_allowed_file_no_extension(self):
        """Test that files without extension are rejected"""
        assert allowed_file('filename') is False

    def test_allowed_file_case_insensitive(self):
        """Test that extension check is case insensitive"""
        assert allowed_file('IMAGE.PNG') is True
        assert allowed_file('Photo.JPG') is True
        assert allowed_file('FILE.JpEg') is True


class TestCompressImage:
    """Tests for compress_image function"""

    def test_compress_image_valid(self, sample_image_data):
        """Test compressing valid image data"""
        compressed = compress_image(sample_image_data)

        assert compressed is not None
        assert isinstance(compressed, bytes)
        # Should return some image data
        assert len(compressed) > 0

    def test_compress_image_invalid_data(self):
        """Test that invalid image data raises error"""
        with pytest.raises(ValueError):
            compress_image(b'not an image')

    def test_compress_image_with_options(self, sample_image_data):
        """Test compress with custom max_size and quality"""
        compressed = compress_image(
            sample_image_data,
            max_size=(400, 400),
            quality=70
        )

        assert compressed is not None


class TestPermissionFunctions:
    """Tests for permission utility functions"""

    def test_is_site_admin_true(self, app, admin_user):
        """Test is_site_admin for admin user"""
        with app.app_context():
            user = db.session.get(User, admin_user.id)
            assert is_site_admin(user) is True

    def test_is_site_admin_false(self, app, test_user):
        """Test is_site_admin for regular user"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            assert is_site_admin(user) is False

    def test_is_site_admin_none_user(self):
        """Test is_site_admin with None user"""
        assert is_site_admin(None) is False

    def test_can_manage_university_members_admin(self, app, admin_user, test_university):
        """Test that site admin can manage any university"""
        with app.app_context():
            user = db.session.get(User, admin_user.id)
            result = can_manage_university_members(user, test_university.id)
            assert result is True

    def test_can_manage_university_members_executive(
        self, app, executive_user, test_university
    ):
        """Test that executive can manage their university"""
        with app.app_context():
            user = db.session.get(User, executive_user.id)
            result = can_manage_university_members(user, test_university.id)
            assert result is True

    def test_can_manage_university_members_regular(self, app, member_user, test_university):
        """Test that regular member cannot manage"""
        with app.app_context():
            user = db.session.get(User, member_user.id)
            result = can_manage_university_members(user, test_university.id)
            assert result is False

    def test_can_manage_executives_president(self, app, president_user, test_university):
        """Test that president can manage executives"""
        with app.app_context():
            user = db.session.get(User, president_user.id)
            result = can_manage_executives(user, test_university.id)
            assert result is True

    def test_can_manage_executives_executive(self, app, executive_user, test_university):
        """Test that executive cannot manage other executives"""
        with app.app_context():
            user = db.session.get(User, executive_user.id)
            result = can_manage_executives(user, test_university.id)
            assert result is False

    def test_get_user_university_permissions_complete(
        self, app, president_user, test_university
    ):
        """Test getting complete permission summary"""
        with app.app_context():
            user = db.session.get(User, president_user.id)
            permissions = get_user_university_permissions(user, test_university.id)

            assert 'isMember' in permissions
            assert 'isExecutive' in permissions
            assert 'isPresident' in permissions
            assert 'isSiteAdmin' in permissions
            assert 'canManageMembers' in permissions
            assert 'canManageExecutives' in permissions
            assert 'role' in permissions
            assert 'roleName' in permissions

    def test_get_user_university_permissions_unauthenticated(
        self, app, test_university
    ):
        """Test permissions for unauthenticated user"""
        permissions = get_user_university_permissions(None, test_university.id)

        assert permissions['isMember'] is False
        assert permissions['canManageMembers'] is False
        assert permissions['role'] is None
