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


def search_cities(
    query: str,
) -> list[DestinationResult]:
    """Search cities using local airportsdata.

    Groups by city+country to avoid duplicates (e.g. Tokyo
    has NRT and HND). Returns the first airport's IATA code
    per city. Max 10 results.
    """
    q = query.lower()
    airports = _get_airports()
    seen: dict[str, DestinationResult] = {}

    for iata, info in airports.items():
        city = info.get("city", "")
        name = info.get("name", "")
        if not city:
            continue
        if q not in city.lower() and q not in name.lower():
            continue
        key = f"{city.upper()}_{info.get('country', '')}"
        if key in seen:
            continue
        seen[key] = DestinationResult(
            name=city,
            latitude=info.get("lat", 0.0),
            longitude=info.get("lon", 0.0),
            country=info.get("country", ""),
            iata_code=iata,
        )
        if len(seen) >= 10:
            break

    return list(seen.values())


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
