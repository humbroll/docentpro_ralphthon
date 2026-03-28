# Frontend Specification: Component Hierarchy & Props Interface for Progressive Reveal Container

> **Audience**: Ralph Loop (autonomous implementation agent)
> **Scope**: Complete component hierarchy documentation for the progressive reveal container, including every child section component's props interface, unlock/lock state propagation, and completion signaling to advance the flow.
> **Cross-references**: `docs/frontend/frontend-spec-progressive-reveal.md` (state machine), `docs/frontend/frontend-spec-component-signatures.md` (full component signatures), `docs/frontend/frontend-spec-section-reveal-ux.md` (animations/scroll), `docs/frontend/frontend-spec-context-provider.md` (ComparisonQueueContext), `docs/frontend/frontend-spec.md` §1.3 (frontend types), `frontend/src/types/api.ts` (API types)

---

## Table of Contents

1. [Component Tree Overview](#1-component-tree-overview)
2. [SectionContainer — The Reveal Wrapper](#2-sectioncontainer--the-reveal-wrapper)
3. [HomePage — The Orchestrator](#3-homepage--the-orchestrator)
4. [Section 1: SearchSection](#4-section-1-searchsection)
5. [Section 2: CalendarSection](#5-section-2-calendarsection)
6. [Section 3: DateOptionBuilderSection](#6-section-3-dateoptionbuildersection)
7. [Section 4: ComparisonSection](#7-section-4-comparisonsection)
8. [Data Flow & Completion Signal Summary](#8-data-flow--completion-signal-summary)
9. [Complete JSX Tree Reference](#9-complete-jsx-tree-reference)
10. [Lock/Unlock State Matrix](#10-lockunlock-state-matrix)

---

## 1. Component Tree Overview

The entire frontend is a single-page flow rendered at the root route (`/`). The component tree from the root layout down to every section component is:

```
RootLayout (src/app/layout.tsx) — Server Component
└── ComparisonQueueProvider (src/context/ComparisonQueueContext.tsx) — Client Component
    └── HomePage (src/app/page.tsx) — Client Component ('use client')
        ├── Header (src/components/Header.tsx) — Client Component
        │   └── Typography ("WhenToGo" title)
        │
        ├── SectionContainer #destination (visible={true})
        │   └── SearchSection
        │       ├── DestinationAutocomplete
        │       ├── OriginAirportInput
        │       └── TravelerCountInput
        │
        ├── SectionContainer #calendar (visible={searchParams.destination !== null})
        │   └── CalendarSection
        │       └── CalendarDateRangePicker
        │
        ├── SectionContainer #dateDetails (visible={dateRange !== null})
        │   └── DateOptionBuilderSection
        │       ├── FlightPriceCard
        │       ├── HotelSelectionCard
        │       ├── WeatherSummaryCard
        │       └── AddToQueueButton
        │
        └── SectionContainer #comparison (visible={queueCount >= 1})
            └── ComparisonSection
                ├── ComparisonQueuePanel
                ├── CompareButton
                └── ComparisonResultsTable
```

### 1.1 Key Architectural Rules

| Rule | Detail |
|------|--------|
| **State owner** | `HomePage` owns ALL page-level state (`searchParams`, `calendarWeather`, `dateRange`, `dateDetailResults`). Sections never own cross-section state. |
| **Visibility control** | `HomePage` computes each `SectionContainer`'s `visible` prop as a boolean expression against page-level state. Sections do NOT control their own visibility. |
| **Completion signaling** | Each section signals "completion" by calling a callback prop passed from `HomePage`. This callback updates `HomePage` state, which causes downstream sections to become visible. |
| **No step counter** | There is NO `currentStep`, `activeStep`, or wizard index. Each section evaluates its visibility independently. |
| **Context for queue only** | Only the comparison queue and its results use React Context. All other state is prop-drilled from `HomePage`. |

---

## 2. SectionContainer — The Reveal Wrapper

**File**: `frontend/src/components/shared/SectionContainer.tsx`
**Directive**: `'use client'`

`SectionContainer` is a generic wrapper that handles the fade-in animation and HTML id for scroll targeting. It does NOT contain business logic — it only controls visibility.

### 2.1 Props Interface

```typescript
import type { SectionId } from '@/types/frontend';
import type { ReactNode } from 'react';

export interface SectionContainerProps {
  /**
   * Unique section identifier. Used as the HTML `id` attribute for scroll-into-view targeting.
   * Must be one of: "destination" | "calendar" | "dateDetails" | "comparison"
   */
  sectionId: SectionId;

  /**
   * Whether this section is currently visible.
   * When `true`: section fades in (500ms) and is rendered in the DOM.
   * When `false`: section is instantly removed from the DOM (no fade-out).
   * Computed by HomePage from page-level state. The section itself NEVER changes this value.
   */
  visible: boolean;

  /**
   * Optional section title displayed as an MUI Typography variant="h5" above the section content.
   * Omitted for the destination section (which has no title).
   */
  title?: string;

  /**
   * The section content (the actual section component: SearchSection, CalendarSection, etc.)
   */
  children: ReactNode;
}
```

### 2.2 Render Structure

```tsx
<Fade
  in={visible}
  timeout={{ enter: 500, exit: 0 }}
  mountOnEnter
  unmountOnExit
  appear
>
  <Box id={sectionId} sx={{ mb: 4, scrollMarginTop: 0 }}>
    {title && (
      <Typography variant="h5" sx={{ mb: 2 }}>
        {title}
      </Typography>
    )}
    {children}
  </Box>
</Fade>
```

### 2.3 What SectionContainer Does NOT Do

- Does NOT fetch data
- Does NOT evaluate whether it should be visible (that's `HomePage`'s job)
- Does NOT communicate completion (children do that via their own callback props)
- Does NOT hold any state

---

## 3. HomePage — The Orchestrator

**File**: `frontend/src/app/page.tsx`
**Directive**: `'use client'`

`HomePage` is the single orchestrator component that:
1. Owns all page-level state
2. Computes visibility booleans for each `SectionContainer`
3. Passes props and callbacks to each section component
4. Receives completion signals from sections (via callback props)
5. Triggers API calls and manages async state transitions
6. Manages scroll-into-view on section reveal

### 3.1 State Declarations

```typescript
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

// ── From context ──
const { count: queueCount } = useComparisonQueue();
```

### 3.2 Visibility Computations

```typescript
// Computed inline — NOT stored as state
const showCalendar: boolean = searchParams.destination !== null;
const showDateDetails: boolean = dateRange !== null;
const showComparison: boolean = queueCount >= 1;
// Destination section: always visible (hardcoded true in JSX)
```

### 3.3 Callback Handlers (Completion Signals from Sections)

Each handler is the mechanism by which a section "signals completion" to unlock the next section:

```typescript
/**
 * SIGNAL: SearchSection → Calendar unlock
 * Called when user selects/clears a destination, changes origin, or changes traveler count.
 * When destination changes to non-null: triggers calendar weather fetch and reveals CalendarSection.
 * When destination changes to null: hides CalendarSection and all downstream sections.
 */
const handleSearchParamsChange = useCallback((params: Partial<SearchParams>) => {
  setSearchParams(prev => {
    const next = { ...prev, ...params };

    // If destination changed, cascade reset
    if ('destination' in params && params.destination !== prev.destination) {
      setDateRange(null);
      setDateDetailResults({
        flight: { state: 'idle', data: null, error: null },
        hotels: { state: 'idle', data: null, error: null },
        weather: { state: 'idle', data: null, error: null },
      });

      if (params.destination) {
        fetchCalendarWeather(params.destination);
      } else {
        setCalendarWeather({ state: 'idle', data: null, error: null });
      }
    }

    // If origin or traveler count changed while dateRange exists, re-fetch relevant data
    if (dateRange && ('originAirport' in params || 'travelerCount' in params)) {
      // Re-fetch flights if origin changed, flights+hotels if traveler count changed
      if ('originAirport' in params) {
        fetchFlightPrice(next, dateRange);
      }
      if ('travelerCount' in params) {
        fetchFlightPrice(next, dateRange);
        fetchHotels(next, dateRange);
      }
    }

    return next;
  });
}, [dateRange]); // dateRange needed for conditional re-fetch

/**
 * SIGNAL: CalendarSection → DateOptionBuilderSection unlock
 * Called when user selects a date range on the calendar.
 * Sets dateRange to non-null, which reveals DateOptionBuilderSection.
 * Triggers 3 parallel API calls (flights, hotels, weather).
 */
const handleDateRangeSelect = useCallback((range: DateRange) => {
  setDateRange(range);
  // Trigger 3 parallel fetches (see §3.4 for fetch implementations)
  fetchFlightPrice(searchParams, range);
  fetchHotels(searchParams, range);
  fetchWeather(searchParams, range);
}, [searchParams]);

/**
 * SIGNAL: CalendarSection → retry calendar fetch
 * Called when user clicks "Retry" on the calendar error state.
 * Re-fetches calendar weather data for the current destination.
 */
const handleCalendarRetry = useCallback(() => {
  if (searchParams.destination) {
    fetchCalendarWeather(searchParams.destination);
  }
}, [searchParams.destination]);

/**
 * SIGNAL: DateOptionBuilderSection → retry individual fetch
 * Called when user clicks "Retry" on a flight/hotel/weather error card.
 * Re-fetches only the failed data source.
 */
const handleRetryFetch = useCallback((fetchType: 'flight' | 'hotels' | 'weather') => {
  if (!dateRange || !searchParams.destination) return;
  switch (fetchType) {
    case 'flight':
      fetchFlightPrice(searchParams, dateRange);
      break;
    case 'hotels':
      fetchHotels(searchParams, dateRange);
      break;
    case 'weather':
      fetchWeather(searchParams, dateRange);
      break;
  }
}, [searchParams, dateRange]);
```

### 3.4 API Fetch Functions (called by handlers)

These functions update `HomePage` state. They are NOT passed to children — only the callback handlers are passed.

```typescript
/**
 * Fetches calendar weather data for a given destination.
 * Called when destination changes to non-null, or on retry.
 */
async function fetchCalendarWeather(destination: SelectedDestination): Promise<void> {
  setCalendarWeather({ state: 'loading', data: null, error: null });
  try {
    const data = await api.getCalendarWeather({
      destination: destination.name,
      latitude: destination.latitude,
      longitude: destination.longitude,
      start_date: dayjs().startOf('month').format('YYYY-MM-DD'),
      end_date: dayjs().add(CALENDAR_MONTH_RANGE - 1, 'month').endOf('month').format('YYYY-MM-DD'),
    });
    setCalendarWeather({ state: 'success', data: data.days, error: null });
  } catch (err) {
    setCalendarWeather({
      state: 'error',
      data: null,
      error: extractErrorMessage(err),
    });
  }
}

/**
 * Fetches flight price. Updates dateDetailResults.flight.
 */
async function fetchFlightPrice(params: SearchParams, range: DateRange): Promise<void> {
  setDateDetailResults(prev => ({
    ...prev,
    flight: { state: 'loading', data: null, error: null },
  }));
  try {
    const data = await api.getFlightPrice({
      origin: params.originAirport,
      destination: params.destination!.iata_code ?? '',
      departure_date: range.startDate,
      return_date: range.endDate,
      traveler_count: params.travelerCount,
    });
    setDateDetailResults(prev => ({
      ...prev,
      flight: { state: 'success', data, error: null },
    }));
  } catch (err) {
    setDateDetailResults(prev => ({
      ...prev,
      flight: { state: 'error', data: null, error: extractErrorMessage(err) },
    }));
  }
}

// fetchHotels and fetchWeather follow the same pattern (see docs/frontend/frontend-spec-api-service-layer.md)
```

### 3.5 Scroll-Into-View Effects

```typescript
const prevShowCalendar = useRef(false);
const prevShowDateDetails = useRef(false);
const prevShowComparison = useRef(false);

useEffect(() => {
  if (showCalendar && !prevShowCalendar.current) {
    scrollToSection('calendar');
  }
  prevShowCalendar.current = showCalendar;
}, [showCalendar]);

useEffect(() => {
  if (showDateDetails && !prevShowDateDetails.current) {
    scrollToSection('dateDetails');
  }
  prevShowDateDetails.current = showDateDetails;
}, [showDateDetails]);

useEffect(() => {
  if (showComparison && !prevShowComparison.current) {
    scrollToSection('comparison');
  }
  prevShowComparison.current = showComparison;
}, [showComparison]);
```

---

## 4. Section 1: SearchSection

**File**: `frontend/src/components/sections/SearchSection.tsx`
**Directive**: `'use client'`
**Unlock state**: Always unlocked (always visible, always interactive)
**Completion signal**: Calls `onSearchParamsChange({ destination: SelectedDestination })` when user selects a destination

### 4.1 Props Interface

```typescript
import type { SearchParams, SelectedDestination } from '@/types/frontend';

export interface SearchSectionProps {
  /**
   * Current search parameters (destination, originAirport, travelerCount).
   * Controlled state — SearchSection renders but does not own this state.
   */
  searchParams: SearchParams;

  /**
   * Callback to update any subset of search parameters.
   * This is the COMPLETION SIGNAL mechanism:
   *   - When called with { destination: SelectedDestination }, it unlocks CalendarSection.
   *   - When called with { destination: null }, it locks CalendarSection and all downstream.
   *   - When called with { originAirport } or { travelerCount }, no sections lock/unlock,
   *     but downstream data may re-fetch if dateRange exists.
   */
  onSearchParamsChange: (params: Partial<SearchParams>) => void;
}
```

### 4.2 How It Signals Completion

```
User selects destination from autocomplete
  → DestinationAutocomplete calls onChange(destinationResult)
  → SearchSection converts to SelectedDestination and calls:
      onSearchParamsChange({ destination: { name, latitude, longitude, country, iata_code } })
  → HomePage receives this, sets searchParams.destination to non-null
  → showCalendar evaluates to true
  → SectionContainer #calendar becomes visible={true}
  → CalendarSection fades in
```

### 4.3 Lock/Unlock Behavior

| Aspect | Behavior |
|--------|----------|
| **Visibility** | Always `visible={true}`. Never hidden. |
| **Interactivity** | Always fully interactive. User can change destination/origin/traveler at any time, even after downstream sections are visible. |
| **Effect of changes** | Changing destination triggers cascading reset (hides calendar + date details, resets all downstream data). Changing origin/traveler count only re-fetches affected data if dateRange exists. |

---

## 5. Section 2: CalendarSection

**File**: `frontend/src/components/sections/CalendarSection.tsx`
**Directive**: `'use client'`
**Unlock condition**: `searchParams.destination !== null` (set by SearchSection's completion signal)
**Completion signal**: Calls `onDateRangeSelect(dateRange)` when user selects a start and end date

### 5.1 Props Interface

```typescript
import type { SelectedDestination, DateRange, CalendarWeatherState } from '@/types/frontend';
import type { CalendarDay } from '@/types/api';

export interface CalendarSectionProps {
  /**
   * The selected destination. Guaranteed non-null when this section is visible
   * (visibility is gated by destination !== null).
   * Used to display destination name in the section header and for retry logic.
   */
  destination: SelectedDestination;

  /**
   * Weather overlay data for the calendar grid.
   * Managed by HomePage. Transitions through: idle → loading → success | error.
   *   - state: 'loading' → CalendarSection shows a skeleton placeholder.
   *   - state: 'success' → Calendar renders with weather indicators on each day cell.
   *   - state: 'error' → Calendar shows InlineError with retry button.
   *   - state: 'idle' → Should not occur when section is visible (fetch auto-triggers).
   */
  calendarWeather: CalendarWeatherState;

  /**
   * Currently selected date range, or null if no range is selected yet.
   * Used to highlight the selected range on the calendar.
   * Controlled from HomePage — CalendarSection does NOT own this state.
   */
  dateRange: DateRange | null;

  /**
   * COMPLETION SIGNAL: Called when user finishes selecting a date range.
   * Receives the { startDate, endDate } object.
   * This triggers HomePage to:
   *   1. Set dateRange to the new value (reveals DateOptionBuilderSection)
   *   2. Fire 3 parallel API calls (flights, hotels, weather)
   */
  onDateRangeSelect: (range: DateRange) => void;

  /**
   * Retry callback for calendar weather fetch failure.
   * Connected to the InlineError retry button shown when calendarWeather.state === 'error'.
   */
  onRetry: () => void;
}
```

### 5.2 How It Signals Completion

```
User clicks start date on calendar → internal state tracks selection start
User clicks end date on calendar → CalendarDateRangePicker determines the range
  → CalendarSection calls:
      onDateRangeSelect({ startDate: "2026-05-01", endDate: "2026-05-05" })
  → HomePage receives this, sets dateRange to non-null
  → showDateDetails evaluates to true
  → SectionContainer #dateDetails becomes visible={true}
  → DateOptionBuilderSection fades in
  → HomePage fires fetchFlightPrice, fetchHotels, fetchWeather in parallel
```

### 5.3 Lock/Unlock Behavior

| Aspect | Behavior |
|--------|----------|
| **Visibility** | Visible when `searchParams.destination !== null`. Hidden otherwise. |
| **Locked state** | When `calendarWeather.state === 'loading'`, the calendar grid shows a skeleton. The user cannot select dates until the calendar data loads (`calendarWeather.state === 'success'`). |
| **Unlocked state** | When `calendarWeather.state === 'success'`, the calendar grid is interactive. User can click days to select a date range. |
| **Error state** | When `calendarWeather.state === 'error'`, an `InlineError` is shown with the error message and a "Retry" button that calls `onRetry`. The calendar grid is not rendered. |
| **Re-selection** | After a date range is selected and downstream data is loading/loaded, the user CAN select a new date range. This triggers a cascading re-fetch of all downstream data. |

---

## 6. Section 3: DateOptionBuilderSection

**File**: `frontend/src/components/sections/DateOptionBuilderSection.tsx`
**Directive**: `'use client'`
**Unlock condition**: `dateRange !== null` (set by CalendarSection's completion signal)
**Completion signal**: Calls `addItem(queueItem)` on `ComparisonQueueContext` (via the `useComparisonQueue` hook) when user clicks "Add to Queue"

### 6.1 Props Interface

```typescript
import type { SearchParams, DateRange, DateDetailResults } from '@/types/frontend';

export interface DateOptionBuilderSectionProps {
  /**
   * Current search parameters (destination, originAirport, travelerCount).
   * Used to assemble the ComparisonQueueItem when "Add to Queue" is clicked.
   * Also used for display (destination name, traveler count for cost calculations).
   */
  searchParams: SearchParams;

  /**
   * Selected date range. Guaranteed non-null when this section is visible
   * (visibility is gated by dateRange !== null).
   * Displayed in the section and used to assemble the ComparisonQueueItem.
   */
  dateRange: DateRange;

  /**
   * Results from the 3 parallel API calls (flight price, hotel list, weather summary).
   * Each sub-field independently tracks its own loading state.
   *   - flight.state: 'loading' → FlightPriceCard shows skeleton
   *   - flight.state: 'success' → FlightPriceCard shows price data
   *   - flight.state: 'error' → FlightPriceCard shows InlineError with retry
   *   - (same pattern for hotels and weather)
   */
  results: DateDetailResults;

  /**
   * Retry callback for individual failed API calls.
   * The fetchType parameter indicates which call to retry.
   * Connected to the InlineError retry button inside each card.
   */
  onRetryFetch: (fetchType: 'flight' | 'hotels' | 'weather') => void;
}
```

### 6.2 Internal State

```typescript
/**
 * The hotel selected by the user from the hotel list.
 * null until user clicks a hotel card.
 * Reset to null when results.hotels changes (new fetch starts).
 */
const [selectedHotel, setSelectedHotel] = useState<HotelOption | null>(null);
```

### 6.3 How It Signals Completion (Queue Addition)

This section does NOT use a callback prop for its completion signal. Instead, it uses the `ComparisonQueueContext` directly:

```typescript
import { useComparisonQueue } from '@/context/ComparisonQueueContext';

const { addItem, isFull } = useComparisonQueue();

/**
 * Assembles a ComparisonQueueItem from current state and adds it to the queue.
 * This is the COMPLETION SIGNAL — adding to the queue makes queueCount >= 1,
 * which reveals ComparisonSection.
 */
const handleAddToQueue = (): void => {
  if (!searchParams.destination || !selectedHotel || !results.weather.data || !results.flight.data) {
    return; // Guard — button should be disabled if we reach here
  }

  const item: ComparisonQueueItem = {
    id: `${searchParams.destination.name}-${dateRange.startDate}-${dateRange.endDate}`,
    destination: searchParams.destination.name,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    originAirport: searchParams.originAirport,
    flightPrice: results.flight.data.price,
    hotelName: selectedHotel.hotel_name,
    hotelPrice: selectedHotel.total_price,
    weather: results.weather.data,
    travelerCount: searchParams.travelerCount,
  };

  addItem(item);  // → queueCount becomes >= 1 → ComparisonSection reveals
};
```

### 6.4 "Add to Queue" Button Enable Conditions

The `AddToQueueButton` is enabled ONLY when ALL of these conditions are true:

| Condition | Variable Check |
|-----------|---------------|
| Flight data loaded | `results.flight.state === 'success'` |
| Hotel data loaded | `results.hotels.state === 'success'` |
| Weather data loaded | `results.weather.state === 'success'` |
| Hotel selected | `selectedHotel !== null` |
| Queue not full | `!isFull` (from `useComparisonQueue`) |
| No duplicate | Queue does not already contain an item with the same `id` |

If the queue is full (5 items), the button shows "Queue Full (5/5)" and is disabled.
If a duplicate exists, the button shows "Already in Queue" and is disabled.

### 6.5 Lock/Unlock Behavior

| Aspect | Behavior |
|--------|----------|
| **Visibility** | Visible when `dateRange !== null`. Hidden otherwise. |
| **Loading state** | When any of the 3 API calls is in `loading` state, the corresponding card shows a skeleton. The "Add to Queue" button is disabled. |
| **Fully loaded (unlocked)** | When all 3 API calls are in `success` state, all cards show data. User can select a hotel and click "Add to Queue". |
| **Partial error** | Individual cards can error independently. E.g., flights may error while hotels succeed. Each card shows its own InlineError with retry. "Add to Queue" remains disabled until ALL are success. |
| **After adding to queue** | The section remains visible and interactive. The user can select a different hotel and add another variation, OR go back to the calendar to select a new date range. |

---

## 7. Section 4: ComparisonSection

**File**: `frontend/src/components/sections/ComparisonSection.tsx`
**Directive**: `'use client'`
**Unlock condition**: `queueCount >= 1` (set by DateOptionBuilderSection adding an item to the queue via Context)
**Completion signal**: None — this is the terminal section. The user's journey ends here.

### 7.1 Props Interface

```typescript
// ComparisonSection has NO props from HomePage.
// It reads everything from ComparisonQueueContext.
export interface ComparisonSectionProps {
  // Empty — all data comes from useComparisonQueue() hook
}
```

### 7.2 Context Data Consumed

```typescript
const {
  queue,              // ComparisonQueueItem[] — items to display and compare
  count,              // number — queue length (for UI display "2/5 options")
  isFull,             // boolean — whether queue is at max capacity
  comparisonResult,   // ComparisonResultState — result of POST /api/v1/compare
  compareTrips,       // () => Promise<void> — trigger comparison
  removeItem,         // (id: string) => void — remove a queue item
  clearQueue,         // () => void — remove all items
  resetComparison,    // () => void — clear comparison results
} = useComparisonQueue();
```

### 7.3 Lock/Unlock Behavior

| Aspect | Behavior |
|--------|----------|
| **Visibility** | Visible when `queueCount >= 1`. Hidden when queue is empty. |
| **Independent of upstream** | Remains visible even if user changes destination or clears upstream state. Queue items are preserved across destination changes. |
| **Compare button** | Enabled when `count >= 2` (MIN_COMPARE_SIZE). Disabled with tooltip "Add at least 2 options to compare" when `count < 2`. |
| **During comparison** | When `comparisonResult.state === 'loading'`, the Compare button shows a loading spinner and is disabled. Queue items remain visible but remove buttons are disabled. |
| **After comparison** | `comparisonResult.state === 'success'` → ComparisonResultsTable displays the scored results. Queue panel still visible above results. |
| **Comparison error** | `comparisonResult.state === 'error'` → InlineError shown below the queue panel with retry button that calls `compareTrips()` again. |
| **Queue modification after comparison** | Adding or removing a queue item calls `resetComparison()` automatically (handled by context), clearing stale results. The user must click "Compare" again. |

### 7.4 How ComparisonSection Relates to the Flow

ComparisonSection is unique in that:
1. It does NOT receive props from `HomePage` — it's fully self-contained via Context.
2. Its visibility is controlled by `HomePage` reading `queueCount` from the same Context.
3. It does NOT signal completion to any further section (it's the last section).
4. It CAN coexist with any combination of upstream sections being visible or hidden.

---

## 8. Data Flow & Completion Signal Summary

This table maps every completion signal in the flow — what triggers it, what state it updates, and what downstream section it unlocks:

| # | Signal Source | User Action | Callback / Mechanism | State Updated in HomePage | Downstream Section Unlocked |
|---|--------------|-------------|---------------------|---------------------------|---------------------------|
| 1 | `SearchSection` | Select destination from autocomplete | `onSearchParamsChange({ destination })` | `searchParams.destination` = non-null | `CalendarSection` (visible when destination !== null) |
| 2 | `SearchSection` | Clear destination | `onSearchParamsChange({ destination: null })` | `searchParams.destination` = null | Hides `CalendarSection` + `DateOptionBuilderSection` |
| 3 | `SearchSection` | Change origin airport | `onSearchParamsChange({ originAirport })` | `searchParams.originAirport` = new value | None (re-fetches flight if dateRange exists) |
| 4 | `SearchSection` | Change traveler count | `onSearchParamsChange({ travelerCount })` | `searchParams.travelerCount` = new value | None (re-fetches flight+hotels if dateRange exists) |
| 5 | `CalendarSection` | Select date range | `onDateRangeSelect(range)` | `dateRange` = non-null | `DateOptionBuilderSection` (visible when dateRange !== null) |
| 6 | `CalendarSection` | Click retry on error | `onRetry()` | `calendarWeather` = loading → success/error | None (retries same section's data) |
| 7 | `DateOptionBuilderSection` | Click "Add to Queue" | `addItem(item)` via Context | `queue` gains an item → `queueCount` >= 1 | `ComparisonSection` (visible when queueCount >= 1) |
| 8 | `DateOptionBuilderSection` | Click retry on card error | `onRetryFetch('flight'|'hotels'|'weather')` | Corresponding `dateDetailResults` sub-field re-fetches | None (retries same section's data) |
| 9 | `ComparisonSection` | Click "Compare" | `compareTrips()` via Context | `comparisonResult` = loading → success/error | None (terminal section) |
| 10 | `ComparisonSection` | Remove queue item / Clear queue | `removeItem(id)` / `clearQueue()` via Context | `queue` shrinks. If empty → `queueCount` = 0 | Hides `ComparisonSection` if queue becomes empty |

---

## 9. Complete JSX Tree Reference

This is the exact JSX structure rendered by `HomePage`. Use this as the implementation blueprint:

```tsx
// frontend/src/app/page.tsx
'use client';

export default function HomePage() {
  // ... state declarations (§3.1) ...
  // ... visibility computations (§3.2) ...
  // ... callback handlers (§3.3) ...
  // ... fetch functions (§3.4) ...
  // ... scroll effects (§3.5) ...

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Header />

      {/* Section 1: Destination Search — always visible */}
      <SectionContainer sectionId="destination" visible={true}>
        <SearchSection
          searchParams={searchParams}
          onSearchParamsChange={handleSearchParamsChange}
        />
      </SectionContainer>

      {/* Section 2: Calendar — visible when destination is selected */}
      <SectionContainer
        sectionId="calendar"
        visible={showCalendar}
        title="Select Your Dates"
      >
        <CalendarSection
          destination={searchParams.destination!}  // Non-null guaranteed by visibility
          calendarWeather={calendarWeather}
          dateRange={dateRange}
          onDateRangeSelect={handleDateRangeSelect}
          onRetry={handleCalendarRetry}
        />
      </SectionContainer>

      {/* Section 3: Date Details — visible when date range is selected */}
      <SectionContainer
        sectionId="dateDetails"
        visible={showDateDetails}
        title="Trip Details"
      >
        <DateOptionBuilderSection
          searchParams={searchParams}
          dateRange={dateRange!}  // Non-null guaranteed by visibility
          results={dateDetailResults}
          onRetryFetch={handleRetryFetch}
        />
      </SectionContainer>

      {/* Section 4: Comparison — visible when queue has items */}
      <SectionContainer
        sectionId="comparison"
        visible={showComparison}
        title="Compare Options"
      >
        <ComparisonSection />
      </SectionContainer>
    </Container>
  );
}
```

### 9.1 Non-null Assertions Explained

- `searchParams.destination!` in `CalendarSection`: Safe because the `SectionContainer` wrapping it has `visible={showCalendar}` which is `searchParams.destination !== null`. When `visible` is `false`, the children are not rendered (`unmountOnExit`), so the non-null assertion is never evaluated when destination is null.
- `dateRange!` in `DateOptionBuilderSection`: Same reasoning — `visible={showDateDetails}` is `dateRange !== null`.

---

## 10. Lock/Unlock State Matrix

Complete matrix showing every section's state under every visibility combination:

| Section | State | Visual | User Can Interact? | What Triggers Transition |
|---------|-------|--------|-------------------|--------------------------|
| **Search** | Always visible | Form with inputs | ✅ Always | N/A (always unlocked) |
| **Calendar** | Locked (hidden) | Not in DOM | ❌ | Destination selected → unlocks |
| **Calendar** | Loading | Skeleton grid | ❌ Cannot select dates | Calendar API response → success/error |
| **Calendar** | Unlocked (success) | Interactive calendar with weather overlay | ✅ Can select dates | User selects range → signals completion |
| **Calendar** | Error | InlineError with retry button | ⚠️ Only retry button | User clicks retry → re-fetches |
| **Date Details** | Locked (hidden) | Not in DOM | ❌ | Date range selected → unlocks |
| **Date Details** | Loading | 3 skeleton cards | ❌ Cannot add to queue | Each API resolves independently |
| **Date Details** | Partial success | Mix of data cards and skeleton/error cards | ⚠️ Can select hotel but cannot add to queue | Remaining APIs resolve or user retries errors |
| **Date Details** | Fully loaded (unlocked) | 3 data cards, hotel selectable | ✅ Can select hotel and add to queue | User selects hotel + clicks Add to Queue → signals completion |
| **Date Details** | Queue full | Same as fully loaded but button shows "Queue Full" | ⚠️ Can view but not add | User removes items from queue → button re-enables |
| **Comparison** | Locked (hidden) | Not in DOM | ❌ | First item added to queue → unlocks |
| **Comparison** | Queue only (< 2) | Queue panel with 1 item, Compare button disabled | ⚠️ Can remove items, cannot compare | Add 2nd item → Compare button enables |
| **Comparison** | Ready (≥ 2 items) | Queue panel, Compare button enabled | ✅ Can compare | User clicks Compare → triggers API |
| **Comparison** | Comparing | Queue panel (frozen), loading spinner | ❌ Cannot modify queue during comparison | API responds → success/error |
| **Comparison** | Results shown | Queue panel + results table | ✅ Can remove items (clears results), can re-compare | User modifies queue → results reset |
| **Comparison** | Error | Queue panel + InlineError with retry | ⚠️ Can retry or modify queue | User retries or modifies queue |

---

## Summary

The progressive reveal pattern is implemented through:

1. **`SectionContainer`** — A pure visibility wrapper using MUI `<Fade>`. It receives a `visible` boolean from `HomePage` and renders/unmounts children accordingly. It has no business logic.

2. **`HomePage`** — The orchestrator that owns all state, computes visibility booleans, and passes callback props to sections. Each callback updates `HomePage` state, which causes downstream `SectionContainer`s to become visible.

3. **Completion signaling** — Each section (except ComparisonSection) has a callback prop that, when called, updates `HomePage` state to unlock the next section:
   - `SearchSection.onSearchParamsChange({ destination })` → unlocks `CalendarSection`
   - `CalendarSection.onDateRangeSelect(range)` → unlocks `DateOptionBuilderSection`
   - `DateOptionBuilderSection` → calls `addItem()` on Context → unlocks `ComparisonSection`

4. **Lock/unlock** — Sections are "locked" (not in DOM) when their prerequisite data is missing, and "unlocked" (visible + interactive) when their prerequisite is satisfied. Within a visible section, sub-states (loading, error, success) further control what the user can do.
