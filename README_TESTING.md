# Testing

Backend tests using pytest. Runs automatically via GitHub Actions on push/PR to `main` or `develop`.

## Quick Start

```bash
pip install -r requirements-test.txt
pytest
```

## Structure

```
tests/
├── conftest.py      # Shared fixtures
├── test_auth.py     # /api/auth/* endpoints
└── test_health.py   # Health check, app startup
```

## Fixtures

All fixtures are in `tests/conftest.py`. Use them as function parameters:

```python
def test_something(client, test_user):
    response = client.post('/api/auth/login', json={...})
```

| Fixture | Description |
|---------|-------------|
| `app` | Flask app with SQLite (isolated per test) |
| `client` | Test client for HTTP requests |
| `test_user` | User with email `test@example.edu`, password `testpassword123` |
| `test_university` | University with domain `example` |
| `authenticated_client` | Client with `test_user` logged in |
| `test_user_with_university` | User enrolled in `test_university` |

## Writing Tests

Create `tests/test_<feature>.py`:

```python
class TestFeatureName:
    def test_success_case(self, client, test_user):
        response = client.post('/api/endpoint', json={'key': 'value'})
        assert response.status_code == 200

    def test_error_case(self, client):
        response = client.post('/api/endpoint', json={})
        assert response.status_code == 400
```

## CI Pipeline

On push/PR to `main` or `develop`:
1. Installs dependencies
2. Runs flake8 linting (syntax errors only)
3. Runs pytest
