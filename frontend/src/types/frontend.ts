// frontend/src/types/frontend.ts
// Frontend-only types for UI state management. Never sent to or received from the API.

import type {
  FlightPrice,
  HotelOption,
  WeatherSummary,
  CalendarDay,
  CompareResponse,
} from "./api";

// ── Enums & Union Types ──────────────────────────────────

export type SectionId =
  | "destination"
  | "calendar"
  | "dateDetails"
  | "comparison";

export type LoadingState = "idle" | "loading" | "success" | "error";

export type WeatherLabel = "Great" | "Good" | "Fair" | "Poor";

export type TripTag = "cheapest" | "best_weather" | "best_overall";

// ── Component State Types ────────────────────────────────

export interface SelectedDestination {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  iata_code: string | null;
}

export interface SearchParams {
  destination: SelectedDestination | null;
  originAirport: string;
  travelerCount: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface DateDetailResults {
  flight: {
    state: LoadingState;
    data: FlightPrice | null;
    error: string | null;
  };
  hotels: {
    state: LoadingState;
    data: HotelOption[] | null;
    error: string | null;
  };
  weather: {
    state: LoadingState;
    data: WeatherSummary | null;
    error: string | null;
  };
}

export interface CalendarWeatherState {
  state: LoadingState;
  data: CalendarDay[] | null;
  error: string | null;
}

export interface ComparisonQueueItem {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  originAirport: string;
  flightPrice: number;
  hotelName: string;
  hotelPrice: number;
  weather: WeatherSummary;
  travelerCount: number;
}

export interface ComparisonResultState {
  state: LoadingState;
  data: CompareResponse | null;
  error: string | null;
}

// ── Context Types ────────────────────────────────────────

export interface ComparisonQueueContextValue {
  queue: ComparisonQueueItem[];
  addItem: (item: ComparisonQueueItem) => boolean;
  removeItem: (id: string) => void;
  clearQueue: () => void;
  isFull: boolean;
  count: number;
  comparisonResult: ComparisonResultState;
  compareTrips: () => Promise<void>;
  resetComparison: () => void;
}

// ── API Service Types ────────────────────────────────────

export interface AsyncState<T> {
  state: LoadingState;
  data: T | null;
  error: string | null;
}

// ── Utility Types ────────────────────────────────────────

export interface SectionVisibility {
  visible: boolean;
}
