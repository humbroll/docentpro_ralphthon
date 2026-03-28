/**
 * API Contract — TypeScript Mirror
 *
 * Must stay in sync with backend/app/api/v1/schemas.py
 * See docs/api-spec.yaml for the complete OpenAPI specification.
 */

// ── Error ────────────────────────────────────────────────

export interface ErrorResponse {
  error: string;
  message: string;
}

// ── Requests ─────────────────────────────────────────────

export interface FlightPriceRequest {
  origin: string; // IATA code, e.g. "ICN"
  destination: string; // IATA code, e.g. "NRT"
  departure_date: string; // ISO date "YYYY-MM-DD"
  return_date: string;
  traveler_count: number;
}

export interface HotelSearchRequest {
  destination: string; // city name
  latitude: number;
  longitude: number;
  checkin_date: string;
  checkout_date: string;
  traveler_count: number;
}

export interface WeatherRequest {
  latitude: number;
  longitude: number;
  start_date: string;
  end_date: string;
}

export interface CalendarRequest {
  destination: string;
  latitude: number;
  longitude: number;
  start_date: string;
  end_date: string;
}

export interface WeatherSummaryInput {
  average_temp: number;
  rain_signal: "low" | "medium" | "high";
  weather_score: number;
  label: "Great" | "Good" | "Fair" | "Poor";
}

export interface CompareOptionInput {
  destination: string;
  start_date: string;
  end_date: string;
  flight_price: number;
  hotel_name: string;
  hotel_price: number;
  weather: WeatherSummaryInput;
  traveler_count: number;
}

export interface CompareRequest {
  options: CompareOptionInput[];
}

// ── Responses ────────────────────────────────────────────

export interface DestinationResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  iata_code: string | null;
}

export interface FlightPrice {
  origin: string;
  destination: string;
  departure_date: string;
  return_date: string;
  price: number; // lowest economy round-trip per person
  currency: string;
}

export interface HotelOption {
  hotel_id: string;
  hotel_name: string;
  distance: number | null; // km from city center
  total_price: number; // total for all nights and rooms
  rating: number | null;
}

export interface WeatherDay {
  date: string;
  temp_high: number;
  temp_low: number;
  rain_mm: number;
  description: string;
}

export interface WeatherSummary {
  average_temp: number;
  rain_signal: "low" | "medium" | "high";
  weather_score: number; // 0-100
  label: "Great" | "Good" | "Fair" | "Poor";
  daily: WeatherDay[];
}

export interface TripOption {
  destination: string;
  start_date: string;
  end_date: string;
  flight_price: number;
  hotel_name: string;
  hotel_price: number;
  weather: WeatherSummary;
  traveler_count: number;
  total_trip_cost: number;
  cost_per_person: number;
  overall_score: number;
  tags: string[]; // "cheapest", "best_weather", "best_overall"
}

export interface CompareResponse {
  options: TripOption[];
  best_option_index: number;
}

// ── Calendar ─────────────────────────────────────────────

export interface CalendarDay {
  date: string;
  temp_high: number | null;
  temp_low: number | null;
  rain_mm: number | null;
  weather_label: string | null;
}

export interface CalendarResponse {
  destination: string;
  days: CalendarDay[];
}
