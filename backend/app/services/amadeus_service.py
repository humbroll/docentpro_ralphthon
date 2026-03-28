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

# City center coordinates for major cities.
# Airports are often 30-60km from city centers, causing
# hotel searches to fail. This map provides accurate
# city-center coords without external API calls.
_CITY_CENTER_COORDS: dict[str, tuple[float, float]] = {
    "Seoul_KR": (37.5667, 126.9783),
    "Tokyo_JP": (35.6769, 139.7639),
    "New York_US": (40.7128, -74.0060),
    "London_GB": (51.5074, -0.1278),
    "Paris_FR": (48.8566, 2.3522),
    "Barcelona_ES": (41.3874, 2.1686),
    "Madrid_ES": (40.4168, -3.7038),
    "Rome_IT": (41.9028, 12.4964),
    "Berlin_DE": (52.5200, 13.4050),
    "Amsterdam_NL": (52.3676, 4.9041),
    "Bangkok_TH": (13.7563, 100.5018),
    "Singapore_SG": (1.3521, 103.8198),
    "Dubai_AE": (25.2048, 55.2708),
    "Sydney_AU": (33.8688, 151.2093),
    "Melbourne_AU": (-37.8136, 144.9631),
    "Los Angeles_US": (34.0522, -118.2437),
    "San Francisco_US": (37.7749, -122.4194),
    "Chicago_US": (41.8781, -87.6298),
    "Miami_US": (25.7617, -80.1918),
    "Toronto_CA": (43.6532, -79.3832),
    "Vancouver_CA": (49.2827, -123.1207),
    "Hong Kong_HK": (22.3193, 114.1694),
    "Shanghai_CN": (31.2304, 121.4737),
    "Beijing_CN": (39.9042, 116.4074),
    "Delhi_IN": (28.6139, 77.2090),
    "Mumbai_IN": (19.0760, 72.8777),
    "Istanbul_TR": (41.0082, 28.9784),
    "Cairo_EG": (30.0444, 31.2357),
    "Mexico City_MX": (19.4326, -99.1332),
    "São Paulo_BR": (-23.5505, -46.6333),
    "Buenos Aires_AR": (-34.6037, -58.3816),
    "Osaka_JP": (34.6937, 135.5023),
    "Taipei_TW": (25.0330, 121.5654),
    "Kuala Lumpur_MY": (3.1390, 101.6869),
    "Jakarta_ID": (-6.2088, 106.8456),
    "Lisbon_PT": (38.7223, -9.1393),
    "Munich_DE": (48.1351, 11.5820),
    "Zurich_CH": (47.3769, 8.5417),
    "Vienna_AT": (48.2082, 16.3738),
    "Prague_CZ": (50.0755, 14.4378),
    "Athens_GR": (37.9838, 23.7275),
    "Moscow_RU": (55.7558, 37.6173),
    "Honolulu_US": (21.3069, -157.8583),
    "Denver_US": (39.7392, -104.9903),
    "Seattle_US": (47.6062, -122.3321),
    "Boston_US": (42.3601, -71.0589),
    "Dallas_US": (32.7767, -96.7970),
    "Houston_US": (29.7604, -95.3698),
    "Atlanta_US": (33.7490, -84.3880),
    "Washington_US": (38.9072, -77.0369),
    "Philadelphia_US": (39.9526, -75.1652),
    "Phoenix_US": (33.4484, -112.0740),
    "Hanoi_VN": (21.0278, 105.8342),
    "Ho Chi Minh City_VN": (10.8231, 106.6297),
    "Manila_PH": (14.5995, 120.9842),
    "Nairobi_KE": (-1.2921, 36.8219),
    "Cape Town_ZA": (-33.9249, 18.4241),
    "Doha_QA": (25.2854, 51.5310),
    "Riyadh_SA": (24.7136, 46.6753),
}


def _get_city_coords(
    city: str,
    country: str,
    fallback_lat: float,
    fallback_lon: float,
) -> tuple[float, float]:
    """Get city center coords from static map, with fallback."""
    key = f"{city}_{country}"
    if key in _CITY_CENTER_COORDS:
        return _CITY_CENTER_COORDS[key]
    return (fallback_lat, fallback_lon)


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


def geocode_city(
    city: str, country: str = "", iata_code: str = ""
) -> DestinationResult | None:
    """Geocode a city to get accurate center coordinates."""
    lat, lon = _get_city_coords(city, country, 0.0, 0.0)
    if lat == 0.0 and lon == 0.0:
        return None
    return DestinationResult(
        name=city,
        latitude=lat,
        longitude=lon,
        country=country or lookup_country_code(city),
        iata_code=iata_code or None,
    )


def lookup_country_code(city_name: str) -> str:
    """Find country code for a city from airportsdata."""
    airports = _get_airports()
    q = city_name.lower()
    for iata, info in airports.items():
        if info.get("city", "").lower() == q:
            return info.get("country", "")
    return ""


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
        country = info.get("country", "")
        # Use city center coords when available
        lat, lon = _get_city_coords(
            city_name,
            country,
            info.get("lat", 0.0),
            info.get("lon", 0.0),
        )
        # Exact city name match ranks higher
        exact = 0 if city_name.lower() == q else 1
        city_results.append(
            (
                exact,
                DestinationResult(
                    name=city_name,
                    latitude=lat,
                    longitude=lon,
                    country=country,
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
