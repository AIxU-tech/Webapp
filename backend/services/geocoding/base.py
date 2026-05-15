"""
Geocoder Base Interface

Defines the provider-agnostic contract that all geocoding implementations
must satisfy. Routes and services never import a concrete provider directly;
they go through `get_geocoder()` in the package __init__ so the underlying
provider (Nominatim, LocationIQ, Mapbox, a mock for tests, etc.) can be
swapped via the GEOCODER_PROVIDER env var.

Concrete implementations:
- backend.services.geocoding.nominatim.NominatimGeocoder
- backend.services.geocoding.mock.MockGeocoder
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

from backend.constants import GeocodeStatus


@dataclass
class GeocodeResult:
    """
    Outcome of a single geocoding call.

    Attributes:
        status: One of GeocodeStatus.{OK, NOT_FOUND, FAILED}.
            Note: providers never return MANUAL — that status is only
            set by admin-driven flows in the application layer.
        latitude: Decimal degrees (WGS84), or None unless status == OK.
        longitude: Decimal degrees (WGS84), or None unless status == OK.
        raw: Raw response payload from the provider, kept for debugging.
            Implementations may leave this empty in tests.
    """

    status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    raw: Optional[dict] = field(default=None, repr=False)

    def __post_init__(self):
        if self.status not in (GeocodeStatus.OK, GeocodeStatus.NOT_FOUND, GeocodeStatus.FAILED):
            raise ValueError(
                f"GeocodeResult.status must be one of OK/NOT_FOUND/FAILED, got {self.status!r}"
            )
        if self.status == GeocodeStatus.OK:
            if self.latitude is None or self.longitude is None:
                raise ValueError("GeocodeResult.status == 'ok' requires latitude and longitude")


class Geocoder(ABC):
    """
    Abstract base class for all geocoding providers.

    Implementations must be safe to call from a request thread. Providers
    that talk to the network are responsible for their own rate limiting
    and timeouts; the orchestrator does not impose its own.
    """

    @abstractmethod
    def geocode(self, query: str) -> GeocodeResult:
        """
        Resolve a free-form location query to coordinates.

        Args:
            query: A free-form location string (e.g. "Eugene, OR" or
                "University of Oregon, Eugene, OR"). Must be non-empty;
                callers should short-circuit empty queries before calling.

        Returns:
            A GeocodeResult capturing the outcome. Implementations must
            never raise for routine "not found" or transient network
            failures — those should be encoded as NOT_FOUND or FAILED
            statuses respectively. Unexpected programming errors may
            still raise.
        """
        raise NotImplementedError
