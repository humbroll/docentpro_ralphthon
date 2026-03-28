# WhenToGo Frontend Specification — Network & API Error Edge Cases

> **Audience**: Ralph Loop (autonomous implementation agent)
> **Scope**: Exhaustive documentation of every network/API error edge case — timeouts, 500 errors, rate limiting, partial data failures, connection loss — with exact retry logic, error message copy, fallback UI, and timeout threshold values.
> **Cross-references**: UI states in `docs/frontend/frontend-spec-ui-states.md`, API service layer in `docs/frontend/frontend-spec-api-service-layer.md`, empty states in `docs/frontend/frontend-spec-empty-states.md`, types from `frontend/src/types/api.ts`.

---

## Table of Contents

1. [Timeout Configuration & Thresholds](#1-timeout-configuration--thresholds)
2. [Error Classification Taxonomy](#2-error-classification-taxonomy)
3. [Error Handling Architecture](#3-error-handling-architecture)
4. [Per-Endpoint Error Scenarios](#4-per-endpoint-error-scenarios)
5. [Network-Level Errors](#5-network-level-errors)
6. [Partial Data Failure (Concurrent Fetch Scenarios)](#6-partial-data-failure-concurrent-fetch-scenarios)
7. [Rate Limiting (HTTP 429)](#7-rate-limiting-http-429)
8. [Request Cancellation Edge Cases](#8-request-cancellation-edge-cases)
9. [Retry Logic Specification](#9-retry-logic-specification)
10. [Error Message Copy — Complete Reference](#10-error-message-copy--complete-reference)
11. [Fallback UI Patterns](#11-fallback-ui-patterns)
12. [Compound Error Scenarios](#12-compound-error-scenarios)
13. [Implementation Checklist](#13-implementation-checklist)

---

## 1. Timeout Configuration & Thresholds

### 1.1 Timeout Hierarchy

There are two timeout layers. The frontend must account for both:

| Layer | Timeout Value | Where Configured | What Happens on Timeout |
|-------|--------------|------------------|------------------------|
| **Backend external API timeout** | 10 seconds | Backend server (not frontend-configurable) | Backend returns HTTP 504 with `{ error: "gateway_timeout", message: "External API request timed out after 10 seconds" }` |
| **Frontend Axios client timeout** | 15 seconds | `src/lib/api.ts` → `apiClient.timeout = 15000` | Axios throws `AxiosError` with `code: 'ECONNABORTED'`. No HTTP response body. `extractApiError()` returns `{ message: "Request timed out. Please try again.", statusCode: 0 }` |

### 1.2 Why Two Timeouts

- The backend has a 10-second timeout for calls to external services (Amadeus, LiteAPI, Open-Meteo). If an external API is slow, the backend catches the timeout and returns HTTP 504 to the frontend with a structured error body.
- The frontend has a 15-second Axios timeout as a safety net. This fires if the backend itself becomes unresponsive (e.g., the backend process hangs, or the network connection stalls). The 5-second buffer (15s − 10s) allows the backend to process its own timeout and respond with 504 before the frontend gives up.

### 1.3 Timeout Scenarios by Endpoint

| Endpoint | Can Return 504? | Reason | Frontend Axios Timeout Likely? |
|----------|----------------|--------|-------------------------------|
| `GET /health` | No | No external API calls | Only if backend is down |
| `GET /api/v1/search/destinations` | Yes | Amadeus City Search API timeout | Rare (backend 504 first) |
| `POST /api/v1/flights/price` | Yes | Amadeus Flight Offers API timeout | Rare (backend 504 first) |
| `POST /api/v1/hotels/search` | Yes | LiteAPI timeout (2-step flow: search + rates) | Possible (2 sequential external calls may approach 15s) |
| `POST /api/v1/weather` | Yes | Open-Meteo API timeout | Rare (Open-Meteo is fast) |
| `POST /api/v1/calendar` | Yes | Open-Meteo API timeout | Rare (Open-Meteo is fast) |
| `POST /api/v1/compare` | No | Pure computation, no external APIs | Only if backend is down |

### 1.4 Hotel Search: Extended Timeout Risk

The hotel search endpoint (`POST /api/v1/hotels/search`) makes **two sequential external API calls** (LiteAPI hotel search → LiteAPI min-rates). Each has a 10-second backend timeout. In the worst case, the first call takes 9.9 seconds and the second takes 9.9 seconds, totaling ~20 seconds of backend processing — which **exceeds the 15-second frontend timeout**.

**Handling**: If the frontend Axios timeout fires (15s) before the backend responds, `extractApiError()` returns `{ message: "Request timed out. Please try again.", statusCode: 0 }`. The user sees this in the Hotels card's `InlineError` and can click Retry. No special handling is needed beyond the standard timeout error flow.

### 1.5 Debounce Timeout (Destination Search Only)

The destination search autocomplete uses a **300ms debounce** before firing API requests. This is NOT an error-related timeout — it's a UX optimization to avoid excessive API calls while the user is typing. It does not produce error states.

| Parameter | Value | Defined In |
|-----------|-------|-----------|
| Debounce delay | 300ms | `DestinationAutocomplete` component |
| Minimum query length | 3 characters | `DestinationAutocomplete` component |

---

## 2. Error Classification Taxonomy

Every error the frontend can encounter falls into one of these categories. The `extractApiError()` function in `src/lib/api.ts` normalizes all of them into an `ApiErrorDisplay` object.

### 2.1 Server Error Responses (HTTP 4xx/5xx)

The backend always responds with a JSON body matching `{ error: string, message: string }` (the `ErrorResponse` schema from the API spec).

| HTTP Status | Error Code | Category | User Can Fix? | Retry Useful? |
|-------------|-----------|----------|---------------|---------------|
| 400 | `bad_request` | Client validation error | Yes (fix input) | Yes (after fixing input) |
| 404 | `not_found` | No results for valid input | Sometimes (try different input) | Yes (idempotent) |
| 422 | `validation_error` | Semantic validation failure | Yes (fix queue) | Yes (after fixing queue) |
| 500 | `internal_error` | Backend crash / unhandled error | No | Yes (transient issue may resolve) |
| 504 | `gateway_timeout` | External API timed out | No | Yes (external API may recover) |

### 2.2 Client-Side Errors (No HTTP Response)

These errors occur when the Axios request never receives an HTTP response from the backend.

| Error Condition | Axios `err.code` | `err.response` | `extractApiError()` Output |
|-----------------|------------------|----------------|---------------------------|
| Frontend timeout (15s) | `ECONNABORTED` | `undefined` | `{ message: "Request timed out. Please try again.", statusCode: 0 }` |
| Request cancelled (AbortController) | `ERR_CANCELED` | `undefined` | `{ message: "Request timed out. Please try again.", statusCode: 0 }` |
| Network unreachable / DNS failure / CORS | `ERR_NETWORK` | `undefined` | `{ message: "Network error. Please check your connection and try again.", statusCode: 0 }` |
| Backend server down (connection refused) | `ERR_NETWORK` | `undefined` | `{ message: "Network error. Please check your connection and try again.", statusCode: 0 }` |

### 2.3 Non-Axios Errors (Defensive)

If a non-Axios error somehow reaches the catch block (e.g., a JSON parse error, a TypeError in response processing):

| Condition | `extractApiError()` Output |
|-----------|---------------------------|
| `err` is not an `AxiosError` instance | `{ message: "An unexpected error occurred. Please try again.", statusCode: 0 }` |

---

## 3. Error Handling Architecture

### 3.1 Error Flow Diagram

```
Component/Hook
    │
    ├── calls api.searchDestinations(query)
    │       │
    │       ├── SUCCESS: HTTP 200 → returns typed data
    │       │
    │       └── FAILURE: throws AxiosError
    │
    └── catch block:
            │
            ├── calls extractApiError(err)
            │       │
            │       └── returns ApiErrorDisplay { message, statusCode }
            │
            └── sets state: { status: 'error', error: ApiErrorDisplay }
                    │
                    └── renders <InlineError message={error.message} onRetry={handleRetry} />
```

### 3.2 Key Architectural Rules

1. **No global error boundary for API errors**: API errors are handled per-section, not globally. Each section manages its own `AsyncState<T>` independently.
2. **No error interceptors**: Axios interceptors are NOT used. Errors propagate naturally from the API method to the calling code.
3. **No auto-retry**: The user must explicitly click the Retry button. No exponential backoff, no automatic retries, no retry counters.
4. **No toasts or snackbars**: All errors display inline within the section where the failed request was initiated.
5. **No auto-dismiss**: Error messages persist until the user either clicks Retry or triggers a new fetch (e.g., changing dates, selecting a new destination).
6. **No error logging to external services**: Errors are displayed to the user only. No Sentry, no LogRocket, no console.error (except in development for debugging).
7. **statusCode is internal only**: The `statusCode` field in `ApiErrorDisplay` is used by components to customize error messages (e.g., show a different message for 404 vs 500). It is NEVER displayed to the user.

### 3.3 AbortController Usage for Request Cancellation

The destination search autocomplete MUST use `AbortController` to cancel in-flight requests when the user types new characters. This prevents stale results from appearing.

```typescript
// Pattern for DestinationAutocomplete:
const abortControllerRef = useRef<AbortController | null>(null);

const fetchDestinations = async (query: string) => {
  // Cancel any in-flight request
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }

  const controller = new AbortController();
  abortControllerRef.current = controller;

  setState({ status: 'loading' });
  try {
    // Pass signal to the API call
    const response = await apiClient.get<DestinationResult[]>(
      '/api/v1/search/destinations',
      { params: { q: query }, signal: controller.signal },
    );
    setState({ status: 'success', data: response.data });
  } catch (err) {
    if (axios.isCancel(err)) {
      // Request was cancelled by user typing — do NOT show error, do NOT change state
      return;
    }
    setState({ status: 'error', error: extractApiError(err) });
  }
};
```

**Critical**: When a request is cancelled via `AbortController`, do NOT transition to the error state. Silently ignore the cancellation. Only show errors for genuine failures.

**Note on `searchDestinations` API method**: Since `searchDestinations` in `src/lib/api.ts` does not accept an `AbortSignal` parameter, the autocomplete component should call `apiClient.get(...)` directly for this specific endpoint (passing `{ signal: controller.signal }` in the config), OR the `searchDestinations` method should be extended to accept an optional `signal` parameter:

```typescript
// Recommended extension to src/lib/api.ts:
export async function searchDestinations(
  query: string,
  signal?: AbortSignal,
): Promise<DestinationResult[]> {
  const response = await apiClient.get<DestinationResult[]>(
    '/api/v1/search/destinations',
    { params: { q: query }, signal },
  );
  return response.data;
}
```

---

## 4. Per-Endpoint Error Scenarios

### 4.1 Destination Search (`GET /api/v1/search/destinations`)

| Error Scenario | HTTP Status | Backend `message` (example) | Frontend Display Message | Retry Behavior |
|----------------|------------|----------------------------|-------------------------|----------------|
| Query too short (< 3 chars) | 400 | `"Query parameter 'q' must be at least 3 characters"` | Backend message verbatim | Retry re-sends the same query. User should also modify input. |
| Missing query parameter | 400 | `"Query parameter 'q' is required"` | Backend message verbatim | Retry re-sends. (Should not happen if frontend enforces min 3 chars.) |
| Amadeus API down | 500 | `"An unexpected error occurred"` | `"Something went wrong. Please try again."` | Retry re-sends the same query. |
| Amadeus API timeout | 504 | `"External API request timed out after 10 seconds"` | `"The request timed out. Please try again in a moment."` | Retry re-sends. |
| Frontend timeout (15s) | N/A (0) | N/A | `"Request timed out. Please try again."` | Retry re-sends. |
| Network error | N/A (0) | N/A | `"Network error. Please check your connection and try again."` | Retry re-sends. |

**Error display location**: Below the search input, outside the dropdown. Dropdown closes on error.

**Special behavior**: The search input remains enabled during error state. User can keep typing, which triggers a new debounced search and clears the error.

### 4.2 Calendar Weather (`POST /api/v1/calendar`)

| Error Scenario | HTTP Status | Backend `message` (example) | Frontend Display Message | Retry Behavior |
|----------------|------------|----------------------------|-------------------------|----------------|
| Invalid date range | 400 | `"start_date must be before end_date"` | Backend message verbatim | Retry re-sends. (Shouldn't occur if frontend sends valid dates.) |
| Open-Meteo API down | 500 | `"An unexpected error occurred"` | `"Something went wrong. Please try again."` | Retry re-sends with same destination/coordinates. |
| Open-Meteo timeout | 504 | `"External API request timed out after 10 seconds"` | `"The request timed out. Please try again in a moment."` | Retry re-sends. |
| Frontend timeout (15s) | N/A (0) | N/A | `"Request timed out. Please try again."` | Retry re-sends. |
| Network error | N/A (0) | N/A | `"Network error. Please check your connection and try again."` | Retry re-sends. |

**Error display location**: Inside the calendar section area, replacing the calendar grid.

**Impact on downstream sections**: When calendar is in error state, date range selection is blocked (date pickers are disabled). Therefore, flight/hotel/weather sections remain in `idle` state (hidden).

**Retry parameters**: Retry re-sends the same `CalendarRequest` with the same destination name, latitude, longitude, start_date, and end_date.

### 4.3 Flight Price (`POST /api/v1/flights/price`)

| Error Scenario | HTTP Status | Backend `message` (example) | Frontend Display Message | Retry Behavior |
|----------------|------------|----------------------------|-------------------------|----------------|
| No flights found | 404 | `"No flights found for ICN → NRT on 2026-05-01"` | `"No flights found for this route and dates."` | Retry re-sends. Likely to fail again unless external conditions change. |
| Invalid IATA code | 400 | `"Invalid origin airport code"` | Backend message verbatim | Retry re-sends. User should change origin airport. |
| Amadeus API down | 500 | `"An unexpected error occurred"` | `"Something went wrong. Please try again."` | Retry re-sends. |
| Amadeus API timeout | 504 | `"External API request timed out after 10 seconds"` | `"The request timed out. Please try again in a moment."` | Retry re-sends. |
| Frontend timeout (15s) | N/A (0) | N/A | `"Request timed out. Please try again."` | Retry re-sends. |
| Network error | N/A (0) | N/A | `"Network error. Please check your connection and try again."` | Retry re-sends. |

**Error display location**: Inside the "Flight Price" `Card` body, using `InlineError`.

**Special 404 handling**: The component checks `error.statusCode === 404` and overrides the message to `"No flights found for this route and dates."` regardless of the backend's message (which may contain technical route formatting).

**Impact on "Add to Queue"**: Button disabled with tooltip `"Waiting for flight price..."`.

### 4.4 Hotel Search (`POST /api/v1/hotels/search`)

| Error Scenario | HTTP Status | Backend `message` (example) | Frontend Display Message | Retry Behavior |
|----------------|------------|----------------------------|-------------------------|----------------|
| No hotels found | 404 | `"No hotels found in Tokyo for 2026-05-01 to 2026-05-05"` | `"No hotels found for this destination and dates."` | Retry re-sends. |
| Invalid coordinates | 400 | `"Latitude must be between -90 and 90"` | Backend message verbatim | Retry re-sends. (Shouldn't occur if destination was selected from API results.) |
| LiteAPI search down | 500 | `"An unexpected error occurred"` | `"Something went wrong. Please try again."` | Retry re-sends. |
| LiteAPI rates down (partial) | 500 | `"An unexpected error occurred"` | `"Something went wrong. Please try again."` | Retry re-sends. Backend handles the 2-step LiteAPI flow internally. |
| LiteAPI timeout (either step) | 504 | `"External API request timed out after 10 seconds"` | `"The request timed out. Please try again in a moment."` | Retry re-sends. |
| Frontend timeout (15s) — more likely for hotels due to 2-step backend | N/A (0) | N/A | `"Request timed out. Please try again."` | Retry re-sends. |
| Network error | N/A (0) | N/A | `"Network error. Please check your connection and try again."` | Retry re-sends. |

**Error display location**: Inside the "Hotels" `Card` body, using `InlineError`.

**Special 404 handling**: Component checks `error.statusCode === 404` and overrides the message to `"No hotels found for this destination and dates."`.

**Impact on "Add to Queue"**: Button disabled with tooltip `"Select a hotel first"`.

### 4.5 Weather Summary (`POST /api/v1/weather`)

| Error Scenario | HTTP Status | Backend `message` (example) | Frontend Display Message | Retry Behavior |
|----------------|------------|----------------------------|-------------------------|----------------|
| Invalid date range | 400 | `"start_date must be before end_date"` | Backend message verbatim | Retry re-sends. |
| Open-Meteo API down | 500 | `"An unexpected error occurred"` | `"Something went wrong. Please try again."` | Retry re-sends. |
| Open-Meteo timeout | 504 | `"External API request timed out after 10 seconds"` | `"The request timed out. Please try again in a moment."` | Retry re-sends. |
| Frontend timeout (15s) | N/A (0) | N/A | `"Request timed out. Please try again."` | Retry re-sends. |
| Network error | N/A (0) | N/A | `"Network error. Please check your connection and try again."` | Retry re-sends. |

**Error display location**: Inside the "Weather" `Card` body, using `InlineError`.

**Note**: The weather endpoint does NOT return 404. Open-Meteo provides historical data for virtually all coordinates. If it somehow does return 404, treat it as a standard error.

**Impact on "Add to Queue"**: Button disabled with tooltip `"Waiting for weather data..."`.

### 4.6 Trip Comparison (`POST /api/v1/compare`)

| Error Scenario | HTTP Status | Backend `message` (example) | Frontend Display Message | Retry Behavior |
|----------------|------------|----------------------------|-------------------------|----------------|
| Fewer than 2 options | 422 | `"At least 2 options are required for comparison"` | Backend message verbatim | Retry re-sends. (Should not occur if frontend enforces min 2 queue items.) |
| More than 5 options | 422 | `"Maximum 5 options allowed for comparison"` | Backend message verbatim | Retry re-sends. (Should not occur if frontend enforces max 5 queue items.) |
| Invalid option data | 400 | `"flight_price is required for each option"` | Backend message verbatim | Retry re-sends. Queue items should be valid from prior API calls. |
| Backend crash | 500 | `"An unexpected error occurred"` | `"Something went wrong. Please try again."` | Retry re-sends. |
| Frontend timeout (15s) | N/A (0) | N/A | `"Request timed out. Please try again."` | Retry re-sends. (Unlikely — compare is pure computation.) |
| Network error | N/A (0) | N/A | `"Network error. Please check your connection and try again."` | Retry re-sends. |

**Error display location**: In the comparison results area (below the queue list), using `InlineError`.

**Note**: This endpoint does NOT call external APIs, so it should NEVER return 504. If it somehow does, `extractApiError()` handles it like any other server error.

**Queue state during error**: Queue items remain visible and editable. User can remove/add items and then retry. The "Compare" button returns to enabled state (not loading).

---

## 5. Network-Level Errors

### 5.1 Backend Server Down (Connection Refused)

**Cause**: Backend process is not running, or the `NEXT_PUBLIC_API_URL` is misconfigured.

**Axios behavior**: `AxiosError` with `code: 'ERR_NETWORK'`, no `response` object.

**User-facing message**: `"Network error. Please check your connection and try again."`

**Affected endpoints**: ALL endpoints fail simultaneously.

**UI behavior**: Each section that has an in-flight or pending request shows its own `InlineError` independently. For example, if the user selects a date range (triggering flights, hotels, weather concurrently) and the backend is down, all three sections show error states simultaneously. Each has its own Retry button.

### 5.2 DNS Resolution Failure

**Cause**: Invalid hostname in `NEXT_PUBLIC_API_URL`, or DNS server unreachable.

**Axios behavior**: Same as connection refused — `AxiosError` with `code: 'ERR_NETWORK'`.

**User-facing message**: `"Network error. Please check your connection and try again."`

### 5.3 CORS Error

**Cause**: Backend does not include proper CORS headers, or backend is on a different origin without CORS configuration.

**Axios behavior**: Browser blocks the response. Axios receives a network error — `AxiosError` with `code: 'ERR_NETWORK'`.

**User-facing message**: `"Network error. Please check your connection and try again."` (The user cannot distinguish CORS from other network errors, which is intentional.)

### 5.4 SSL/TLS Error

**Cause**: Invalid certificate if using HTTPS.

**Axios behavior**: Same as network error.

**User-facing message**: `"Network error. Please check your connection and try again."`

### 5.5 Intermittent Network Loss

**Cause**: User's WiFi drops momentarily, mobile connection lost.

**Axios behavior**: Depending on timing:
- If the request hadn't been sent yet: `ERR_NETWORK`
- If the request was sent but response not received: `ECONNABORTED` (timeout) or `ERR_NETWORK`

**User-facing message**: Either `"Request timed out. Please try again."` or `"Network error. Please check your connection and try again."`

**Note**: There is NO online/offline detection. The frontend does not listen for `navigator.onLine` changes and does not show a global "You are offline" banner. Errors are handled per-request as they fail.

---

## 6. Partial Data Failure (Concurrent Fetch Scenarios)

### 6.1 The Concurrent Fetch Context

When the user selects a date range on the calendar, **three API requests fire simultaneously**:

1. `POST /api/v1/flights/price` → Flight Price card
2. `POST /api/v1/hotels/search` → Hotels card
3. `POST /api/v1/weather` → Weather Summary card

Each request is independent. They are NOT dispatched with `Promise.all()` or `Promise.allSettled()` — each manages its own `AsyncState<T>` via separate state variables or a combined reducer. One can succeed while others fail.

### 6.2 Partial Success Scenarios

| Flights | Hotels | Weather | "Add to Queue" Button | User Action |
|---------|--------|---------|----------------------|-------------|
| success | success | success | **Enabled** | User can add to queue |
| success | success | error | Disabled (`"Waiting for weather data..."`) | User retries weather |
| success | error | success | Disabled (`"Select a hotel first"`) | User retries hotels |
| error | success | success | Disabled (`"Waiting for flight price..."`) | User retries flights |
| success | error | error | Disabled (`"Select a hotel first"`) | User retries hotels and weather independently |
| error | success | error | Disabled (`"Waiting for flight price..."`) | User retries flights and weather independently |
| error | error | success | Disabled (`"Waiting for flight price..."`) | User retries flights and hotels independently |
| error | error | error | Disabled (`"Waiting for flight price..."`) | User retries all three independently |

### 6.3 Visual Layout During Partial Failure

All three sections are always visible once dates are selected (they were revealed by the progressive flow). Each section renders its own state independently:

```
┌─────────────────────────────────────────────────────┐
│  ✈️  Flight Price                                    │
│  ┌───────────────────────────────────────────────┐  │
│  │  $342.50 USD                                  │  │  ← SUCCESS
│  │  ICN → NRT · May 1 – May 5                   │  │
│  └───────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  🏨  Hotels                                         │
│  ┌───────────────────────────────────────────────┐  │
│  │  ⚠️  The request timed out. Please try again  │  │  ← ERROR (504)
│  │     in a moment.                              │  │
│  │  [ Retry ]                                    │  │
│  └───────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  🌤️  Weather                                        │
│  ┌───────────────────────────────────────────────┐  │
│  │  ████████████████████████  (loading skeleton) │  │  ← LOADING (still in-flight)
│  └───────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  [ Add to Queue ]  ← DISABLED                       │
│  Tooltip: "Select a hotel first"                    │
└─────────────────────────────────────────────────────┘
```

### 6.4 Retry After Partial Failure

Each section's Retry button re-sends ONLY that section's request. It does NOT re-trigger the other sections.

**Example**: Hotels failed with 504. User clicks Retry on the Hotels card.
- Hotels transitions: `error` → `loading` → (hopefully) `success`
- Flights remains in `success` (unchanged)
- Weather remains in whatever state it's in (unchanged)

### 6.5 Date Change During Partial Failure

If the user changes the date range while some sections are in error and others in success:
- ALL three sections reset to `loading` and fire new requests with the new dates
- Previous error states are cleared
- Previous success data is discarded (stale for old dates)

### 6.6 Destination Change During Partial Failure

If the user selects a new destination while sections are in error/success/loading:
- Calendar resets to `loading` (new destination requires new calendar weather data)
- Flight, Hotel, Weather sections reset to `idle` (hidden) — they wait for a new date range selection
- Previous error states are cleared
- Comparison queue is **preserved** (existing items are from the old destination and remain valid as queued trip options)

---

## 7. Rate Limiting (HTTP 429)

### 7.1 Backend Rate Limiting Behavior

The API spec (OpenAPI 3.1) does NOT define a 429 response for any endpoint. However, the external APIs the backend calls (Amadeus, LiteAPI) may rate-limit the backend. In those cases:

- The backend will typically convert external rate-limit errors into HTTP 500 (`internal_error`) with a generic message like `"An unexpected error occurred"`, OR
- In rare cases, the backend may pass through an HTTP 429 response if not explicitly handled.

### 7.2 Frontend Handling of HTTP 429

Since 429 is not in the API contract, `extractApiError()` handles it as a generic server error:

```typescript
// extractApiError behavior for 429:
if (err.response) {
  const data = err.response.data as { error?: string; message?: string } | undefined;
  return {
    message: data?.message || `Request failed (${err.response.status})`,
    statusCode: err.response.status,
  };
}
```

- If the backend returns a 429 with a `message` field: that message is displayed.
- If the backend returns a 429 without a message body: the fallback `"Request failed (429)"` is displayed.

### 7.3 No Special 429 UI Treatment

The frontend does NOT implement:
- Retry-After header parsing
- Automatic retry with backoff
- Rate limit countdown timers
- "Too many requests" specific messaging

The user sees the error and clicks Retry manually, same as any other error. This is sufficient because:
1. Rate limiting is controlled at the backend level (the frontend doesn't directly call external APIs)
2. The backend's own rate-limiting strategy is opaque to the frontend
3. Manual retry with human-speed delays naturally provides backoff

### 7.4 Defensive Override for 429

If Ralph Loop wants to provide a better message for 429, the following optional enhancement can be added to the `extractApiError` function (AFTER the standard handling):

```typescript
// Optional: Add after the `if (err.response)` block in extractApiError
if (err.response?.status === 429) {
  return {
    message: 'Too many requests. Please wait a moment and try again.',
    statusCode: 429,
  };
}
```

This is **optional** — the default behavior (using the backend's message or fallback) is acceptable.

---

## 8. Request Cancellation Edge Cases

### 8.1 Destination Search — Rapid Typing

**Scenario**: User types "T", "To", "Tok", "Toky", "Tokyo" rapidly.

- Each keystroke resets the 300ms debounce timer
- Only the final debounced query ("Tokyo") actually fires an API request
- If a request for "Tok" was already in-flight (the debounce fired before "y" was typed), it must be cancelled via `AbortController`
- Cancelled requests do NOT produce error states — they are silently ignored

### 8.2 Destination Search — Clear and Retype

**Scenario**: User types "Tokyo" (search fires), then clears the input and types "Paris".

- The "Tokyo" request (if still in-flight) must be cancelled
- State resets to `idle` when input is cleared to < 3 chars
- A new debounced request fires for "Paris" when >= 3 chars are typed

### 8.3 Date Range Change During Concurrent Fetch

**Scenario**: User selects May 1–5, triggering flights/hotels/weather. Before all three complete, user changes dates to May 10–15.

**Handling**: The three in-flight requests from the first date selection are NOT explicitly cancelled (they are not using `AbortController` — cancellation is only implemented for destination search). Instead:
- The component re-triggers all three requests with the new dates
- When old requests complete, their results are stale and must be discarded

**Implementation**: Use a request ID or a ref to the "current" request parameters. When a response arrives, compare its parameters against the current parameters. If they don't match, discard the response:

```typescript
const currentRequestRef = useRef<string>('');

const fetchDateDetails = async (startDate: string, endDate: string) => {
  const requestId = `${startDate}-${endDate}`;
  currentRequestRef.current = requestId;

  setFlightState({ status: 'loading' });

  try {
    const flight = await getFlightPrice({ /* params */ });
    // Only update state if this is still the current request
    if (currentRequestRef.current === requestId) {
      setFlightState({ status: 'success', data: flight });
    }
  } catch (err) {
    if (currentRequestRef.current === requestId) {
      setFlightState({ status: 'error', error: extractApiError(err) });
    }
  }
};
```

### 8.4 Destination Change During Calendar Fetch

**Scenario**: User selects "Tokyo", calendar fetch starts. User immediately searches and selects "Paris".

**Handling**: The Tokyo calendar request completes but its data is for the wrong destination. The "Paris" selection triggers a new calendar fetch. Use the same request-ID pattern (keyed on destination name + coordinates) to discard stale responses.

---

## 9. Retry Logic Specification

### 9.1 Core Retry Rules

| Rule | Specification |
|------|--------------|
| **Retry mechanism** | Manual only — user clicks the `Retry` button in the `InlineError` component |
| **Auto-retry** | NONE. No automatic retries under any circumstances. |
| **Exponential backoff** | NONE. Retries fire immediately when the user clicks. |
| **Retry count limit** | NONE. The user can retry unlimited times. |
| **Retry counter display** | NONE. Do not show "Attempt 2 of 3" or similar. |
| **Retry cooldown** | NONE. No minimum wait between retries. |
| **Retry button state during loading** | Disabled (the section transitions to `loading` state, which replaces the error UI with skeleton/spinner). |

### 9.2 Retry Parameter Resolution

When the user clicks Retry, the request is re-sent with the **current** parameters, not necessarily the parameters from the original failed request. This is important because the user may have changed inputs between the failure and the retry.

| Section | Retry Parameters Source |
|---------|------------------------|
| Destination Search | Current value of the search input (the text currently in the field) |
| Calendar Weather | Current selected destination (name, latitude, longitude) + current calendar date range |
| Flight Price | Current origin airport + current destination IATA code + current date range + current traveler count |
| Hotel Search | Current destination (name, lat, lon) + current date range + current traveler count |
| Weather Summary | Current destination (lat, lon) + current date range |
| Trip Comparison | Current comparison queue contents (all items in the queue at the time of retry) |

### 9.3 Retry Button Rendering

The `InlineError` component renders the Retry button as specified in `docs/frontend/frontend-spec-ui-states.md`:

```typescript
<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
  <Alert severity="error" variant="outlined">
    {message}
  </Alert>
  <Button
    variant="outlined"
    color="error"
    size="small"
    onClick={onRetry}
  >
    Retry
  </Button>
</Box>
```

### 9.4 Retry State Transition

When Retry is clicked:

```
error ──(click Retry)──> loading ──(success)──> success
                              └──(failure)──> error (with new error message — could be different from the original)
```

The error message may change between retries (e.g., first try fails with 504, retry fails with 500). The `InlineError` always shows the most recent error message.

---

## 10. Error Message Copy — Complete Reference

### 10.1 Server Error Messages by HTTP Status

These messages are used when `extractApiError()` processes server responses:

| HTTP Status | Source of Message | Default Fallback (if no `message` in response body) |
|-------------|------------------|------------------------------------------------------|
| 400 | `response.data.message` (backend's validation message) | `"Request failed (400)"` |
| 404 | Overridden per-section (see below) | `"Request failed (404)"` |
| 422 | `response.data.message` (backend's validation message) | `"Request failed (422)"` |
| 500 | Hard-coded override | `"Something went wrong. Please try again."` — Note: `extractApiError` uses the backend message if available. The 500 override happens in the API spec convention (backend sends `"An unexpected error occurred"`) or as a component-level override. |
| 504 | Hard-coded override | `"The request timed out. Please try again in a moment."` — Note: Same caveat as 500. |

### 10.2 Per-Section 404 Message Overrides

Components override the 404 message from `extractApiError` with a user-friendly version:

| Section | 404 Override Message |
|---------|---------------------|
| Flight Price | `"No flights found for this route and dates."` |
| Hotel Search | `"No hotels found for this destination and dates."` |

**Implementation**: In the component, after calling `extractApiError`, check `error.statusCode`:

```typescript
catch (err) {
  const apiError = extractApiError(err);
  if (apiError.statusCode === 404) {
    apiError.message = 'No flights found for this route and dates.';
  }
  setState({ status: 'error', error: apiError });
}
```

### 10.3 Client-Side Error Messages

| Error Condition | Message |
|-----------------|---------|
| Axios timeout (15s) | `"Request timed out. Please try again."` |
| Request cancelled | `"Request timed out. Please try again."` (but typically not shown — see Section 8) |
| Network unreachable | `"Network error. Please check your connection and try again."` |
| Non-Axios error | `"An unexpected error occurred. Please try again."` |

### 10.4 Defensive Error Messages (Components)

These messages are not from `extractApiError` but are set by components for specific edge cases:

| Scenario | Message | Where Set |
|----------|---------|-----------|
| Compare returns empty `options` array | `"Comparison returned no results. Please try again."` | Comparison results component |
| Compare endpoint returns unexpected format | `"An unexpected error occurred. Please try again."` | Comparison results component |

### 10.5 Complete Message Lookup Table

For quick reference, here is every unique error message string that can appear in the UI:

| # | Message String | Triggered By |
|---|---------------|-------------|
| 1 | `"Request timed out. Please try again."` | Client-side Axios timeout (15s) or request cancellation |
| 2 | `"Network error. Please check your connection and try again."` | Network unreachable, DNS failure, CORS, backend down |
| 3 | `"An unexpected error occurred. Please try again."` | Non-Axios error (defensive) |
| 4 | `"Something went wrong. Please try again."` | Not used by `extractApiError` directly; this is a convention the component MAY apply for 500s. The actual 500 message comes from the backend's `message` field: `"An unexpected error occurred"` |
| 5 | `"The request timed out. Please try again in a moment."` | Backend 504 response (backend's own message field) |
| 6 | `"No flights found for this route and dates."` | Flight section 404 override |
| 7 | `"No hotels found for this destination and dates."` | Hotel section 404 override |
| 8 | `"Comparison returned no results. Please try again."` | Defensive: compare returns empty options |
| 9 | `"Too many requests. Please wait a moment and try again."` | Optional 429 override (if implemented) |
| 10 | `"Request failed ({status})"` | Fallback when server responds with an error but no `message` field in the body |
| 11 | _(Backend's `message` field verbatim)_ | 400, 422 responses where the backend provides a specific validation message |

---

## 11. Fallback UI Patterns

### 11.1 InlineError Component (Standard Error Fallback)

Every error state in every section uses the same `InlineError` component. There are NO alternative error UIs, NO modals, NO toasts, NO banners outside the section.

```
┌─────────────────────────────────────────┐
│  ┌───────────────────────────────────┐  │
│  │  ⚠️  {error message text}        │  │  ← MUI Alert, severity="error",
│  │                                   │  │     variant="outlined"
│  └───────────────────────────────────┘  │
│                                         │
│            [ Retry ]                    │  ← MUI Button, variant="outlined",
│                                         │     color="error", size="small"
└─────────────────────────────────────────┘
```

### 11.2 Loading Skeleton (Replaces Error on Retry)

When the user clicks Retry, the error UI is immediately replaced by the section's loading skeleton (or spinner for destination search dropdown). The skeleton dimensions match the expected success UI to avoid layout shift.

| Section | Loading Fallback |
|---------|-----------------|
| Destination Search | `CircularProgress` (size 24) centered in dropdown area |
| Calendar Weather | Skeleton calendar grid (2-month layout, each day cell 48px height) |
| Flight Price | `Skeleton` text (60% width) + `Skeleton` text (40% width) |
| Hotel Search | 3× `Skeleton` rectangular (72px height, 100% width, 8px gap) |
| Weather Summary | `Skeleton` text (50%) + `Skeleton` rectangular (24px, 80%) + `Skeleton` text (30%) |
| Trip Comparison | 3× `Skeleton` rectangular (48px height, 100% width, 4px gap) |

### 11.3 No Data Persistence Across Errors

When a section transitions from `success` → `loading` (due to parameter change) → `error`:
- The previous success data is NOT displayed
- The error UI completely replaces the success UI
- There is no "stale while revalidate" pattern
- Previous data is discarded when the new fetch begins

### 11.4 Error State Does Not Block Unrelated Sections

Each section operates independently. An error in one section does NOT:
- Disable other sections (except "Add to Queue" which requires all three: flights, hotels, weather)
- Prevent the user from interacting with the calendar or search
- Block the comparison queue from being viewed or modified

---

## 12. Compound Error Scenarios

### 12.1 Backend Completely Down

**Scenario**: The backend server is unreachable (crashed, wrong port, not started).

**User experience flow**:
1. User types "Tokyo" in destination search → 300ms debounce → API call fails → `"Network error. Please check your connection and try again."` below the search input
2. User cannot select a destination → calendar never loads → no date range → no flights/hotels/weather
3. The comparison queue (local state) is still functional — user can view/remove previously added items (if any from before the crash), but cannot add new items
4. Compare button (if queue has 2+ items): clicking it fails with the same network error in the comparison results area

**Key point**: The app does NOT show a global "Backend unavailable" screen. Each section independently fails with its own error.

### 12.2 External API Down (Amadeus Only)

**Scenario**: Amadeus is down, but LiteAPI and Open-Meteo are fine.

**User experience flow**:
1. Destination search fails (Amadeus) → error below search input
2. User clicks Retry → if Amadeus is still down, same error
3. The user is blocked because they cannot select a destination

**Alternative path**: If the user had previously selected a destination and the destination is still in state (page not refreshed), they can still select dates and:
- Flights fail (Amadeus) → Flight Price card shows error
- Hotels succeed (LiteAPI) → Hotels card shows results
- Weather succeeds (Open-Meteo) → Weather card shows results
- "Add to Queue" is disabled (flights in error)

### 12.3 External API Down (LiteAPI Only)

**Scenario**: LiteAPI is down, but Amadeus and Open-Meteo are fine.

**User experience flow**:
1. Destination search succeeds (Amadeus)
2. Calendar weather loads (Open-Meteo)
3. After date selection:
   - Flights succeed (Amadeus)
   - Hotels fail (LiteAPI) → Hotels card shows error
   - Weather succeeds (Open-Meteo)
4. "Add to Queue" is disabled (hotels in error, tooltip: `"Select a hotel first"`)
5. User clicks Retry on Hotels → may succeed if LiteAPI recovers

### 12.4 External API Down (Open-Meteo Only)

**Scenario**: Open-Meteo is down, but Amadeus and LiteAPI are fine.

**User experience flow**:
1. Destination search succeeds (Amadeus)
2. Calendar weather fails (Open-Meteo) → calendar section shows error instead of calendar grid
3. **Date selection is blocked** (calendar is in error state, date pickers are disabled)
4. User clicks Retry on Calendar → may succeed if Open-Meteo recovers
5. If Calendar Retry succeeds → calendar renders → user can select dates
6. After date selection: weather summary may also fail (same Open-Meteo dependency)

### 12.5 Intermittent Failures (Flaky Network)

**Scenario**: Network is unstable. Some requests succeed, some fail randomly.

**User experience**: Each section independently shows success or error based on whether its specific request succeeded. The user can retry individual failed sections. There is no coordination between sections for retry purposes.

### 12.6 Backend Slow (Approaching Timeout)

**Scenario**: Backend is running but slow (e.g., under heavy load). Responses take 10–14 seconds.

**User experience**:
- Sections show loading skeletons for an extended period
- If the response arrives before 15s: section transitions to success/error normally
- If the response doesn't arrive by 15s: Axios timeout fires → `"Request timed out. Please try again."`
- User may see some sections succeed (faster endpoints) while others timeout (slower endpoints, especially hotels with 2-step LiteAPI)

### 12.7 Malformed Response Body

**Scenario**: Backend returns HTTP 200 but the JSON body doesn't match the expected TypeScript type (e.g., a field is missing or has the wrong type).

**Handling**: TypeScript types are compile-time only — they don't validate at runtime. The component receives the malformed data and may:
- Render `undefined` or `null` values where data is expected
- Throw a runtime error (e.g., `Cannot read property 'x' of undefined`)

**Defensive measures**: Components should use optional chaining (`?.`) and nullish coalescing (`??`) when accessing response data fields. This is a best-effort defense, not a formal validation layer.

```typescript
// Example defensive rendering:
<Typography>{flight?.price != null ? `$${flight.price.toFixed(2)}` : 'Price unavailable'}</Typography>
```

### 12.8 HTTP 200 with Error Body

**Scenario**: Backend returns HTTP 200 but the body contains `{ error: "...", message: "..." }` instead of the expected data shape.

**Handling**: Since the response status is 200, Axios treats it as a success. The component receives the error body as if it were valid data. TypeScript types don't prevent this at runtime.

**Defensive measure**: For array endpoints (destinations, hotels), check `Array.isArray(data)` before rendering. For object endpoints (flights, weather, calendar, compare), check for expected fields. This is best-effort:

```typescript
const data = await searchDestinations(query);
if (!Array.isArray(data)) {
  // Defensive: unexpected response shape
  setState({ status: 'error', error: { message: 'An unexpected error occurred. Please try again.', statusCode: 0 } });
  return;
}
```

---

## 13. Implementation Checklist

Ralph Loop must verify that every error scenario is handled. Use this as a testing checklist:

### 13.1 Error Handling Per Section

| Section | InlineError Used | Retry Works | 404 Override | Loading on Retry | Error Clears on Input Change |
|---------|-----------------|-------------|-------------|-----------------|------------------------------|
| Destination Search | Yes (below input) | Yes | N/A (no 404) | Spinner in dropdown | Yes (typing new chars) |
| Calendar Weather | Yes (replaces grid) | Yes | N/A (no 404) | Skeleton grid | Yes (new destination) |
| Flight Price | Yes (in card) | Yes | Yes (`"No flights found..."`) | Skeleton text | Yes (new date range) |
| Hotel Search | Yes (in card) | Yes | Yes (`"No hotels found..."`) | Skeleton rects | Yes (new date range) |
| Weather Summary | Yes (in card) | Yes | N/A (no 404) | Skeleton text | Yes (new date range) |
| Trip Comparison | Yes (in results area) | Yes | N/A (no 404) | Skeleton table rows | Yes (queue modification) |

### 13.2 Error Types to Test Per Section

| Section | 400 | 404 | 422 | 500 | 504 | Network Error | Timeout (15s) |
|---------|-----|-----|-----|-----|-----|---------------|---------------|
| Destination Search | ✓ | — | — | ✓ | ✓ | ✓ | ✓ |
| Calendar Weather | ✓ | — | — | ✓ | ✓ | ✓ | ✓ |
| Flight Price | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| Hotel Search | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| Weather Summary | ✓ | — | — | ✓ | ✓ | ✓ | ✓ |
| Trip Comparison | ✓ | — | ✓ | ✓ | — | ✓ | ✓ |

### 13.3 Partial Failure Combinations to Test

At minimum, test these 4 concurrent failure combinations:

1. **All succeed**: Flights ✓, Hotels ✓, Weather ✓ → "Add to Queue" enabled
2. **One fails**: Flights ✓, Hotels ✗ (500), Weather ✓ → "Add to Queue" disabled, Hotels shows error with Retry
3. **Two fail**: Flights ✗ (504), Hotels ✗ (504), Weather ✓ → "Add to Queue" disabled, Flights and Hotels show errors independently
4. **All fail**: Flights ✗, Hotels ✗, Weather ✗ → "Add to Queue" disabled, all three show errors with independent Retry buttons

### 13.4 Timeout Thresholds Summary

| Threshold | Value | Where Defined |
|-----------|-------|--------------|
| Backend external API timeout | 10,000ms | Backend config (not frontend) |
| Frontend Axios client timeout | 15,000ms | `src/lib/api.ts` → `apiClient.timeout` |
| Destination search debounce | 300ms | `DestinationAutocomplete` component |
| "Added!" confirmation display time | 1,500ms | "Add to Queue" button (not an error timeout) |

### 13.5 Files That Must Handle Errors

| File | Error Handling Responsibility |
|------|------------------------------|
| `src/lib/api.ts` | `extractApiError()` function, `ApiErrorDisplay` type, `apiClient` timeout config |
| `src/components/shared/InlineError.tsx` | Render error Alert + Retry button |
| `src/components/search/DestinationAutocomplete.tsx` | AbortController for cancellation, error state below input |
| `src/components/calendar/WeatherCalendar.tsx` | Calendar error state, retry for calendar weather |
| `src/components/details/FlightPriceCard.tsx` | 404 override, error state, retry |
| `src/components/details/HotelSearchCard.tsx` | 404 override, error state, retry |
| `src/components/details/WeatherSummaryCard.tsx` | Error state, retry |
| `src/components/comparison/ComparisonResults.tsx` | 422 handling, defensive empty check, retry |
| `src/types/ui.ts` | `AsyncState<T>` type, `ApiErrorDisplay` type |
