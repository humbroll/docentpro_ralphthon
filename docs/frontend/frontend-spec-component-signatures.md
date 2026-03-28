# WhenToGo Frontend Spec — TypeScript Component Signatures for Form & Input Components

> Sub-specification: Exact TypeScript props interfaces, callback types, validation schemas, and internal state for every form and input component in the single-page progressive flow.
> **Cross-references**: `docs/frontend/frontend-spec.md` §1 (types), `docs/frontend/frontend-spec-search-section.md` (SearchSection layout), `docs/frontend/frontend-spec-destination-autocomplete.md` (DestinationAutocomplete details), `docs/frontend/frontend-spec-calendar-section.md` (CalendarSection layout), `docs/frontend/frontend-spec-hotel-section.md` (HotelSelectionCard layout), `docs/frontend/frontend-spec-ui-states.md` (AsyncState model), `frontend/src/types/api.ts` (API types)

---

## Table of Contents

1. [Component Inventory](#1-component-inventory)
2. [SearchSection (Form Container)](#2-searchsection-form-container)
3. [DestinationAutocomplete](#3-destinationautocomplete)
4. [OriginAirportInput](#4-originairportinput)
5. [TravelerCountInput](#5-travelerecountinput)
6. [CalendarDateRangePicker](#6-calendardaterangepicker)
7. [HotelSelectionCard](#7-hotelselectioncard)
8. [FlightPriceCard](#8-flightpricecard)
9. [WeatherSummaryCard](#9-weathersummarycard)
10. [DateOptionBuilderSection (Form Container)](#10-dateoptionbuildersection-form-container)
11. [AddToQueueButton](#11-addtoqueuebutton)
12. [ComparisonQueuePanel](#12-comparisonqueuepanel)
13. [CompareButton](#13-comparebutton)
14. [ComparisonResultsTable](#14-comparisonresultstable)
15. [Shared Utility Components](#15-shared-utility-components)
16. [Validation Rules Reference](#16-validation-rules-reference)
17. [Complete Import Map](#17-complete-import-map)

---

## 1. Component Inventory

Every form and input component, its file path, directive, and role:

| # | Component | File Path | Directive | Role |
|---|-----------|-----------|-----------|------|
| 1 | `SearchSection` | `src/components/SearchSection.tsx` | `'use client'` | Container for destination, origin, and traveler inputs |
| 2 | `DestinationAutocomplete` | `src/components/DestinationAutocomplete.tsx` | `'use client'` | Autocomplete city search with debounced API calls |
| 3 | `OriginAirportInput` | `src/components/OriginAirportInput.tsx` | `'use client'` | 3-letter IATA airport code text input |
| 4 | `TravelerCountInput` | `src/components/TravelerCountInput.tsx` | `'use client'` | Numeric stepper for traveler count (1–100) |
| 5 | `CalendarDateRangePicker` | `src/components/CalendarDateRangePicker.tsx` | `'use client'` | 2-month calendar with weather overlay and date range selection |
| 6 | `HotelSelectionCard` | `src/components/HotelSelectionCard.tsx` | `'use client'` | Hotel list with single-select interaction |
| 7 | `FlightPriceCard` | `src/components/FlightPriceCard.tsx` | `'use client'` | Flight price display card (read-only data display) |
| 8 | `WeatherSummaryCard` | `src/components/WeatherSummaryCard.tsx` | `'use client'` | Weather summary display with daily breakdown accordion |
| 9 | `DateOptionBuilderSection` | `src/components/DateOptionBuilderSection.tsx` | `'use client'` | Container for flight/hotel/weather cards + Add to Queue |
| 10 | `AddToQueueButton` | `src/components/AddToQueueButton.tsx` | `'use client'` | Button to add current selections to comparison queue |
| 11 | `ComparisonQueuePanel` | `src/components/ComparisonQueuePanel.tsx` | `'use client'` | List of queued items with remove buttons |
| 12 | `CompareButton` | `src/components/CompareButton.tsx` | `'use client'` | Triggers POST /api/v1/compare with queue items |
| 13 | `ComparisonResultsTable` | `src/components/ComparisonResultsTable.tsx` | `'use client'` | Side-by-side comparison table (read-only data display) |
| 14 | `LoadingIndicator` | `src/components/shared/LoadingIndicator.tsx` | `'use client'` | Reusable spinner with message |
| 15 | `InlineError` | `src/components/shared/InlineError.tsx` | `'use client'` | Reusable error alert with retry button |
| 16 | `EmptyState` | `src/components/shared/EmptyState.tsx` | `'use client'` | Reusable empty state message |

---

## 2. SearchSection (Form Container)

**File**: `frontend/src/components/SearchSection.tsx`
**Directive**: `'use client'`
**Purpose**: Container component that composes DestinationAutocomplete, OriginAirportInput, and TravelerCountInput into a single form card. Manages the search-related state and passes it up to the page.

### 2.1 Props Interface

```typescript
import type { DestinationResult } from '@/types/api';
import type { SearchParams } from '@/types/frontend';

interface SearchSectionProps {
  /**
   * Current search parameters.
   * Controlled from the parent page component.
   */
  searchParams: SearchParams;

  /**
   * Callback when any search parameter changes.
   * The parent page component uses this to update state and trigger
   * downstream section visibility changes.
   *
   * @param params - Partial update; merged with existing searchParams.
   *   When `destination` changes to null, downstream sections (calendar, dateDetails) hide.
   *   When `destination` changes to a DestinationResult, calendar section reveals.
   */
  onSearchParamsChange: (params: Partial<SearchParams>) => void;
}
```

### 2.2 Internal State

```typescript
// No internal state beyond what is delegated to child components.
// SearchSection is a pure "form container" — all state is lifted to the parent via onSearchParamsChange.
// Exception: DestinationAutocomplete manages its own inputValue, options, isLoading, fetchError internally.
```

### 2.3 Callback Wiring

```typescript
// How SearchSection wires callbacks to child components:

const handleDestinationChange = (destination: DestinationResult | null): void => {
  // Convert DestinationResult to SelectedDestination (same shape, direct assignment)
  onSearchParamsChange({
    destination: destination
      ? {
          name: destination.name,
          latitude: destination.latitude,
          longitude: destination.longitude,
          country: destination.country,
          iata_code: destination.iata_code,
        }
      : null,
  });
};

const handleOriginChange = (value: string): void => {
  onSearchParamsChange({ originAirport: value });
};

const handleTravelerCountChange = (value: number): void => {
  onSearchParamsChange({ travelerCount: value });
};
```

### 2.4 Validation

SearchSection itself does NOT perform cross-field validation. Each child component handles its own field-level validation (see individual component sections). Cross-field validation (e.g., "origin must be set before fetching flights") is handled by the DateOptionBuilderSection at the point of triggering API calls.

---

## 3. DestinationAutocomplete

**File**: `frontend/src/components/DestinationAutocomplete.tsx`
**Directive**: `'use client'`
**Fully specified in**: `docs/frontend/frontend-spec-destination-autocomplete.md`

### 3.1 Props Interface

```typescript
import type { DestinationResult } from '@/types/api';

interface DestinationAutocompleteProps {
  /**
   * Currently selected destination, or null if none selected.
   * Controlled from parent (SearchSection).
   * When non-null, the Autocomplete displays `getOptionLabel(value)`.
   */
  value: DestinationResult | null;

  /**
   * Callback when user selects or clears a destination.
   * Called with the full DestinationResult on selection, or null on clear.
   * The parent uses this to:
   *   1. Store the SelectedDestination in state
   *   2. Trigger calendar section reveal (when non-null)
   *   3. Hide downstream sections (when null)
   */
  onChange: (destination: DestinationResult | null) => void;

  /**
   * External error message from parent validation.
   * When truthy, TextField renders in MUI error state (red border + red helperText).
   * Internal fetchError (from failed API calls) takes priority over this prop.
   * Optional — defaults to undefined (no external error).
   */
  error?: string;
}
```

### 3.2 Internal State

```typescript
const [inputValue, setInputValue] = useState<string>('');
const [options, setOptions] = useState<DestinationResult[]>([]);
const [isLoading, setIsLoading] = useState<boolean>(false);
const [fetchError, setFetchError] = useState<string | undefined>(undefined);
const debounceRef = useRef<ReturnType<typeof setTimeout>>();
```

### 3.3 Validation Rules

| Rule | Implementation | Error Message |
|------|----------------|---------------|
| Minimum 3 characters for API call | Client-side check in `handleInputChange`: if `inputValue.length < 3`, skip API call and show `noOptionsText = "Type at least 3 characters"` | Shown in dropdown, not as field error |
| API failure | `fetchError` state set in catch block | `"Failed to search destinations. Please try again."` (shown as red helperText) |

### 3.4 Export

```typescript
export function DestinationAutocomplete(props: DestinationAutocompleteProps): JSX.Element;
```

---

## 4. OriginAirportInput

**File**: `frontend/src/components/OriginAirportInput.tsx`
**Directive**: `'use client'`

### 4.1 Props Interface

```typescript
interface OriginAirportInputProps {
  /**
   * Current value of the origin airport field.
   * Always uppercase. Empty string when no input.
   * Controlled from parent (SearchSection).
   */
  value: string;

  /**
   * Callback when the input value changes.
   * Called with the uppercased value on every keystroke.
   * The component auto-uppercases input via `e.target.value.toUpperCase()`.
   */
  onChange: (value: string) => void;

  /**
   * External error message to display below the field.
   * When truthy, TextField renders in MUI error state.
   * Optional — defaults to undefined (no error).
   */
  error?: string;
}
```

### 4.2 Internal State

```typescript
// No internal state. This is a fully controlled, stateless input component.
// Validation error is managed externally via the `error` prop.
// However, the parent (SearchSection or page) validates on blur:
```

### 4.3 Validation Rules

| Rule | When Checked | Regex | Error Message | Where Displayed |
|------|-------------|-------|---------------|-----------------|
| Must be exactly 3 uppercase alphabetic characters | On blur (parent handles via `error` prop) | `/^[A-Z]{3}$/` | `"Enter a 3-letter IATA airport code"` | `helperText` under field (red) |
| Required before flight lookup | Before triggering POST /api/v1/flights/price (in DateOptionBuilderSection) | Non-empty + passes regex | `"Origin airport is required"` | `helperText` under field (red) |
| Auto-uppercase on input | On every change event | N/A | N/A | Visual transformation via `textTransform: 'uppercase'` CSS + `toUpperCase()` in onChange |

### 4.4 MUI Configuration

```typescript
// Key TextField props:
{
  fullWidth: true,
  label: "Origin Airport (IATA)",
  placeholder: "e.g. ICN, LAX, JFK",
  slotProps: {
    htmlInput: {
      maxLength: 3,
      style: { textTransform: 'uppercase' as const },
    },
  },
  helperText: error || ' ',  // space char prevents layout shift
  error: !!error,
}
```

### 4.5 Export

```typescript
export function OriginAirportInput(props: OriginAirportInputProps): JSX.Element;
```

---

## 5. TravelerCountInput

**File**: `frontend/src/components/TravelerCountInput.tsx`
**Directive**: `'use client'`

### 5.1 Props Interface

```typescript
interface TravelerCountInputProps {
  /**
   * Current traveler count value. Integer, minimum 1, maximum 100.
   * Controlled from parent (SearchSection).
   */
  value: number;

  /**
   * Callback when the traveler count changes.
   * Called with the new integer value, clamped to 1–100.
   * Invalid values (NaN, decimals, out-of-range) are silently ignored
   * — the onChange is not called for invalid input.
   */
  onChange: (value: number) => void;
}
```

### 5.2 Internal State

```typescript
// No internal state. Fully controlled via props.
// The helperText showing rooms needed is computed inline from `value`.
```

### 5.3 Validation Rules

| Rule | Implementation | Behavior |
|------|----------------|----------|
| Minimum value: 1 | HTML `min` attribute + onChange guard: `num >= 1` | Values < 1 are silently rejected (onChange not called) |
| Maximum value: 100 | HTML `max` attribute + onChange guard: `num <= 100` | Values > 100 are silently rejected (onChange not called) |
| Integer only | `parseInt(e.target.value, 10)` in onChange; `isNaN` check | Non-integer input is silently rejected |
| Default value | Parent initializes with `1` | N/A |

### 5.4 Computed Display

```typescript
// Rooms needed calculation (displayed in helperText):
const roomsNeeded = Math.ceil(value / 2);
const helperText = `${roomsNeeded} room${roomsNeeded !== 1 ? 's' : ''} needed`;
```

### 5.5 MUI Configuration

```typescript
// Key TextField props:
{
  fullWidth: true,
  label: "Travelers",
  type: "number",
  slotProps: {
    htmlInput: {
      min: 1,
      max: 100,
      step: 1,
    },
  },
  helperText: helperText,  // always shows rooms needed, never an error
}
```

### 5.6 Export

```typescript
export function TravelerCountInput(props: TravelerCountInputProps): JSX.Element;
```

---

## 6. CalendarDateRangePicker

**File**: `frontend/src/components/CalendarDateRangePicker.tsx`
**Directive**: `'use client'`

### 6.1 Props Interface

```typescript
import type { CalendarDay } from '@/types/api';
import type { DateRange, LoadingState } from '@/types/frontend';

interface CalendarDateRangePickerProps {
  /**
   * Weather overlay data for the calendar.
   * Array of CalendarDay objects covering a 2-month range.
   * null when data hasn't been fetched yet or API failed.
   */
  calendarDays: CalendarDay[] | null;

  /**
   * Loading state of the calendar weather data request.
   * Determines whether to show skeletons, error, or rendered calendar.
   */
  calendarState: LoadingState;

  /**
   * Error message from the calendar weather fetch.
   * null when no error.
   */
  calendarError: string | null;

  /**
   * Callback to retry the calendar weather fetch after an error.
   */
  onRetryCalendar: () => void;

  /**
   * Currently selected date range, or null if no dates are selected.
   * Both startDate and endDate are ISO "YYYY-MM-DD" strings.
   */
  selectedRange: DateRange | null;

  /**
   * Callback when the user selects or modifies a date range.
   * Called with null when the user clears the selection.
   *
   * Selection flow:
   *   1. User clicks a start date → onChange({ startDate: "...", endDate: "..." }) where endDate = startDate (single day)
   *   2. User clicks an end date → onChange({ startDate: "...", endDate: "..." }) with the full range
   *   3. User clicks a third time → resets: new startDate selected, previous range cleared
   *
   * When a valid range is set (startDate !== endDate), the parent triggers
   * concurrent flight/hotel/weather API calls.
   */
  onDateRangeChange: (range: DateRange | null) => void;

  /**
   * The name of the destination city (for display in the calendar header).
   * e.g., "Tokyo"
   */
  destinationName: string;

  /**
   * The month to initially display. Defaults to the current month.
   * Format: dayjs object or ISO date string.
   * When the user navigates months, the component tracks the visible month internally.
   */
  initialMonth?: string;
}
```

### 6.2 Internal State

```typescript
/**
 * The first of the two visible months in the calendar.
 * The calendar always shows this month and the next month side-by-side.
 */
const [visibleMonth, setVisibleMonth] = useState<dayjs.Dayjs>(
  props.initialMonth ? dayjs(props.initialMonth) : dayjs().startOf('month')
);

/**
 * Tracks whether the user is in "start date selected, waiting for end date" mode.
 * false = next click sets start date
 * true = next click sets end date (or resets if before start date)
 */
const [isSelectingEnd, setIsSelectingEnd] = useState<boolean>(false);

/**
 * Temporary start date held during range selection (before end date is confirmed).
 */
const [pendingStart, setPendingStart] = useState<string | null>(null);
```

### 6.3 Validation Rules

| Rule | Implementation | Behavior |
|------|----------------|----------|
| Future dates only | Days before today are visually greyed out and not clickable | `dayjs(date).isBefore(dayjs(), 'day')` → disabled |
| End date must be after start date | If user clicks a date before the pending start, reset: treat clicked date as new start | Automatically handled in click handler |
| Maximum trip length: none | No explicit limit on date range length | User can select any range of future dates |
| Minimum trip length: 1 night | Start date and end date must be different days | If user clicks same date twice, endDate = startDate + 1 day |

### 6.4 Date Selection Flow (Click Handler Logic)

```typescript
const handleDayClick = (dateStr: string): void => {
  const clicked = dayjs(dateStr);

  // Ignore past dates
  if (clicked.isBefore(dayjs(), 'day')) return;

  if (!isSelectingEnd) {
    // First click: set start date
    setPendingStart(dateStr);
    setIsSelectingEnd(true);
    // Don't call onDateRangeChange yet — wait for end date
  } else {
    // Second click: set end date
    if (pendingStart && clicked.isAfter(dayjs(pendingStart), 'day')) {
      // Valid range: start < end
      onDateRangeChange({ startDate: pendingStart, endDate: dateStr });
    } else if (pendingStart && clicked.isSame(dayjs(pendingStart), 'day')) {
      // Same day clicked: set 1-night stay (end = start + 1)
      const nextDay = clicked.add(1, 'day').format('YYYY-MM-DD');
      onDateRangeChange({ startDate: pendingStart, endDate: nextDay });
    } else {
      // Clicked before start: treat as new start date
      setPendingStart(dateStr);
      onDateRangeChange(null); // clear any previous range
      return; // stay in isSelectingEnd = true
    }
    setIsSelectingEnd(false);
    setPendingStart(null);
  }
};
```

### 6.5 Weather Overlay Rendering

```typescript
/**
 * Lookup function: given a date string, find the CalendarDay data.
 * Returns null if no data exists for that date.
 */
const getCalendarDayData = (dateStr: string): CalendarDay | null => {
  if (!calendarDays) return null;
  return calendarDays.find((d) => d.date === dateStr) ?? null;
};

/**
 * Background color for a calendar day cell based on weather_label.
 * Uses WEATHER_LABEL_COLORS from constants with alpha for subtle backgrounds.
 */
const getDayBackgroundColor = (label: string | null): string => {
  switch (label) {
    case 'Great': return 'rgba(76, 175, 80, 0.1)';   // green-50 equivalent
    case 'Good':  return 'rgba(139, 195, 74, 0.1)';  // lightGreen-50 equivalent
    case 'Fair':  return 'rgba(255, 152, 0, 0.1)';    // orange-50 equivalent
    case 'Poor':  return 'rgba(244, 67, 54, 0.1)';    // red-50 equivalent
    default:      return 'transparent';
  }
};
```

### 6.6 Month Navigation

```typescript
const handlePreviousMonth = (): void => {
  setVisibleMonth((prev) => prev.subtract(1, 'month'));
};

const handleNextMonth = (): void => {
  setVisibleMonth((prev) => prev.add(1, 'month'));
};

// The calendar renders `visibleMonth` and `visibleMonth.add(1, 'month')` side-by-side.
```

### 6.7 Export

```typescript
export function CalendarDateRangePicker(props: CalendarDateRangePickerProps): JSX.Element;
```

---

## 7. HotelSelectionCard

**File**: `frontend/src/components/HotelSelectionCard.tsx`
**Directive**: `'use client'`
**Fully specified in**: `docs/frontend/frontend-spec-hotel-section.md`

### 7.1 Props Interface

```typescript
import type { HotelOption } from '@/types/api';
import type { LoadingState } from '@/types/frontend';

interface HotelSelectionCardProps {
  /**
   * Current loading state of the hotel search request.
   * Determines rendering: skeleton (loading), error (error), list (success), empty message (idle with no data).
   */
  state: LoadingState;

  /**
   * Array of hotel options returned by POST /api/v1/hotels/search.
   * null when not yet loaded or when an error occurred.
   * Empty array [] is a valid "empty" state (no hotels found).
   * Maximum 5 items, pre-sorted by total_price ascending (cheapest first).
   */
  hotels: HotelOption[] | null;

  /**
   * Error message to display when state is "error".
   * null when no error.
   */
  error: string | null;

  /**
   * Callback when user clicks the Retry button after an error.
   * Re-triggers POST /api/v1/hotels/search with the same parameters.
   */
  onRetry: () => void;

  /**
   * Currently selected hotel from the list.
   * null if no hotel is selected.
   * Auto-set to the first (cheapest) hotel when data loads successfully.
   */
  selectedHotel: HotelOption | null;

  /**
   * Callback when user selects a hotel from the list.
   * Called with the full HotelOption object.
   * Only one hotel can be selected at a time (single-select).
   */
  onSelectHotel: (hotel: HotelOption) => void;
}
```

### 7.2 Internal State

```typescript
// No internal state. Selection is fully controlled via selectedHotel + onSelectHotel props.
// The parent (DateOptionBuilderSection) manages selectedHotel state.
```

### 7.3 Validation Rules

| Rule | Implementation | Behavior |
|------|----------------|----------|
| Exactly one hotel must be selected | Enforced by parent: AddToQueueButton is disabled when `selectedHotel === null` | User cannot add to queue without hotel selection |
| Auto-select first hotel on load | Parent sets `selectedHotel = hotels[0]` when hotel state transitions to "success" | First (cheapest) hotel pre-selected |
| Selection resets on re-fetch | Parent sets `selectedHotel = null` when hotel state transitions to "loading" | Previous selection cleared during re-fetch |

### 7.4 Export

```typescript
export function HotelSelectionCard(props: HotelSelectionCardProps): JSX.Element;
```

---

## 8. FlightPriceCard

**File**: `frontend/src/components/FlightPriceCard.tsx`
**Directive**: `'use client'`

### 8.1 Props Interface

```typescript
import type { FlightPrice } from '@/types/api';
import type { LoadingState } from '@/types/frontend';

interface FlightPriceCardProps {
  /**
   * Current loading state of the flight price request.
   */
  state: LoadingState;

  /**
   * Flight price data returned by POST /api/v1/flights/price.
   * null when not yet loaded, loading, or error.
   */
  flight: FlightPrice | null;

  /**
   * Error message when state is "error".
   * null when no error.
   */
  error: string | null;

  /**
   * Callback when user clicks the Retry button after an error.
   * Re-triggers POST /api/v1/flights/price with the same parameters.
   */
  onRetry: () => void;

  /**
   * Current traveler count, used to display the group total.
   * Group total = flight.price * travelerCount.
   */
  travelerCount: number;
}
```

### 8.2 Internal State

```typescript
// No internal state. This is a read-only display component.
```

### 8.3 Computed Values

```typescript
// Displayed when state === 'success' and flight is non-null:
const groupFlightTotal = flight ? flight.price * travelerCount : 0;
// Display: "$342.50 per person" and "$685.00 total for 2 travelers"
```

### 8.4 Export

```typescript
export function FlightPriceCard(props: FlightPriceCardProps): JSX.Element;
```

---

## 9. WeatherSummaryCard

**File**: `frontend/src/components/WeatherSummaryCard.tsx`
**Directive**: `'use client'`

### 9.1 Props Interface

```typescript
import type { WeatherSummary } from '@/types/api';
import type { LoadingState } from '@/types/frontend';

interface WeatherSummaryCardProps {
  /**
   * Current loading state of the weather request.
   */
  state: LoadingState;

  /**
   * Weather summary data from POST /api/v1/weather.
   * null when not yet loaded, loading, or error.
   */
  weather: WeatherSummary | null;

  /**
   * Error message when state is "error".
   * null when no error.
   */
  error: string | null;

  /**
   * Callback when user clicks the Retry button after an error.
   * Re-triggers POST /api/v1/weather with the same parameters.
   */
  onRetry: () => void;
}
```

### 9.2 Internal State

```typescript
/**
 * Whether the daily weather breakdown accordion is expanded.
 * Defaults to false (collapsed).
 */
const [dailyExpanded, setDailyExpanded] = useState<boolean>(false);
```

### 9.3 Chip Color Mapping

```typescript
// Weather label to MUI Chip color mapping:
const labelChipColor: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
  Great: 'success',
  Good:  'info',
  Fair:  'warning',
  Poor:  'error',
};
```

### 9.4 Export

```typescript
export function WeatherSummaryCard(props: WeatherSummaryCardProps): JSX.Element;
```

---

## 10. DateOptionBuilderSection (Form Container)

**File**: `frontend/src/components/DateOptionBuilderSection.tsx`
**Directive**: `'use client'`

### 10.1 Props Interface

```typescript
import type { DestinationResult, FlightPrice, HotelOption, WeatherSummary } from '@/types/api';
import type { DateRange, DateDetailResults, SelectedDestination } from '@/types/frontend';

interface DateOptionBuilderSectionProps {
  /**
   * Whether this section is visible (progressive reveal).
   * Visible when a date range is selected on the calendar.
   */
  visible: boolean;

  /**
   * The selected destination. Required for API calls.
   */
  destination: SelectedDestination;

  /**
   * Origin airport IATA code. Required for flight API call.
   */
  originAirport: string;

  /**
   * Number of travelers. Required for flight and hotel API calls.
   */
  travelerCount: number;

  /**
   * Selected date range from the calendar.
   * null if no dates selected (section should be hidden).
   */
  dateRange: DateRange | null;

  /**
   * Results from the three parallel API calls (flight, hotel, weather).
   * Each has its own LoadingState.
   */
  results: DateDetailResults;

  /**
   * Callbacks to retry individual failed API calls.
   */
  onRetryFlight: () => void;
  onRetryHotels: () => void;
  onRetryWeather: () => void;

  /**
   * Currently selected hotel from the hotel list.
   * null if no hotel selected or hotels haven't loaded.
   * Managed by this section and passed to HotelSelectionCard.
   */
  selectedHotel: HotelOption | null;

  /**
   * Callback when user selects a hotel.
   */
  onSelectHotel: (hotel: HotelOption) => void;

  /**
   * Callback when user clicks the "Add to Queue" button.
   * Called only when all three API calls succeeded and a hotel is selected.
   * The parent assembles the ComparisonQueueItem and adds it to the queue.
   */
  onAddToQueue: () => void;

  /**
   * Whether the Add to Queue button should be disabled.
   * True when: queue is full (5 items), duplicate exists, or data is incomplete.
   */
  addToQueueDisabled: boolean;

  /**
   * Tooltip text for the disabled Add to Queue button.
   * Explains why the button is disabled.
   */
  addToQueueTooltip: string;
}
```

### 10.2 Internal State

```typescript
/**
 * Brief "Added!" confirmation state for the Add to Queue button.
 * Set to true for 1.5 seconds after a successful add.
 */
const [justAdded, setJustAdded] = useState<boolean>(false);
```

### 10.3 Export

```typescript
export function DateOptionBuilderSection(props: DateOptionBuilderSectionProps): JSX.Element;
```

---

## 11. AddToQueueButton

**File**: `frontend/src/components/AddToQueueButton.tsx`
**Directive**: `'use client'`

### 11.1 Props Interface

```typescript
interface AddToQueueButtonProps {
  /**
   * Click handler. Called when the button is enabled and clicked.
   */
  onClick: () => void;

  /**
   * Whether the button is disabled.
   * Disabled states:
   *   - Flight price not yet loaded (state !== 'success')
   *   - Hotels not yet loaded or no hotel selected
   *   - Weather not yet loaded (state !== 'success')
   *   - Queue is full (5 items)
   *   - Duplicate entry exists in queue
   */
  disabled: boolean;

  /**
   * Tooltip text explaining why the button is disabled.
   * Only shown when disabled === true.
   * Examples:
   *   - "Waiting for flight price..."
   *   - "Select a hotel first"
   *   - "Waiting for weather data..."
   *   - "Comparison queue is full (max 5)"
   *   - "This date range is already in your queue"
   */
  tooltipText: string;

  /**
   * Whether the button is in "just added" confirmation state.
   * When true, button shows "Added! ✓" text and success color for 1.5 seconds.
   */
  showConfirmation: boolean;
}
```

### 11.2 Internal State

```typescript
// No internal state. The confirmation timer is managed by the parent (DateOptionBuilderSection).
```

### 11.3 Button States

| Condition | Label | Variant | Color | Icon | Disabled |
|-----------|-------|---------|-------|------|----------|
| Ready (enabled) | "Add to Queue" | `contained` | `primary` | `AddIcon` (MUI) | `false` |
| Disabled | "Add to Queue" | `contained` | `primary` | `AddIcon` | `true` (with Tooltip) |
| Confirmation | "Added!" | `contained` | `success` | `CheckIcon` (MUI) | `true` |

### 11.4 Export

```typescript
export function AddToQueueButton(props: AddToQueueButtonProps): JSX.Element;
```

---

## 12. ComparisonQueuePanel

**File**: `frontend/src/components/ComparisonQueuePanel.tsx`
**Directive**: `'use client'`

### 12.1 Props Interface

```typescript
import type { ComparisonQueueItem } from '@/types/frontend';

interface ComparisonQueuePanelProps {
  /**
   * Items currently in the comparison queue.
   * Empty array when no items have been added.
   * Maximum 5 items.
   */
  queue: ComparisonQueueItem[];

  /**
   * Callback to remove an item from the queue by its ID.
   * After removal, if comparison results were showing, they are cleared.
   */
  onRemoveItem: (id: string) => void;

  /**
   * Callback to clear all items from the queue.
   */
  onClearQueue: () => void;

  /**
   * Whether the queue has reached maximum capacity (5 items).
   * Used to display a visual indicator.
   */
  isFull: boolean;

  /**
   * Whether a comparison is currently loading.
   * When true, remove buttons are disabled to prevent queue modification during comparison.
   */
  isComparing: boolean;
}
```

### 12.2 Internal State

```typescript
// No internal state. Fully controlled via props from ComparisonQueueContext.
```

### 12.3 Queue Item Display

Each queue item renders as a row with:

```typescript
// Per-item display structure:
{
  primary: `${item.destination}: ${dayjs(item.startDate).format('MMM D')} – ${dayjs(item.endDate).format('MMM D, YYYY')}`,
  secondary: `Flight: $${item.flightPrice}/pp · Hotel: $${item.hotelPrice} · Weather: ${item.weather.label}`,
  action: <IconButton onClick={() => onRemoveItem(item.id)} disabled={isComparing}><DeleteIcon /></IconButton>
}
```

### 12.4 Export

```typescript
export function ComparisonQueuePanel(props: ComparisonQueuePanelProps): JSX.Element;
```

---

## 13. CompareButton

**File**: `frontend/src/components/CompareButton.tsx`
**Directive**: `'use client'`

### 13.1 Props Interface

```typescript
interface CompareButtonProps {
  /**
   * Click handler. Triggers POST /api/v1/compare with queue items.
   */
  onClick: () => void;

  /**
   * Whether the button is disabled.
   * Disabled when queue has fewer than 2 items or a comparison is loading.
   */
  disabled: boolean;

  /**
   * Whether a comparison request is currently in-flight.
   * When true, shows CircularProgress spinner inside the button.
   */
  isLoading: boolean;

  /**
   * Number of items in the queue. Used for button label.
   * e.g., "Compare 3 Options"
   */
  queueCount: number;
}
```

### 13.2 Button States

| Condition | Label | Disabled | Shows Spinner |
|-----------|-------|----------|---------------|
| Queue < 2 items | "Compare Options" | `true` (with Tooltip: "Add at least 2 date options to compare") | No |
| Queue 2–5 items, idle | `"Compare ${queueCount} Options"` | `false` | No |
| Loading | "Comparing..." | `true` | Yes (`CircularProgress` size 20, color `inherit`) |

### 13.3 Export

```typescript
export function CompareButton(props: CompareButtonProps): JSX.Element;
```

---

## 14. ComparisonResultsTable

**File**: `frontend/src/components/ComparisonResultsTable.tsx`
**Directive**: `'use client'`

### 14.1 Props Interface

```typescript
import type { CompareResponse } from '@/types/api';
import type { LoadingState } from '@/types/frontend';

interface ComparisonResultsTableProps {
  /**
   * Loading state of the comparison request.
   */
  state: LoadingState;

  /**
   * Comparison results from POST /api/v1/compare.
   * null when not yet loaded, loading, or error.
   * Contains options sorted by overall_score descending and best_option_index.
   */
  results: CompareResponse | null;

  /**
   * Error message when state is "error".
   * null when no error.
   */
  error: string | null;

  /**
   * Callback when user clicks Retry after an error.
   */
  onRetry: () => void;
}
```

### 14.2 Internal State

```typescript
// No internal state. Read-only display component.
```

### 14.3 Table Columns

```typescript
// Column definitions for the comparison table:
const columns = [
  { header: 'Dates',             accessor: (opt: TripOption) => `${dayjs(opt.start_date).format('MMM D')} – ${dayjs(opt.end_date).format('MMM D')}` },
  { header: 'Flight (per person)', accessor: (opt: TripOption) => `$${opt.flight_price.toFixed(2)}` },
  { header: 'Hotel',             accessor: (opt: TripOption) => opt.hotel_name },
  { header: 'Hotel (total)',     accessor: (opt: TripOption) => `$${opt.hotel_price.toFixed(2)}` },
  { header: 'Weather',           accessor: (opt: TripOption) => opt.weather.label },  // rendered as Chip
  { header: 'Total Cost',        accessor: (opt: TripOption) => `$${opt.total_trip_cost.toFixed(2)}` },
  { header: 'Per Person',        accessor: (opt: TripOption) => `$${opt.cost_per_person.toFixed(2)}` },
  { header: 'Score',             accessor: (opt: TripOption) => opt.overall_score.toFixed(1) },
  { header: 'Tags',              accessor: (opt: TripOption) => opt.tags },  // rendered as Chip[]
] as const;
```

### 14.4 Export

```typescript
export function ComparisonResultsTable(props: ComparisonResultsTableProps): JSX.Element;
```

---

## 15. Shared Utility Components

### 15.1 LoadingIndicator

**File**: `frontend/src/components/shared/LoadingIndicator.tsx`

```typescript
interface LoadingIndicatorProps {
  /**
   * Message displayed below the spinner.
   * e.g., "Loading destinations...", "Fetching flight prices..."
   */
  message: string;
}

export function LoadingIndicator(props: LoadingIndicatorProps): JSX.Element;
```

### 15.2 InlineError

**File**: `frontend/src/components/shared/InlineError.tsx`

```typescript
interface InlineErrorProps {
  /**
   * Human-readable error message to display.
   * Shown inside an MUI Alert with severity="error".
   */
  message: string;

  /**
   * Callback invoked when the user clicks the Retry button.
   * The Retry button is always shown — there is no auto-retry.
   */
  onRetry: () => void;
}

export function InlineError(props: InlineErrorProps): JSX.Element;
```

### 15.3 EmptyState

**File**: `frontend/src/components/shared/EmptyState.tsx`

```typescript
interface EmptyStateProps {
  /**
   * Primary message. e.g., "No hotels available".
   * Rendered as Typography variant="h6", color="text.secondary", centered.
   */
  title: string;

  /**
   * Optional secondary hint. e.g., "Try adjusting your dates or destination."
   * Rendered as Typography variant="body2", color="text.disabled", centered.
   * Only rendered when provided.
   */
  subtitle?: string;
}

export function EmptyState(props: EmptyStateProps): JSX.Element;
```

### 15.4 SectionContainer

**File**: `frontend/src/components/layout/SectionContainer.tsx`

```typescript
import type { SectionId } from '@/types/frontend';

interface SectionContainerProps {
  /**
   * Unique section identifier for the progressive reveal system.
   */
  sectionId: SectionId;

  /**
   * Whether this section is visible.
   * When false, the section is not rendered (returns null).
   * When transitioning from false to true, a 500ms fade-in animation is applied via MUI Fade.
   * See docs/frontend/frontend-spec-section-reveal-ux.md for full animation specs.
   */
  visible: boolean;

  /**
   * Section title displayed as Typography variant="h4".
   */
  title: string;

  /**
   * Optional section subtitle displayed as Typography variant="body1", color="text.secondary".
   */
  subtitle?: string;

  /**
   * Section content.
   */
  children: React.ReactNode;
}

export function SectionContainer(props: SectionContainerProps): JSX.Element | null;
```

---

## 16. Validation Rules Reference

Consolidated reference of all validation rules across all form components.

### 16.1 Field-Level Validation

| Field | Component | Rule | When Checked | Error Message | Display Location |
|-------|-----------|------|-------------|---------------|-----------------|
| Destination | DestinationAutocomplete | Min 3 chars for search | On input change | "Type at least 3 characters" | Autocomplete dropdown `noOptionsText` |
| Destination | DestinationAutocomplete | API call failed | On API error | "Failed to search destinations. Please try again." | TextField `helperText` (red) |
| Origin Airport | OriginAirportInput | Must be 3 uppercase alpha chars | On blur | "Enter a 3-letter IATA airport code" | TextField `helperText` (red) |
| Origin Airport | OriginAirportInput | Required for flight lookup | Before flight API call | "Origin airport is required" | TextField `helperText` (red) |
| Traveler Count | TravelerCountInput | Integer 1–100 | On change (guarded) | N/A (silently rejected) | N/A |
| Date Range | CalendarDateRangePicker | Future dates only | On day click | N/A (past dates greyed out and unclickable) | Visual grey styling |
| Date Range | CalendarDateRangePicker | End date after start date | On day click | N/A (auto-handled by click logic) | N/A |
| Hotel Selection | HotelSelectionCard | Exactly one hotel selected | Before Add to Queue | "Select a hotel first" | AddToQueueButton tooltip |

### 16.2 Cross-Field Validation (Enforced by Parent)

| Validation | When Checked | Result |
|------------|-------------|--------|
| Destination + Origin + Date range required before API calls | When date range is selected | Flight/hotel/weather calls fire only when all three are available. If origin is empty, flight call is skipped and shows error "Origin airport is required". |
| All three results (flight, hotel, weather) must be "success" AND hotel selected before Add to Queue | Continuously (AddToQueueButton disabled state) | Button disabled with appropriate tooltip |
| Queue not full (< 5 items) before Add to Queue | Continuously | Button disabled: "Comparison queue is full (max 5)" |
| No duplicate in queue before Add to Queue | Continuously (checked by `id` match) | Button disabled: "This date range is already in your queue" |
| Queue must have 2–5 items before Compare | Continuously (CompareButton disabled state) | Button disabled: "Add at least 2 date options to compare" |

### 16.3 Validation Priority for AddToQueueButton Tooltip

When multiple disable conditions are true, show the FIRST matching tooltip in this priority order:

1. `"Waiting for flight price..."` (flight state !== 'success')
2. `"Waiting for weather data..."` (weather state !== 'success')
3. `"Select a hotel first"` (hotels loaded but none selected)
4. `"Waiting for hotel data..."` (hotels state !== 'success')
5. `"This date range is already in your queue"` (duplicate check)
6. `"Comparison queue is full (max 5)"` (queue full)

---

## 17. Complete Import Map

### 17.1 Per-Component Imports

```typescript
// ── SearchSection.tsx ──
'use client';
import { Box, Paper, Typography, Grid2 } from '@mui/material';
import { DestinationAutocomplete } from './DestinationAutocomplete';
import { OriginAirportInput } from './OriginAirportInput';
import { TravelerCountInput } from './TravelerCountInput';
import type { DestinationResult } from '@/types/api';
import type { SearchParams } from '@/types/frontend';

// ── DestinationAutocomplete.tsx ──
'use client';
import { useState, useRef, useEffect } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { api } from '@/lib/api';
import type { DestinationResult } from '@/types/api';
import { MIN_SEARCH_QUERY_LENGTH, SEARCH_DEBOUNCE_MS } from '@/types/constants';

// ── OriginAirportInput.tsx ──
'use client';
import TextField from '@mui/material/TextField';

// ── TravelerCountInput.tsx ──
'use client';
import TextField from '@mui/material/TextField';

// ── CalendarDateRangePicker.tsx ──
'use client';
import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import dayjs from 'dayjs';
import type { CalendarDay } from '@/types/api';
import type { DateRange, LoadingState } from '@/types/frontend';
import { WEATHER_LABEL_COLORS } from '@/types/constants';
import { InlineError } from './shared/InlineError';

// ── HotelSelectionCard.tsx ──
'use client';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Rating from '@mui/material/Rating';
import Skeleton from '@mui/material/Skeleton';
import type { HotelOption } from '@/types/api';
import type { LoadingState } from '@/types/frontend';
import { InlineError } from './shared/InlineError';
import { EmptyState } from './shared/EmptyState';
import { CURRENCY_SYMBOL } from '@/types/constants';

// ── FlightPriceCard.tsx ──
'use client';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import type { FlightPrice } from '@/types/api';
import type { LoadingState } from '@/types/frontend';
import { InlineError } from './shared/InlineError';
import { CURRENCY_SYMBOL } from '@/types/constants';

// ── WeatherSummaryCard.tsx ──
'use client';
import { useState } from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Skeleton from '@mui/material/Skeleton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { WeatherSummary } from '@/types/api';
import type { LoadingState } from '@/types/frontend';
import { InlineError } from './shared/InlineError';

// ── DateOptionBuilderSection.tsx ──
'use client';
import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Grid2 from '@mui/material/Grid2';
import { FlightPriceCard } from './FlightPriceCard';
import { HotelSelectionCard } from './HotelSelectionCard';
import { WeatherSummaryCard } from './WeatherSummaryCard';
import { AddToQueueButton } from './AddToQueueButton';
import { SectionContainer } from './layout/SectionContainer';
import type { HotelOption, FlightPrice, WeatherSummary } from '@/types/api';
import type { DateRange, DateDetailResults, SelectedDestination } from '@/types/frontend';

// ── AddToQueueButton.tsx ──
'use client';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';

// ── ComparisonQueuePanel.tsx ──
'use client';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import type { ComparisonQueueItem } from '@/types/frontend';

// ── CompareButton.tsx ──
'use client';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';

// ── ComparisonResultsTable.tsx ──
'use client';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import dayjs from 'dayjs';
import type { CompareResponse, TripOption } from '@/types/api';
import type { LoadingState } from '@/types/frontend';
import { InlineError } from './shared/InlineError';
import { TAG_COLORS, TAG_LABELS, CURRENCY_SYMBOL } from '@/types/constants';

// ── shared/LoadingIndicator.tsx ──
'use client';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

// ── shared/InlineError.tsx ──
'use client';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

// ── shared/EmptyState.tsx ──
'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// ── layout/SectionContainer.tsx ──
'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { SectionId } from '@/types/frontend';
```

---

*End of Component Signatures Specification*
