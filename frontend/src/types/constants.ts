// frontend/src/types/constants.ts

export const MAX_QUEUE_SIZE = 5;

export const MIN_COMPARE_SIZE = 2;

export const MIN_SEARCH_QUERY_LENGTH = 3;

export const SEARCH_DEBOUNCE_MS = 300;

export const CALENDAR_MONTH_RANGE = 2;

export const MAX_HOTEL_RESULTS = 5;

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const WEATHER_LABEL_COLORS: Record<string, string> = {
  Great: "#4caf50",
  Good: "#8bc34a",
  Fair: "#ff9800",
  Poor: "#f44336",
};

export const RAIN_SIGNAL_COLORS: Record<string, string> = {
  low: "#4caf50",
  medium: "#ff9800",
  high: "#f44336",
};
