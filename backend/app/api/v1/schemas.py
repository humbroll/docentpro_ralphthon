"""
API Contract — Source of Truth

All request/response models for the Trip Timing AI API.
Frontend TypeScript types (frontend/src/types/api.ts) must
stay in sync with these definitions.
"""

from datetime import date

from pydantic import BaseModel


# ── Requests ──────────────────────────────────────────────


class SearchRequest(BaseModel):
    destination: str
    origin_airport: str  # IATA code, e.g. "ICN"
    start_date: date
    end_date: date
    traveler_count: int = 1


class WeatherRequest(BaseModel):
    latitude: float
    longitude: float
    start_date: date
    end_date: date


class HotelSearchRequest(BaseModel):
    destination: str
    latitude: float
    longitude: float
    checkin_date: date
    checkout_date: date
    traveler_count: int = 1


# ── Responses ─────────────────────────────────────────────


class DestinationResult(BaseModel):
    name: str
    latitude: float
    longitude: float
    country: str
    iata_code: str | None = None


class FlightPrice(BaseModel):
    origin: str
    destination: str
    departure_date: date
    return_date: date
    price: float  # lowest economy round-trip per person
    currency: str = "USD"


class HotelOption(BaseModel):
    hotel_id: str
    hotel_name: str
    distance: float | None = None  # km from city center
    total_price: float  # total for all nights
    rating: float | None = None


class WeatherDay(BaseModel):
    date: date
    temp_high: float
    temp_low: float
    rain_mm: float
    description: str


class WeatherSummary(BaseModel):
    average_temp: float
    rain_signal: str  # "low", "medium", "high"
    weather_score: float  # 0-100
    label: str  # "Great", "Good", "Fair", "Poor"
    daily: list[WeatherDay] = []


class TripOption(BaseModel):
    destination: str
    start_date: date
    end_date: date
    flight_price: float
    hotel_name: str
    hotel_price: float
    weather: WeatherSummary
    traveler_count: int
    total_trip_cost: float
    cost_per_person: float
    overall_score: float
    tags: list[str] = []  # "cheapest", "best_weather", "best_overall"


class CompareResponse(BaseModel):
    options: list[TripOption]
    best_option_index: int


# ── Calendar ──────────────────────────────────────────────


class CalendarDay(BaseModel):
    date: date
    temp_high: float | None = None
    temp_low: float | None = None
    rain_mm: float | None = None
    weather_label: str | None = None


class CalendarResponse(BaseModel):
    destination: str
    days: list[CalendarDay]
