"""LiteAPI hotel service — search + rates."""

import logging
import math
from datetime import date

import httpx
from geopy.distance import geodesic

from app.api.v1.schemas import HotelOption
from app.core.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://api.liteapi.travel/v3.0"


def _build_occupancies(traveler_count: int) -> list[dict]:
    """Split travelers into rooms (2 per room max)."""
    rooms = math.ceil(traveler_count / 2)
    remaining = traveler_count
    occupancies = []
    for _ in range(rooms):
        adults = min(2, remaining)
        occupancies.append({"adults": adults})
        remaining -= adults
    return occupancies


async def search_hotels(
    destination: str,
    latitude: float,
    longitude: float,
    checkin_date: date,
    checkout_date: date,
    traveler_count: int = 1,
) -> list[HotelOption]:
    """Search hotels and return top 5 by price."""
    occupancies = _build_occupancies(traveler_count)

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Step 1: Search hotels by location
        search_resp = await client.get(
            f"{BASE_URL}/data/hotels",
            headers={
                "X-API-Key": settings.LITEAPI_API_KEY_SEARCH,
            },
            params={
                "countryCode": "",
                "cityName": destination,
                "latitude": latitude,
                "longitude": longitude,
                "limit": 20,
            },
        )
        search_resp.raise_for_status()
        search_data = search_resp.json()
        hotels_raw = search_data.get("data", [])

        if not hotels_raw:
            return []

        hotel_ids = [h["id"] for h in hotels_raw[:20]]

        # Step 2: Get rates
        rates_resp = await client.post(
            f"{BASE_URL}/hotels/rates",
            headers={
                "X-API-Key": settings.LITEAPI_API_KEY_RATES,
                "Content-Type": "application/json",
            },
            json={
                "hotelIds": hotel_ids,
                "checkin": checkin_date.isoformat(),
                "checkout": checkout_date.isoformat(),
                "occupancies": occupancies,
                "currency": "USD",
                "guestNationality": "US",
            },
        )
        rates_resp.raise_for_status()
        rates_data = rates_resp.json()

        # Build price map from rates response
        price_map: dict[str, float] = {}
        for item in rates_data.get("data", []):
            hotel_id = item.get("hotelId", "")
            room_types = item.get("roomTypes", [])
            if room_types:
                rates = room_types[0].get("rates", [])
                if rates:
                    total_arr = (
                        rates[0]
                        .get("retailRate", {})
                        .get("total", [])
                    )
                    if total_arr:
                        try:
                            price_map[hotel_id] = float(
                                total_arr[0].get("amount", 0)
                            )
                        except (ValueError, TypeError):
                            pass

        # Build hotel list from search data + prices
        hotel_meta = {h["id"]: h for h in hotels_raw}
        results: list[HotelOption] = []

        for hotel_id, price in price_map.items():
            meta = hotel_meta.get(hotel_id, {})
            h_lat = meta.get("latitude")
            h_lon = meta.get("longitude")

            dist = None
            if h_lat and h_lon:
                try:
                    dist = round(
                        geodesic(
                            (latitude, longitude),
                            (h_lat, h_lon),
                        ).km,
                        1,
                    )
                except Exception:
                    pass

            results.append(
                HotelOption(
                    hotel_id=hotel_id,
                    hotel_name=meta.get("name", "Unknown"),
                    distance=dist,
                    total_price=round(price, 2),
                    rating=meta.get("rating"),
                )
            )

        results.sort(key=lambda h: h.total_price)
        return results[:5]
