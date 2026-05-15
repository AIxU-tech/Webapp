"""
Geocoding Tests

Covers:
- NominatimGeocoder response parsing (with mocked HTTP)
- University.needs_geocoding() / has_valid_coords() / clear_geocode() helpers
- GET /api/universities?include_coordinates=true lazy-fetch behavior
- PATCH /api/universities/<id> coordinate invalidation on location change
- End-to-end loop: PATCH location -> GET include_coordinates -> coords appear

These tests never hit the real Nominatim API. They either mock
``requests.get`` for the provider unit tests or inject a MockGeocoder
via ``set_geocoder()`` for the route-level integration tests.
"""

from datetime import datetime, timedelta
from unittest.mock import patch

import pytest

from backend.constants import (
    NOT_FOUND_RETRY_DAYS,
    GeocodeStatus,
)
from backend.extensions import db
from backend.models import University
from backend.services.geocoding import (
    GeocodeResult,
    MockGeocoder,
    build_geocode_query,
    geocode_university,
    reset_geocoder,
    set_geocoder,
)
from backend.services.geocoding.nominatim import NominatimGeocoder


# =============================================================================
# Helpers
# =============================================================================


def _make_university(
    name='Lazy University',
    email_domain='lazy',
    club_name='Lazy AI Club',
    location='Eugene, OR',
    latitude=None,
    longitude=None,
    geocode_status=None,
    geocoded_at=None,
):
    """Construct + persist a University with arbitrary geocoding state."""
    uni = University(
        name=name,
        email_domain=email_domain,
        clubName=club_name,
        location=location,
        latitude=latitude,
        longitude=longitude,
        geocode_status=geocode_status,
        geocoded_at=geocoded_at,
    )
    db.session.add(uni)
    db.session.commit()
    db.session.refresh(uni)
    return uni


@pytest.fixture(autouse=True)
def _reset_geocoder_after_test():
    """Make sure no test leaks a geocoder override into the next test."""
    yield
    reset_geocoder()


class _FakeResponse:
    """Minimal stand-in for the bits of requests.Response we exercise."""

    def __init__(self, status_code=200, json_data=None, raise_json=False):
        self.status_code = status_code
        self._json_data = json_data
        self._raise_json = raise_json

    def json(self):
        if self._raise_json:
            raise ValueError('not json')
        return self._json_data


# =============================================================================
# NominatimGeocoder unit tests
# =============================================================================


class TestNominatimGeocoderResponseParsing:
    """Lock in how raw Nominatim responses map to GeocodeResult values."""

    def _build(self):
        # min_interval_seconds=0 keeps the rate-limit sleep out of the test loop.
        return NominatimGeocoder(
            base_url='https://example.test',
            user_agent='AIxU-Test/1.0',
            min_interval_seconds=0,
        )

    def test_ok_response_returns_ok_result(self):
        geocoder = self._build()
        payload = [{'lat': '44.0521', 'lon': '-123.0868', 'display_name': 'Eugene, OR'}]

        with patch('backend.services.geocoding.nominatim.requests.get') as mock_get:
            mock_get.return_value = _FakeResponse(status_code=200, json_data=payload)
            result = geocoder.geocode('Eugene, OR')

        assert result.status == GeocodeStatus.OK
        assert result.latitude == pytest.approx(44.0521)
        assert result.longitude == pytest.approx(-123.0868)

    def test_empty_response_returns_not_found(self):
        geocoder = self._build()

        with patch('backend.services.geocoding.nominatim.requests.get') as mock_get:
            mock_get.return_value = _FakeResponse(status_code=200, json_data=[])
            result = geocoder.geocode('Nonexistent City, ZZ')

        assert result.status == GeocodeStatus.NOT_FOUND
        assert result.latitude is None
        assert result.longitude is None

    def test_http_error_returns_failed(self):
        geocoder = self._build()

        with patch('backend.services.geocoding.nominatim.requests.get') as mock_get:
            mock_get.return_value = _FakeResponse(status_code=429, json_data=None)
            result = geocoder.geocode('Eugene, OR')

        assert result.status == GeocodeStatus.FAILED

    def test_network_exception_returns_failed(self):
        import requests as requests_lib
        geocoder = self._build()

        with patch('backend.services.geocoding.nominatim.requests.get') as mock_get:
            mock_get.side_effect = requests_lib.ConnectionError('boom')
            result = geocoder.geocode('Eugene, OR')

        assert result.status == GeocodeStatus.FAILED

    def test_malformed_json_returns_failed(self):
        geocoder = self._build()

        with patch('backend.services.geocoding.nominatim.requests.get') as mock_get:
            mock_get.return_value = _FakeResponse(status_code=200, raise_json=True)
            result = geocoder.geocode('Eugene, OR')

        assert result.status == GeocodeStatus.FAILED

    def test_response_missing_lat_lon_returns_failed(self):
        geocoder = self._build()
        # First hit is missing lat/lon entirely.
        payload = [{'display_name': 'somewhere'}]

        with patch('backend.services.geocoding.nominatim.requests.get') as mock_get:
            mock_get.return_value = _FakeResponse(status_code=200, json_data=payload)
            result = geocoder.geocode('Eugene, OR')

        assert result.status == GeocodeStatus.FAILED

    def test_empty_query_short_circuits_without_request(self):
        geocoder = self._build()

        with patch('backend.services.geocoding.nominatim.requests.get') as mock_get:
            result = geocoder.geocode('')

        assert mock_get.call_count == 0
        assert result.status == GeocodeStatus.FAILED


# =============================================================================
# Model helper tests
# =============================================================================


class TestUniversityGeocodeHelpers:
    """The pure-Python helpers on University don't need a request context."""

    def test_has_valid_coords_true_for_ok_status(self, app):
        with app.app_context():
            uni = _make_university(
                latitude=1.0,
                longitude=2.0,
                geocode_status=GeocodeStatus.OK,
            )
            assert uni.has_valid_coords() is True

    def test_has_valid_coords_true_for_manual_status(self, app):
        with app.app_context():
            uni = _make_university(
                latitude=1.0,
                longitude=2.0,
                geocode_status=GeocodeStatus.MANUAL,
            )
            assert uni.has_valid_coords() is True

    def test_has_valid_coords_false_when_failed(self, app):
        with app.app_context():
            uni = _make_university(geocode_status=GeocodeStatus.FAILED)
            assert uni.has_valid_coords() is False

    def test_has_valid_coords_false_when_null(self, app):
        with app.app_context():
            uni = _make_university()
            assert uni.has_valid_coords() is False

    def test_needs_geocoding_when_status_null(self, app):
        with app.app_context():
            uni = _make_university()
            assert uni.needs_geocoding() is True

    def test_needs_geocoding_when_failed(self, app):
        with app.app_context():
            uni = _make_university(geocode_status=GeocodeStatus.FAILED)
            assert uni.needs_geocoding() is True

    def test_needs_geocoding_false_when_ok(self, app):
        with app.app_context():
            uni = _make_university(
                latitude=1.0,
                longitude=2.0,
                geocode_status=GeocodeStatus.OK,
                geocoded_at=datetime.utcnow(),
            )
            assert uni.needs_geocoding() is False

    def test_needs_geocoding_false_when_manual(self, app):
        with app.app_context():
            uni = _make_university(
                latitude=1.0,
                longitude=2.0,
                geocode_status=GeocodeStatus.MANUAL,
            )
            assert uni.needs_geocoding() is False

    def test_needs_geocoding_false_for_recent_not_found(self, app):
        with app.app_context():
            recent = datetime.utcnow() - timedelta(days=NOT_FOUND_RETRY_DAYS - 1)
            uni = _make_university(
                geocode_status=GeocodeStatus.NOT_FOUND,
                geocoded_at=recent,
            )
            assert uni.needs_geocoding() is False

    def test_needs_geocoding_true_for_stale_not_found(self, app):
        with app.app_context():
            stale = datetime.utcnow() - timedelta(days=NOT_FOUND_RETRY_DAYS + 1)
            uni = _make_university(
                geocode_status=GeocodeStatus.NOT_FOUND,
                geocoded_at=stale,
            )
            assert uni.needs_geocoding() is True

    def test_clear_geocode_resets_fields(self, app):
        with app.app_context():
            uni = _make_university(
                latitude=1.0,
                longitude=2.0,
                geocode_status=GeocodeStatus.OK,
                geocoded_at=datetime.utcnow(),
            )
            uni.clear_geocode()
            assert uni.latitude is None
            assert uni.longitude is None
            assert uni.geocode_status is None
            assert uni.geocoded_at is None

    def test_clear_geocode_protects_manual_status(self, app):
        with app.app_context():
            uni = _make_university(
                latitude=1.0,
                longitude=2.0,
                geocode_status=GeocodeStatus.MANUAL,
                geocoded_at=datetime.utcnow(),
            )
            uni.clear_geocode()
            assert uni.latitude == 1.0
            assert uni.longitude == 2.0
            assert uni.geocode_status == GeocodeStatus.MANUAL


# =============================================================================
# build_geocode_query / geocode_university orchestration tests
# =============================================================================


class TestBuildGeocodeQuery:
    def test_uses_name_and_location_when_both_present(self, app):
        with app.app_context():
            uni = _make_university(name='Test U', location='Eugene, OR')
            assert build_geocode_query(uni) == 'Test U, Eugene, OR'

    def test_uses_location_only(self, app):
        with app.app_context():
            uni = _make_university(name='', location='Eugene, OR')
            assert build_geocode_query(uni) == 'Eugene, OR'

    def test_uses_name_only(self, app):
        with app.app_context():
            uni = _make_university(name='Test U', location=None)
            assert build_geocode_query(uni) == 'Test U'

    def test_empty_when_neither(self, app):
        with app.app_context():
            uni = _make_university(name='', location=None)
            assert build_geocode_query(uni) == ''


class TestGeocodeUniversity:
    def test_persists_ok_result(self, app):
        with app.app_context():
            uni = _make_university()
            set_geocoder(MockGeocoder({
                'Lazy University, Eugene, OR': GeocodeResult(
                    status=GeocodeStatus.OK, latitude=44.05, longitude=-123.09,
                ),
            }))

            ok = geocode_university(uni)

            assert ok is True
            assert uni.latitude == pytest.approx(44.05)
            assert uni.longitude == pytest.approx(-123.09)
            assert uni.geocode_status == GeocodeStatus.OK
            assert uni.geocoded_at is not None

    def test_persists_not_found_result(self, app):
        with app.app_context():
            uni = _make_university(location='Imaginary City, ZZ')
            set_geocoder(MockGeocoder(default=GeocodeResult(status=GeocodeStatus.NOT_FOUND)))

            ok = geocode_university(uni)

            assert ok is False
            assert uni.latitude is None
            assert uni.longitude is None
            assert uni.geocode_status == GeocodeStatus.NOT_FOUND
            assert uni.geocoded_at is not None

    def test_persists_failed_when_provider_raises(self, app):
        with app.app_context():
            uni = _make_university()

            def raising(_query):
                raise RuntimeError('boom')

            set_geocoder(MockGeocoder(responses=raising))

            ok = geocode_university(uni)

            assert ok is False
            assert uni.geocode_status == GeocodeStatus.FAILED
            assert uni.geocoded_at is not None

    def test_skips_manual_rows(self, app):
        with app.app_context():
            uni = _make_university(
                latitude=10.0,
                longitude=20.0,
                geocode_status=GeocodeStatus.MANUAL,
            )
            mock = MockGeocoder()
            set_geocoder(mock)

            ok = geocode_university(uni)

            assert ok is False
            assert mock.call_count == 0
            assert uni.latitude == 10.0
            assert uni.geocode_status == GeocodeStatus.MANUAL

    def test_empty_query_marks_failed_without_calling_provider(self, app):
        with app.app_context():
            uni = _make_university(name='', location=None)
            mock = MockGeocoder()
            set_geocoder(mock)

            ok = geocode_university(uni)

            assert ok is False
            assert mock.call_count == 0
            assert uni.geocode_status == GeocodeStatus.FAILED


# =============================================================================
# GET /api/universities?include_coordinates=true integration tests
# =============================================================================


class TestListUniversitiesGeocoding:
    def test_default_flag_does_not_call_geocoder(self, client, app):
        """Existing callers (RegisterPage etc.) must not pay the geocoding cost."""
        with app.app_context():
            _make_university()
            mock = MockGeocoder()
            set_geocoder(mock)

            response = client.get('/api/universities')

            assert response.status_code == 200
            assert mock.call_count == 0
            uni = response.get_json()['universities'][0]
            assert 'latitude' not in uni
            assert 'longitude' not in uni
            assert 'geocodeStatus' not in uni

    def test_include_coordinates_returns_geocode_fields(self, client, app):
        with app.app_context():
            _make_university(
                latitude=44.05,
                longitude=-123.09,
                geocode_status=GeocodeStatus.OK,
                geocoded_at=datetime.utcnow(),
            )
            set_geocoder(MockGeocoder())

            response = client.get('/api/universities?include_coordinates=true')

            assert response.status_code == 200
            uni = response.get_json()['universities'][0]
            assert uni['latitude'] == pytest.approx(44.05)
            assert uni['longitude'] == pytest.approx(-123.09)
            assert uni['geocodeStatus'] == GeocodeStatus.OK

    def test_already_geocoded_rows_skip_provider(self, client, app):
        with app.app_context():
            _make_university(
                latitude=44.05,
                longitude=-123.09,
                geocode_status=GeocodeStatus.OK,
                geocoded_at=datetime.utcnow(),
            )
            mock = MockGeocoder()
            set_geocoder(mock)

            response = client.get('/api/universities?include_coordinates=true')

            assert response.status_code == 200
            assert mock.call_count == 0

    def test_lazy_geocode_fills_in_coords_on_first_call(self, client, app):
        with app.app_context():
            uni = _make_university()
            mock = MockGeocoder({
                'Lazy University, Eugene, OR': GeocodeResult(
                    status=GeocodeStatus.OK, latitude=44.05, longitude=-123.09,
                ),
            })
            set_geocoder(mock)

            response = client.get('/api/universities?include_coordinates=true')

            assert response.status_code == 200
            assert mock.call_count == 1
            payload = response.get_json()['universities'][0]
            assert payload['latitude'] == pytest.approx(44.05)
            assert payload['longitude'] == pytest.approx(-123.09)
            assert payload['geocodeStatus'] == GeocodeStatus.OK

            # Persisted to the DB as well.
            refreshed = db.session.get(University, uni.id)
            assert refreshed.geocode_status == GeocodeStatus.OK
            assert refreshed.geocoded_at is not None

    def test_batch_size_cap_is_honored(self, client, app, monkeypatch):
        """With many ungeocoded rows, only the batch-size limit is processed."""
        with app.app_context():
            monkeypatch.setenv('LAZY_GEOCODE_BATCH_SIZE', '2')

            for i in range(5):
                _make_university(
                    name=f'Uni {i}',
                    email_domain=f'uni{i}',
                    club_name=f'Uni {i} Club',
                    location=f'City {i}, ST',
                )

            mock = MockGeocoder(default=GeocodeResult(
                status=GeocodeStatus.OK, latitude=1.0, longitude=2.0,
            ))
            set_geocoder(mock)

            response = client.get('/api/universities?include_coordinates=true')

            assert response.status_code == 200
            assert mock.call_count == 2

            # Three rows are still pending; a subsequent request picks up
            # the next batch.
            response = client.get('/api/universities?include_coordinates=true')
            assert mock.call_count == 4

    def test_geocoder_failure_does_not_break_request(self, client, app):
        with app.app_context():
            _make_university(name='Good', email_domain='good', club_name='Good Club')
            _make_university(name='Bad', email_domain='bad', club_name='Bad Club')

            def selective(query):
                if query.startswith('Bad'):
                    raise RuntimeError('provider blew up')
                return GeocodeResult(status=GeocodeStatus.OK, latitude=1.0, longitude=2.0)

            set_geocoder(MockGeocoder(responses=selective))

            response = client.get('/api/universities?include_coordinates=true')

            assert response.status_code == 200
            unis = {u['name']: u for u in response.get_json()['universities']}
            assert unis['Good']['geocodeStatus'] == GeocodeStatus.OK
            # 'Bad' was marked failed by geocode_university()'s defensive try.
            assert unis['Bad']['geocodeStatus'] == GeocodeStatus.FAILED

    def test_manual_rows_are_not_overwritten(self, client, app):
        with app.app_context():
            _make_university(
                latitude=99.9,
                longitude=88.8,
                geocode_status=GeocodeStatus.MANUAL,
            )
            mock = MockGeocoder(default=GeocodeResult(
                status=GeocodeStatus.OK, latitude=1.0, longitude=2.0,
            ))
            set_geocoder(mock)

            response = client.get('/api/universities?include_coordinates=true')

            assert response.status_code == 200
            assert mock.call_count == 0
            uni = response.get_json()['universities'][0]
            assert uni['latitude'] == pytest.approx(99.9)
            assert uni['geocodeStatus'] == GeocodeStatus.MANUAL


# =============================================================================
# PATCH /api/universities/<id> integration tests
# =============================================================================


class TestPatchUniversityGeocoding:
    def test_location_change_clears_coords(
        self, authenticated_admin_client, test_university, admin_user, app
    ):
        with app.app_context():
            uni = db.session.get(University, test_university.id)
            uni.latitude = 1.0
            uni.longitude = 2.0
            uni.geocode_status = GeocodeStatus.OK
            uni.geocoded_at = datetime.utcnow()
            db.session.commit()

        response = authenticated_admin_client.patch(
            f'/api/universities/{test_university.id}',
            json={'location': 'Portland, OR'},
        )

        assert response.status_code == 200
        with app.app_context():
            refreshed = db.session.get(University, test_university.id)
            assert refreshed.location == 'Portland, OR'
            assert refreshed.latitude is None
            assert refreshed.longitude is None
            assert refreshed.geocode_status is None
            assert refreshed.geocoded_at is None

    def test_location_unchanged_keeps_coords(
        self, authenticated_admin_client, test_university, admin_user, app
    ):
        with app.app_context():
            uni = db.session.get(University, test_university.id)
            uni.latitude = 1.0
            uni.longitude = 2.0
            uni.geocode_status = GeocodeStatus.OK
            uni.geocoded_at = datetime.utcnow()
            db.session.commit()
            original_location = uni.location

        response = authenticated_admin_client.patch(
            f'/api/universities/{test_university.id}',
            json={'location': original_location},
        )

        assert response.status_code == 200
        with app.app_context():
            refreshed = db.session.get(University, test_university.id)
            assert refreshed.latitude == 1.0
            assert refreshed.geocode_status == GeocodeStatus.OK

    def test_manual_status_is_preserved_on_location_change(
        self, authenticated_admin_client, test_university, admin_user, app
    ):
        with app.app_context():
            uni = db.session.get(University, test_university.id)
            uni.latitude = 1.0
            uni.longitude = 2.0
            uni.geocode_status = GeocodeStatus.MANUAL
            uni.geocoded_at = datetime.utcnow()
            db.session.commit()

        response = authenticated_admin_client.patch(
            f'/api/universities/{test_university.id}',
            json={'location': 'Somewhere Else, ZZ'},
        )

        assert response.status_code == 200
        with app.app_context():
            refreshed = db.session.get(University, test_university.id)
            assert refreshed.latitude == 1.0
            assert refreshed.longitude == 2.0
            assert refreshed.geocode_status == GeocodeStatus.MANUAL

    def test_non_location_updates_do_not_clear_coords(
        self, authenticated_admin_client, test_university, admin_user, app
    ):
        with app.app_context():
            uni = db.session.get(University, test_university.id)
            uni.latitude = 1.0
            uni.longitude = 2.0
            uni.geocode_status = GeocodeStatus.OK
            uni.geocoded_at = datetime.utcnow()
            db.session.commit()

        response = authenticated_admin_client.patch(
            f'/api/universities/{test_university.id}',
            json={'description': 'New description, nothing about location.'},
        )

        assert response.status_code == 200
        with app.app_context():
            refreshed = db.session.get(University, test_university.id)
            assert refreshed.latitude == 1.0
            assert refreshed.geocode_status == GeocodeStatus.OK


# =============================================================================
# End-to-end loop test
# =============================================================================


class TestPatchTriggersLazyRegeocode:
    """Editing the location should cause the next list call to re-geocode."""

    def test_patch_then_list_repopulates_coords(
        self, authenticated_admin_client, test_university, admin_user, client, app
    ):
        with app.app_context():
            uni = db.session.get(University, test_university.id)
            uni.latitude = 10.0
            uni.longitude = 20.0
            uni.geocode_status = GeocodeStatus.OK
            uni.geocoded_at = datetime.utcnow()
            db.session.commit()

        # 1) Admin moves the university to a new city.
        response = authenticated_admin_client.patch(
            f'/api/universities/{test_university.id}',
            json={'location': 'Portland, OR'},
        )
        assert response.status_code == 200

        # 2) Next include_coordinates request triggers the lazy geocoder.
        with app.app_context():
            mock = MockGeocoder(default=GeocodeResult(
                status=GeocodeStatus.OK, latitude=45.5, longitude=-122.7,
            ))
            set_geocoder(mock)

        response = client.get('/api/universities?include_coordinates=true')
        assert response.status_code == 200

        uni_payload = response.get_json()['universities'][0]
        assert uni_payload['latitude'] == pytest.approx(45.5)
        assert uni_payload['longitude'] == pytest.approx(-122.7)
        assert uni_payload['geocodeStatus'] == GeocodeStatus.OK
