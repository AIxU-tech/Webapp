"""
Health Check and Basic API Tests

Tests for basic application functionality:
- Health check endpoint
"""

import pytest


class TestHealthCheck:
    """Tests for the /healthz endpoint"""

    def test_health_check_returns_200(self, client):
        """Test that health check endpoint returns 200 OK"""
        response = client.get('/healthz')

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'healthy'
