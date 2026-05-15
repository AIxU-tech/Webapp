"""
Nominatim Geocoder

Talks to the OpenStreetMap Nominatim search API. The public instance has
a strict usage policy:
- Maximum 1 request per second
- Descriptive User-Agent required (no generic 'python-requests/...')
- No bulk geocoding
- Attribution required on the map

The 1 req/sec limit is enforced at the module level via a lock so that
concurrent Flask request threads share the same throttle.
"""

import logging
import os
import threading
import time

import requests

from backend.constants import GeocodeStatus
from backend.services.geocoding.base import Geocoder, GeocodeResult


logger = logging.getLogger(__name__)


# Nominatim public-instance policy: minimum 1 second between requests.
# Configurable down to a smaller value for tests via the
# NOMINATIM_MIN_INTERVAL_SECONDS env var (1.1s default leaves a small
# safety margin over the documented 1.0s minimum).
_DEFAULT_MIN_INTERVAL_SECONDS = 1.1


class NominatimGeocoder(Geocoder):
    """
    Geocoder backed by https://nominatim.openstreetmap.org/search.

    Configuration is read from environment variables at construction time:
        NOMINATIM_BASE_URL: defaults to the public instance.
        GEOCODER_USER_AGENT: REQUIRED by Nominatim TOS. A descriptive
            string identifying the application + a contact address.
        GEOCODER_EMAIL: optional, sent as the `email` query parameter so
            that the operators can reach the application owner.
        NOMINATIM_TIMEOUT_SECONDS: per-request HTTP timeout (default 5).
        NOMINATIM_MIN_INTERVAL_SECONDS: throttle floor (default 1.1).
    """

    # Process-wide throttle. A single lock + timestamp is sufficient under
    # Flask's typical request-per-thread model; for multi-process gunicorn
    # workers each worker enforces its own ceiling, which is acceptable
    # given the very low expected request volume.
    _rate_limit_lock = threading.Lock()
    _last_request_time: float = 0.0

    def __init__(
        self,
        base_url: str | None = None,
        user_agent: str | None = None,
        email: str | None = None,
        timeout_seconds: float | None = None,
        min_interval_seconds: float | None = None,
    ):
        self.base_url = (
            base_url
            or os.environ.get('NOMINATIM_BASE_URL', 'https://nominatim.openstreetmap.org')
        ).rstrip('/')
        self.user_agent = user_agent or os.environ.get('GEOCODER_USER_AGENT', '')
        self.email = email or os.environ.get('GEOCODER_EMAIL') or None
        self.timeout_seconds = float(
            timeout_seconds
            if timeout_seconds is not None
            else os.environ.get('NOMINATIM_TIMEOUT_SECONDS', '5')
        )
        self.min_interval_seconds = float(
            min_interval_seconds
            if min_interval_seconds is not None
            else os.environ.get('NOMINATIM_MIN_INTERVAL_SECONDS', str(_DEFAULT_MIN_INTERVAL_SECONDS))
        )

        if not self.user_agent:
            # Nominatim's TOS bans generic User-Agent strings. We warn loudly
            # rather than fail hard so local dev still works, but a real
            # deployment must set this env var.
            logger.warning(
                "GEOCODER_USER_AGENT is not set; Nominatim may reject these "
                "requests under their usage policy."
            )

    def _wait_for_rate_limit(self) -> None:
        """Block until at least min_interval_seconds have passed since the last call."""
        with self._rate_limit_lock:
            now = time.monotonic()
            wait = self.min_interval_seconds - (now - self._last_request_time)
            if wait > 0:
                time.sleep(wait)
            type(self)._last_request_time = time.monotonic()

    def geocode(self, query: str) -> GeocodeResult:
        if not query or not query.strip():
            # Defensive: callers should short-circuit, but if a bad query
            # gets through, surface it as a failure rather than hammering
            # Nominatim with an empty `q=`.
            return GeocodeResult(status=GeocodeStatus.FAILED)

        self._wait_for_rate_limit()

        params = {
            'q': query,
            'format': 'json',
            'limit': 1,
            'countrycodes': 'us',
            'addressdetails': 0,
        }
        if self.email:
            params['email'] = self.email

        headers = {}
        if self.user_agent:
            headers['User-Agent'] = self.user_agent

        start = time.monotonic()
        try:
            response = requests.get(
                f'{self.base_url}/search',
                params=params,
                headers=headers,
                timeout=self.timeout_seconds,
            )
        except requests.RequestException as e:
            logger.info(
                "Nominatim request failed for %r after %.0fms: %s",
                query, (time.monotonic() - start) * 1000, e,
            )
            return GeocodeResult(status=GeocodeStatus.FAILED)

        latency_ms = (time.monotonic() - start) * 1000

        if response.status_code != 200:
            logger.info(
                "Nominatim returned HTTP %s for %r in %.0fms",
                response.status_code, query, latency_ms,
            )
            return GeocodeResult(status=GeocodeStatus.FAILED)

        try:
            payload = response.json()
        except ValueError:
            logger.info("Nominatim returned non-JSON body for %r", query)
            return GeocodeResult(status=GeocodeStatus.FAILED)

        if not isinstance(payload, list) or len(payload) == 0:
            logger.info("Nominatim returned no results for %r in %.0fms", query, latency_ms)
            return GeocodeResult(status=GeocodeStatus.NOT_FOUND, raw={'response': payload})

        first = payload[0]
        try:
            latitude = float(first['lat'])
            longitude = float(first['lon'])
        except (KeyError, TypeError, ValueError):
            logger.info("Nominatim response missing lat/lon for %r: %r", query, first)
            return GeocodeResult(status=GeocodeStatus.FAILED, raw={'response': first})

        logger.info(
            "Nominatim resolved %r -> (%.4f, %.4f) in %.0fms",
            query, latitude, longitude, latency_ms,
        )
        return GeocodeResult(
            status=GeocodeStatus.OK,
            latitude=latitude,
            longitude=longitude,
            raw={'response': first},
        )
