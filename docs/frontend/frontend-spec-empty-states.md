# WhenToGo Frontend Specification — Empty & No-Results States

> **Audience**: Ralph Loop (autonomous implementation agent)
> **Scope**: Exhaustive edge case documentation for every empty/no-results state in the application, including exact placeholder text, MUI icon references (in place of illustrations), and suggested-action CTAs.
> **Cross-references**: UI states in `docs/frontend/frontend-spec-ui-states.md`, component signatures in `docs/frontend/frontend-spec-component-signatures.md`, types from `frontend/src/types/api.ts`.

---

## Table of Contents

1. [Shared EmptyState Component](#1-shared-emptystate-component)
2. [Empty State: Destination Search — No Results](#2-empty-state-destination-search--no-results)
3. [Empty State: Calendar Weather — No Historical Data](#3-empty-state-calendar-weather--no-historical-data)
4. [Empty State: Flight Price — No Flights Found](#4-empty-state-flight-price--no-flights-found)
5. [Empty State: Hotel Search — No Hotels Available](#5-empty-state-hotel-search--no-hotels-available)
6. [Empty State: Weather Summary — No Weather Data](#6-empty-state-weather-summary--no-weather-data)
7. [Empty State: Comparison Queue — No Items Queued](#7-empty-state-comparison-queue--no-items-queued)
8. [Empty State: Comparison Results — No Results (Defensive)](#8-empty-state-comparison-results--no-results-defensive)
9. [Empty State: Initial Page Load — No Destination Selected Yet](#9-empty-state-initial-page-load--no-destination-selected-yet)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. Shared EmptyState Component

All empty states use the shared `EmptyState` component defined in `src/components/shared/EmptyState.tsx`. This section extends the base component spec from `docs/frontend/frontend-spec-ui-states.md` with icon and CTA support.

### 1.1 Extended Props Interface

```typescript
// src/components/shared/EmptyState.tsx
import { SvgIconComponent } from '@mui/icons-material';
import { ReactNode } from 'react';

interface EmptyStateProps {
  /** MUI icon component to render above the title. Renders at 48x48, color text.disabled. */
  icon?: SvgIconComponent;
  /** Primary message, e.g. "No flights found". */
  title: string;
  /** Optional secondary hint, e.g. "Try different dates". */
  subtitle?: string;
  /** Optional CTA action. If provided, renders a Button below the subtitle. */
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

### 1.2 Rendering Rules

```
┌─────────────────────────────────────────────┐
│              (centered vertically)          │
│                                             │
│           [ MUI Icon 48×48 ]                │
│           color: text.disabled              │
│                                             │
│           "Title Text Here"                 │
│           Typography variant="h6"           │
│           color="text.secondary"            │
│           textAlign="center"                │
│                                             │
│           "Subtitle hint here"              │
│           Typography variant="body2"        │
│           color="text.disabled"             │
│           textAlign="center"                │
│                                             │
│         [ Action Button ]                   │
│         Button variant="text"               │
│         color="primary"                     │
│         size="medium"                       │
│                                             │
└─────────────────────────────────────────────┘
```

- **Container**: MUI `Box` with `display: flex`, `flexDirection: column`, `alignItems: center`, `gap: 1.5`, `py: 6`
- **Icon**: Rendered only if `icon` prop is provided. Uses `sx={{ fontSize: 48, color: 'text.disabled' }}`
- **Title**: Always rendered. `Typography` variant `h6`, color `text.secondary`, `textAlign: center`
- **Subtitle**: Rendered only if `subtitle` prop is provided. `Typography` variant `body2`, color `text.disabled`, `textAlign: center`
- **Action button**: Rendered only if `action` prop is provided. MUI `Button` variant `text`, color `primary`, size `medium`. `onClick` calls `action.onClick`. Text is `action.label`.
- **No illustration images**: Use MUI icons exclusively. No SVG files, no PNGs, no external illustration libraries.

---

## 2. Empty State: Destination Search — No Results

### 2.1 When This Occurs

- **API**: `GET /api/v1/search/destinations?q={query}` returns HTTP 200 with an empty array `[]`
- **Trigger**: User types >= 3 characters, debounce fires, API returns zero matching destinations
- **Common scenarios**: Misspelled city name, very obscure location, nonsensical input like "asdfgh"

### 2.2 Exact Rendering

This empty state renders **inside the MUI Autocomplete dropdown** (not using the shared `EmptyState` component), because it must appear within the dropdown listbox area.

```
┌────────────────────────────────────────┐
│  🔍  [ Tokyo_____________________ ]   │  ← search input
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │  No destinations found for       │  │  ← dropdown listbox
│  │  "xyzabc"                        │  │
│  │                                  │  │
│  │  Check the spelling or try a     │  │
│  │  different city name.            │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

**Implementation via MUI Autocomplete `noOptionsText`**:

Do NOT use the `noOptionsText` string prop directly (it doesn't support rich content). Instead, use the `renderOption` approach combined with state checks, or use the `noOptionsText` prop with a ReactNode:

```typescript
// In DestinationSearch component:
noOptionsText={
  <Box sx={{ textAlign: 'center', py: 2 }}>
    <Typography variant="body2" color="text.secondary">
      No destinations found for &quot;{query}&quot;
    </Typography>
    <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
      Check the spelling or try a different city name.
    </Typography>
  </Box>
}
```

### 2.3 Exact Copy

| Element | Text |
|---------|------|
| **Primary** | `No destinations found for "{query}"` — where `{query}` is the user's current search input verbatim |
| **Secondary** | `Check the spelling or try a different city name.` |
| **CTA** | None (the user can simply keep typing in the still-active input) |
| **Icon** | None (dropdown context is too small for an icon) |

### 2.4 Interaction After Empty

- The search input remains enabled and focused
- User can modify their query; typing new characters (still >= 3 chars) triggers a new debounced search
- If user clears input to < 3 characters, dropdown closes and state returns to `idle`

---

## 3. Empty State: Calendar Weather — No Historical Data

### 3.1 When This Occurs

- **API**: `POST /api/v1/calendar` returns HTTP 200 with `{ destination: "...", days: [] }`
- **Trigger**: Destination selected but Open-Meteo has no historical data for the given coordinates
- **Common scenarios**: Very remote locations, newly recognized cities, locations where Open-Meteo coverage gaps exist

### 3.2 Exact Rendering

This empty state renders **above the calendar grid** as an MUI `Alert`, and the calendar grid still renders (without weather overlays) so the user can select dates.

```
┌─────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────┐  │
│  │ ℹ️  No historical weather data available for  │  │  ← MUI Alert severity="info"
│  │     this destination. You can still select     │  │
│  │     dates to check flights and hotels.         │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────── May 2026 ──────────────────────────┐  │
│  │ Sun  Mon  Tue  Wed  Thu  Fri  Sat             │  │  ← Calendar renders WITHOUT
│  │                          1    2               │  │    weather color overlays.
│  │  3    4    5    6    7   8    9               │  │    Days show only date numbers.
│  │ ...                                           │  │    Date selection IS enabled.
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 3.3 Exact Copy

| Element | Text |
|---------|------|
| **Alert message** | `No historical weather data available for this destination. You can still select dates to check flights and hotels.` |
| **Alert severity** | `info` |
| **Alert variant** | `standard` (default MUI Alert variant) |
| **CTA** | None (date selection is already enabled; user's natural next action is to pick dates) |
| **Icon** | Uses MUI Alert's built-in info icon (no custom icon needed) |

### 3.4 Calendar Grid Behavior When Empty

- Calendar grid renders with the standard 2-month layout
- Each day cell shows ONLY the date number (no temperature, no rain indicator, no color-coded background)
- Day cells remain clickable for date range selection
- Month navigation arrows remain functional
- The calendar looks like a standard date picker without weather augmentation

### 3.5 Downstream Impact

- When weather calendar data is empty, date selection is still possible
- Flight and hotel searches proceed normally when dates are selected
- The per-date-range weather summary (`POST /api/v1/weather`) is fetched independently and may still return data (it uses a different Open-Meteo query)

---

## 4. Empty State: Flight Price — No Flights Found

### 4.1 When This Occurs

- **API**: `POST /api/v1/flights/price` returns HTTP **404** with `{ error: "not_found", message: "No flights found for ICN → NRT on 2026-05-01" }`
- **Important**: This is a 404 error response, NOT a 200 with empty data. The flight endpoint never returns 200 with empty data — it either returns a `FlightPrice` object or 404.
- **Common scenarios**: No airline serves the route on that date, extremely remote destination with no direct flights, dates too far in the future for airline schedules

### 4.2 Exact Rendering

Because the API returns 404 (not 200-empty), this is technically an **error state**, not an empty state. However, it is listed here because it represents a "no results" user experience. Render using the `InlineError` component inside the Flight Price card:

```
┌─────────────────────────────────────────┐
│  ✈️  Flight Price                       │  ← Card heading
│  ┌───────────────────────────────────┐  │
│  │  ⚠️  No flights found for this    │  │  ← Alert severity="error"
│  │     route and dates.              │  │     variant="outlined"
│  │                                   │  │
│  │  Try adjusting your travel dates  │  │  ← subtitle text in body2
│  │  or choosing a different          │  │
│  │  destination.                     │  │
│  │                                   │  │
│  │  [ Retry ]  [ Change Dates ↑ ]   │  │  ← two actions
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 4.3 Exact Copy

| Element | Text |
|---------|------|
| **Error message** (InlineError) | `No flights found for this route and dates.` |
| **Guidance text** | `Try adjusting your travel dates or choosing a different destination.` — rendered as `Typography` variant `body2`, color `text.secondary`, below the Alert, inside the same error container |
| **CTA 1** | `Retry` button — standard InlineError retry button (variant `outlined`, color `error`, size `small`). Calls `onRetry` which re-sends the same flight request. |
| **CTA 2** | None. The user scrolls up to the calendar to change dates. No programmatic scroll-to button is needed (the calendar is always visible above). |

### 4.4 Impact on "Add to Queue" Button

- When flights are in error (including 404), the "Add to Queue" button is **disabled**
- Tooltip on disabled button: `"Waiting for flight price..."`
- The user must either Retry or change dates to get a flight price before adding to queue

---

## 5. Empty State: Hotel Search — No Hotels Available

### 5.1 When This Occurs

Two distinct scenarios produce a "no hotels" state:

**Scenario A — HTTP 200 with empty array:**
- **API**: `POST /api/v1/hotels/search` returns HTTP 200 with `[]`
- **When**: LiteAPI finds hotels in the area but none have rates available for the given dates

**Scenario B — HTTP 404:**
- **API**: `POST /api/v1/hotels/search` returns HTTP 404 with `{ error: "not_found", message: "No hotels found in Tokyo for 2026-05-01 to 2026-05-05" }`
- **When**: LiteAPI finds no hotels at all near the coordinates

### 5.2 Rendering — Scenario A (200 Empty Array)

Uses the shared `EmptyState` component inside the Hotels card:

```
┌─────────────────────────────────────────┐
│  🏨  Hotels                             │  ← Card heading
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │     🏢  (MUI: ApartmentOutlined) │  │  ← icon, 48×48, text.disabled
│  │                                   │  │
│  │     No hotels available           │  │  ← title (h6, text.secondary)
│  │                                   │  │
│  │     Try adjusting your dates or   │  │  ← subtitle (body2, text.disabled)
│  │     destination.                  │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 5.3 Rendering — Scenario B (404 Error)

Uses the `InlineError` component inside the Hotels card:

```
┌─────────────────────────────────────────┐
│  🏨  Hotels                             │  ← Card heading
│  ┌───────────────────────────────────┐  │
│  │  ⚠️  No hotels found for this     │  │  ← Alert severity="error"
│  │     destination and dates.        │  │
│  │                                   │  │
│  │  [ Retry ]                        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 5.4 Exact Copy

**Scenario A (200 empty):**

| Element | Value |
|---------|-------|
| **Icon** | `ApartmentOutlined` from `@mui/icons-material` |
| **Title** | `No hotels available` |
| **Subtitle** | `Try adjusting your dates or destination.` |
| **CTA** | None (user naturally changes dates on the calendar above or picks a new destination) |

**Scenario B (404 error):**

| Element | Value |
|---------|-------|
| **Error message** | `No hotels found for this destination and dates.` |
| **CTA** | `Retry` button (standard InlineError retry) |

### 5.5 Impact on "Add to Queue" Button

- **Scenario A (empty)**: "Add to Queue" button is **disabled**. Tooltip: `"Select a hotel first"`
- **Scenario B (error)**: "Add to Queue" button is **disabled**. Tooltip: `"Select a hotel first"`
- In both cases, no hotel can be selected, so the queue entry cannot be constructed

---

## 6. Empty State: Weather Summary — No Weather Data

### 6.1 When This Occurs

- **API**: `POST /api/v1/weather` returns HTTP 200 with a `WeatherSummary` where the `daily` array is empty
- **Note**: This is extremely rare since Open-Meteo provides historical data for virtually all coordinates, but must be handled defensively
- **Common scenarios**: Coordinates in the middle of an ocean, Antarctica, locations at the extreme edge of data coverage

### 6.2 Exact Rendering

Uses the shared `EmptyState` component inside the Weather card:

```
┌─────────────────────────────────────────┐
│  🌤️  Weather                            │  ← Card heading
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │     🌥️  (MUI: CloudOffOutlined)  │  │  ← icon, 48×48, text.disabled
│  │                                   │  │
│  │     No weather data available     │  │  ← title (h6, text.secondary)
│  │                                   │  │
│  │     Historical data may not be    │  │  ← subtitle (body2, text.disabled)
│  │     available for this location.  │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 6.3 Exact Copy

| Element | Value |
|---------|-------|
| **Icon** | `CloudOffOutlined` from `@mui/icons-material` |
| **Title** | `No weather data available` |
| **Subtitle** | `Historical data may not be available for this location.` |
| **CTA** | None (weather data absence is not user-actionable; changing location is the only remedy, which happens via the destination search at the top of the page) |

### 6.4 Impact on "Add to Queue" Button

- When weather is in `empty` state, the "Add to Queue" button is **disabled**
- Tooltip: `"Waiting for weather data..."`
- Without weather data, the comparison scoring cannot function (weather_score is required by `POST /api/v1/compare`)

---

## 7. Empty State: Comparison Queue — No Items Queued

### 7.1 When This Occurs

- **Trigger**: The comparison queue section is always visible on the page, but the queue starts empty
- **States**: Queue has 0 items (initial state, or after user has removed all items)

### 7.2 Exact Rendering — Zero Items in Queue

```
┌─────────────────────────────────────────────────────┐
│  📊  Compare Date Options (0 of 5)                  │  ← Section heading with counter
│  ┌───────────────────────────────────────────────┐  │
│  │                                               │  │
│  │     📅  (MUI: EventNoteOutlined)             │  │  ← icon, 48×48, text.disabled
│  │                                               │  │
│  │     No date options added yet                 │  │  ← title (h6, text.secondary)
│  │                                               │  │
│  │     Search for a destination and select       │  │  ← subtitle (body2, text.disabled)
│  │     travel dates to start building your       │  │
│  │     comparison.                               │  │
│  │                                               │  │
│  │     [ Search Destinations ↑ ]                 │  │  ← CTA button
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [ Compare ]  ← disabled                            │  ← Button disabled, greyed out
│  Tooltip: "Add at least 2 date options to compare"  │
└─────────────────────────────────────────────────────┘
```

### 7.3 Exact Copy

| Element | Value |
|---------|-------|
| **Section heading** | `Compare Date Options (0 of 5)` — the counter format is always `({count} of {MAX_QUEUE_SIZE})` |
| **Icon** | `EventNoteOutlined` from `@mui/icons-material` |
| **Title** | `No date options added yet` |
| **Subtitle** | `Search for a destination and select travel dates to start building your comparison.` |
| **CTA label** | `Search Destinations` |
| **CTA behavior** | Scrolls the page to the destination search input at the top and focuses it. Implementation: `document.getElementById('destination-search-input')?.focus(); window.scrollTo({ top: 0, behavior: 'smooth' });` The destination search input must have `id="destination-search-input"`. |
| **Compare button** | Disabled. Tooltip: `"Add at least 2 date options to compare"` |

### 7.4 Exact Rendering — One Item in Queue (Sub-Minimum)

When the queue has exactly 1 item, the empty state is NOT shown. Instead, the single queued item is displayed, but the Compare button remains disabled with specific messaging:

```
┌─────────────────────────────────────────────────────┐
│  📊  Compare Date Options (1 of 5)                  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Tokyo · May 1 – May 5 · $1,005              │  │  ← queued item card
│  │  Tokyo Inn · Weather: Great (82.4)    [ ✕ ]   │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Add at least 1 more date option to enable    │  │  ← hint banner
│  │  comparison.                                  │  │     MUI Alert severity="info"
│  └───────────────────────────────────────────────┘  │     variant="standard"
│                                                     │
│  [ Compare ]  ← disabled                            │
│  Tooltip: "Add at least 2 date options to compare"  │
└─────────────────────────────────────────────────────┘
```

### 7.5 Exact Copy for Sub-Minimum Hint

| Element | Value |
|---------|-------|
| **Hint alert severity** | `info` |
| **Hint alert text** | `Add at least 1 more date option to enable comparison.` |
| **Compare button tooltip** | `Add at least 2 date options to compare` |

---

## 8. Empty State: Comparison Results — No Results (Defensive)

### 8.1 When This Occurs

- **API**: `POST /api/v1/compare` returns HTTP 200 but with `{ options: [], best_option_index: 0 }`
- **Likelihood**: Should never happen in practice (the backend always returns scored options if valid input is sent). This is a defensive edge case only.
- **Trigger**: Backend bug or unexpected data corruption

### 8.2 Exact Rendering

Treated as an error state (not an empty state) per the spec in `docs/frontend/frontend-spec-ui-states.md`. Uses `InlineError`:

```
┌─────────────────────────────────────────────────────┐
│  Comparison Results                                  │
│  ┌───────────────────────────────────────────────┐  │
│  │                                               │  │
│  │  ⚠️  Comparison returned no results.          │  │  ← Alert severity="error"
│  │     Please try again.                         │  │
│  │                                               │  │
│  │  [ Retry ]                                    │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 8.3 Exact Copy

| Element | Value |
|---------|-------|
| **Error message** | `Comparison returned no results. Please try again.` |
| **CTA** | `Retry` button (re-sends the same `POST /api/v1/compare` request with the current queue items) |
| **Icon** | None (uses standard InlineError Alert icon) |

---

## 9. Empty State: Initial Page Load — No Destination Selected Yet

### 9.1 When This Occurs

- **Trigger**: User first lands on the page, or refreshes the page
- **State**: No destination selected, no calendar visible, no flight/hotel/weather data

### 9.2 Exact Rendering

The initial page shows only two things:
1. The app header/title
2. The destination search section

All other sections (calendar, flights, hotels, weather, comparison) are **hidden** per the progressive reveal pattern. There is NO full-page empty state or splash screen. The destination search input itself serves as the starting point.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│           WhenToGo                                  │  ← App title
│           Find your perfect travel dates            │  ← Subtitle
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Where do you want to go?                     │  │  ← Section heading
│  │                                               │  │
│  │  [ 🔍 Search for a destination...         ]   │  │  ← Search input (placeholder)
│  │                                               │  │
│  │  Type at least 3 characters to search         │  │  ← FormHelperText
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  📊  Compare Date Options (0 of 5)            │  │  ← Queue section (always visible)
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │  (EmptyState: "No date options added    │  │  │  ← see Section 7.2 above
│  │  │   yet...")                               │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 9.3 Exact Copy

| Element | Value |
|---------|-------|
| **App title** | `WhenToGo` — `Typography` variant `h3`, color `text.primary`, `textAlign: center` |
| **App subtitle** | `Find your perfect travel dates` — `Typography` variant `h6`, color `text.secondary`, `textAlign: center`, `fontWeight: 400` |
| **Search section heading** | `Where do you want to go?` — `Typography` variant `h5` |
| **Search input placeholder** | `Search for a destination...` |
| **Search helper text** | `Type at least 3 characters to search` — MUI `FormHelperText`, visible when input has < 3 characters |
| **Origin airport input label** | `Departure airport` — with placeholder `e.g. ICN, LAX, JFK` |
| **Traveler count input label** | `Number of travelers` — with default value `1` |

### 9.4 Sections Hidden on Initial Load

These sections are NOT rendered until their prerequisite is met:

| Section | Prerequisite to Become Visible |
|---------|-------------------------------|
| Calendar Weather | Destination selected |
| Flight Price | Date range selected on calendar |
| Hotel Search | Date range selected on calendar |
| Weather Summary | Date range selected on calendar |
| Comparison Results Table | User clicks "Compare" with 2+ queue items |

---

## 10. Implementation Checklist

Ralph Loop must verify that each of the following empty states is implemented. Use this as a testing checklist:

### 10.1 Component-to-Empty-State Mapping

| Component / Section | Empty State Trigger | Shared Component Used | Icon Import | Title | Subtitle | CTA |
|---|---|---|---|---|---|---|
| `DestinationSearch` | 200 + empty `[]` | Custom (in-dropdown) | None | `No destinations found for "{query}"` | `Check the spelling or try a different city name.` | None (input stays active) |
| `CalendarWeather` | 200 + empty `days[]` | MUI `Alert` (not EmptyState) | Alert built-in | N/A (alert message) | N/A | None (dates selectable) |
| `FlightPriceCard` | 404 response | `InlineError` | None | N/A (error message) | Guidance text below | `Retry` button |
| `HotelSearchCard` (200 empty) | 200 + empty `[]` | `EmptyState` | `ApartmentOutlined` | `No hotels available` | `Try adjusting your dates or destination.` | None |
| `HotelSearchCard` (404) | 404 response | `InlineError` | None | N/A (error message) | None | `Retry` button |
| `WeatherSummaryCard` | 200 + empty `daily[]` | `EmptyState` | `CloudOffOutlined` | `No weather data available` | `Historical data may not be available for this location.` | None |
| `ComparisonQueue` (0 items) | Queue empty | `EmptyState` | `EventNoteOutlined` | `No date options added yet` | `Search for a destination and select travel dates to start building your comparison.` | `Search Destinations` (scroll+focus) |
| `ComparisonQueue` (1 item) | Queue has 1 item | MUI `Alert` | Alert built-in | N/A (alert message) | N/A | None |
| `ComparisonResults` (defensive) | 200 + empty `options[]` | `InlineError` | None | N/A (error message) | None | `Retry` button |

### 10.2 MUI Icon Imports Required

```typescript
// All MUI icons used across empty states — import from @mui/icons-material
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import CloudOffOutlined from '@mui/icons-material/CloudOffOutlined';
import EventNoteOutlined from '@mui/icons-material/EventNoteOutlined';
```

### 10.3 Testing Scenarios

To verify each empty state, Ralph Loop should ensure the following scenarios are testable (via mock API responses):

1. **Destination search**: Mock `GET /api/v1/search/destinations?q=xyzabc` → `200 []`
2. **Calendar weather**: Mock `POST /api/v1/calendar` → `200 { destination: "Test", days: [] }`
3. **Flight price 404**: Mock `POST /api/v1/flights/price` → `404 { error: "not_found", message: "No flights found..." }`
4. **Hotel search empty**: Mock `POST /api/v1/hotels/search` → `200 []`
5. **Hotel search 404**: Mock `POST /api/v1/hotels/search` → `404 { error: "not_found", message: "No hotels found..." }`
6. **Weather empty daily**: Mock `POST /api/v1/weather` → `200 { average_temp: 0, rain_signal: "low", weather_score: 0, label: "Poor", daily: [] }`
7. **Comparison empty options**: Mock `POST /api/v1/compare` → `200 { options: [], best_option_index: 0 }`
8. **Queue empty**: No mock needed — initial state
9. **Queue sub-minimum**: Add exactly 1 item to queue, verify hint banner appears
