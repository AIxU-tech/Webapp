"""
Geocoding Service

Provider-agnostic geocoding for the AIxU map view. Route handlers and
other services should call :func:`get_geocoder` to obtain the active
implementation, and :func:`geocode_university` to actually persist a
geocoding attempt against a University row.

Provider selection is controlled by the ``GEOCODER_PROVIDER`` env var
(default: ``nominatim``). Tests typically call :func:`set_geocoder` to
inject a :class:`MockGeocoder` instance for the duration of a single
test, then call :func:`reset_geocoder` to restore the production factory
behavior.
"""

import logging
import os
from datetime import datetime
from typing import Optional

from backend.constants import GeocodeStatus
from backend.extensions import db
from backend.services.geocoding.base import Geocoder, GeocodeResult
from backend.services.geocoding.mock import MockGeocoder
from backend.services.geocoding.nominatim import NominatimGeocoder


__all__ = [
    'Geocoder',
    'GeocodeResult',
    'MockGeocoder',
    'NominatimGeocoder',
    'get_geocoder',
    'set_geocoder',
    'reset_geocoder',
    'geocode_university',
    'build_geocode_query',
]


logger = logging.getLogger(__name__)


# Active geocoder instance. When None, get_geocoder() falls back to the
# factory + env var. Tests use set_geocoder() to override this.
_geocoder_override: Optional[Geocoder] = None


def get_geocoder() -> Geocoder:
    """
    Return the active geocoder, building one lazily if needed.

    Resolution order:
        1. The instance set via :func:`set_geocoder` (used by tests).
        2. A new instance keyed by the ``GEOCODER_PROVIDER`` env var.

    A fresh instance is constructed on every call when no override is
    set. This is cheap (no network I/O at construction time) and avoids
    the staleness pitfalls of caching env-driven config.
    """
    if _geocoder_override is not None:
        return _geocoder_override

    provider = os.environ.get('GEOCODER_PROVIDER', 'nominatim').lower()

    if provider == 'nominatim':
        return NominatimGeocoder()
    if provider == 'mock':
        return MockGeocoder()

    raise ValueError(
        f"Unknown GEOCODER_PROVIDER {provider!r}; expected one of 'nominatim', 'mock'"
    )


def set_geocoder(geocoder: Geocoder) -> None:
    """Override the active geocoder. Intended for tests."""
    global _geocoder_override
    _geocoder_override = geocoder


def reset_geocoder() -> None:
    """Clear any geocoder override, falling back to the env-driven factory."""
    global _geocoder_override
    _geocoder_override = None


def build_geocode_query(university) -> str:
    """
    Build the free-form query string sent to the geocoder for a university.

    Preference order:
        - ``"{name}, {location}"`` when both are present (most specific).
        - ``location`` when only it is set (e.g. "Eugene, OR").
        - ``name`` when only the name is set.
        - Empty string when neither is set; callers must treat this as a
          short-circuit signal and write 'failed' without calling the
          provider.

    Args:
        university: A University ORM instance (or any object with
            ``name`` and ``location`` attributes).

    Returns:
        The query string, possibly empty.
    """
    name = (getattr(university, 'name', None) or '').strip()
    location = (getattr(university, 'location', None) or '').strip()

    if name and location:
        return f'{name}, {location}'
    if location:
        return location
    if name:
        return name
    return ''


def geocode_university(university) -> bool:
    """
    Run the geocoder against a single University and persist the result.

    Writes ``latitude``, ``longitude``, ``geocoded_at`` and
    ``geocode_status`` directly onto the passed model. The caller is
    responsible for ``db.session.commit()`` so multiple universities can
    be batched within one transaction.

    Skips rows whose ``geocode_status`` is in
    :attr:`GeocodeStatus.PROTECTED` (e.g. MANUAL). This is a safety net
    on top of the caller-side ``needs_geocoding()`` filter.

    Args:
        university: A University ORM instance.

    Returns:
        True when the row was geocoded successfully (status == OK);
        False otherwise (including skipped rows, transient failures, and
        not-found responses).
    """
    if university.geocode_status in GeocodeStatus.PROTECTED:
        return False

    query = build_geocode_query(university)
    now = datetime.utcnow()

    if not query:
        # Nothing meaningful to send; record the attempt so the lazy
        # fetcher does not loop on this row forever.
        university.geocode_status = GeocodeStatus.FAILED
        university.geocoded_at = now
        return False

    try:
        result = get_geocoder().geocode(query)
    except Exception as e:
        # Defensive: real Geocoder implementations should never raise,
        # but a misbehaving provider must not poison the request batch.
        logger.warning("Geocoder raised unexpectedly for %r: %s", query, e)
        university.geocode_status = GeocodeStatus.FAILED
        university.geocoded_at = now
        return False

    university.geocoded_at = now
    university.geocode_status = result.status

    if result.status == GeocodeStatus.OK:
        university.latitude = result.latitude
        university.longitude = result.longitude
        return True

    return False
