# WhenToGo Frontend Spec — Centralized API Service Layer

> **File**: `frontend/src/lib/api.ts`
> **Audience**: Ralph Loop (autonomous implementation agent)
> **Cross-references**: Types from `frontend/src/types/api.ts` (Section 1.1 + 1.2 of `docs/frontend/frontend-spec.md`), constants from `frontend/src/types/constants.ts` (Section 1.4), error display types from `docs/frontend/frontend-spec-ui-states.md` (Section 2).

---

## 1. Purpose

`src/lib/api.ts` is the **single file** through which every HTTP request to the backend flows. No component or hook may import `axios` directly — they must use the typed methods exported from this module. This ensures:

- Consistent base URL configuration
- Consistent request/response timeout
- Consistent error propagation (Axios errors bubble up to callers)
- Type-safe request/response contracts using existing TypeScript types

---

## 2. File Location & Exports

```
frontend/
  src/
    lib/
      api.ts          ← THIS FILE (centralized API service layer)
```

The file exports:
1. A pre-configured Axios instance (`apiClient`) — exported for testing but NOT used directly by components
2. Seven typed async functions — one per API endpoint
3. One error extraction utility function (`extractApiError`)
4. One TypeScript interface (`ApiErrorDisplay`)

---

## 3. Axios Instance Configuration

```typescript
// frontend/src/lib/api.ts

import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_BASE_URL } from '@/types/constants';

/**
 * Pre-configured Axios instance for all backend API calls.
 * Exported for test mocking; components should use the typed methods below.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,  // from constants.ts: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
  timeout: 15000,          // 15 seconds — generous to accommodate backend's own 10s external API timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});
```

### 3.1 Configuration Details

| Setting | Value | Rationale |
|---------|-------|-----------|
| `baseURL` | `API_BASE_URL` from `@/types/constants` | `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"` |
| `timeout` | `15000` (15s) | Backend has a 10s external API timeout; 15s gives buffer for backend processing |
| `Content-Type` | `application/json` | All endpoints accept JSON |
| `Accept` | `application/json` | All endpoints return JSON |

### 3.2 No Interceptors

Do NOT add request or response interceptors. There is no auth, no token refresh, no global error handling. Errors propagate as Axios errors to the calling code, which uses `extractApiError()` to convert them for display.

---

## 4. Error Handling

### 4.1 ApiErrorDisplay Interface

```typescript
/**
 * Normalized error object for UI display.
 * Created by extractApiError() from Axios errors.
 */
export interface ApiErrorDisplay {
  /** Human-readable message to show inline. */
  message: string;
  /** Original HTTP status code, or 0 for network/timeout errors. */
  statusCode: number;
}
```

### 4.2 extractApiError Function

```typescript
/**
 * Extracts a user-facing error display object from any caught error.
 * Maps backend ErrorResponse shapes ({error, message}), network errors,
 * and timeouts to a single ApiErrorDisplay.
 *
 * @param err - The caught error (typically AxiosError from a failed API call)
 * @returns ApiErrorDisplay with a user-friendly message and HTTP status code
 *
 * @example
 * try {
 *   const data = await searchDestinations('tok');
 * } catch (err) {
 *   const display = extractApiError(err);
 *   // display.message → "No destinations found matching 'tok'"
 *   // display.statusCode → 404
 * }
 */
export function extractApiError(err: unknown): ApiErrorDisplay {
  if (err instanceof AxiosError) {
    if (err.response) {
      // Server responded with an error status (400, 404, 422, 500, 504)
      const data = err.response.data as { error?: string; message?: string } | undefined;
      return {
        message: data?.message || `Request failed (${err.response.status})`,
        statusCode: err.response.status,
      };
    }
    if (err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED') {
      // Client-side timeout or request cancellation
      return { message: 'Request timed out. Please try again.', statusCode: 0 };
    }
    // Network error (no response received — server unreachable)
    return { message: 'Network error. Please check your connection and try again.', statusCode: 0 };
  }
  // Non-Axios error (should not happen in normal usage)
  return { message: 'An unexpected error occurred. Please try again.', statusCode: 0 };
}
```

### 4.3 Error Propagation Pattern

API methods in this file do **NOT** catch errors. They let Axios errors propagate to the caller. The calling component or hook catches the error and calls `extractApiError()`:

```typescript
// Pattern used by every component/hook that calls an API method:
try {
  setStatus('loading');
  const data = await searchDestinations(query);
  if (data.length === 0) {
    setStatus('empty');
  } else {
    setStatus('success');
    setData(data);
  }
} catch (err) {
  setStatus('error');
  setError(extractApiError(err));
}
```

---

## 5. Typed API Methods — Complete Reference

All methods are `async` functions that return typed promises. All methods throw `AxiosError` on failure (caught by callers via `extractApiError`).

### Import Block

```typescript
import type {
  DestinationResult,
  FlightPriceRequest,
  FlightPrice,
  HotelSearchRequest,
  HotelOption,
  WeatherRequest,
  WeatherSummary,
  CalendarRequest,
  CalendarResponse,
  CompareRequest,
  CompareResponse,
} from '@/types/api';
```

---

### 5.1 healthCheck

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /health` |
| **Parameters** | None |
| **Returns** | `Promise<{ status: string }>` |
| **Used by** | Optional startup check; not required by any UI component |

```typescript
/**
 * Checks backend health.
 * GET /health
 *
 * @returns Object with status field (expected: "ok")
 * @throws AxiosError on network failure or non-200 response
 */
export async function healthCheck(): Promise<{ status: string }> {
  const response = await apiClient.get<{ status: string }>('/health');
  return response.data;
}
```

---

### 5.2 searchDestinations

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/v1/search/destinations?q={query}` |
| **Parameters** | `query: string` — city name search (minimum 3 characters) |
| **Returns** | `Promise<DestinationResult[]>` |
| **Used by** | `DestinationAutocomplete` component (debounced, 300ms) |
| **Empty response** | Valid — returns `[]` when no cities match |
| **Error responses** | 400 (query too short), 500 (internal), 504 (Amadeus timeout) |

```typescript
/**
 * Searches for destinations by city name.
 * GET /api/v1/search/destinations?q={query}
 *
 * @param query - City name search string (must be >= 3 characters; caller enforces this)
 * @returns Array of matching destinations (may be empty)
 * @throws AxiosError on 400/500/504 or network error
 *
 * @example
 * const results = await searchDestinations('Tokyo');
 * // results: [{ name: "Tokyo", latitude: 35.6762, longitude: 139.6503, country: "Japan", iata_code: "TYO" }]
 */
export async function searchDestinations(query: string): Promise<DestinationResult[]> {
  const response = await apiClient.get<DestinationResult[]>(
    '/api/v1/search/destinations',
    { params: { q: query } },
  );
  return response.data;
}
```

**Caller responsibility**: The `DestinationAutocomplete` component must NOT call this method if `query.length < 3`. This is enforced in the component, not in this layer.

---

### 5.3 getFlightPrice

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/v1/flights/price` |
| **Parameters** | `request: FlightPriceRequest` |
| **Returns** | `Promise<FlightPrice>` |
| **Used by** | Date detail results section (auto-fetched when user selects dates) |
| **Error responses** | 400 (invalid params), 404 (no flights found), 500 (internal), 504 (Amadeus timeout) |

```typescript
/**
 * Fetches the lowest round-trip economy flight price.
 * POST /api/v1/flights/price
 *
 * Returns price PER PERSON. The frontend calculates group total:
 *   total_flight_cost = flight_price * traveler_count
 *
 * @param request - Flight search parameters (origin, destination, dates, traveler count)
 * @returns Flight price data including per-person price in USD
 * @throws AxiosError on 400/404/500/504 or network error
 *
 * @example
 * const flight = await getFlightPrice({
 *   origin: 'ICN',
 *   destination: 'NRT',
 *   departure_date: '2026-05-01',
 *   return_date: '2026-05-05',
 *   traveler_count: 2,
 * });
 * // flight.price → 342.50 (per person)
 */
export async function getFlightPrice(request: FlightPriceRequest): Promise<FlightPrice> {
  const response = await apiClient.post<FlightPrice>(
    '/api/v1/flights/price',
    request,
  );
  return response.data;
}
```

---

### 5.4 searchHotels

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/v1/hotels/search` |
| **Parameters** | `request: HotelSearchRequest` |
| **Returns** | `Promise<HotelOption[]>` |
| **Used by** | Hotel selection section (auto-fetched when user selects dates) |
| **Response size** | Up to 5 hotels, sorted by `total_price` ascending |
| **Error responses** | 400 (invalid params), 404 (no hotels found), 500 (internal), 504 (LiteAPI timeout) |

```typescript
/**
 * Searches for hotels near the destination.
 * POST /api/v1/hotels/search
 *
 * Returns up to 5 hotels sorted by total_price ascending.
 * total_price includes all rooms and all nights.
 * Room calculation: ceil(traveler_count / 2).
 *
 * @param request - Hotel search parameters (destination, coordinates, dates, traveler count)
 * @returns Array of hotel options (up to 5, may be empty array — but backend returns 404 for no results)
 * @throws AxiosError on 400/404/500/504 or network error
 *
 * @example
 * const hotels = await searchHotels({
 *   destination: 'Tokyo',
 *   latitude: 35.6762,
 *   longitude: 139.6503,
 *   checkin_date: '2026-05-01',
 *   checkout_date: '2026-05-05',
 *   traveler_count: 2,
 * });
 * // hotels: [{ hotel_id: "liteapi_12345", hotel_name: "Tokyo Inn", distance: 1.2, total_price: 320.00, rating: 4.2 }, ...]
 */
export async function searchHotels(request: HotelSearchRequest): Promise<HotelOption[]> {
  const response = await apiClient.post<HotelOption[]>(
    '/api/v1/hotels/search',
    request,
  );
  return response.data;
}
```

---

### 5.5 getWeather

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/v1/weather` |
| **Parameters** | `request: WeatherRequest` |
| **Returns** | `Promise<WeatherSummary>` |
| **Used by** | Date detail results section (auto-fetched when user selects dates) |
| **Note** | Backend fetches **last year's** historical data for the given date range |
| **Error responses** | 400 (invalid params), 500 (internal), 504 (Open-Meteo timeout) |

```typescript
/**
 * Fetches historical weather data and weather score for a date range.
 * POST /api/v1/weather
 *
 * Backend fetches LAST YEAR's data for the same date range (e.g., requesting
 * 2026-05-01 to 2026-05-05 fetches data for 2025-05-01 to 2025-05-05).
 *
 * @param request - Weather request with coordinates and date range
 * @returns Weather summary including average temp, rain signal, weather score, label, and daily breakdown
 * @throws AxiosError on 400/500/504 or network error
 *
 * @example
 * const weather = await getWeather({
 *   latitude: 35.6762,
 *   longitude: 139.6503,
 *   start_date: '2026-05-01',
 *   end_date: '2026-05-05',
 * });
 * // weather.weather_score → 82.4
 * // weather.label → "Great"
 */
export async function getWeather(request: WeatherRequest): Promise<WeatherSummary> {
  const response = await apiClient.post<WeatherSummary>(
    '/api/v1/weather',
    request,
  );
  return response.data;
}
```

---

### 5.6 getCalendarWeather

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/v1/calendar` |
| **Parameters** | `request: CalendarRequest` |
| **Returns** | `Promise<CalendarResponse>` |
| **Used by** | `WeatherCalendar` component (fetched when destination is selected) |
| **Response size** | ~60 days of daily weather data (2-month range) |
| **Error responses** | 400 (invalid params), 500 (internal), 504 (Open-Meteo timeout) |

```typescript
/**
 * Fetches weather overlay data for the 2-month calendar view.
 * POST /api/v1/calendar
 *
 * Returns daily weather data (temp high/low, rain, weather label) for each
 * day in the range. Used to color-code calendar days by weather quality.
 *
 * @param request - Calendar request with destination name, coordinates, and date range
 * @returns Calendar response with destination name and array of daily weather data
 * @throws AxiosError on 400/500/504 or network error
 *
 * @example
 * const calendar = await getCalendarWeather({
 *   destination: 'Tokyo',
 *   latitude: 35.6762,
 *   longitude: 139.6503,
 *   start_date: '2026-05-01',
 *   end_date: '2026-06-30',
 * });
 * // calendar.days.length → ~61 (May 1 through June 30)
 * // calendar.days[0].weather_label → "Great"
 */
export async function getCalendarWeather(request: CalendarRequest): Promise<CalendarResponse> {
  const response = await apiClient.post<CalendarResponse>(
    '/api/v1/calendar',
    request,
  );
  return response.data;
}
```

---

### 5.7 compareTrips

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/v1/compare` |
| **Parameters** | `request: CompareRequest` |
| **Returns** | `Promise<CompareResponse>` |
| **Used by** | `ComparisonQueueProvider` context (called when user clicks "Compare") |
| **Validation** | Backend requires 2–5 options; caller must enforce this before calling |
| **Error responses** | 400 (invalid params), 422 (fewer than 2 options), 500 (internal) |

```typescript
/**
 * Sends trip options to the backend for scoring and comparison.
 * POST /api/v1/compare
 *
 * The backend calculates total_trip_cost, cost_per_person, cost_score,
 * overall_score, and auto-tags for each option. Returns options sorted
 * by overall_score descending.
 *
 * @param request - Compare request containing 2–5 trip options (caller must enforce min/max)
 * @returns Scored and ranked trip options with best_option_index
 * @throws AxiosError on 400/422/500 or network error
 *
 * @example
 * const result = await compareTrips({
 *   options: [
 *     { destination: 'Tokyo', start_date: '2026-05-01', end_date: '2026-05-05',
 *       flight_price: 342.50, hotel_name: 'Tokyo Inn', hotel_price: 320.00,
 *       weather: { average_temp: 21.3, rain_signal: 'low', weather_score: 82.4, label: 'Great' },
 *       traveler_count: 2 },
 *     { destination: 'Tokyo', start_date: '2026-05-15', end_date: '2026-05-19',
 *       flight_price: 289.00, hotel_name: 'Tokyo Inn', hotel_price: 295.00,
 *       weather: { average_temp: 23.8, rain_signal: 'medium', weather_score: 68.2, label: 'Good' },
 *       traveler_count: 2 },
 *   ],
 * });
 * // result.options[0].tags → ["cheapest", "best_overall"]
 * // result.best_option_index → 0
 */
export async function compareTrips(request: CompareRequest): Promise<CompareResponse> {
  const response = await apiClient.post<CompareResponse>(
    '/api/v1/compare',
    request,
  );
  return response.data;
}
```

---

## 6. Complete File — Copy-Ready Implementation

Below is the full file that Ralph Loop should create at `frontend/src/lib/api.ts`:

```typescript
// frontend/src/lib/api.ts
// Centralized API service layer — all backend calls go through this file.
// Components and hooks import typed methods from here; never import axios directly.

'use client';

import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_BASE_URL } from '@/types/constants';
import type {
  DestinationResult,
  FlightPriceRequest,
  FlightPrice,
  HotelSearchRequest,
  HotelOption,
  WeatherRequest,
  WeatherSummary,
  CalendarRequest,
  CalendarResponse,
  CompareRequest,
  CompareResponse,
} from '@/types/api';

// ── Error Display Type ───────────────────────────────────

/**
 * Normalized error object for inline UI display.
 * Created by extractApiError() from Axios errors.
 */
export interface ApiErrorDisplay {
  /** Human-readable message to show inline. */
  message: string;
  /** Original HTTP status code, or 0 for network/timeout errors. */
  statusCode: number;
}

// ── Axios Instance ───────────────────────────────────────

/**
 * Pre-configured Axios instance for all backend API calls.
 * Exported for test mocking; components should use the typed methods below.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ── Error Extraction ─────────────────────────────────────

/**
 * Extracts a user-facing error display object from any caught error.
 * Maps backend ErrorResponse shapes ({error, message}), network errors,
 * and timeouts to a single ApiErrorDisplay.
 *
 * @param err - The caught error (typically AxiosError from a failed API call)
 * @returns ApiErrorDisplay with a user-friendly message and HTTP status code
 */
export function extractApiError(err: unknown): ApiErrorDisplay {
  if (err instanceof AxiosError) {
    if (err.response) {
      const data = err.response.data as { error?: string; message?: string } | undefined;
      return {
        message: data?.message || `Request failed (${err.response.status})`,
        statusCode: err.response.status,
      };
    }
    if (err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED') {
      return { message: 'Request timed out. Please try again.', statusCode: 0 };
    }
    return { message: 'Network error. Please check your connection and try again.', statusCode: 0 };
  }
  return { message: 'An unexpected error occurred. Please try again.', statusCode: 0 };
}

// ── API Methods ──────────────────────────────────────────

/**
 * GET /health
 * Checks backend health status.
 */
export async function healthCheck(): Promise<{ status: string }> {
  const response = await apiClient.get<{ status: string }>('/health');
  return response.data;
}

/**
 * GET /api/v1/search/destinations?q={query}
 * Searches for destinations by city name.
 *
 * @param query - City name (must be >= 3 characters; caller enforces)
 * @returns Array of matching destinations (may be empty)
 */
export async function searchDestinations(query: string): Promise<DestinationResult[]> {
  const response = await apiClient.get<DestinationResult[]>(
    '/api/v1/search/destinations',
    { params: { q: query } },
  );
  return response.data;
}

/**
 * POST /api/v1/flights/price
 * Fetches the lowest round-trip economy flight price (per person).
 *
 * @param request - Flight search parameters
 * @returns Flight price data
 */
export async function getFlightPrice(request: FlightPriceRequest): Promise<FlightPrice> {
  const response = await apiClient.post<FlightPrice>('/api/v1/flights/price', request);
  return response.data;
}

/**
 * POST /api/v1/hotels/search
 * Searches for hotels near the destination (up to 5 results, sorted by price).
 *
 * @param request - Hotel search parameters
 * @returns Array of hotel options
 */
export async function searchHotels(request: HotelSearchRequest): Promise<HotelOption[]> {
  const response = await apiClient.post<HotelOption[]>('/api/v1/hotels/search', request);
  return response.data;
}

/**
 * POST /api/v1/weather
 * Fetches historical weather data and weather score for a date range.
 *
 * @param request - Weather request with coordinates and date range
 * @returns Weather summary with daily breakdown
 */
export async function getWeather(request: WeatherRequest): Promise<WeatherSummary> {
  const response = await apiClient.post<WeatherSummary>('/api/v1/weather', request);
  return response.data;
}

/**
 * POST /api/v1/calendar
 * Fetches weather overlay data for the 2-month calendar view.
 *
 * @param request - Calendar request with destination and date range
 * @returns Calendar response with daily weather data
 */
export async function getCalendarWeather(request: CalendarRequest): Promise<CalendarResponse> {
  const response = await apiClient.post<CalendarResponse>('/api/v1/calendar', request);
  return response.data;
}

/**
 * POST /api/v1/compare
 * Sends trip options for scoring and comparison (2–5 options required).
 *
 * @param request - Compare request with trip options
 * @returns Scored and ranked options with best_option_index
 */
export async function compareTrips(request: CompareRequest): Promise<CompareResponse> {
  const response = await apiClient.post<CompareResponse>('/api/v1/compare', request);
  return response.data;
}
```

---

## 7. API Method Summary Table

| Method | HTTP | Endpoint | Request Type | Response Type | Used By |
|--------|------|----------|-------------|---------------|---------|
| `healthCheck` | GET | `/health` | — | `{ status: string }` | Optional startup check |
| `searchDestinations` | GET | `/api/v1/search/destinations?q=` | `string` (query param) | `DestinationResult[]` | `DestinationAutocomplete` |
| `getFlightPrice` | POST | `/api/v1/flights/price` | `FlightPriceRequest` | `FlightPrice` | Date detail results |
| `searchHotels` | POST | `/api/v1/hotels/search` | `HotelSearchRequest` | `HotelOption[]` | Hotel selection section |
| `getWeather` | POST | `/api/v1/weather` | `WeatherRequest` | `WeatherSummary` | Date detail results |
| `getCalendarWeather` | POST | `/api/v1/calendar` | `CalendarRequest` | `CalendarResponse` | `WeatherCalendar` |
| `compareTrips` | POST | `/api/v1/compare` | `CompareRequest` | `CompareResponse` | `ComparisonQueueProvider` |

---

## 8. Error Response Mapping

Each backend endpoint can return these error HTTP statuses. The `extractApiError` function handles all of them uniformly:

| Status | Error Code | Example Message | Which Endpoints |
|--------|-----------|-----------------|-----------------|
| 400 | `bad_request` | "Query parameter 'q' is required" | All 7 |
| 404 | `not_found` | "No flights found for ICN → NRT on 2026-05-01" | `getFlightPrice`, `searchHotels` |
| 422 | `validation_error` | "At least 2 options are required for comparison" | `compareTrips` only |
| 500 | `internal_error` | "An unexpected error occurred" | All 7 |
| 504 | `gateway_timeout` | "External API request timed out after 10 seconds" | All except `compareTrips` and `healthCheck` |
| 0 (client) | — | "Request timed out. Please try again." | Any (client timeout at 15s) |
| 0 (client) | — | "Network error. Please check your connection and try again." | Any (server unreachable) |

**Important**: `extractApiError` always produces a user-friendly `message`. Components render this message as-is. Never display raw status codes or error codes to the user.

---

## 9. Usage Patterns for Components

### 9.1 Standard Fetch Pattern (used by all data-fetching sections)

```typescript
import { searchDestinations, extractApiError, type ApiErrorDisplay } from '@/lib/api';

// Inside a component or custom hook:
const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'empty'>('idle');
const [data, setData] = useState<DestinationResult[]>([]);
const [error, setError] = useState<ApiErrorDisplay | null>(null);

const fetchDestinations = async (query: string) => {
  setStatus('loading');
  setError(null);
  try {
    const results = await searchDestinations(query);
    if (results.length === 0) {
      setStatus('empty');
      setData([]);
    } else {
      setStatus('success');
      setData(results);
    }
  } catch (err) {
    setStatus('error');
    setError(extractApiError(err));
  }
};
```

### 9.2 Parallel Fetch Pattern (flights + hotels + weather fetched together)

When the user selects a date range, three API calls fire in parallel:

```typescript
import { getFlightPrice, searchHotels, getWeather, extractApiError } from '@/lib/api';

// Each fetch is independent — one can fail while others succeed.
// Each has its own loading/error/success state.

const fetchDateDetails = async (params: SearchParams, destination: SelectedDestination) => {
  // Fire all three in parallel — do NOT await sequentially
  const flightPromise = getFlightPrice({
    origin: params.originAirport,
    destination: destination.iata_code!,
    departure_date: params.startDate,
    return_date: params.endDate,
    traveler_count: params.travelerCount,
  });

  const hotelPromise = searchHotels({
    destination: destination.name,
    latitude: destination.latitude,
    longitude: destination.longitude,
    checkin_date: params.startDate,
    checkout_date: params.endDate,
    traveler_count: params.travelerCount,
  });

  const weatherPromise = getWeather({
    latitude: destination.latitude,
    longitude: destination.longitude,
    start_date: params.startDate,
    end_date: params.endDate,
  });

  // Each settles independently — use Promise.allSettled or individual try/catch
  // See docs/frontend/frontend-spec-ui-states.md for per-section state handling
};
```

### 9.3 Retry Pattern

Retry re-invokes the same function with the same or updated parameters:

```typescript
const handleRetry = () => {
  // Simply re-call the fetch function. It resets status to 'loading' internally.
  fetchDestinations(currentQuery);
};
```

No auto-retry. No exponential backoff. User must click the Retry button.

---

## 10. Adaptability to API Changes

The API service layer is designed to adapt to evolving backend contracts:

1. **Request/response type changes**: Update the corresponding interface in `frontend/src/types/api.ts`. The API method signatures in `api.ts` reference these types, so changes propagate automatically via TypeScript.

2. **New endpoints**: Add a new typed async function following the same pattern (use `apiClient`, return `response.data`, no error catching).

3. **URL changes**: Only update the path string in the affected method. Base URL is centralized in `API_BASE_URL`.

4. **New error codes**: `extractApiError` already handles arbitrary error responses — it reads `data.message` from any error response shape matching `{ message: string }`. No changes needed for new backend error codes.

5. **Query parameter changes**: For GET endpoints, update the `params` object. For POST endpoints, update the request type interface.

---

## 11. Testing Guidance

For component tests that need to mock API calls:

```typescript
// Mock the entire module
jest.mock('@/lib/api', () => ({
  searchDestinations: jest.fn(),
  getFlightPrice: jest.fn(),
  searchHotels: jest.fn(),
  getWeather: jest.fn(),
  getCalendarWeather: jest.fn(),
  compareTrips: jest.fn(),
  healthCheck: jest.fn(),
  extractApiError: jest.requireActual('@/lib/api').extractApiError,
}));
```

For testing `extractApiError` directly, construct `AxiosError` instances:

```typescript
import { AxiosError, AxiosHeaders } from 'axios';
import { extractApiError } from '@/lib/api';

// Simulate a 404 response
const error404 = new AxiosError('Not Found', '404', undefined, undefined, {
  status: 404,
  data: { error: 'not_found', message: 'No flights found' },
  statusText: 'Not Found',
  headers: {},
  config: { headers: new AxiosHeaders() },
});
expect(extractApiError(error404)).toEqual({
  message: 'No flights found',
  statusCode: 404,
});
```

---

## 12. File Dependencies

```
frontend/src/lib/api.ts
  ├── imports from: axios (AxiosError, AxiosInstance)
  ├── imports from: @/types/constants (API_BASE_URL)
  ├── imports from: @/types/api (all request/response types)
  └── imported by:
      ├── src/components/search/DestinationAutocomplete.tsx (searchDestinations)
      ├── src/components/calendar/WeatherCalendar.tsx (getCalendarWeather)
      ├── src/components/details/* (getFlightPrice, searchHotels, getWeather)
      ├── src/context/ComparisonQueueProvider.tsx (compareTrips)
      └── Any component needing extractApiError or ApiErrorDisplay
```
