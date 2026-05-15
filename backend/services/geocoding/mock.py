"""
Mock Geocoder

Used by the test suite and by local development when network access to a
real geocoding provider is undesirable. Selected via the env var
``GEOCODER_PROVIDER=mock`` or by directly injecting an instance via
:func:`backend.services.geocoding.set_geocoder` in tests.

Tests typically construct a MockGeocoder with a hand-built ``responses``
mapping (or a callable for dynamic behavior) and assert against
``call_log`` after exercising the route under test.
"""

from typing import Callable, Mapping, Union

from backend.constants import GeocodeStatus
from backend.services.geocoding.base import Geocoder, GeocodeResult


# Type alias: either a static dict-style lookup keyed by query string, or
# a callable that maps a query to a GeocodeResult.
MockResponses = Union[Mapping[str, GeocodeResult], Callable[[str], GeocodeResult]]


class MockGeocoder(Geocoder):
    """
    In-memory geocoder for tests.

    Args:
        responses: A dict ``{query_string: GeocodeResult}`` or a callable
            ``(query_string) -> GeocodeResult``. If a dict is provided and
            the query is missing, the default value is returned.
        default: The GeocodeResult returned for queries not present in
            the ``responses`` dict. Defaults to a NOT_FOUND result so
            tests fail loudly when they forget to register a fixture.
    """

    def __init__(
        self,
        responses: MockResponses | None = None,
        default: GeocodeResult | None = None,
    ):
        self.responses: MockResponses = responses if responses is not None else {}
        self.default: GeocodeResult = default or GeocodeResult(status=GeocodeStatus.NOT_FOUND)
        self.call_log: list[str] = []

    def geocode(self, query: str) -> GeocodeResult:
        self.call_log.append(query)

        if callable(self.responses):
            return self.responses(query)

        return self.responses.get(query, self.default)

    @property
    def call_count(self) -> int:
        """Convenience wrapper around ``len(call_log)`` for terser test assertions."""
        return len(self.call_log)
