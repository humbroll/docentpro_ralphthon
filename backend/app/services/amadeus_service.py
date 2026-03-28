"""Amadeus API service — city search + flight price."""

import logging
from datetime import date

from amadeus import Client, ResponseError

from app.api.v1.schemas import DestinationResult, FlightPrice
from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = Client(
            client_id=settings.AMADEUS_API_KEY,
            client_secret=settings.AMADEUS_API_SECRET,
            hostname="test",
        )
    return _client


def search_cities(query: str) -> list[DestinationResult]:
    """Search cities by keyword. Returns up to 10 results."""
    client = _get_client()
    resp = client.reference_data.locations.get(
        keyword=query,
        subType=["CITY"],
    )
    results: list[DestinationResult] = []
    for loc in resp.data[:10]:
        geo = loc.get("geoCode", {})
        address = loc.get("address", {})
        results.append(
            DestinationResult(
                name=loc.get("name", ""),
                latitude=geo.get("latitude", 0.0),
                longitude=geo.get("longitude", 0.0),
                country=address.get("countryCode", ""),
                iata_code=loc.get("iataCode"),
            )
        )
    return results


def search_flights(
    origin: str,
    destination: str,
    departure_date: date,
    return_date: date,
    traveler_count: int = 1,
) -> FlightPrice | None:
    """Get lowest round-trip economy flight price."""
    client = _get_client()
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
