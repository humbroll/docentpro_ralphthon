# Frontend Specification: Progressive Section Reveal State Machine

> **Audience**: Ralph Loop (autonomous implementation agent)
> **Scope**: Complete specification of the progressive section reveal state machine — states, transitions, triggers, data dependencies, cascading resets, and edge cases.
> **Implementation file**: `frontend/src/app/page.tsx` (HomePage component)
> **Cross-references**: Types from `frontend/src/types/frontend.ts` (`SectionId`, `SearchParams`, `DateRange`, `DateDetailResults`, `CalendarWeatherState`, `SelectedDestination`), Context from `frontend/src/context/ComparisonQueueContext.tsx`, UI states from `docs/frontend/frontend-spec-ui-states.md`, layout from `docs/frontend/frontend-spec.md` Section 2.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Section Definitions & Ordering](#2-section-definitions--ordering)
3. [State Variables That Gate Visibility](#3-state-variables-that-gate-visibility)
4. [Section Visibility Rules (Formal)](#4-section-visibility-rules-formal)
5. [State Machine: States & Transitions](#5-state-machine-states--transitions)
6. [Data Dependencies Between Sections](#6-data-dependencies-between-sections)
7. [Cascading Reset Rules](#7-cascading-reset-rules)
8. [Trigger → Effect Matrix](#8-trigger--effect-matrix)
9. [API Call Triggers by Section Transition](#9-api-call-triggers-by-section-transition)
10. [Edge Cases & Boundary Conditions](#10-edge-cases--boundary-conditions)
11. [Implementation Reference: HomePage State & Handlers](#11-implementation-reference-homepage-state--handlers)
12. [Visual State Diagram](#12-visual-state-diagram)
13. [Testing Checklist](#13-testing-checklist)

---

## 1. Overview

The WhenToGo frontend uses a **progressive section reveal** pattern on a single page (`/`). Instead of multi-step wizards or separate routes, the page is a vertical stack of four sections. Each section becomes visible only when its data dependency is satisfied. Sections reveal top-to-bottom as the user progresses through the flow:

```
Search → Calendar → Date Details (Flight/Hotel/Weather) → Comparison
```

**Key principles:**
- Sections are **never hidden once shown** unless their prerequisite data is invalidated (e.g., user changes destination, which hides calendar and everything below).
- Visibility is controlled by `SectionContainer`'s `visible` prop, which evaluates a boolean expression against page-level state.
- There is **no step counter**, no `currentStep` number, and no wizard-like progression. Each section independently evaluates its own visibility condition.
- The comparison section's visibility additionally depends on the comparison queue count (from React Context), not just page-level state.

---

## 2. Section Definitions & Ordering

Exactly four sections exist, rendered in this fixed order from top to bottom. The `SectionId` type (from `frontend/src/types/frontend.ts`) enumerates them:

| Order | SectionId       | Display Name           | Component Inside SectionContainer     | File Path                                           |
|-------|-----------------|------------------------|---------------------------------------|-----------------------------------------------------|
| 1     | `"destination"` | *(no title — always visible)* | `SearchSection`                  | `src/components/sections/SearchSection.tsx`          |
| 2     | `"calendar"`    | "Select Your Dates"    | `CalendarSection`                     | `src/components/sections/CalendarSection.tsx`        |
| 3     | `"dateDetails"` | "Trip Details"         | `DateOptionBuilderSection`            | `src/components/sections/DateOptionBuilderSection.tsx` |
| 4     | `"comparison"`  | "Compare Options"      | `ComparisonSection`                   | `src/components/sections/ComparisonSection.tsx`      |

**Rendering order is fixed.** Sections are always rendered in this order within the JSX tree. A section later in the list can never appear without the section(s) above it also being visible (except: section 4 "comparison" can be visible while section 3 "dateDetails" is also visible, but only if section 2 "calendar" is also visible).

---

## 3. State Variables That Gate Visibility

The progressive reveal is controlled by **four state variables**, three of which live in `HomePage` (page-level `useState`) and one from React Context:

| # | Variable             | Type                            | Declared In         | Initial Value                                                  | What It Tracks                                     |
|---|----------------------|---------------------------------|---------------------|----------------------------------------------------------------|----------------------------------------------------|
| 1 | `searchParams`       | `SearchParams`                  | `HomePage` state    | `{ destination: null, originAirport: '', travelerCount: 1 }`   | User's selected destination, origin airport, traveler count |
| 2 | `calendarWeather`    | `CalendarWeatherState`          | `HomePage` state    | `{ state: 'idle', data: null, error: null }`                   | Calendar weather overlay data (calendar always visible; weather fetched when destination selected) |
| 3 | `dateRange`          | `DateRange \| null`             | `HomePage` state    | `null`                                                         | User's selected start/end dates from the calendar  |
| 4 | `dateDetailResults`  | `DateDetailResults`             | `HomePage` state    | `{ flight: {...idle}, hotels: {...idle}, weather: {...idle} }`  | Flight price, hotel list, weather data for selected dates |
| 5 | `queueCount`         | `number`                        | `ComparisonQueueContext` | `0` (derived from `queue.length`)                         | Number of items in the comparison queue             |

**Derived visibility booleans** (computed inline, never stored as state):

| Section         | Visibility Expression                     |
|-----------------|-------------------------------------------|
| `"destination"` | `true` (always visible)                   |
| `"calendar"`    | `true` (always visible)                    |
| `"dateDetails"` | `dateRange !== null`                       |
| `"comparison"`  | `queueCount >= 1`                          |

---

## 4. Section Visibility Rules (Formal)

### 4.1 Section 1: Destination Search (`"destination"`)

**Visible**: Always. This section is rendered with `visible={true}` unconditionally.

**Rationale**: It is the entry point of the flow. The user must always be able to search for and select a destination.

**What gates the NEXT section**: Setting `searchParams.destination` to a non-null `SelectedDestination` value. This happens when the user selects an item from the destination autocomplete dropdown.

---

### 4.2 Section 2: Calendar (`"calendar"`)

**Visible when**: Always. The calendar section is rendered with `visible={true}` unconditionally.

**Becomes visible**: Immediately on page load, alongside the Search section.

**Becomes hidden**: Never. The calendar section remains visible throughout the entire page lifecycle. Before a destination is selected, it shows an empty calendar grid (no weather data). After a destination is selected, weather data is fetched and overlaid on the calendar days.

**Data dependency**: The `CalendarSection` component requires:
- `destination: SelectedDestination` — the selected destination (for display and API call)
- `calendarWeather: CalendarWeatherState` — the weather overlay data (fetched via `POST /api/v1/calendar`)

**Auto-fetch trigger**: When this section becomes visible (destination transitions from `null` → non-null), the `HomePage` must automatically call `POST /api/v1/calendar` with the destination's coordinates. This sets `calendarWeather.state` to `'loading'`, then `'success'` or `'error'`.

**What gates the NEXT section**: The user selecting a valid date range (start date + end date) on the calendar. This sets `dateRange` to a non-null `DateRange` object.

---

### 4.3 Section 3: Date Details / Trip Builder (`"dateDetails"`)

**Visible when**: `dateRange !== null`

**Becomes visible**: Immediately after the user completes date range selection on the calendar (both start and end dates are set). The `handleDateRangeSelect` callback in `HomePage` sets `dateRange` to the selected `{ startDate, endDate }`.

**Becomes hidden**: If `dateRange` is reset to `null`. This happens during cascading resets (see Section 7).

**Data dependency**: The `DateOptionBuilderSection` component requires:
- `searchParams: SearchParams` — destination, origin airport, and traveler count
- `dateRange: DateRange` — selected start/end dates (guaranteed non-null by visibility rule)
- `results: DateDetailResults` — flight, hotel, and weather data states

**Auto-fetch trigger**: When `dateRange` transitions from `null` → non-null (or from one value to a new value), the `HomePage` must automatically fire three parallel API calls:
1. `POST /api/v1/flights/price` → updates `dateDetailResults.flight`
2. `POST /api/v1/hotels/search` → updates `dateDetailResults.hotels`
3. `POST /api/v1/weather` → updates `dateDetailResults.weather`

Each of these transitions independently through `idle` → `loading` → `success` | `error`.

**What gates the NEXT section**: This section does NOT gate the comparison section directly. Instead, the user must click "Add to Queue" (which requires all three sub-fetches to be in `success` state AND a hotel to be selected), and the item is added to the comparison queue via `ComparisonQueueContext`. The comparison section's visibility is gated by `queueCount >= 1`.

---

### 4.4 Section 4: Comparison (`"comparison"`)

**Visible when**: `queueCount >= 1` (at least one item in the comparison queue)

**Becomes visible**: After the user successfully adds their first trip option to the comparison queue via the "Add to Queue" button in the Date Details section.

**Becomes hidden**: If all items are removed from the queue (via individual remove or "Clear All"), setting `queueCount` back to `0`.

**Data dependency**: The `ComparisonSection` component reads everything from `ComparisonQueueContext`:
- `queue: ComparisonQueueItem[]` — the queued trip options
- `count: number` — queue length
- `comparisonResult: ComparisonResultState` — result of `POST /api/v1/compare`
- `compareTrips: () => Promise<void>` — trigger comparison
- `removeItem: (id: string) => void` — remove a queue item
- `clearQueue: () => void` — clear all items

**No auto-fetch**: The comparison API is NOT called automatically. The user must explicitly click the "Compare" button (enabled when `count >= 2`).

**Special behavior**: This section's visibility is INDEPENDENT of sections 2 and 3 in the upward direction. Even if the user changes the destination (which hides sections 2 and 3), the comparison section remains visible as long as `queueCount >= 1`. The queue preserves items from previous destinations — they are valid trip options that were already assembled.

---

## 5. State Machine: States & Transitions

The progressive reveal can be modeled as a state machine with the following states. The "state" here refers to the combination of which sections are visible.

### 5.1 Machine States

| State Name          | Sections Visible                                    | Condition                                                    |
|---------------------|-----------------------------------------------------|--------------------------------------------------------------|
| `S0_SEARCH_ONLY`    | destination                                          | `destination === null && queueCount === 0`                   |
| `S1_CALENDAR`       | destination, calendar                                | `destination !== null && dateRange === null && queueCount === 0` |
| `S2_DATE_DETAILS`   | destination, calendar, dateDetails                   | `destination !== null && dateRange !== null && queueCount === 0` |
| `S3_WITH_QUEUE`     | destination, calendar (maybe), dateDetails (maybe), comparison | `queueCount >= 1` (other sections depend on their own conditions) |

**Important**: State `S3_WITH_QUEUE` is a composite state — the comparison section is visible, AND other sections may or may not be visible depending on their individual conditions. For example:
- `destination !== null && dateRange !== null && queueCount >= 1` → all four sections visible
- `destination !== null && dateRange === null && queueCount >= 1` → destination + calendar + comparison visible
- `destination === null && queueCount >= 1` → destination + comparison visible (user cleared destination but queue still has items)

### 5.2 Transitions

```
S0_SEARCH_ONLY
    │
    │ [T1] User selects destination from autocomplete
    │      → sets searchParams.destination = SelectedDestination
    │      → triggers POST /api/v1/calendar (auto-fetch)
    ▼
S1_CALENDAR
    │
    │ [T2] User selects date range on calendar
    │      → sets dateRange = { startDate, endDate }
    │      → triggers 3 parallel API calls (flights, hotels, weather)
    ▼
S2_DATE_DETAILS
    │
    │ [T3] User clicks "Add to Queue" (all data loaded, hotel selected)
    │      → addItem(queueItem) via ComparisonQueueContext
    │      → queueCount becomes >= 1
    ▼
S3_WITH_QUEUE (all four sections visible)
    │
    │ [T4] User selects new date range on calendar
    │      → dateRange updated → 3 API calls re-fire
    │      → stays in S3_WITH_QUEUE (comparison section stays visible)
    │
    │ [T5] User selects new destination
    │      → cascading reset: dateRange = null, dateDetailResults = idle
    │      → calendar re-fetches for new destination
    │      → comparison section stays visible (queue preserved)
    │      → now in S3_WITH_QUEUE with destination + calendar + comparison visible
    │
    │ [T6] User removes all items from queue
    │      → queueCount === 0
    │      → comparison section hides
    │      → transitions back to S0, S1, or S2 depending on destination/dateRange state
```

### 5.3 Reverse Transitions (Backward Navigation)

There is no explicit "back" button. Backward transitions happen when the user changes upstream inputs:

| Reverse Trigger                          | Effect                                                                                      |
|------------------------------------------|---------------------------------------------------------------------------------------------|
| User clears destination (types over selected destination or clears input) | `searchParams.destination = null` → calendar hides, dateDetails hides. Comparison stays if `queueCount >= 1`. |
| User selects a NEW destination           | Old calendar data cleared, new calendar fetched. `dateRange = null` → dateDetails hides. `dateDetailResults` reset to idle. Comparison stays if `queueCount >= 1`. |
| User selects a NEW date range            | `dateDetailResults` reset to `loading` for all three fetches. Comparison results invalidated (reset to idle) but queue items preserved. |

---

## 6. Data Dependencies Between Sections

This section documents exactly what data flows FROM one section TO the next, creating the dependency chain.

### 6.1 Dependency Graph

```
┌─────────────────────────┐
│   Section 1: Search     │
│   (destination)         │
│                         │
│  Produces:              │
│  - SelectedDestination  │
│  - originAirport        │
│  - travelerCount        │
└──────────┬──────────────┘
           │
           │  SelectedDestination (non-null gates Section 2)
           │  latitude, longitude, name → POST /api/v1/calendar request
           ▼
┌─────────────────────────┐
│   Section 2: Calendar   │
│   (calendar)            │
│                         │
│  Receives:              │
│  - SelectedDestination  │
│  - CalendarWeatherState │
│                         │
│  Produces:              │
│  - DateRange            │
└──────────┬──────────────┘
           │
           │  DateRange (non-null gates Section 3)
           │  + SelectedDestination + originAirport + travelerCount
           │  → 3 parallel POST requests (flights, hotels, weather)
           ▼
┌──────────────────────────────────────────────┐
│   Section 3: Date Details                    │
│   (dateDetails)                              │
│                                              │
│  Receives:                                   │
│  - SearchParams (destination, origin, count) │
│  - DateRange                                 │
│  - DateDetailResults (flight, hotels, weather)│
│                                              │
│  Produces:                                   │
│  - ComparisonQueueItem (via "Add to Queue")  │
│    assembled from: destination.name,         │
│    dateRange, originAirport, flight.price,   │
│    selectedHotel.hotel_name,                 │
│    selectedHotel.total_price, weatherSummary,│
│    travelerCount                             │
└──────────┬───────────────────────────────────┘
           │
           │  ComparisonQueueItem added to context
           │  queueCount >= 1 gates Section 4
           ▼
┌─────────────────────────┐
│   Section 4: Comparison │
│   (comparison)          │
│                         │
│  Receives (from Context)│
│  - queue[]              │
│  - comparisonResult     │
│                         │
│  Produces:              │
│  - CompareResponse      │
│    (via POST /api/v1/   │
│     compare)            │
└─────────────────────────┘
```

### 6.2 Detailed Data Passing Per Section Boundary

#### Search → Calendar

| Data Field               | Source in SearchParams            | Used By CalendarSection For                    |
|--------------------------|----------------------------------|------------------------------------------------|
| `destination.name`       | `searchParams.destination.name`  | Display in calendar header / API request       |
| `destination.latitude`   | `searchParams.destination.latitude` | `POST /api/v1/calendar` → `latitude`        |
| `destination.longitude`  | `searchParams.destination.longitude` | `POST /api/v1/calendar` → `longitude`      |

The calendar API request also needs `start_date` and `end_date` for the 2-month range. These are computed by `HomePage`:
- `start_date`: 1st day of the current month (using `dayjs().startOf('month').format('YYYY-MM-DD')`)
- `end_date`: last day of 2 months from now (using `dayjs().add(CALENDAR_MONTH_RANGE - 1, 'month').endOf('month').format('YYYY-MM-DD')`)

#### Calendar → Date Details

| Data Field           | Source                                | Used By DateOptionBuilderSection For               |
|----------------------|---------------------------------------|----------------------------------------------------|
| `dateRange.startDate`| User click on calendar start date     | Flight `departure_date`, Hotel `checkin_date`, Weather `start_date` |
| `dateRange.endDate`  | User click on calendar end date       | Flight `return_date`, Hotel `checkout_date`, Weather `end_date` |

Plus all data from Search (destination, origin, travelerCount) flows through to the three API calls:

| API Call                     | Parameters From SearchParams         | Parameters From DateRange            |
|------------------------------|--------------------------------------|--------------------------------------|
| `POST /api/v1/flights/price` | `origin` = `originAirport`, `destination` = `destination.iata_code`, `traveler_count` = `travelerCount` | `departure_date` = `startDate`, `return_date` = `endDate` |
| `POST /api/v1/hotels/search` | `destination` = `destination.name`, `latitude`, `longitude`, `traveler_count` = `travelerCount` | `checkin_date` = `startDate`, `checkout_date` = `endDate` |
| `POST /api/v1/weather`       | `latitude`, `longitude`              | `start_date` = `startDate`, `end_date` = `endDate` |

#### Date Details → Comparison Queue

The "Add to Queue" button assembles a `ComparisonQueueItem` from multiple sources:

| ComparisonQueueItem Field | Source                                          |
|---------------------------|-------------------------------------------------|
| `id`                      | `${destination.name}-${dateRange.startDate}-${dateRange.endDate}` |
| `destination`             | `searchParams.destination.name`                 |
| `startDate`               | `dateRange.startDate`                           |
| `endDate`                 | `dateRange.endDate`                             |
| `originAirport`           | `searchParams.originAirport`                    |
| `flightPrice`             | `dateDetailResults.flight.data.price`           |
| `hotelName`               | User-selected `HotelOption.hotel_name`          |
| `hotelPrice`              | User-selected `HotelOption.total_price`         |
| `weather`                 | `dateDetailResults.weather.data` (full `WeatherSummary`) |
| `travelerCount`           | `searchParams.travelerCount`                    |

---

## 7. Cascading Reset Rules

When an upstream input changes, all dependent downstream state must be reset. These rules prevent stale data from persisting across different user selections.

### 7.1 Rule Table

| Trigger Event                                | State Changes                                                                                                    | Sections Affected                    |
|----------------------------------------------|------------------------------------------------------------------------------------------------------------------|--------------------------------------|
| **User selects a NEW destination**           | 1. `searchParams.destination` = new `SelectedDestination`<br>2. `calendarWeather` = `{ state: 'loading', ... }` (re-fetch)<br>3. `dateRange` = `null`<br>4. `dateDetailResults` = all three sub-states reset to `{ state: 'idle', data: null, error: null }` | Calendar re-fetches; Date Details hides; Comparison queue PRESERVED |
| **User clears destination** (empties search input) | 1. `searchParams.destination` = `null`<br>2. `calendarWeather` = `{ state: 'idle', data: null, error: null }`<br>3. `dateRange` = `null`<br>4. `dateDetailResults` = all reset to idle | Calendar hides; Date Details hides; Comparison queue PRESERVED |
| **User selects a NEW date range** (while dateRange was already set) | 1. `dateRange` = new `{ startDate, endDate }`<br>2. `dateDetailResults` = all three sub-states set to `{ state: 'loading', ... }` (re-fetch)<br>3. Comparison result reset to `idle` (via `resetComparison()` from context) | Date Details re-fetches; Comparison results cleared (but queue items preserved) |
| **User changes origin airport**              | No cascading reset. Origin is only used when fetching flight prices. If a date range is already selected, the flight price should be re-fetched. Hotels and weather are unaffected. | Flight re-fetches (if dateRange is set) |
| **User changes traveler count**              | No cascading reset for section visibility. If a date range is already selected, flight price and hotel search should be re-fetched (traveler count affects both). Weather is unaffected. | Flight and Hotels re-fetch (if dateRange is set) |

### 7.2 Cascade Order (Implementation)

When the user selects a new destination, the `handleDestinationChange` callback in `HomePage` must execute these state updates in this exact order (all synchronously within the same handler, so React batches them into a single re-render):

```typescript
function handleDestinationChange(destination: SelectedDestination | null) {
  // 1. Update destination
  setSearchParams(prev => ({ ...prev, destination }));

  // 2. Reset date range (hides dateDetails section)
  setDateRange(null);

  // 3. Reset date detail results
  setDateDetailResults({
    flight: { state: 'idle', data: null, error: null },
    hotels: { state: 'idle', data: null, error: null },
    weather: { state: 'idle', data: null, error: null },
  });

  // 4. Fetch calendar weather for the new destination (or reset if null)
  if (destination) {
    fetchCalendarWeather(destination);
  } else {
    setCalendarWeather({ state: 'idle', data: null, error: null });
  }
}
```

### 7.3 What is NOT Reset

**The comparison queue is NEVER reset by upstream changes.** Items already in the queue represent fully assembled trip options from previous user interactions. They are valid regardless of what the user is currently exploring. Only explicit user actions (remove item, clear queue) modify the queue.

This means:
- User adds "Tokyo May 1–5" to queue
- User changes destination to "Osaka"
- Queue still contains "Tokyo May 1–5"
- User can continue adding "Osaka" date options to the queue
- Comparison section remains visible

---

## 8. Trigger → Effect Matrix

Complete matrix of every user action and its effect on all state variables:

| # | User Action                                      | `searchParams.destination` | `calendarWeather`     | `dateRange`   | `dateDetailResults`     | Queue / Comparison |
|---|--------------------------------------------------|----------------------------|-----------------------|---------------|-------------------------|--------------------|
| 1 | Types in destination search (< 3 chars)          | No change                  | No change             | No change     | No change               | No change          |
| 2 | Types in destination search (≥ 3 chars)          | No change                  | No change             | No change     | No change               | No change          |
| 3 | Selects destination from autocomplete dropdown   | Set to SelectedDestination | → `loading` (fetch)   | → `null`      | → all `idle`            | Queue preserved    |
| 4 | Clears destination input (backspace/clear)       | → `null`                   | → `idle`              | → `null`      | → all `idle`            | Queue preserved    |
| 5 | Changes origin airport input                     | `.originAirport` updated   | No change             | No change     | Flight re-fetches if dateRange set | No change |
| 6 | Changes traveler count                           | `.travelerCount` updated   | No change             | No change     | Flight + Hotels re-fetch if dateRange set | No change |
| 7 | Clicks start date on calendar                    | No change                  | No change             | Partial (start only, not complete) | No change | No change |
| 8 | Clicks end date on calendar (completes range)    | No change                  | No change             | → `{ startDate, endDate }` | → all `loading` (3 parallel fetches) | Comparison result → `idle` |
| 9 | Clicks a different date range on calendar        | No change                  | No change             | → new range   | → all `loading` (re-fetch) | Comparison result → `idle` |
| 10| Selects a hotel from hotel list                  | No change                  | No change             | No change     | No change (selection is local to DateOptionBuilderSection) | No change |
| 11| Clicks "Add to Queue"                            | No change                  | No change             | No change     | No change               | `addItem()` → queue grows; comparison result → `idle` |
| 12| Clicks "Remove" on a queue item                  | No change                  | No change             | No change     | No change               | `removeItem()` → queue shrinks; comparison result → `idle` |
| 13| Clicks "Clear All" on queue                      | No change                  | No change             | No change     | No change               | `clearQueue()` → queue empty; comparison result → `idle`; comparison section hides if count → 0 |
| 14| Clicks "Compare" button                          | No change                  | No change             | No change     | No change               | `compareTrips()` → result `loading` → `success`/`error` |
| 15| Clicks "Retry" on any failed fetch               | No change                  | May re-fetch          | No change     | Re-fetches the specific failed call | May re-fetch comparison |

---

## 9. API Call Triggers by Section Transition

### 9.1 When Each API Is Called

| API Endpoint                      | Triggered When                                                         | Called By               | Parameters Derived From                                |
|-----------------------------------|------------------------------------------------------------------------|-------------------------|--------------------------------------------------------|
| `POST /api/v1/calendar`          | Destination selected (transition to `"calendar"` section visible)      | `HomePage` handler      | `destination.{name, latitude, longitude}`, computed date range |
| `POST /api/v1/flights/price`     | Date range selected (transition to `"dateDetails"` section visible)    | `HomePage` handler      | `searchParams.{originAirport, destination.iata_code, travelerCount}`, `dateRange.{startDate, endDate}` |
| `POST /api/v1/hotels/search`     | Date range selected (concurrent with flights and weather)              | `HomePage` handler      | `searchParams.{destination.{name, latitude, longitude}, travelerCount}`, `dateRange.{startDate, endDate}` |
| `POST /api/v1/weather`           | Date range selected (concurrent with flights and hotels)               | `HomePage` handler      | `searchParams.destination.{latitude, longitude}`, `dateRange.{startDate, endDate}` |
| `POST /api/v1/compare`           | User clicks "Compare" button (NOT automatic)                           | `ComparisonQueueContext` | `queue[]` converted to `CompareOptionInput[]`          |

### 9.2 Concurrent Fetch Pattern for Date Details

When `dateRange` transitions from `null` → non-null (or changes value), ALL THREE of these must fire concurrently:

```typescript
// Inside HomePage — pseudo-code for handleDateRangeSelect
async function handleDateRangeSelect(range: DateRange) {
  setDateRange(range);

  // Reset all three to loading simultaneously
  setDateDetailResults({
    flight: { state: 'loading', data: null, error: null },
    hotels: { state: 'loading', data: null, error: null },
    weather: { state: 'loading', data: null, error: null },
  });

  // Fire all three concurrently — do NOT await sequentially
  fetchFlightPrice(range);   // updates dateDetailResults.flight independently
  fetchHotelSearch(range);   // updates dateDetailResults.hotels independently
  fetchWeatherData(range);   // updates dateDetailResults.weather independently
}
```

Each fetch updates its own sub-state independently. One can succeed while another fails. The `DateOptionBuilderSection` renders each sub-section based on its own `LoadingState`.

### 9.3 Origin Airport / Traveler Count Change Re-fetch

When origin airport changes while `dateRange` is set:
- Re-fetch **only** `POST /api/v1/flights/price` (origin affects flight price)
- Do NOT re-fetch hotels or weather

When traveler count changes while `dateRange` is set:
- Re-fetch `POST /api/v1/flights/price` (traveler count may affect pricing)
- Re-fetch `POST /api/v1/hotels/search` (traveler count affects room calculation)
- Do NOT re-fetch weather (weather is independent of traveler count)

---

## 10. Edge Cases & Boundary Conditions

### 10.1 Destination Without IATA Code

**Condition**: User selects a destination where `iata_code === null`.

**Behavior**: The origin airport input and flight price fetch still work — `destination.iata_code` is used as the `destination` parameter for `POST /api/v1/flights/price`. If `iata_code` is null, the flight price fetch should be skipped (set `dateDetailResults.flight` to `error` state with message: "No airport found for this destination. Flight prices are unavailable."). Hotels and weather still fetch normally.

**Impact on "Add to Queue"**: The "Add to Queue" button requires all three fetches (flight, hotel, weather) to be in `success` state. If flight is in `error` because there's no IATA code, the button remains disabled.

### 10.2 Empty Origin Airport

**Condition**: User has not entered an origin airport (empty string) when date range is selected.

**Behavior**: The flight price fetch requires `origin` to be a non-empty IATA code. If `searchParams.originAirport` is an empty string when date range is selected:
- Do NOT call `POST /api/v1/flights/price`
- Set `dateDetailResults.flight` to `error` with message: "Please enter your departure airport code."
- Hotels and weather still fetch normally.

### 10.3 Rapid Destination Changes

**Condition**: User selects destination A, then quickly selects destination B before calendar fetch for A completes.

**Behavior**: The calendar fetch for destination A should be cancelled (or its result ignored). Only the most recent destination's calendar data should be displayed. Implementation: use a ref to track the latest destination and ignore stale responses, or use an `AbortController` to cancel the in-flight request.

### 10.4 Rapid Date Range Changes

**Condition**: User selects date range A, then quickly selects date range B before the three parallel fetches for A complete.

**Behavior**: All three in-flight requests for range A should be cancelled or their results ignored. Only results for range B should populate `dateDetailResults`. Implementation: same pattern as 10.3 — ref-based staleness check or `AbortController`.

### 10.5 Queue Full (5 Items) — Add to Queue Button

**Condition**: Queue already has 5 items. User is viewing a new date option with all data loaded.

**Behavior**: "Add to Queue" button is disabled. Tooltip reads: "Comparison queue is full (max 5)". The user must remove an existing item before adding a new one. This is enforced by the `isFull` derived value from `ComparisonQueueContext`.

### 10.6 Duplicate Date Option

**Condition**: User tries to add the same destination + date range combination that's already in the queue.

**Behavior**: "Add to Queue" button is disabled. Tooltip reads: "This date range is already in your queue". Duplicate detection uses the `id` field: `${destination.name}-${startDate}-${endDate}`. The check is performed against `queue` from context: `queue.some(item => item.id === candidateId)`.

### 10.7 Comparison Section Visible Without Date Details

**Condition**: User adds an item to the queue (comparison section appears), then selects a new destination (date details hides, calendar shows loading). Comparison section is still visible because `queueCount >= 1`.

**Behavior**: This is valid. The comparison section operates independently from the upper sections. The user can view, modify, or compare their queued items while simultaneously exploring a new destination in the upper sections.

### 10.8 All Queue Items Removed While Comparison Results Are Shown

**Condition**: User has comparison results displayed, then removes all items from the queue.

**Behavior**:
1. Each removal triggers `resetComparison()` (comparison results cleared)
2. When the last item is removed, `queueCount` drops to 0
3. Comparison section visibility becomes `false` → section hides
4. If user adds new items later, comparison section reappears with no previous results (result state is `idle`)

### 10.9 Page Refresh at Any Point

**Condition**: User refreshes the browser at any point during the flow.

**Behavior**: All state resets to initial values. Queue is empty. All sections except destination are hidden. The user starts the flow from the beginning. This is expected — state is in-memory only with no persistence.

### 10.10 Calendar Weather Fetch Fails

**Condition**: `POST /api/v1/calendar` returns an error.

**Behavior**: Calendar section shows `InlineError` with retry button. The user cannot select dates (no calendar grid is rendered). Date details section remains hidden (`dateRange` stays `null`). The user can retry the calendar fetch or select a different destination.

---

## 11. Implementation Reference: HomePage State & Handlers

### 11.1 Complete State Declarations

```typescript
// frontend/src/app/page.tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import type { SearchParams, DateRange, DateDetailResults, CalendarWeatherState, SelectedDestination } from '@/types/frontend';
import { useComparisonQueue } from '@/context/ComparisonQueueContext';

export default function HomePage() {
  // ── Page-level state ──
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

  // ── Context ──
  const { count: queueCount } = useComparisonQueue();

  // ── Visibility conditions (computed, not stored) ──
  const showCalendar = searchParams.destination !== null;
  const showDateDetails = dateRange !== null;
  const showComparison = queueCount >= 1;

  // ... handlers and render (see Section 11.2)
}
```

### 11.2 Handler Signatures

```typescript
/**
 * Called when user selects or clears a destination.
 * Cascading reset: clears dateRange and dateDetailResults.
 * Auto-fetches calendar weather if destination is non-null.
 */
handleDestinationChange: (destination: SelectedDestination | null) => void

/**
 * Called when user changes the origin airport input.
 * Re-fetches flight price if dateRange is currently set.
 */
handleOriginChange: (originAirport: string) => void

/**
 * Called when user changes the traveler count.
 * Re-fetches flight price and hotel search if dateRange is currently set.
 */
handleTravelerCountChange: (count: number) => void

/**
 * Called when user completes date range selection on the calendar.
 * Sets dateRange and fires 3 parallel API calls.
 * If dateRange was already set (user re-selecting), resets and re-fetches.
 */
handleDateRangeSelect: (range: DateRange) => void

/**
 * Called when user clicks Retry on the calendar weather error.
 * Re-fetches calendar weather with current destination.
 */
handleRetryCalendar: () => void

/**
 * Called when user clicks Retry on the flight price error.
 * Re-fetches flight price with current params.
 */
handleRetryFlight: () => void

/**
 * Called when user clicks Retry on the hotel search error.
 * Re-fetches hotel search with current params.
 */
handleRetryHotels: () => void

/**
 * Called when user clicks Retry on the weather summary error.
 * Re-fetches weather data with current params.
 */
handleRetryWeather: () => void

/**
 * Called when user clicks "Add to Queue" with assembled data.
 * Delegates to ComparisonQueueContext.addItem().
 * The DateOptionBuilderSection component assembles the ComparisonQueueItem
 * and calls this handler.
 */
handleAddToQueue: (item: ComparisonQueueItem) => void
```

### 11.3 Render Structure

```tsx
return (
  <AppShell>
    {/* Section 1: ALWAYS visible */}
    <SectionContainer sectionId="destination" visible={true}>
      <SearchSection
        searchParams={searchParams}
        onDestinationChange={handleDestinationChange}
        onOriginChange={handleOriginChange}
        onTravelerCountChange={handleTravelerCountChange}
      />
    </SectionContainer>

    {/* Section 2: visible when destination is selected */}
    <SectionContainer
      sectionId="calendar"
      visible={showCalendar}
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

    {/* Section 3: visible when date range is selected */}
    <SectionContainer
      sectionId="dateDetails"
      visible={showDateDetails}
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

    {/* Section 4: visible when queue has >= 1 items */}
    <SectionContainer
      sectionId="comparison"
      visible={showComparison}
      title="Compare Options"
      subtitle="Add at least 2 date options to compare. Maximum 5."
    >
      <ComparisonSection />
    </SectionContainer>
  </AppShell>
);
```

---

## 12. Visual State Diagram

### 12.1 Full State Machine Diagram

```
                    ┌────────────────────────────────────────────────────┐
                    │                                                    │
                    │  ┌──────────────────────┐                         │
                    │  │  S0: SEARCH ONLY     │                         │
                    │  │                      │                         │
                    │  │  Visible:            │                         │
                    │  │  [1] Destination ✓   │                         │
                    │  │  [2] Calendar ✗      │                         │
                    │  │  [3] DateDetails ✗   │                         │
                    │  │  [4] Comparison ✗    │                         │
                    │  └──────────┬───────────┘                         │
                    │             │                                      │
                    │             │ T1: select destination               │
                    │             │     → auto-fetch calendar weather    │
                    │             ▼                                      │
                    │  ┌──────────────────────┐                         │
                    │  │  S1: CALENDAR        │◄──── T_back: clear      │
                    │  │                      │      destination         │
                    │  │  Visible:            │                         │
                    │  │  [1] Destination ✓   │                         │
                    │  │  [2] Calendar ✓      │                         │
                    │  │  [3] DateDetails ✗   │                         │
                    │  │  [4] Comparison ✗*   │  * visible if queue > 0 │
                    │  └──────────┬───────────┘                         │
                    │             │                                      │
                    │             │ T2: select date range                │
                    │             │     → auto-fetch flights,            │
                    │             │       hotels, weather (parallel)     │
                    │             ▼                                      │
                    │  ┌──────────────────────┐                         │
                    │  │  S2: DATE DETAILS    │◄──── T_back: new dest   │
                    │  │                      │      (resets dateRange)  │
                    │  │  Visible:            │                         │
                    │  │  [1] Destination ✓   │                         │
                    │  │  [2] Calendar ✓      │                         │
                    │  │  [3] DateDetails ✓   │                         │
                    │  │  [4] Comparison ✗*   │  * visible if queue > 0 │
                    │  └──────────┬───────────┘                         │
                    │             │                                      │
                    │             │ T3: "Add to Queue"                   │
                    │             │     (all data loaded, hotel selected)│
                    │             ▼                                      │
                    │  ┌──────────────────────────────────────┐         │
                    │  │  S3: WITH QUEUE                      │         │
                    │  │                                      │         │
                    │  │  Visible:                            │         │
                    │  │  [1] Destination ✓                   │         │
                    │  │  [2] Calendar ✓ (if dest set)        │         │
                    │  │  [3] DateDetails ✓ (if range set)    │         │
                    │  │  [4] Comparison ✓                    │         │
                    │  └──────────┬───────────────────────────┘         │
                    │             │                                      │
                    │             │ T6: remove all queue items           │
                    │             │     → queueCount = 0                 │
                    │             │     → comparison section hides       │
                    │             │                                      │
                    └─────────────┘ (back to S0, S1, or S2 based on     │
                                     destination/dateRange state)        │
                                                                        │
                    Loop: T4 (new date range), T5 (new destination)     │
                    keep S3 if queue still has items                     │
                    ────────────────────────────────────────────────────┘
```

### 12.2 Section Visibility Truth Table

| `destination` | `dateRange` | `queueCount` | Section 1 | Section 2 | Section 3 | Section 4 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `null` | `null` | `0` | ✓ | ✗ | ✗ | ✗ |
| `null` | `null` | `≥1` | ✓ | ✗ | ✗ | ✓ |
| set | `null` | `0` | ✓ | ✓ | ✗ | ✗ |
| set | `null` | `≥1` | ✓ | ✓ | ✗ | ✓ |
| set | set | `0` | ✓ | ✓ | ✓ | ✗ |
| set | set | `≥1` | ✓ | ✓ | ✓ | ✓ |

> **Note**: The combination `destination === null && dateRange !== null` is unreachable because selecting a new destination (or clearing it) always resets `dateRange` to `null`.

---

## 13. Testing Checklist

Ralph Loop should verify these behaviors during implementation:

### 13.1 Forward Flow

- [ ] Page loads with only destination search visible
- [ ] Selecting a destination reveals calendar section with fade animation
- [ ] Calendar weather auto-fetches and shows loading skeleton
- [ ] Calendar weather success shows 2-month grid with weather overlay
- [ ] Selecting a date range reveals date details section
- [ ] Three parallel API calls fire on date range selection
- [ ] Each sub-section (flight, hotel, weather) shows its own loading/success/error state
- [ ] "Add to Queue" becomes enabled when all three are success AND hotel is selected
- [ ] Clicking "Add to Queue" makes comparison section appear
- [ ] Adding a second item enables the "Compare" button

### 13.2 Backward / Reset Flow

- [ ] Selecting a new destination hides date details, re-fetches calendar
- [ ] Clearing destination hides calendar and date details
- [ ] Selecting a new date range re-fetches all three detail APIs
- [ ] Queue items persist across destination changes
- [ ] Queue items persist across date range changes

### 13.3 Edge Cases

- [ ] "Add to Queue" disabled when queue has 5 items
- [ ] "Add to Queue" disabled for duplicate destination+dates
- [ ] Destination with null IATA code shows flight error
- [ ] Empty origin airport shows flight error
- [ ] Comparison section visible with queue items even when destination is cleared
- [ ] Removing all queue items hides comparison section
- [ ] Page refresh resets all state to initial

---

*End of Progressive Section Reveal State Machine Specification*
