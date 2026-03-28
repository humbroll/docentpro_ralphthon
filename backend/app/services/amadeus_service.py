"""Amadeus API service — city search + flight price."""

import logging
from datetime import date

import airportsdata
from amadeus import Client

from app.api.v1.schemas import DestinationResult, FlightPrice
from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Client | None = None
_airports: dict | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = Client(
            client_id=settings.AMADEUS_API_KEY,
            client_secret=settings.AMADEUS_API_SECRET,
            hostname="test",
        )
    return _client


def _get_airports() -> dict:
    global _airports
    if _airports is None:
        _airports = airportsdata.load("IATA")
    return _airports


# Well-known hub airports that should always be preferred
_HUB_AIRPORTS = {
    "LHR", "CDG", "JFK", "LAX", "SFO", "ORD", "ATL",
    "NRT", "HND", "ICN", "PEK", "PVG", "SIN", "HKG",
    "DXB", "AMS", "FRA", "FCO", "BCN", "MAD", "MUC",
    "SYD", "MEL", "BKK", "DEL", "BOM", "GRU", "EZE",
    "MEX", "YYZ", "YVR", "MIA", "BOS", "SEA", "DEN",
    "DFW", "IAH", "EWR", "LGA", "PHX", "MSP", "DTW",
}


def _airport_priority(iata: str, name: str) -> int:
    """Lower = better. Prefer major hub airports."""
    if iata in _HUB_AIRPORTS:
        return 0
    n = name.lower()
    if "international" in n:
        return 1
    if "regional" in n or "municipal" in n:
        return 3
    if any(
        w in n
        for w in (
            "seaplane", "heliport", "airpark",
            "airfield", "raf ",
        )
    ):
        return 4
    return 2


def search_cities(
    query: str,
) -> list[DestinationResult]:
    """Search cities using local airportsdata.

    Groups by city+country. For each city picks the main
    airport (international > regular > regional > seaplane).
    Max 10 results.
    """
    q = query.lower()
    airports = _get_airports()

    # Collect all matching airports per city
    city_airports: dict[str, list[tuple[int, str, dict]]] = {}
    for iata, info in airports.items():
        city = info.get("city", "")
        name = info.get("name", "")
        if not city:
            continue
        if q not in city.lower() and q not in name.lower():
            continue
        key = f"{city.upper()}_{info.get('country', '')}"
        priority = _airport_priority(iata, name)
        if key not in city_airports:
            city_airports[key] = []
        city_airports[key].append((priority, iata, info))

    # Pick best airport per city, build results
    city_results: list[tuple[int, DestinationResult]] = []
    for key, aps in city_airports.items():
        aps.sort(key=lambda x: x[0])
        _, iata, info = aps[0]
        city_name = info.get("city", "")
        # Exact city name match ranks higher
        exact = 0 if city_name.lower() == q else 1
        city_results.append(
            (
                exact,
                DestinationResult(
                    name=city_name,
                    latitude=info.get("lat", 0.0),
                    longitude=info.get("lon", 0.0),
                    country=info.get("country", ""),
                    iata_code=iata,
                ),
            )
        )

    city_results.sort(key=lambda x: x[0])
    return [r for _, r in city_results[:10]]


def search_flights(
    origin: str,
    destination: str,
    departure_date: date,
    return_date: date,
    traveler_count: int = 1,
) -> FlightPrice | None:
    """Get lowest round-trip economy flight price."""
    client = _get_client()
    logger.info(
        "Amadeus flight search: %s→%s %s-%s pax=%d",
        origin,
        destination,
        departure_date,
        return_date,
        traveler_count,
    )
    resp = client.shopping.flight_offers_search.get(
        originLocationCode=origin,
        destinationLocationCode=destination,
        departureDate=departure_date.isoformat(),
        returnDate=return_date.isoformat(),
        adults=traveler_count,
        travelClass="ECONOMY",
        currencyCode="USD",
        max=1,
    )
    if not resp.data:
        return None

    offer = resp.data[0]
    price_data = offer["price"]
    total = float(price_data.get("grandTotal", price_data["total"]))
    currency = price_data.get("currency", "USD")
    price_per_person = total / traveler_count

    return FlightPrice(
        origin=origin,
        destination=destination,
        departure_date=departure_date,
        return_date=return_date,
        price=round(price_per_person, 2),
        currency=currency,
    )
