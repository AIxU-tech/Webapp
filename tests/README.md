# AIxU Website Test Suite

This directory contains comprehensive tests for the AIxU website, covering all major functionality including authentication, profiles, community features, universities, and messaging.

## Test Structure

```
tests/
├── conftest.py           # Pytest configuration and shared fixtures
├── test_auth.py          # Authentication and login tests
├── test_profile.py       # User profile functionality tests
├── test_community.py     # Community and notes tests
├── test_universities.py  # University management tests
├── test_messaging.py     # Messaging functionality tests
└── test_api.py          # API endpoints and general tests
```

## Running Tests

### Prerequisites

Install test dependencies:
```bash
pip install -r requirements-test.txt
```

### Run All Tests

```bash
pytest
```

### Run Specific Test Files

```bash
# Authentication tests only
pytest tests/test_auth.py

# Profile tests only
pytest tests/test_profile.py

# Community tests only
pytest tests/test_community.py
```

### Run Tests by Marker

```bash
# Run only authentication tests
pytest -m auth

# Run only API tests
pytest -m api

# Run only integration tests
pytest -m integration
```

### Run with Coverage

```bash
# Run with coverage report
pytest --cov=. --cov-report=html

# View coverage report
open htmlcov/index.html
```

### Run Specific Tests

```bash
# Run a specific test class
pytest tests/test_auth.py::TestLogin

# Run a specific test function
pytest tests/test_auth.py::TestLogin::test_successful_login_with_email
```

## Test Markers

The test suite uses pytest markers to organize tests:

- `@pytest.mark.auth` - Authentication tests
- `@pytest.mark.profile` - Profile management tests
- `@pytest.mark.community` - Community and notes tests
- `@pytest.mark.university` - University tests
- `@pytest.mark.messaging` - Messaging tests
- `@pytest.mark.api` - API endpoint tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.slow` - Slow running tests

## Available Fixtures

Common fixtures available in all tests (from `conftest.py`):

- `app` - Flask application instance
- `client` - Test client for making requests
- `init_database` - Initialize clean database
- `test_user` - Create a test user
- `test_user2` - Create a second test user
- `admin_user` - Create an admin user
- `test_university` - Create a test university
- `test_note` - Create a test note
- `test_message` - Create a test message
- `authenticated_client` - Client with authenticated session
- `admin_authenticated_client` - Client with admin session
- `sample_image` - Sample image for testing uploads

## Test Coverage

Current test coverage includes:

### Authentication (test_auth.py)
- User registration flow
- Email verification
- Login with email
- Logout
- Password hashing and security
- Authorization protection

### Profile (test_profile.py)
- Profile viewing (own and public)
- Profile updates
- Skills and interests management
- University affiliation
- Profile picture upload/delete
- Account deletion
- User statistics

### Community (test_community.py)
- Community page display
- Note creation and deletion
- Note tags
- Like/unlike functionality
- Bookmark functionality
- Time ago calculations

### Universities (test_universities.py)
- University listing
- University creation (admin only)
- University detail pages
- Joining universities
- Domain-based membership
- Member management
- University editing/deletion
- Like universities

### Messaging (test_messaging.py)
- Messages page
- Sending messages
- Viewing conversations
- Message read status
- User search
- Conversation grouping

### API (test_api.py)
- Static pages
- Feedback submission
- API endpoints
- Error handling
- Session management
- Database constraints
- Permission levels
- Data validation

## Writing New Tests

### Example Test Structure

```python
@pytest.mark.your_marker
class TestYourFeature:
    """Test your feature description"""

    def test_your_specific_case(self, authenticated_client, test_user):
        """Test description"""
        # Arrange
        data = {'key': 'value'}

        # Act
        response = authenticated_client.post('/your/endpoint', json=data)

        # Assert
        assert response.status_code == 200
        assert b'expected' in response.data
```

### Best Practices

1. **Use descriptive test names** - Test name should describe what is being tested
2. **Follow AAA pattern** - Arrange, Act, Assert
3. **Use appropriate fixtures** - Reuse fixtures from conftest.py
4. **Test edge cases** - Not just happy paths
5. **Mock external dependencies** - Use pytest-mock for email, external APIs
6. **Keep tests independent** - Each test should work in isolation
7. **Use markers** - Tag tests appropriately for organization

## Continuous Integration

Tests automatically run on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Manual workflow dispatch

See `.github/workflows/test.yml` for CI configuration.

## Troubleshooting

### Database Conflicts
If you see database errors, the test database might be locked:
```bash
rm -f test.db
pytest
```

### Import Errors
Make sure you're in the project root:
```bash
cd /path/to/AIxU_website
pytest
```

### Coverage Not Working
Reinstall coverage tools:
```bash
pip install --upgrade pytest-cov coverage
```

## Contributing

When adding new features:
1. Write tests first (TDD approach recommended)
2. Ensure all existing tests pass
3. Aim for >80% code coverage
4. Add appropriate markers to new tests
5. Update this README if adding new test categories
