# Frontend Specification: UI States for All Data-Fetching Views

> This document defines the **four canonical UI states** (Loading, Error, Empty, Success) for every data-fetching view in the WhenToGo frontend. Ralph Loop must implement all four states for each view exactly as specified below.

---

## Table of Contents

1. [Universal UI State Model](#1-universal-ui-state-model)
2. [Shared State Types & Hook Pattern](#2-shared-state-types--hook-pattern)
3. [View: Destination Autocomplete Search](#3-view-destination-autocomplete-search)
4. [View: Calendar Weather Overlay](#4-view-calendar-weather-overlay)
5. [View: Flight Price Lookup](#5-view-flight-price-lookup)
6. [View: Hotel Search Results](#6-view-hotel-search-results)
7. [View: Weather Summary (per date range)](#7-view-weather-summary-per-date-range)
8. [View: Trip Comparison (POST /api/v1/compare)](#8-view-trip-comparison-post-apiv1compare)
9. [Error Classification & Display Rules](#9-error-classification--display-rules)
10. [State Transition Diagrams](#10-state-transition-diagrams)

---

## 1. Universal UI State Model

Every data-fetching view uses exactly four mutually exclusive states. At any moment, exactly ONE state is active per view.

| State       | Description                                                                 |
|-------------|-----------------------------------------------------------------------------|
| **idle**    | Initial state before any fetch has been triggered for this view. Nothing is rendered for this view (the section is not yet revealed in the progressive flow). |
| **loading** | A network request is in-flight. Show a loading indicator. Disable interactions that would trigger duplicate requests. |
| **error**   | The network request failed (HTTP 4xx, 5xx, network error, or timeout). Show an inline error message with a Retry button. |
| **empty**   | The request succeeded (HTTP 200) but returned zero results or an empty dataset. Show a contextual empty-state message. |
| **success** | The request succeeded (HTTP 200) and returned non-empty data. Render the full data view. |

> **Note**: "idle" is the pre-fetch state and is distinct from "empty". Idle means the user hasn't triggered the fetch yet; empty means the fetch returned no data.

---

## 2. Shared State Types & Hook Pattern

### 2.1 Generic Async State Type

Define in `src/types/ui.ts`:

```typescript
/**
 * Discriminated union for async data-fetching state.
 * Every data-fetching view must use this type.
 */
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: ApiErrorDisplay }
  | { status: 'empty' }
  | { status: 'success'; data: T };

/**
 * Standardized error display object extracted from API error responses.
 */
export interface ApiErrorDisplay {
  /** Human-readable message to show inline. */
  message: string;
  /** Original HTTP status code, or 0 for network/timeout errors. */
  statusCode: number;
}
```

### 2.2 Error Extraction Utility

Define in `src/lib/api.ts` (within the centralized API service layer):

```typescript
import { AxiosError } from 'axios';

/**
 * Extracts a user-facing error display object from an Axios error.
 * Maps all backend ErrorResponse shapes ({error, message}) plus
 * network errors and timeouts to a single ApiErrorDisplay.
 */
export function extractApiError(err: unknown): ApiErrorDisplay {
  if (err instanceof AxiosError) {
    if (err.response) {
      // Server responded with an error status
      const data = err.response.data as { error?: string; message?: string } | undefined;
      return {
        message: data?.message || `Request failed (${err.response.status})`,
        statusCode: err.response.status,
      };
    }
    if (err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED') {
      return { message: 'Request timed out. Please try again.', statusCode: 0 };
    }
    // Network error (no response received)
    return { message: 'Network error. Please check your connection and try again.', statusCode: 0 };
  }
  return { message: 'An unexpected error occurred. Please try again.', statusCode: 0 };
}
```

### 2.3 Shared UI Components for States

#### `LoadingIndicator` (`src/components/shared/LoadingIndicator.tsx`)

```typescript
interface LoadingIndicatorProps {
  /** Message displayed below the spinner. */
  message: string;
}
```

- Renders: MUI `CircularProgress` (size 40, color `primary`) centered horizontally
- Below spinner: MUI `Typography` variant `body2`, color `text.secondary`, with the `message` prop
- Container: `Box` with `display: flex`, `flexDirection: column`, `alignItems: center`, `gap: 2`, `py: 6`

#### `InlineError` (`src/components/shared/InlineError.tsx`)

```typescript
interface InlineErrorProps {
  /** Error message to display. */
  message: string;
  /** Callback invoked when the user clicks Retry. */
  onRetry: () => void;
}
```

- Renders: MUI `Alert` with `severity="error"` and `variant="outlined"`
- Inside the Alert: the `message` text
- Below the Alert (inside same container): MUI `Button` variant `outlined`, color `error`, size `small`, text "Retry", onClick calls `onRetry`
- Container: `Box` with `display: flex`, `flexDirection: column`, `alignItems: center`, `gap: 2`, `py: 4`
- No auto-retry. No toast. No auto-dismiss. The error persists until the user clicks Retry or navigates away.

#### `EmptyState` (`src/components/shared/EmptyState.tsx`)

```typescript
interface EmptyStateProps {
  /** Primary message, e.g. "No flights found". */
  title: string;
  /** Optional secondary hint, e.g. "Try different dates". */
  subtitle?: string;
}
```

- Renders: MUI `Typography` variant `h6`, color `text.secondary`, centered, with `title`
- Below: MUI `Typography` variant `body2`, color `text.disabled`, centered, with `subtitle` (only if provided)
- Container: `Box` with `textAlign: center`, `py: 6`

---

## 3. View: Destination Autocomplete Search

**API endpoint**: `GET /api/v1/search/destinations?q={query}`
**Response type**: `DestinationResult[]` (from `frontend/src/types/api.ts`)
**Trigger**: User types >= 3 characters into the search input (after 300ms debounce)

### 3.1 State Definitions

| State | Condition | What Renders |
|-------|-----------|--------------|
| **idle** | Input is empty or fewer than 3 characters typed | Search input is visible. Dropdown is closed. No loading indicator. If < 3 chars typed, show helper text below input: "Type at least 3 characters to search" (MUI `FormHelperText`). |
| **loading** | Debounced request is in-flight | Search input remains enabled (user can keep typing, which cancels the previous request). Inside the dropdown (MUI `Autocomplete` listbox area): show `CircularProgress` (size 24) centered. No result items rendered during loading. |
| **error** | API returned 400, 500, or 504; or network error | Dropdown closes. Below the search input: render `InlineError` with message from `extractApiError()`. The Retry button re-sends the last query. Input remains enabled so user can also just retype. |
| **empty** | API returned HTTP 200 with an empty array `[]` | Dropdown opens showing a single non-selectable item: `Typography` variant `body2`, color `text.secondary`, text: **"No destinations found for '{query}'"** where `{query}` is the user's search text. |
| **success** | API returned HTTP 200 with 1+ results | Dropdown opens showing each `DestinationResult` as a list item. Each item displays: **"{name}, {country}"** as primary text, and **"({iata_code})"** as secondary text if `iata_code` is not null. Items without `iata_code` show only **"{name}, {country}"**. |

### 3.2 State Transitions

```
idle ──(user types >= 3 chars)──> loading
loading ──(HTTP 200, results.length > 0)──> success
loading ──(HTTP 200, results.length === 0)──> empty
loading ──(HTTP error / network error)──> error
loading ──(user types new chars, cancels previous)──> loading (new request)
success ──(user clears input)──> idle
empty ──(user types new chars)──> loading
error ──(user clicks Retry)──> loading
error ──(user types new chars)──> loading
success ──(user selects item)──> idle (input shows selected destination; dropdown closes; next section reveals)
```

### 3.3 Interaction Details During Loading

- **Typing while loading**: The previous Axios request is cancelled via `AbortController`. A new debounced request starts. This prevents stale results from appearing.
- **The input is never disabled during any state** (users must always be able to type).
- **Dropdown visibility**: Open during loading (showing spinner), success (showing results), and empty (showing message). Closed during idle and error.

---

## 4. View: Calendar Weather Overlay

**API endpoint**: `POST /api/v1/calendar`
**Response type**: `CalendarResponse` (from `frontend/src/types/api.ts`)
**Trigger**: Automatically fetched when a destination is selected (the calendar section is revealed)

### 4.1 State Definitions

| State | Condition | What Renders |
|-------|-----------|--------------|
| **idle** | Destination not yet selected | Calendar section is not visible (hidden per progressive reveal flow). Nothing renders. |
| **loading** | Calendar weather data request is in-flight | Calendar grid skeleton renders: a 2-month calendar grid layout (matching the success layout dimensions) using MUI `Skeleton` variant `rectangular` in each day cell (width 100%, height 48px). Month headers render as `Skeleton` variant `text`. The user cannot select dates during loading. |
| **error** | API returned 400, 500, 504, or network error | Calendar section is visible but instead of the calendar grid: render `InlineError` with the error message. Retry button re-sends the calendar request with the same destination/coordinates. The date range pickers below the calendar are disabled (since weather overlay data is unavailable). |
| **empty** | API returned HTTP 200 but `days` array is empty | Calendar grid renders with all day cells showing only the date number (no weather data overlay). Above the calendar: `Alert` severity `info`, text: **"No historical weather data available for this destination. You can still select dates."** Date selection is enabled. |
| **success** | API returned HTTP 200 with populated `days` array | Full 2-month calendar renders with weather overlay on each day cell. Each cell with data shows: date number, color-coded background based on `weather_label` (Great = green-50, Good = blue-50, Fair = amber-50, Poor = red-50), temperature range "{temp_high}° / {temp_low}°" in small text, rain indicator if `rain_mm > 0`. Date selection is enabled. |

### 4.2 State Transitions

```
idle ──(destination selected)──> loading
loading ──(HTTP 200, days.length > 0)──> success
loading ──(HTTP 200, days.length === 0)──> empty
loading ──(HTTP error)──> error
error ──(user clicks Retry)──> loading
success ──(user selects new destination via search)──> loading (re-fetch for new destination)
empty ──(user selects new destination via search)──> loading (re-fetch for new destination)
```

### 4.3 Additional Behaviors

- **Calendar month navigation**: When the user navigates to a month outside the fetched 2-month range, cells for dates without weather data render as plain dates (no overlay), identical to the empty state per-cell treatment.
- **Stale data replacement**: When the user selects a new destination, the calendar immediately transitions to `loading` (no stale data from the previous destination is shown).

---

## 5. View: Flight Price Lookup

**API endpoint**: `POST /api/v1/flights/price`
**Response type**: `FlightPrice` (from `frontend/src/types/api.ts`)
**Trigger**: Automatically fetched when the user selects a date range on the calendar (start_date and end_date are both set)

### 5.1 State Definitions

| State | Condition | What Renders |
|-------|-----------|--------------|
| **idle** | Date range not yet selected | Flight price section is not visible (hidden per progressive reveal). Nothing renders. |
| **loading** | Flight price request is in-flight | Section is visible. Render: a `Card` (MUI) with heading "Flight Price". Inside the card body: `Skeleton` variant `text` (width 60%) for the price line, and `Skeleton` variant `text` (width 40%) for the route line. The card is visually consistent with the success card layout. |
| **error** | API returned 400, 404, 500, 504, or network error | Section is visible. Render a `Card` with heading "Flight Price". Inside the card body: `InlineError` component. **Special 404 handling**: If `statusCode === 404`, the error message should read: **"No flights found for this route and dates."** For all other errors, use the message from `extractApiError()`. Retry button re-fetches with the same parameters. |
| **empty** | _Not applicable for this view_ — a 404 (no flights found) is treated as an **error** state, not empty, because the API returns 404 (not 200 with empty data). The user must retry with different dates. | N/A — this state is unreachable for this view. If somehow triggered, render same as error with message "No flights found." |
| **success** | API returned HTTP 200 with a `FlightPrice` object | Render a `Card` with heading "Flight Price". Inside: **"${price} {currency}"** in `Typography` variant `h4` (e.g., "$342.50 USD"). Below: route info "{origin} → {destination}" in `Typography` variant `body2`, color `text.secondary`. Below: date range "{departure_date} – {return_date}" in `Typography` variant `body2`. |

### 5.2 State Transitions

```
idle ──(date range selected)──> loading
loading ──(HTTP 200)──> success
loading ──(HTTP 404)──> error (with "no flights found" message)
loading ──(HTTP 400/500/504 / network error)──> error
error ──(user clicks Retry)──> loading
success ──(user changes date range on calendar)──> loading (re-fetch for new dates)
error ──(user changes date range on calendar)──> loading (re-fetch for new dates)
```

### 5.3 Concurrent Fetch Note

When the user selects a date range, three requests fire concurrently:
1. Flight price (this view)
2. Hotel search (Section 6)
3. Weather summary (Section 7)

Each view manages its own `AsyncState` independently. One can be in `success` while another is still `loading` or in `error`.

---

## 6. View: Hotel Search Results

**API endpoint**: `POST /api/v1/hotels/search`
**Response type**: `HotelOption[]` (from `frontend/src/types/api.ts`)
**Trigger**: Automatically fetched when the user selects a date range (concurrently with flights and weather)

### 6.1 State Definitions

| State | Condition | What Renders |
|-------|-----------|--------------|
| **idle** | Date range not yet selected | Hotel section is not visible (hidden per progressive reveal). Nothing renders. |
| **loading** | Hotel search request is in-flight | Section is visible. Render: a `Card` with heading "Hotels". Inside: a vertical stack of 3 `Skeleton` items, each `Skeleton` variant `rectangular`, height 72px, width 100%, with 8px gap between them. This mimics the layout of 3 hotel list items. |
| **error** | API returned 400, 404, 500, 504, or network error | Section is visible. Render a `Card` with heading "Hotels". Inside: `InlineError` component. **Special 404 handling**: If `statusCode === 404`, message reads: **"No hotels found for this destination and dates."** For all other errors, use `extractApiError()` message. Retry button re-fetches. |
| **empty** | API returned HTTP 200 with an empty array `[]` | Section is visible. Render a `Card` with heading "Hotels". Inside: `EmptyState` with title **"No hotels available"** and subtitle **"Try adjusting your dates or destination."** No hotel can be selected, so the "Add to Queue" button (in the parent date option section) remains disabled. |
| **success** | API returned HTTP 200 with 1+ `HotelOption` items | Render a `Card` with heading "Hotels" and a subtitle "(select one)". Inside: a `List` (MUI) of hotel items (up to 5, as returned by the API). Each `ListItem` shows: hotel name (`Typography` variant `subtitle1`), rating as `Rating` component (MUI, read-only, value = `rating`, hidden if `rating` is null), distance "{distance} km from center" (`Typography` variant `body2`, color `text.secondary`, hidden if `distance` is null), total price "**${total_price}**" (`Typography` variant `subtitle1`, color `primary`). Each item is selectable (via `ListItemButton`). Selected item has `selected={true}` visual highlight. Exactly one hotel must be selected before the user can add this date option to the comparison queue. **Default selection**: The first (cheapest) hotel is auto-selected on success. |

### 6.2 State Transitions

```
idle ──(date range selected)──> loading
loading ──(HTTP 200, results.length > 0)──> success
loading ──(HTTP 200, results.length === 0)──> empty
loading ──(HTTP 404)──> error
loading ──(HTTP 400/500/504 / network error)──> error
error ──(user clicks Retry)──> loading
success ──(user changes date range)──> loading (re-fetch)
empty ──(user changes date range)──> loading (re-fetch)
```

### 6.3 Selection Interaction

- User clicks a `ListItemButton` to select a hotel. The previously selected hotel is deselected.
- Selected hotel's `hotel_name` and `hotel_price` (which is `total_price`) are captured for the comparison queue entry.
- If the hotel list re-fetches (due to date change), the selection resets to the first hotel.

---

## 7. View: Weather Summary (per date range)

**API endpoint**: `POST /api/v1/weather`
**Response type**: `WeatherSummary` (from `frontend/src/types/api.ts`)
**Trigger**: Automatically fetched when the user selects a date range (concurrently with flights and hotels)

### 7.1 State Definitions

| State | Condition | What Renders |
|-------|-----------|--------------|
| **idle** | Date range not yet selected | Weather summary section is not visible. Nothing renders. |
| **loading** | Weather request is in-flight | Section is visible. Render a `Card` with heading "Weather". Inside: `Skeleton` variant `text` (width 50%) for the label, `Skeleton` variant `rectangular` (height 24px, width 80%) for the score bar, `Skeleton` variant `text` (width 30%) for temperature. |
| **error** | API returned 400, 500, 504, or network error | Section is visible. Render a `Card` with heading "Weather". Inside: `InlineError` component with `extractApiError()` message. Retry button re-fetches. Note: the weather endpoint does not return 404 (it always returns data from Open-Meteo historical), but if it somehow does, treat it as a standard error. |
| **empty** | API returned HTTP 200 but `daily` array is empty | Section is visible. Render a `Card` with heading "Weather". Inside: `EmptyState` with title **"No weather data available"** and subtitle **"Historical data may not be available for this location."** The weather portion of the comparison queue entry is left as null; the "Add to Queue" button is disabled if weather data is required. |
| **success** | API returned HTTP 200 with populated `WeatherSummary` | Render a `Card` with heading "Weather". Inside: **Label badge**: `Chip` (MUI) with `label` value (e.g., "Great"), colored by label (Great = `success`, Good = `info`, Fair = `warning`, Poor = `error`). **Score**: "Score: {weather_score}/100" in `Typography` variant `body1`. **Temperature**: "Avg {average_temp}°C" in `Typography` variant `body2`. **Rain**: "Rain: {rain_signal}" in `Typography` variant `body2`. **Daily breakdown**: Collapsible section (MUI `Accordion`) showing a simple table of daily weather with columns: Date, High, Low, Rain, Description. |

### 7.2 State Transitions

```
idle ──(date range selected)──> loading
loading ──(HTTP 200, daily.length > 0)──> success
loading ──(HTTP 200, daily.length === 0)──> empty
loading ──(HTTP error)──> error
error ──(user clicks Retry)──> loading
success ──(user changes date range)──> loading (re-fetch)
```

---

## 8. View: Trip Comparison (POST /api/v1/compare)

**API endpoint**: `POST /api/v1/compare`
**Response type**: `CompareResponse` (from `frontend/src/types/api.ts`)
**Trigger**: User clicks "Compare" button (enabled only when the comparison queue has 2-5 items)

### 8.1 State Definitions

| State | Condition | What Renders |
|-------|-----------|--------------|
| **idle** | User has not clicked Compare yet, or queue has < 2 items | Comparison section shows the queue summary (list of queued items with remove buttons). The "Compare" button is: **disabled** if queue has 0–1 items (with tooltip "Add at least 2 date options to compare"), **enabled** if queue has 2–5 items. No comparison table is shown. |
| **loading** | Compare request is in-flight | "Compare" button shows a `CircularProgress` (size 20) inside the button and is disabled. Text changes to "Comparing...". The comparison table area shows: `Skeleton` variant `rectangular`, mimicking a table with 3 rows (height 48px each, full width, 4px gap). Queue items are still visible but remove buttons are disabled during loading. |
| **error** | API returned 400, 422, 500, or network error | Comparison table area renders `InlineError` component. **Special 422 handling**: If `statusCode === 422`, message reads the backend's validation message (e.g., "At least 2 options are required for comparison"). For other errors, use `extractApiError()`. Retry button re-sends the same comparison request. Queue items remain visible and editable (user can modify queue and try again). |
| **empty** | _Not applicable_ — the compare endpoint always returns results if input is valid (2-5 options). The backend scores whatever is sent. If somehow the response `options` array is empty, treat as error with message "Comparison returned no results. Please try again." | N/A — unreachable under normal conditions. Defensive handling: render as error. |
| **success** | API returned HTTP 200 with `CompareResponse` containing `options` array | Render the full side-by-side comparison table (MUI `Table`). The table displays all `TripOption` objects from `options` (already sorted by `overall_score` descending by the backend). **Best option highlight**: The row at index `best_option_index` has a distinct visual treatment: light green background (`success.light` with 0.1 alpha), and a leading `Chip` with label "Best Overall". **Tag rendering**: Each tag in the `tags` array renders as a small `Chip` (cheapest = green, best_weather = blue, best_overall = gold/amber). **Columns** (see Section 8.3). |

### 8.2 State Transitions

```
idle ──(user clicks Compare, queue has 2-5 items)──> loading
loading ──(HTTP 200, options.length > 0)──> success
loading ──(HTTP 200, options.length === 0)──> error (defensive)
loading ──(HTTP 422)──> error
loading ──(HTTP 400/500 / network error)──> error
error ──(user clicks Retry)──> loading
success ──(user modifies queue: adds/removes item)──> idle (comparison results are cleared; user must re-compare)
success ──(user clicks Compare again)──> loading (re-compare with current queue)
```

### 8.3 Comparison Table Columns (Success State)

| Column Header         | Data Source                  | Format                                   |
|-----------------------|------------------------------|------------------------------------------|
| Dates                 | `start_date` – `end_date`    | "May 1 – May 5" (formatted via dayjs)    |
| Flight (per person)   | `flight_price`               | "$342.50"                                |
| Hotel (total)         | `hotel_price`                | "$320.00"                                |
| Hotel                 | `hotel_name`                 | "Tokyo Inn"                              |
| Weather               | `weather.label` + `weather.weather_score` | Chip "Great" + "82.4/100"     |
| Total Cost            | `total_trip_cost`            | "$1,005.00" (bold)                       |
| Per Person            | `cost_per_person`            | "$502.50"                                |
| Score                 | `overall_score`              | "90.5" (bold, `Typography` color primary)|
| Tags                  | `tags`                       | Chip(s) per tag                          |

### 8.4 Queue Modification While Viewing Results

- If the user **removes** an item from the queue after seeing comparison results, the comparison table is **immediately cleared** (state resets to `idle`). The user must click "Compare" again.
- If the user **adds** a new item to the queue after seeing comparison results, the comparison table is **immediately cleared** (state resets to `idle`).
- Rationale: The comparison scores are relative (cost_score depends on all options). Changing the input invalidates the output.

---

## 9. Error Classification & Display Rules

### 9.1 HTTP Status Code Mapping

| Status Code | Error Type         | Default User-Facing Message                                        | Retry Allowed |
|-------------|--------------------|--------------------------------------------------------------------|---------------|
| 400         | Bad Request        | Backend's `message` field from `ErrorResponse`                     | Yes           |
| 404         | Not Found          | View-specific message (see each view section above)                | Yes           |
| 422         | Validation Error   | Backend's `message` field from `ErrorResponse`                     | Yes           |
| 500         | Internal Error     | "Something went wrong on our end. Please try again."               | Yes           |
| 504         | Gateway Timeout    | "The request timed out. Please try again in a moment."             | Yes           |
| 0 (network) | Network Error      | "Network error. Please check your connection and try again."       | Yes           |
| 0 (timeout) | Client Timeout     | "Request timed out. Please try again."                             | Yes           |

### 9.2 Error Display Rules

1. **Always inline**: Errors render inside the section/card where the data would have appeared. Never use toasts, snackbars, modals, or banners outside the relevant section.
2. **Always show Retry**: Every error state includes a Retry button. No auto-retry. No exponential backoff.
3. **Retry behavior**: Retry re-sends the exact same request with the same parameters. If the user has changed inputs (e.g., typed a new destination), the retry uses the NEW inputs.
4. **Error persistence**: The error remains visible until the user either clicks Retry (transitions to loading) or triggers a new fetch via user action (e.g., changing dates, selecting a new destination).
5. **Multiple concurrent errors**: Each view manages its error state independently. It is valid for the flight section to show `error` while hotels show `success` and weather shows `loading`. Each section has its own Retry button.
6. **No error codes shown to user**: Never display the raw HTTP status code or error code (like "not_found") to the user. Only display the human-readable `message`.

### 9.3 Axios Error Handling Integration

In `src/lib/api.ts`, each API method catches errors and re-throws them as-is (Axios errors). The consuming component or hook calls `extractApiError()` to convert the error into an `ApiErrorDisplay` object for rendering. Example pattern:

```typescript
// In a component or custom hook:
try {
  setState({ status: 'loading' });
  const data = await api.searchDestinations(query);
  if (data.length === 0) {
    setState({ status: 'empty' });
  } else {
    setState({ status: 'success', data });
  }
} catch (err) {
  setState({ status: 'error', error: extractApiError(err) });
}
```

---

## 10. State Transition Diagrams

### 10.1 Generic State Machine (applies to all views)

```
                    ┌──────────┐
                    │   idle   │
                    └────┬─────┘
                         │ trigger (user action or auto)
                         v
                    ┌──────────┐
          ┌────────│ loading  │────────┐
          │        └──────────┘        │
          │ error       │ success      │ success
          v             │              v
    ┌──────────┐        │        ┌──────────┐
    │  error   │        │        │  empty   │
    └────┬─────┘        │        └──────────┘
         │ retry        v
         │        ┌──────────┐
         └───────>│ success  │
                  └──────────┘
```

Every state can transition back to `loading` via:
- **Retry button** (from `error`)
- **New user input** (from any state — e.g., selecting a new destination resets calendar/flights/hotels/weather to `loading`)

### 10.2 Progressive Reveal & State Dependencies

The progressive reveal flow determines which sections are visible. Each section's visibility is gated by a prerequisite:

| Section                | Visible When                                       | Initial AsyncState |
|------------------------|----------------------------------------------------|--------------------|
| Destination Search     | Always visible                                     | `idle`             |
| Calendar Weather       | Destination is selected                            | `idle` → `loading` |
| Flight Price           | Date range is selected on calendar                 | `idle` → `loading` |
| Hotel Search           | Date range is selected on calendar                 | `idle` → `loading` |
| Weather Summary        | Date range is selected on calendar                 | `idle` → `loading` |
| Comparison Queue       | Always visible (but empty until items are added)   | N/A (local state)  |
| Comparison Table       | User clicks Compare (queue has 2-5 items)          | `idle` → `loading` |

**Cascading resets**: When a prerequisite changes, all downstream sections reset:
- **User selects a new destination**: Calendar resets to `loading`. Flight, Hotel, Weather, and Comparison reset to `idle` (hidden). Comparison queue is **preserved** (items from the previous destination remain in the queue — they are valid as queued trip options).
- **User selects a new date range**: Flight, Hotel, and Weather reset to `loading`. Comparison table resets to `idle` (cleared). Comparison queue is preserved.

### 10.3 "Add to Queue" Button State

The "Add to Queue" button is a critical interaction point that depends on multiple view states:

| Condition | Button State |
|-----------|-------------|
| Flight state is not `success` | Disabled, tooltip: "Waiting for flight price..." |
| Hotel state is not `success` OR no hotel selected | Disabled, tooltip: "Select a hotel first" |
| Weather state is not `success` | Disabled, tooltip: "Waiting for weather data..." |
| All three are `success` AND a hotel is selected AND queue is not full (< 5) | **Enabled** |
| All three are `success` AND queue is full (5 items) | Disabled, tooltip: "Comparison queue is full (max 5)" |
| A duplicate entry already exists in queue (same destination + start_date + end_date) | Disabled, tooltip: "This date range is already in your queue" |

When clicked (and enabled), the button:
1. Constructs a queue entry from the current flight price, selected hotel, and weather data
2. Adds it to the comparison queue (React Context)
3. Shows brief visual confirmation (the button text changes to "Added!" with a checkmark icon for 1.5 seconds, then reverts to "Add to Queue")

---

## Appendix A: Per-View Loading Message Strings

| View                   | Loading Indicator Message            |
|------------------------|--------------------------------------|
| Destination Search     | _(spinner in dropdown, no text)_     |
| Calendar Weather       | _(skeleton, no text)_                |
| Flight Price           | _(skeleton, no text)_                |
| Hotel Search           | _(skeleton, no text)_                |
| Weather Summary        | _(skeleton, no text)_                |
| Trip Comparison        | Button text: "Comparing..."          |

> Skeletons are preferred over spinner+text for section-level loading because they provide spatial consistency (the section doesn't jump in height between loading and success states).

## Appendix B: Per-View Empty State Strings

| View                   | Empty Title                          | Empty Subtitle                                          |
|------------------------|--------------------------------------|---------------------------------------------------------|
| Destination Search     | (in dropdown) "No destinations found for '{query}'" | _(none)_                                    |
| Calendar Weather       | (alert banner) "No historical weather data available for this destination." | "You can still select dates." |
| Flight Price           | _(not applicable — 404 = error)_     | _(not applicable)_                                      |
| Hotel Search           | "No hotels available"                | "Try adjusting your dates or destination."               |
| Weather Summary        | "No weather data available"          | "Historical data may not be available for this location." |
| Trip Comparison        | _(not applicable — defensive error)_ | _(not applicable)_                                      |

## Appendix C: Per-View Error Messages (by HTTP status)

| View                   | 400                    | 404                                              | 422                           | 500                                              | 504                                                  |
|------------------------|------------------------|--------------------------------------------------|-------------------------------|--------------------------------------------------|------------------------------------------------------|
| Destination Search     | Backend message        | _(not returned by endpoint)_                     | _(not returned)_              | "Something went wrong. Please try again."        | "Request timed out. Please try again."               |
| Calendar Weather       | Backend message        | _(not returned by endpoint)_                     | _(not returned)_              | "Something went wrong. Please try again."        | "Request timed out. Please try again."               |
| Flight Price           | Backend message        | "No flights found for this route and dates."     | _(not returned)_              | "Something went wrong. Please try again."        | "Request timed out. Please try again."               |
| Hotel Search           | Backend message        | "No hotels found for this destination and dates."| _(not returned)_              | "Something went wrong. Please try again."        | "Request timed out. Please try again."               |
| Weather Summary        | Backend message        | _(not returned by endpoint)_                     | _(not returned)_              | "Something went wrong. Please try again."        | "Request timed out. Please try again."               |
| Trip Comparison        | Backend message        | _(not returned)_                                 | Backend validation message    | "Something went wrong. Please try again."        | _(not returned — no external API)_                   |
