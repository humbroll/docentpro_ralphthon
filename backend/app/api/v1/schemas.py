"""
API Contract — Source of Truth

All request/response models for the WhenToGo API.
Frontend TypeScript types (frontend/src/types/api.ts) must
stay in sync with these definitions.

See docs/api-spec.yaml for the complete OpenAPI specification.
"""

from datetime import date

from pydantic import BaseModel


# ── Error ────────────────────────────────────────────────


class ErrorResponse(BaseModel):
    error: str  # machine-readable code
    message: str  # human-readable description


# ── Requests ─────────────────────────────────────────────


class FlightPriceRequest(BaseModel):
    origin: str  # IATA code, e.g. "ICN"
    destination: str  # IATA code, e.g. "NRT"
    departure_date: date
    return_date: date
    traveler_count: int = 1


class HotelSearchRequest(BaseModel):
    destination: str  # city name
    latitude: float
    longitude: float
    checkin_date: date
    checkout_date: date
    traveler_count: int = 1


class WeatherRequest(BaseModel):
    latitude: float
    longitude: float
    start_date: date
    end_date: date


class CalendarRequest(BaseModel):
    destination: str
    latitude: float
    longitude: float
    start_date: date
    end_date: date


class WeatherSummaryInput(BaseModel):
    average_temp: float
    rain_signal: str  # "low", "medium", "high"
    weather_score: float  # 0-100
    label: str  # "Great", "Good", "Fair", "Poor"


class CompareOptionInput(BaseModel):
    destination: str
    start_date: date
    end_date: date
    flight_price: float
    hotel_name: str
    hotel_price: float
    weather: WeatherSummaryInput
    traveler_count: int


class CompareRequest(BaseModel):
    options: list[CompareOptionInput]


# ── Responses ────────────────────────────────────────────


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
    total_price: float  # total for all nights and rooms
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


# ── Calendar ─────────────────────────────────────────────


class CalendarDay(BaseModel):
    date: date
    temp_high: float | None = None
    temp_low: float | None = None
    rain_mm: float | None = None
    weather_label: str | None = None


class CalendarResponse(BaseModel):
    destination: str
    days: list[CalendarDay]
