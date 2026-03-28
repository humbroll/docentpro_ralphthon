# WhenToGo Frontend Specification

> **Audience**: Ralph Loop (autonomous implementation agent)
> **Stack**: Next.js 16 (App Router) · React 19 · MUI 7 · TypeScript (strict) · Axios · dayjs · Emotion
> **Scope**: Single-page progressive-reveal flow on `/` route

---

> **Reading Order**: Start with **Section 0** (`docs/frontend/frontend-spec-tech-stack.md`) for technology stack, environment setup, and bootstrapping instructions before reading this file.
>
> **Cross-Reference Checklist**: See `docs/frontend/frontend-spec-cross-reference-checklist.md` for a comprehensive completeness checklist verifying every component, data type, and API endpoint is fully specified across all sub-specs.

---

## 1. Shared TypeScript Types, Interfaces, and Enums

This section defines **every** TypeScript type used across the frontend. Types are split into three categories:

1. **API types** — Already defined in `frontend/src/types/api.ts`. These MUST be imported and reused as-is. Do NOT redefine them.
2. **Frontend-only types** — New types for UI state, component props, and context. Defined in `frontend/src/types/frontend.ts`.
3. **Constants and enums** — Shared constants and union types. Defined in `frontend/src/types/constants.ts`.

### 1.1 Existing API Types (DO NOT MODIFY — import from `@/types/api`)

The file `frontend/src/types/api.ts` already contains the following types that mirror the backend API contract. Ralph Loop MUST import these directly — never duplicate or redefine them.

#### Request Types

```typescript
/**
 * Request payload for the destination search flow.
 * Used internally to track what the user has entered — NOT sent directly to any single endpoint.
 */
export interface SearchRequest {
  destination: string;
  origin_airport: string;     // IATA code, e.g. "ICN"
  start_date: string;         // ISO date "YYYY-MM-DD"
  end_date: string;           // ISO date "YYYY-MM-DD"
  traveler_count: number;
}

/**
 * Request body for POST /api/v1/weather.
 * Backend fetches historical data from the previous year for the given date range.
 */
export interface WeatherRequest {
  latitude: number;
  longitude: number;
  start_date: string;         // ISO date "YYYY-MM-DD"
  end_date: string;           // ISO date "YYYY-MM-DD"
}

/**
 * Request body for POST /api/v1/hotels/search.
 * Returns top 5 hotels sorted by total_price ascending.
 */
export interface HotelSearchRequest {
  destination: string;
  latitude: number;
  longitude: number;
  checkin_date: string;       // ISO date "YYYY-MM-DD"
  checkout_date: string;      // ISO date "YYYY-MM-DD"
  traveler_count: number;
}
```

#### Response Types

```typescript
/**
 * A single destination result from GET /api/v1/search/destinations?q=...
 * The endpoint returns DestinationResult[].
 */
export interface DestinationResult {
  /** City name, e.g. "Tokyo" */
  name: string;
  /** City latitude coordinate */
  latitude: number;
  /** City longitude coordinate */
  longitude: number;
  /** Country name, e.g. "Japan" */
  country: string;
  /** Primary airport IATA code. null if no airport is associated. */
  iata_code: string | null;
}

/**
 * Response from POST /api/v1/flights/price.
 * Contains the lowest economy round-trip price PER PERSON.
 * Frontend calculates group total: flight_price * traveler_count.
 */
export interface FlightPrice {
  origin: string;             // IATA code
  destination: string;        // IATA code
  departure_date: string;     // ISO date
  return_date: string;        // ISO date
  price: number;              // lowest economy round-trip per person in USD
  currency: string;           // always "USD" for MVP
}

/**
 * A single hotel from POST /api/v1/hotels/search.
 * The endpoint returns HotelOption[] (max 5 items).
 */
export interface HotelOption {
  /** Unique hotel ID from LiteAPI */
  hotel_id: string;
  /** Display name of the hotel */
  hotel_name: string;
  /** Distance from city center in km. null if unavailable. */
  distance: number | null;
  /** Total cost for all nights and all rooms in USD */
  total_price: number;
  /** Hotel rating on 0–5 scale. null if unavailable. */
  rating: number | null;
}

/**
 * A single day's weather data within WeatherSummary.daily[].
 * Dates are from the PREVIOUS year (historical data).
 */
export interface WeatherDay {
  date: string;               // ISO date from previous year
  temp_high: number;          // Celsius
  temp_low: number;           // Celsius
  rain_mm: number;            // millimeters
  description: string;        // e.g. "Clear sky", "Partly cloudy"
}

/**
 * Weather summary response from POST /api/v1/weather.
 * Contains an overall score and daily breakdown.
 */
export interface WeatherSummary {
  /** Average temperature across the date range in Celsius */
  average_temp: number;
  /** Rain intensity classification */
  rain_signal: "low" | "medium" | "high";
  /** Calculated weather score, 0–100 */
  weather_score: number;
  /** Human-readable weather quality label */
  label: "Great" | "Good" | "Fair" | "Poor";
  /** Daily weather breakdown (one entry per day) */
  daily: WeatherDay[];
}

/**
 * A fully scored trip option returned from POST /api/v1/compare.
 * Backend calculates total_trip_cost, cost_per_person, overall_score, and tags.
 */
export interface TripOption {
  destination: string;
  start_date: string;         // ISO date
  end_date: string;           // ISO date
  flight_price: number;       // per person USD
  hotel_name: string;
  hotel_price: number;        // total hotel cost USD
  weather: WeatherSummary;
  traveler_count: number;
  total_trip_cost: number;    // flight_price * traveler_count + hotel_price
  cost_per_person: number;    // total_trip_cost / traveler_count
  overall_score: number;      // 0–100, calculated by backend
  tags: string[];             // subset of ["cheapest", "best_weather", "best_overall"]
}

/**
 * Response from POST /api/v1/compare.
 * Options are sorted by overall_score descending.
 */
export interface CompareResponse {
  options: TripOption[];
  /** Index of the best overall option (always 0 since sorted descending) */
  best_option_index: number;
}

/**
 * A single day in the calendar weather overlay.
 * Returned from POST /api/v1/calendar as CalendarResponse.days[].
 */
export interface CalendarDay {
  date: string;               // ISO date
  temp_high: number | null;   // Celsius, null if unavailable
  temp_low: number | null;    // Celsius, null if unavailable
  rain_mm: number | null;     // mm, null if unavailable
  weather_label: string | null; // "Great" | "Good" | "Fair" | "Poor" | null
}

/**
 * Response from POST /api/v1/calendar.
 * Contains weather data for a 2-month date range.
 */
export interface CalendarResponse {
  destination: string;
  days: CalendarDay[];
}
```

### 1.2 New API Request Types (add to `frontend/src/types/api.ts`)

The existing `api.ts` is missing request types for the flight price, calendar, and compare endpoints. Add these to `frontend/src/types/api.ts`:

```typescript
/**
 * Request body for POST /api/v1/flights/price.
 * Fetches the lowest economy round-trip flight price.
 */
export interface FlightPriceRequest {
  /** Origin airport IATA code, e.g. "ICN" */
  origin: string;
  /** Destination airport IATA code, e.g. "NRT" */
  destination: string;
  /** Departure date in ISO format "YYYY-MM-DD". Must be in the future. */
  departure_date: string;
  /** Return date in ISO format "YYYY-MM-DD". Must be after departure_date. */
  return_date: string;
  /** Number of travelers. Defaults to 1 if omitted. Minimum 1. */
  traveler_count?: number;
}

/**
 * Request body for POST /api/v1/calendar.
 * Fetches weather overlay data for a 2-month calendar view.
 */
export interface CalendarRequest {
  /** City name, e.g. "Tokyo" */
  destination: string;
  /** Destination latitude */
  latitude: number;
  /** Destination longitude */
  longitude: number;
  /** Calendar range start date "YYYY-MM-DD" (typically 1st of current month) */
  start_date: string;
  /** Calendar range end date "YYYY-MM-DD" (typically ~2 months from start) */
  end_date: string;
}

/**
 * A single trip option submitted TO the compare endpoint (before scoring).
 * Does NOT include total_trip_cost, cost_per_person, overall_score, or tags —
 * those are calculated and returned by the backend.
 */
export interface CompareOptionInput {
  destination: string;
  start_date: string;
  end_date: string;
  /** Lowest economy round-trip price per person in USD */
  flight_price: number;
  /** Name of the selected hotel */
  hotel_name: string;
  /** Total hotel cost for all nights and rooms in USD */
  hotel_price: number;
  /** Weather summary (without daily breakdown — only summary fields needed) */
  weather: WeatherSummaryInput;
  /** Number of travelers. Minimum 1. */
  traveler_count: number;
}

/**
 * Weather summary subset sent to the compare endpoint.
 * Does NOT include the daily[] array — only the summary scores.
 */
export interface WeatherSummaryInput {
  average_temp: number;
  rain_signal: "low" | "medium" | "high";
  weather_score: number;
  label: "Great" | "Good" | "Fair" | "Poor";
}

/**
 * Request body for POST /api/v1/compare.
 * Must contain 2–5 trip options.
 */
export interface CompareRequest {
  options: CompareOptionInput[];
}

/**
 * Standard error response shape from all API endpoints.
 * Returned on 400, 404, 422, 500, and 504 responses.
 */
export interface ErrorResponse {
  /** Machine-readable error code, e.g. "not_found", "bad_request", "gateway_timeout" */
  error: string;
  /** Human-readable error description */
  message: string;
}
```

### 1.3 Frontend-Only Types (new file: `frontend/src/types/frontend.ts`)

These types are used exclusively for UI state management. They are never sent to or received from the API.

```typescript
// frontend/src/types/frontend.ts

import type {
  DestinationResult,
  FlightPrice,
  HotelOption,
  WeatherSummary,
  CalendarDay,
  TripOption,
  CompareResponse,
} from "./api";

// ── Enums & Union Types ──────────────────────────────────

/**
 * The progressive sections of the single-page flow.
 * Each section reveals after the previous one is completed.
 * Sections appear in this exact order, top to bottom.
 */
export type SectionId =
  | "destination"    // Step 1: Search and select destination + origin + traveler count
  | "calendar"       // Step 2: View weather calendar and select date range
  | "dateDetails"    // Step 3: View flight/hotel/weather results and select hotel
  | "comparison"     // Step 4: Compare queued trip options (visible when queue has ≥2 items)
  ;

/**
 * Loading state for any async operation.
 * Components use this to determine what to render.
 */
export type LoadingState = "idle" | "loading" | "success" | "error";

/**
 * Weather label values used for color-coding calendar days and badges.
 */
export type WeatherLabel = "Great" | "Good" | "Fair" | "Poor";

/**
 * Tag values assigned by the compare endpoint.
 */
export type TripTag = "cheapest" | "best_weather" | "best_overall";

// ── Component State Types ────────────────────────────────

/**
 * The user's selected destination, enriched from DestinationResult.
 * Stored in the page-level state after the user selects from the autocomplete.
 */
export interface SelectedDestination {
  /** City name, e.g. "Tokyo" */
  name: string;
  /** City latitude */
  latitude: number;
  /** City longitude */
  longitude: number;
  /** Country name, e.g. "Japan" */
  country: string;
  /** Destination airport IATA code. null if the destination has no airport. */
  iata_code: string | null;
}

/**
 * The user's complete search parameters, assembled from the destination section.
 * This is built up progressively as the user fills in each field.
 */
export interface SearchParams {
  /** Selected destination (null until user picks one from autocomplete) */
  destination: SelectedDestination | null;
  /** Origin airport IATA code entered by the user, e.g. "ICN" */
  originAirport: string;
  /** Number of travelers, minimum 1, default 1 */
  travelerCount: number;
}

/**
 * A selected date range from the calendar.
 * Both dates are inclusive.
 */
export interface DateRange {
  /** Trip start date in "YYYY-MM-DD" format */
  startDate: string;
  /** Trip end date in "YYYY-MM-DD" format */
  endDate: string;
}

/**
 * Results from the three parallel API calls made after date range selection.
 * Each field tracks its own loading state independently.
 */
export interface DateDetailResults {
  /** Flight price lookup state */
  flight: {
    state: LoadingState;
    data: FlightPrice | null;
    error: string | null;
  };
  /** Hotel search results state */
  hotels: {
    state: LoadingState;
    data: HotelOption[] | null;
    error: string | null;
  };
  /** Weather data state */
  weather: {
    state: LoadingState;
    data: WeatherSummary | null;
    error: string | null;
  };
}

/**
 * Calendar weather overlay state.
 */
export interface CalendarWeatherState {
  state: LoadingState;
  data: CalendarDay[] | null;
  error: string | null;
}

/**
 * A single item in the comparison queue.
 * Assembled from user selections (destination, dates, flight, hotel, weather).
 * This is the frontend-local representation BEFORE sending to the compare endpoint.
 */
export interface ComparisonQueueItem {
  /**
   * Unique identifier for this queue item.
   * Generated as: `${destination.name}-${startDate}-${endDate}`
   * Used for duplicate detection and React keys.
   */
  id: string;
  /** Destination city name */
  destination: string;
  /** Trip start date "YYYY-MM-DD" */
  startDate: string;
  /** Trip end date "YYYY-MM-DD" */
  endDate: string;
  /** Origin airport IATA code */
  originAirport: string;
  /** Flight price per person in USD */
  flightPrice: number;
  /** Selected hotel name */
  hotelName: string;
  /** Total hotel cost in USD (all nights, all rooms) */
  hotelPrice: number;
  /** Weather summary for the date range */
  weather: WeatherSummary;
  /** Number of travelers */
  travelerCount: number;
}

/**
 * Comparison results state, populated after calling POST /api/v1/compare.
 */
export interface ComparisonResultState {
  state: LoadingState;
  data: CompareResponse | null;
  error: string | null;
}

// ── Context Types ────────────────────────────────────────

/**
 * Shape of the ComparisonQueueContext value.
 * Provides the queue state and all mutation methods.
 * Queue is in-memory only — resets on page refresh.
 */
export interface ComparisonQueueContextValue {
  /** Current items in the comparison queue. Maximum 5. */
  queue: ComparisonQueueItem[];

  /**
   * Add an item to the queue.
   * @returns true if added successfully, false if queue is full (5 items) or duplicate exists.
   * Duplicate check: items with the same `id` (destination-startDate-endDate) are rejected.
   */
  addItem: (item: ComparisonQueueItem) => boolean;

  /**
   * Remove an item from the queue by its id.
   */
  removeItem: (id: string) => void;

  /**
   * Remove all items from the queue.
   */
  clearQueue: () => void;

  /** Whether the queue has reached its maximum capacity (5 items) */
  isFull: boolean;

  /** Number of items currently in the queue */
  count: number;

  /** Comparison results from the backend after calling compareTrips */
  comparisonResult: ComparisonResultState;

  /**
   * Send the current queue to POST /api/v1/compare and store results.
   * Requires at least 2 items in the queue.
   * Sets comparisonResult.state to "loading" immediately, then "success" or "error".
   */
  compareTrips: () => Promise<void>;

  /**
   * Reset comparison results to idle state.
   * Called when queue is modified after a comparison has been made.
   */
  resetComparison: () => void;
}

// ── API Service Types ────────────────────────────────────

/**
 * Generic wrapper for async API call results used in components.
 * Allows components to track loading/error state uniformly.
 */
export interface AsyncState<T> {
  state: LoadingState;
  data: T | null;
  error: string | null;
}

// ── Utility Types ────────────────────────────────────────

/**
 * Props that all section components receive to control visibility.
 * Sections are shown/hidden based on user progress through the flow.
 */
export interface SectionVisibility {
  /** Whether this section should be rendered at all */
  visible: boolean;
}
```

### 1.4 Constants (new file: `frontend/src/types/constants.ts`)

```typescript
// frontend/src/types/constants.ts

/**
 * Maximum number of items allowed in the comparison queue.
 */
export const MAX_QUEUE_SIZE = 5;

/**
 * Minimum number of items required to run a comparison.
 */
export const MIN_COMPARE_SIZE = 2;

/**
 * Minimum character length for destination search query
 * (Amadeus API requirement).
 */
export const MIN_SEARCH_QUERY_LENGTH = 3;

/**
 * Debounce delay in milliseconds for the destination search autocomplete.
 */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Number of months to show in the calendar weather overlay.
 */
export const CALENDAR_MONTH_RANGE = 2;

/**
 * Maximum number of hotel results returned by the API.
 */
export const MAX_HOTEL_RESULTS = 5;

/**
 * Backend API base URL. Read from NEXT_PUBLIC_API_URL env var, falling back to localhost.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Color mapping for weather labels, used for calendar day backgrounds and badges.
 * Keys map to WeatherSummary.label and CalendarDay.weather_label values.
 */
export const WEATHER_LABEL_COLORS: Record<string, string> = {
  Great: "#4caf50",  // MUI green[500]
  Good:  "#8bc34a",  // MUI lightGreen[500]
  Fair:  "#ff9800",  // MUI orange[500]
  Poor:  "#f44336",  // MUI red[500]
};

/**
 * Color mapping for rain signal values.
 */
export const RAIN_SIGNAL_COLORS: Record<string, string> = {
  low:    "#4caf50",
  medium: "#ff9800",
  high:   "#f44336",
};

/**
 * Color mapping for trip tags displayed as MUI Chip components.
 */
export const TAG_COLORS: Record<string, "success" | "info" | "warning"> = {
  cheapest:     "success",
  best_weather: "info",
  best_overall: "warning",
};

/**
 * Human-readable labels for trip tags.
 */
export const TAG_LABELS: Record<string, string> = {
  cheapest:     "Cheapest",
  best_weather: "Best Weather",
  best_overall: "Best Overall",
};

/**
 * Currency symbol for display. API always returns USD.
 */
export const CURRENCY_SYMBOL = "$";

/**
 * Currency code for display.
 */
export const CURRENCY_CODE = "USD";
```

### 1.5 Type Re-Export Barrel (new file: `frontend/src/types/index.ts`)

```typescript
// frontend/src/types/index.ts

// Re-export all API types
export type {
  SearchRequest,
  WeatherRequest,
  HotelSearchRequest,
  FlightPriceRequest,
  CalendarRequest,
  CompareOptionInput,
  WeatherSummaryInput,
  CompareRequest,
  ErrorResponse,
  DestinationResult,
  FlightPrice,
  HotelOption,
  WeatherDay,
  WeatherSummary,
  TripOption,
  CompareResponse,
  CalendarDay,
  CalendarResponse,
} from "./api";

// Re-export all frontend-only types
export type {
  SectionId,
  LoadingState,
  WeatherLabel,
  TripTag,
  SelectedDestination,
  SearchParams,
  DateRange,
  DateDetailResults,
  CalendarWeatherState,
  ComparisonQueueItem,
  ComparisonResultState,
  ComparisonQueueContextValue,
  AsyncState,
  SectionVisibility,
} from "./frontend";

// Re-export all constants
export {
  MAX_QUEUE_SIZE,
  MIN_COMPARE_SIZE,
  MIN_SEARCH_QUERY_LENGTH,
  SEARCH_DEBOUNCE_MS,
  CALENDAR_MONTH_RANGE,
  MAX_HOTEL_RESULTS,
  API_BASE_URL,
  WEATHER_LABEL_COLORS,
  RAIN_SIGNAL_COLORS,
  TAG_COLORS,
  TAG_LABELS,
  CURRENCY_SYMBOL,
  CURRENCY_CODE,
} from "./constants";
```

### 1.6 Cross-Reference: How Types Flow Through the Application

```
User Input (SearchParams)
    │
    ▼
GET /api/v1/search/destinations?q=... → DestinationResult[]
    │
    ▼ (user selects destination → SelectedDestination)
    │
POST /api/v1/calendar → CalendarResponse { days: CalendarDay[] }
    │
    ▼ (user selects DateRange)
    │
    ├─► POST /api/v1/flights/price (FlightPriceRequest) → FlightPrice
    ├─► POST /api/v1/hotels/search (HotelSearchRequest) → HotelOption[]
    └─► POST /api/v1/weather (WeatherRequest) → WeatherSummary
         │
         ▼ (user selects HotelOption)
         │
    ComparisonQueueItem (assembled from above)
         │
         ▼ (user adds to queue, repeats for more date ranges)
         │
    ComparisonQueueItem[] (2–5 items)
         │
         ▼ (converted to CompareOptionInput[])
         │
    POST /api/v1/compare (CompareRequest) → CompareResponse { options: TripOption[] }
```

### 1.7 Type Conversion Rules

These are the exact transformations Ralph Loop must implement when converting between types:

#### ComparisonQueueItem → CompareOptionInput

```typescript
function queueItemToCompareInput(item: ComparisonQueueItem): CompareOptionInput {
  return {
    destination: item.destination,
    start_date: item.startDate,      // camelCase → snake_case
    end_date: item.endDate,          // camelCase → snake_case
    flight_price: item.flightPrice,  // camelCase → snake_case
    hotel_name: item.hotelName,      // camelCase → snake_case
    hotel_price: item.hotelPrice,    // camelCase → snake_case
    weather: {
      average_temp: item.weather.average_temp,
      rain_signal: item.weather.rain_signal,
      weather_score: item.weather.weather_score,
      label: item.weather.label,
      // NOTE: daily[] is intentionally omitted — compare endpoint doesn't need it
    },
    traveler_count: item.travelerCount, // camelCase → snake_case
  };
}
```

#### DestinationResult → SelectedDestination

```typescript
function destinationToSelected(dest: DestinationResult): SelectedDestination {
  return {
    name: dest.name,
    latitude: dest.latitude,
    longitude: dest.longitude,
    country: dest.country,
    iata_code: dest.iata_code,
  };
}
```

#### Assembling a ComparisonQueueItem

```typescript
// After user selects a hotel from hotel results:
function buildQueueItem(
  destination: SelectedDestination,
  dateRange: DateRange,
  originAirport: string,
  flight: FlightPrice,
  hotel: HotelOption,      // the user's selected hotel
  weather: WeatherSummary,
  travelerCount: number,
): ComparisonQueueItem {
  return {
    id: `${destination.name}-${dateRange.startDate}-${dateRange.endDate}`,
    destination: destination.name,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    originAirport: originAirport,
    flightPrice: flight.price,
    hotelName: hotel.hotel_name,
    hotelPrice: hotel.total_price,
    weather: weather,
    travelerCount: travelerCount,
  };
}
```

#### ComparisonQueueItem ID (duplicate detection)

```
Format: "{destination.name}-{startDate}-{endDate}"
Example: "Tokyo-2026-05-01-2026-05-05"
```

Two items are considered duplicates if they have the same `id`. This means the same destination + same date range is a duplicate, even if different hotels are selected. This is intentional — users should compare DIFFERENT date ranges, not different hotels for the same dates.

---

*End of Section 1: Shared TypeScript Types*

---

## 2. Layout & Navigation Component Signatures

This section defines **every** layout and navigation component for the single-page progressive-reveal flow. Since WhenToGo is a single-page app on the root route (`/`) with no client-side routing, there is **no sidebar, no NavigationBar, and no route-based navigation**. The layout is a vertically-stacked shell: Header → Main Content (progressive sections) → Footer, with a floating comparison queue indicator.

### 2.1 Component Tree Overview

```
RootLayout (Server Component — frontend/src/app/layout.tsx)
└── ThemeRegistry (Client Component — frontend/src/components/ThemeRegistry.tsx)
    └── ComparisonQueueProvider (Client Component — frontend/src/context/ComparisonQueueContext.tsx)
        └── AppShell (Client Component — frontend/src/components/layout/AppShell.tsx)
            ├── Header (Client Component — frontend/src/components/layout/Header.tsx)
            ├── PageContainer (Client Component — frontend/src/components/layout/PageContainer.tsx)
            │   ├── SectionContainer[destination] → SearchSection
            │   ├── SectionContainer[calendar] → CalendarSection
            │   ├── SectionContainer[dateDetails] → DateOptionBuilderSection
            │   └── SectionContainer[comparison] → ComparisonSection
            ├── ComparisonQueueFAB (Client Component — frontend/src/components/layout/ComparisonQueueFAB.tsx)
            └── Footer (Client Component — frontend/src/components/layout/Footer.tsx)
```

### 2.2 File Structure

```
frontend/src/
├── app/
│   ├── layout.tsx              # RootLayout (Server Component) — already exists, to be modified
│   └── page.tsx                # HomePage (Client Component) — already exists, to be replaced
├── components/
│   └── layout/
│       ├── AppShell.tsx        # Root client shell wrapping header, content, footer
│       ├── Header.tsx          # Top app bar with branding and queue badge
│       ├── Footer.tsx          # Bottom informational bar
│       ├── PageContainer.tsx   # Scrollable main content area with MUI Container
│       ├── SectionContainer.tsx # Wrapper for each progressive section with visibility control
│       └── ComparisonQueueFAB.tsx # Floating action button showing queue count
├── context/
│   └── ComparisonQueueContext.tsx  # React Context provider (defined in Section 1 types)
└── theme/
    └── ThemeRegistry.tsx       # MUI 7 ThemeProvider + Emotion CacheProvider
```

### 2.3 RootLayout (Server Component)

**File**: `frontend/src/app/layout.tsx` (modify existing)
**Directive**: None (Server Component by default in App Router)

This is the Next.js root layout. It wraps the entire application and is the **only** Server Component in the layout hierarchy. It provides the HTML shell and delegates to `ThemeRegistry` for client-side MUI setup.

#### Signature

```typescript
// frontend/src/app/layout.tsx

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "WhenToGo — Find the Best Travel Dates",
  description:
    "Compare flight prices, hotel rates, and weather to find the optimal travel window for your next trip.",
};

/**
 * Root layout — Server Component.
 * Renders <html> and <body>, wraps children in ThemeRegistry.
 * No props interface needed — uses Next.js convention: { children: ReactNode }.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): JSX.Element;
```

#### Render Structure

```tsx
<html lang="en">
  <body>
    <ThemeRegistry>
      {children}
    </ThemeRegistry>
  </body>
</html>
```

**Notes**:
- Remove the existing Geist font imports and `page.module.css` — MUI 7 uses Roboto via its default theme.
- The `ThemeRegistry` is the boundary between Server and Client components.

---

### 2.4 ThemeRegistry

**File**: `frontend/src/theme/ThemeRegistry.tsx`
**Directive**: `'use client'`

Sets up the MUI 7 default theme with Emotion styling engine. This is the topmost Client Component in the tree.

#### Props Interface

```typescript
// frontend/src/theme/ThemeRegistry.tsx

/**
 * Props for ThemeRegistry.
 * Wraps children in MUI ThemeProvider + Emotion CacheProvider.
 */
export interface ThemeRegistryProps {
  /** Child components to render within the theme context */
  children: React.ReactNode;
}
```

#### Signature

```typescript
/**
 * ThemeRegistry — Client Component.
 *
 * Creates an Emotion cache for SSR-compatible styling and wraps children in
 * MUI's ThemeProvider with the default MUI 7 theme (no customizations).
 *
 * Also includes CssBaseline for consistent cross-browser base styles.
 */
export default function ThemeRegistry(props: ThemeRegistryProps): JSX.Element;
```

#### Default Props

None — `children` is required.

#### Render Structure

```tsx
<CacheProvider value={emotionCache}>
  <ThemeProvider theme={defaultTheme}>
    <CssBaseline />
    {children}
  </ThemeProvider>
</CacheProvider>
```

#### Implementation Notes

```typescript
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

// Create the default MUI 7 theme — no customizations
const defaultTheme = createTheme();

// Create an Emotion cache for SSR. The key 'mui' matches MUI's default.
// prepend: true ensures MUI styles are injected first so component-level
// Emotion styles can override them without !important.
const emotionCache = createCache({ key: 'mui', prepend: true });
```

---

### 2.5 AppShell

**File**: `frontend/src/components/layout/AppShell.tsx`
**Directive**: `'use client'`

The root structural component that arranges Header, PageContainer, ComparisonQueueFAB, and Footer into a full-viewport vertical layout.

#### Props Interface

```typescript
// frontend/src/components/layout/AppShell.tsx

/**
 * Props for AppShell.
 * Children are rendered inside the PageContainer (main content area).
 */
export interface AppShellProps {
  /** Page content — rendered between Header and Footer inside PageContainer */
  children: React.ReactNode;
}
```

#### Signature

```typescript
/**
 * AppShell — Client Component.
 *
 * Full-viewport flex column layout:
 *   - Header (fixed height, top)
 *   - PageContainer (flex-grow, scrollable main content)
 *   - ComparisonQueueFAB (fixed position, bottom-right)
 *   - Footer (fixed height, bottom)
 *
 * Uses CSS flexbox to ensure Footer stays at the bottom even when content is short.
 */
export default function AppShell(props: AppShellProps): JSX.Element;
```

#### Default Props

None — `children` is required.

#### Render Structure

```tsx
<Box
  sx={{
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  }}
>
  <Header />
  <PageContainer>
    {children}
  </PageContainer>
  <ComparisonQueueFAB />
  <Footer />
</Box>
```

#### Layout Details

| Region | Behavior | Sizing |
|--------|----------|--------|
| Header | Static at top of flow (not `position: fixed`) — scrolls with page | Auto height (~64px from AppBar default) |
| PageContainer | `flex: 1` — takes all remaining vertical space | Min-height stretches to push Footer down |
| ComparisonQueueFAB | `position: fixed`, bottom-right corner | 56px diameter (MUI FAB default) |
| Footer | Static at bottom of flow | Auto height (~48px) |

---

### 2.6 Header

**File**: `frontend/src/components/layout/Header.tsx`
**Directive**: `'use client'`

Top application bar with branding and a comparison queue badge.

#### Props Interface

```typescript
// frontend/src/components/layout/Header.tsx

/**
 * Header takes no props.
 * It reads the comparison queue count from ComparisonQueueContext internally.
 */
export interface HeaderProps {
  // Intentionally empty — Header reads state from context
}
```

#### Signature

```typescript
/**
 * Header — Client Component.
 *
 * Renders an MUI AppBar with:
 *   - Left: App logo/title "WhenToGo" as a Typography element
 *   - Right: Badge showing comparison queue count (reads from ComparisonQueueContext)
 *
 * The AppBar uses `position="static"` (scrolls with the page, not fixed/sticky).
 * Uses the default MUI primary color (MUI 7 default: #1976d2).
 */
export default function Header(props: HeaderProps): JSX.Element;
```

#### Default Props

No props — component is self-contained.

#### Render Structure

```tsx
<AppBar position="static" elevation={1}>
  <Toolbar>
    {/* Left: Branding */}
    <Typography
      variant="h6"
      component="div"
      sx={{ flexGrow: 1, fontWeight: 700 }}
    >
      WhenToGo
    </Typography>

    {/* Right: Queue count badge */}
    {count > 0 && (
      <Badge
        badgeContent={count}
        color="secondary"
        aria-label={`${count} item${count !== 1 ? 's' : ''} in comparison queue`}
      >
        <CompareArrowsIcon />
      </Badge>
    )}
  </Toolbar>
</AppBar>
```

#### Internal State

```typescript
// Read from context — no local state
const { count } = useComparisonQueue();
```

#### Behavior

| Aspect | Detail |
|--------|--------|
| **Brand text** | "WhenToGo" — always visible, not clickable (single-page app, no routing) |
| **Queue badge** | Visible only when `count > 0`. Shows the number of items in the comparison queue. |
| **Badge icon** | `CompareArrowsIcon` from `@mui/icons-material/CompareArrows` |
| **Badge color** | `color="secondary"` (MUI default secondary: #9c27b0) |
| **Badge position** | Default MUI Badge position (top-right of the icon) |
| **AppBar color** | Default MUI primary (inherited from theme) |
| **Elevation** | `elevation={1}` for subtle shadow |

#### Import Map

```typescript
import { AppBar, Toolbar, Typography, Badge } from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { useComparisonQueue } from '@/context/ComparisonQueueContext';
```

---

### 2.7 Footer

**File**: `frontend/src/components/layout/Footer.tsx`
**Directive**: `'use client'`

Simple informational footer at the bottom of the page.

#### Props Interface

```typescript
// frontend/src/components/layout/Footer.tsx

/**
 * Footer takes no props.
 * Renders static informational content.
 */
export interface FooterProps {
  // Intentionally empty — Footer is purely presentational
}
```

#### Signature

```typescript
/**
 * Footer — Client Component.
 *
 * Renders a minimal footer with:
 *   - Centered text: "WhenToGo — Find the best dates for your next trip"
 *   - Muted text color (text.secondary)
 *   - Top border for visual separation
 *
 * No links, no navigation — purely informational.
 */
export default function Footer(props: FooterProps): JSX.Element;
```

#### Default Props

No props — component is self-contained.

#### Render Structure

```tsx
<Box
  component="footer"
  sx={{
    py: 2,
    px: 3,
    mt: 'auto',
    borderTop: 1,
    borderColor: 'divider',
    textAlign: 'center',
  }}
>
  <Typography variant="body2" color="text.secondary">
    WhenToGo — Find the best dates for your next trip
  </Typography>
</Box>
```

#### Layout Details

| Property | Value | Description |
|----------|-------|-------------|
| `py` | 2 (16px) | Vertical padding |
| `px` | 3 (24px) | Horizontal padding |
| `mt` | `'auto'` | Pushes footer to bottom of flex container |
| `borderTop` | 1 | 1px solid top border |
| `borderColor` | `'divider'` | MUI theme divider color (rgba(0,0,0,0.12)) |

---

### 2.8 PageContainer

**File**: `frontend/src/components/layout/PageContainer.tsx`
**Directive**: `'use client'`

The scrollable main content area that wraps all progressive sections in an MUI `Container`.

#### Props Interface

```typescript
// frontend/src/components/layout/PageContainer.tsx

/**
 * Props for PageContainer.
 * Wraps children in a centered, max-width-constrained MUI Container.
 */
export interface PageContainerProps {
  /** Section components to render within the constrained container */
  children: React.ReactNode;
}
```

#### Signature

```typescript
/**
 * PageContainer — Client Component.
 *
 * Provides the main content area:
 *   - Uses MUI Container with maxWidth="lg" (1200px)
 *   - flex: 1 to fill available vertical space between Header and Footer
 *   - Semantic <main> element
 *   - Vertical padding for breathing room
 *
 * All progressive sections (SearchSection, CalendarSection, etc.) are
 * rendered as children inside this container.
 */
export default function PageContainer(props: PageContainerProps): JSX.Element;
```

#### Default Props

None — `children` is required.

#### Render Structure

```tsx
<Box
  component="main"
  sx={{ flex: 1, py: 4 }}
>
  <Container maxWidth="lg">
    {children}
  </Container>
</Box>
```

#### Layout Details

| Property | Value | Description |
|----------|-------|-------------|
| `component` | `"main"` | Semantic HTML `<main>` element |
| `flex` | 1 | Grows to fill space between Header and Footer |
| `py` | 4 (32px) | Top and bottom padding inside the main area |
| `maxWidth` | `"lg"` (1200px) | MUI Container max-width; centers content with 24px horizontal padding |

#### Import Map

```typescript
import { Box, Container } from '@mui/material';
```

---

### 2.9 SectionContainer

**File**: `frontend/src/components/layout/SectionContainer.tsx`
**Directive**: `'use client'`

A wrapper component for each progressive section. Controls visibility with a fade/collapse transition and provides consistent spacing between sections.

#### Props Interface

```typescript
// frontend/src/components/layout/SectionContainer.tsx

import type { SectionId } from '@/types/frontend';

/**
 * Props for SectionContainer.
 * Wraps a single progressive section with visibility control and consistent spacing.
 */
export interface SectionContainerProps {
  /**
   * Unique section identifier.
   * Used as the element id for potential scroll-to behavior.
   */
  sectionId: SectionId;

  /**
   * Whether this section should be visible.
   * When false, the section is not rendered (returns null).
   * When transitioning from false → true, the section fades in.
   */
  visible: boolean;

  /**
   * Optional title displayed above the section content.
   * Rendered as Typography variant="h4" if provided.
   * If omitted, no title is rendered.
   */
  title?: string;

  /**
   * Optional subtitle displayed below the title.
   * Rendered as Typography variant="body1" color="text.secondary".
   * Only rendered if `title` is also provided.
   */
  subtitle?: string;

  /**
   * Section content — the actual section component(s).
   */
  children: React.ReactNode;
}
```

#### Signature

```typescript
/**
 * SectionContainer — Client Component.
 *
 * Provides:
 *   1. Conditional rendering based on `visible` prop (returns null when hidden)
 *   2. Fade-in transition when section becomes visible (MUI Fade, 500ms)
 *   3. Consistent bottom margin (mb: 6 = 48px) between sections
 *   4. Optional section title and subtitle
 *   5. An `id` attribute on the wrapper for scroll anchoring
 *
 * Usage:
 *   <SectionContainer sectionId="calendar" visible={!!selectedDestination} title="Select Your Dates">
 *     <CalendarSection ... />
 *   </SectionContainer>
 */
export default function SectionContainer(props: SectionContainerProps): JSX.Element | null;
```

#### Default Props

```typescript
// Default values (applied via destructuring, not React defaultProps)
const defaultProps = {
  title: undefined,    // no title rendered
  subtitle: undefined, // no subtitle rendered
};
```

#### Render Structure

```tsx
// Returns null when not visible
if (!visible) return null;

return (
  <Fade in={visible} timeout={500}>
    <Box id={sectionId} sx={{ mb: 6 }}>
      {title && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h2" fontWeight={600} gutterBottom>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      )}
      {children}
    </Box>
  </Fade>
);
```

#### Layout Details

| Property | Value | Description |
|----------|-------|-------------|
| `mb` (outer Box) | 6 (48px) | Space between consecutive sections |
| `mb` (title Box) | 3 (24px) | Space between title/subtitle and section content |
| Title variant | `"h4"` | Section heading size |
| Title `component` | `"h2"` | Semantic heading level (h1 is the page title in Header) |
| Title `fontWeight` | 600 | Semi-bold |
| Fade `timeout` | 500ms | Fade-in animation duration |

#### Import Map

```typescript
import { Box, Typography, Fade } from '@mui/material';
import type { SectionId } from '@/types/frontend';
```

---

### 2.10 ComparisonQueueFAB

**File**: `frontend/src/components/layout/ComparisonQueueFAB.tsx`
**Directive**: `'use client'`

A floating action button fixed to the bottom-right corner that shows the comparison queue count and scrolls to the comparison section when clicked.

#### Props Interface

```typescript
// frontend/src/components/layout/ComparisonQueueFAB.tsx

/**
 * ComparisonQueueFAB takes no props.
 * It reads queue state from ComparisonQueueContext internally.
 */
export interface ComparisonQueueFABProps {
  // Intentionally empty — reads state from context
}
```

#### Signature

```typescript
/**
 * ComparisonQueueFAB — Client Component.
 *
 * Fixed-position floating action button in the bottom-right corner.
 *
 * Behavior:
 *   - Hidden when comparison queue is empty (count === 0)
 *   - Shows queue count as a Badge on the FAB
 *   - On click: smoothly scrolls the page to the comparison section
 *     using document.getElementById('comparison')?.scrollIntoView({ behavior: 'smooth' })
 *   - Uses MUI Zoom transition to animate in/out
 *
 * This FAB provides a quick way for users to jump to the comparison
 * section from anywhere on the page after adding items to the queue.
 */
export default function ComparisonQueueFAB(props: ComparisonQueueFABProps): JSX.Element | null;
```

#### Default Props

No props — component is self-contained.

#### Render Structure

```tsx
const { count } = useComparisonQueue();

if (count === 0) return null;

return (
  <Zoom in={count > 0}>
    <Fab
      color="primary"
      aria-label={`View ${count} item${count !== 1 ? 's' : ''} in comparison queue`}
      onClick={handleScrollToComparison}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
      }}
    >
      <Badge badgeContent={count} color="secondary">
        <CompareArrowsIcon />
      </Badge>
    </Fab>
  </Zoom>
);
```

#### Internal Implementation

```typescript
const handleScrollToComparison = (): void => {
  document.getElementById('comparison')?.scrollIntoView({ behavior: 'smooth' });
};
```

#### Behavior

| Aspect | Detail |
|--------|--------|
| **Visibility** | Hidden (returns `null`) when `count === 0` |
| **Position** | `position: fixed`, 24px from bottom-right corner |
| **Animation** | MUI `Zoom` transition when appearing/disappearing |
| **Click action** | Smooth-scrolls to `#comparison` section (the SectionContainer with `sectionId="comparison"`) |
| **Badge** | Shows numeric count, `color="secondary"` |
| **Icon** | `CompareArrowsIcon` from `@mui/icons-material` |
| **FAB color** | `color="primary"` (MUI default primary) |
| **FAB size** | Default (56px diameter) |
| **z-index** | MUI Fab default (`z-index: 1050`) — above page content |

#### Import Map

```typescript
import { Fab, Badge, Zoom } from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { useComparisonQueue } from '@/context/ComparisonQueueContext';
```

---

### 2.11 HomePage (Page Component)

**File**: `frontend/src/app/page.tsx` (replace existing scaffold)
**Directive**: `'use client'`

The root page component that orchestrates all progressive sections. This is where section visibility logic lives.

#### Props Interface

```typescript
// frontend/src/app/page.tsx

/**
 * HomePage takes no props.
 * It is the default export for the root route (/).
 * All state is managed internally or via ComparisonQueueContext.
 */
// No props interface — Next.js page components receive no custom props
```

#### Signature

```typescript
/**
 * HomePage — Client Component.
 *
 * The single-page progressive-reveal flow. Manages:
 *   1. SearchParams state (destination, origin, traveler count)
 *   2. CalendarWeatherState (weather overlay data)
 *   3. DateRange state (selected start/end dates)
 *   4. DateDetailResults state (flight, hotel, weather for selected dates)
 *   5. Section visibility based on user progress
 *
 * Section visibility rules:
 *   - "destination": ALWAYS visible
 *   - "calendar": visible when searchParams.destination !== null
 *   - "dateDetails": visible when dateRange !== null
 *   - "comparison": visible when comparison queue count >= 1
 *
 * Wraps everything in AppShell (which provides Header, Footer, PageContainer).
 */
export default function HomePage(): JSX.Element;
```

#### Render Structure

```tsx
<AppShell>
  {/* Section 1: Always visible */}
  <SectionContainer sectionId="destination" visible={true}>
    <SearchSection
      searchParams={searchParams}
      onDestinationChange={handleDestinationChange}
      onOriginChange={handleOriginChange}
      onTravelerCountChange={handleTravelerCountChange}
    />
  </SectionContainer>

  {/* Section 2: Visible after destination selected */}
  <SectionContainer
    sectionId="calendar"
    visible={searchParams.destination !== null}
    title="Select Your Dates"
    subtitle="Choose a date range to explore. Weather data is based on last year's historical records."
  >
    <CalendarSection
      destination={searchParams.destination!}
      calendarWeather={calendarWeather}
      selectedRange={dateRange}
      onRangeSelect={handleDateRangeSelect}
    />
  </SectionContainer>

  {/* Section 3: Visible after date range selected */}
  <SectionContainer
    sectionId="dateDetails"
    visible={dateRange !== null}
    title="Trip Details"
    subtitle="Review flight, hotel, and weather options for your selected dates."
  >
    <DateOptionBuilderSection
      searchParams={searchParams}
      dateRange={dateRange!}
      results={dateDetailResults}
      onRetryFlight={handleRetryFlight}
      onRetryHotels={handleRetryHotels}
      onRetryWeather={handleRetryWeather}
      onAddToQueue={handleAddToQueue}
    />
  </SectionContainer>

  {/* Section 4: Visible when queue has ≥1 items */}
  <SectionContainer
    sectionId="comparison"
    visible={queueCount >= 1}
    title="Compare Options"
    subtitle="Add at least 2 date options to compare. Maximum 5."
  >
    <ComparisonSection />
  </SectionContainer>
</AppShell>
```

#### Internal State

```typescript
// Page-level state — NOT in context (only comparison queue is in context)
const [searchParams, setSearchParams] = useState<SearchParams>({
  destination: null,
  originAirport: '',
  travelerCount: 1,
});
const [calendarWeather, setCalendarWeather] = useState<CalendarWeatherState>({
  state: 'idle',
  data: null,
  error: null,
});
const [dateRange, setDateRange] = useState<DateRange | null>(null);
const [dateDetailResults, setDateDetailResults] = useState<DateDetailResults>({
  flight: { state: 'idle', data: null, error: null },
  hotels: { state: 'idle', data: null, error: null },
  weather: { state: 'idle', data: null, error: null },
});

// From context
const { count: queueCount } = useComparisonQueue();
```

---

### 2.12 Layout Component Summary Table

| Component | File | Directive | Props | Context Used | Children |
|-----------|------|-----------|-------|--------------|----------|
| `RootLayout` | `src/app/layout.tsx` | Server | `{ children: ReactNode }` | None | ThemeRegistry |
| `ThemeRegistry` | `src/theme/ThemeRegistry.tsx` | `'use client'` | `{ children: ReactNode }` | None | CacheProvider + ThemeProvider |
| `AppShell` | `src/components/layout/AppShell.tsx` | `'use client'` | `{ children: ReactNode }` | None | Header, PageContainer, ComparisonQueueFAB, Footer |
| `Header` | `src/components/layout/Header.tsx` | `'use client'` | `{}` (empty) | `useComparisonQueue` | — (leaf) |
| `Footer` | `src/components/layout/Footer.tsx` | `'use client'` | `{}` (empty) | None | — (leaf) |
| `PageContainer` | `src/components/layout/PageContainer.tsx` | `'use client'` | `{ children: ReactNode }` | None | Container + children |
| `SectionContainer` | `src/components/layout/SectionContainer.tsx` | `'use client'` | `{ sectionId, visible, title?, subtitle?, children }` | None | Fade + title + children |
| `ComparisonQueueFAB` | `src/components/layout/ComparisonQueueFAB.tsx` | `'use client'` | `{}` (empty) | `useComparisonQueue` | — (leaf) |
| `HomePage` | `src/app/page.tsx` | `'use client'` | None (page) | `useComparisonQueue` | AppShell + SectionContainers |

### 2.13 All Props Interfaces — Consolidated Quick Reference

```typescript
// ── Layout Props (frontend/src/types/frontend.ts — add to existing file) ──

/**
 * Props for ThemeRegistry component.
 */
export interface ThemeRegistryProps {
  children: React.ReactNode;
}

/**
 * Props for AppShell component.
 */
export interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Props for Header component.
 * Empty — reads queue count from ComparisonQueueContext.
 */
export interface HeaderProps {}

/**
 * Props for Footer component.
 * Empty — renders static content only.
 */
export interface FooterProps {}

/**
 * Props for PageContainer component.
 */
export interface PageContainerProps {
  children: React.ReactNode;
}

/**
 * Props for SectionContainer component.
 * Controls visibility and provides consistent section chrome (title, spacing, fade).
 */
export interface SectionContainerProps {
  /** Section identifier — used as DOM id for scroll anchoring */
  sectionId: SectionId;
  /** Whether to render this section. false = returns null. */
  visible: boolean;
  /** Optional heading above section content. Rendered as h4/h2. */
  title?: string;
  /** Optional description below the title. Only rendered if title is present. */
  subtitle?: string;
  /** Section content */
  children: React.ReactNode;
}

/**
 * Props for ComparisonQueueFAB component.
 * Empty — reads queue state from ComparisonQueueContext.
 */
export interface ComparisonQueueFABProps {}
```

### 2.14 Return Types

All layout components return `JSX.Element` with two exceptions:

| Component | Return Type | Condition |
|-----------|-------------|-----------|
| `SectionContainer` | `JSX.Element \| null` | Returns `null` when `visible === false` |
| `ComparisonQueueFAB` | `JSX.Element \| null` | Returns `null` when queue `count === 0` |
| All others | `JSX.Element` | Always render |

### 2.15 MUI Icon Dependencies

The layout components require the following icons from `@mui/icons-material`:

```bash
# Already included via @mui/icons-material (ensure it's in package.json)
npm install @mui/icons-material
```

| Icon | Import | Used By |
|------|--------|---------|
| `CompareArrowsIcon` | `@mui/icons-material/CompareArrows` | Header, ComparisonQueueFAB |

---

*End of Section 2: Layout & Navigation Component Signatures*
