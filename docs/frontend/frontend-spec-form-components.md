# WhenToGo Frontend Spec — Section 3: Form & Input Component Signatures

> **Audience**: Ralph Loop (autonomous implementation agent)
> **Scope**: Every form, input, and interactive component with full TypeScript signatures, props, callbacks, validation, and internal state.

---

## Table of Contents

1. [Component Inventory & File Map](#1-component-inventory--file-map)
2. [SearchSection (Orchestrating Container)](#2-searchsection-orchestrating-container)
3. [DestinationAutocomplete](#3-destinationautocomplete)
4. [OriginAirportInput](#4-originairportinput)
5. [TravelerCountInput](#5-travelercountinput)
6. [CalendarSection (Weather Calendar + Date Range Picker)](#6-calendarsection-weather-calendar--date-range-picker)
7. [DateOptionBuilderSection](#7-dateoptionbuildersection)
8. [FlightPriceCard](#8-flightpricecard)
9. [HotelSelectionList](#9-hotelselectionlist)
10. [WeatherSummaryCard](#10-weathersummarycard)
11. [AddToQueueButton](#11-addtoqueuebutton)
12. [ComparisonSection](#12-comparisonsection)
13. [ComparisonQueueList](#13-comparisonqueuelist)
14. [ComparisonResultsTable](#14-comparisonresultstable)
15. [Shared Sub-Components](#15-shared-sub-components)
16. [Validation Rules Summary](#16-validation-rules-summary)
17. [Component Dependency Graph](#17-component-dependency-graph)

---

## 1. Component Inventory & File Map

```
frontend/src/components/
├── SearchSection.tsx                  # Step 1: Destination + origin + travelers
├── DestinationAutocomplete.tsx        # Autocomplete city search input
├── OriginAirportInput.tsx             # IATA code text field
├── TravelerCountInput.tsx             # Numeric traveler count field
├── CalendarSection.tsx                # Step 2: Weather calendar + date range selection
├── DateOptionBuilderSection.tsx       # Step 3: Flight/hotel/weather results
├── FlightPriceCard.tsx                # Flight price display card
├── HotelSelectionList.tsx             # Hotel list with selection
├── WeatherSummaryCard.tsx             # Weather summary display card
├── AddToQueueButton.tsx               # "Add to Queue" action button
├── ComparisonSection.tsx              # Step 4: Queue + compare + results
├── ComparisonQueueList.tsx            # Queue item list with remove
├── ComparisonResultsTable.tsx         # Side-by-side comparison table
└── shared/
    ├── LoadingIndicator.tsx           # Spinner + message (defined in UI states spec)
    ├── InlineError.tsx                # Error alert + retry (defined in UI states spec)
    └── EmptyState.tsx                 # Empty state message (defined in UI states spec)
```

All components use `'use client'` directive. All import types from `@/types/api` and `@/types/frontend`.

---

## 2. SearchSection (Orchestrating Container)

**File**: `frontend/src/components/SearchSection.tsx`
**Directive**: `'use client'`
**Role**: Container that renders the hero title/subtitle and the three search input fields inside a Paper card. Does NOT manage its own state — receives state and callbacks from HomePage (page.tsx).

### 2.1 Props Interface

```typescript
// frontend/src/components/SearchSection.tsx

import type { SearchParams, SelectedDestination } from '@/types/frontend';
import type { DestinationResult } from '@/types/api';

/**
 * Props for SearchSection.
 *
 * SearchSection is a controlled component — all state is owned by the parent
 * (HomePage). SearchSection renders the hero title + search form card and
 * delegates to child input components.
 */
export interface SearchSectionProps {
  /**
   * Current search parameters state.
   * Contains destination (null if not yet selected), originAirport, and travelerCount.
   */
  searchParams: SearchParams;

  /**
   * Called when the user selects or clears a destination from the autocomplete.
   * @param destination - The selected DestinationResult, or null if cleared.
   *
   * Parent responsibility on receiving this callback:
   * - If destination is non-null: store as SelectedDestination, trigger calendar weather fetch.
   * - If destination is null: clear SelectedDestination, reset calendar/dateRange/dateDetails to idle.
   */
  onDestinationChange: (destination: DestinationResult | null) => void;

  /**
   * Called when the user changes the origin airport IATA code.
   * @param value - The current input value (always uppercase, 0-3 chars).
   *
   * Parent stores this as searchParams.originAirport.
   * Validation (must be exactly 3 uppercase letters) happens inside OriginAirportInput;
   * the parent just stores the raw value.
   */
  onOriginChange: (value: string) => void;

  /**
   * Called when the user changes the traveler count.
   * @param count - The new traveler count (integer, 1-100).
   *
   * Parent stores this as searchParams.travelerCount.
   */
  onTravelerCountChange: (count: number) => void;
}
```

### 2.2 Signature

```typescript
/**
 * SearchSection — Client Component.
 *
 * Renders:
 *   1. Hero title: "WhenToGo" (Typography h3, bold)
 *   2. Subtitle: "Find the best dates for your next trip" (Typography h6, text.secondary)
 *   3. Paper card containing a Grid2 row with three inputs:
 *      - DestinationAutocomplete (5/12 on md+)
 *      - OriginAirportInput (4/12 on md+)
 *      - TravelerCountInput (3/12 on md+)
 *
 * This component has NO internal state. All values and callbacks are passed through props.
 */
export default function SearchSection(props: SearchSectionProps): JSX.Element;
```

### 2.3 Internal Logic

- Extracts `destination`, `originAirport`, and `travelerCount` from `searchParams`.
- Passes them to child components as controlled values.
- No local state, no side effects, no API calls.

### 2.4 Render Structure

```tsx
<Box sx={{ mb: 6, pt: 4 }}>
  {/* Hero */}
  <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
    WhenToGo
  </Typography>
  <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
    Find the best dates for your next trip
  </Typography>

  {/* Search card */}
  <Paper elevation={2} sx={{ p: 4 }}>
    <Grid2 container spacing={3}>
      <Grid2 size={{ xs: 12, md: 5 }}>
        <DestinationAutocomplete
          value={searchParams.destination ? /* convert to DestinationResult */ : null}
          onChange={onDestinationChange}
        />
      </Grid2>
      <Grid2 size={{ xs: 12, md: 4 }}>
        <OriginAirportInput
          value={searchParams.originAirport}
          onChange={onOriginChange}
        />
      </Grid2>
      <Grid2 size={{ xs: 12, md: 3 }}>
        <TravelerCountInput
          value={searchParams.travelerCount}
          onChange={onTravelerCountChange}
        />
      </Grid2>
    </Grid2>
  </Paper>
</Box>
```

### 2.5 Import Map

```typescript
import { Box, Paper, Typography, Grid2 } from '@mui/material';
import DestinationAutocomplete from './DestinationAutocomplete';
import OriginAirportInput from './OriginAirportInput';
import TravelerCountInput from './TravelerCountInput';
import type { SearchSectionProps } from './SearchSection'; // self
import type { DestinationResult } from '@/types/api';
```

---

## 3. DestinationAutocomplete

**File**: `frontend/src/components/DestinationAutocomplete.tsx`
**Directive**: `'use client'`
**Role**: Autocomplete search input for city destinations. Calls GET /api/v1/search/destinations with debounce. Manages its own internal state (options, loading, input text, error) but the selected value is controlled by the parent.

### 3.1 Props Interface

```typescript
// frontend/src/components/DestinationAutocomplete.tsx

import type { DestinationResult } from '@/types/api';

/**
 * Props for DestinationAutocomplete.
 *
 * This is a controlled component for the SELECTED value only.
 * Internal state (options list, loading indicator, input text, error) is managed internally.
 */
export interface DestinationAutocompleteProps {
  /**
   * The currently selected destination, or null if nothing is selected.
   * Controlled by the parent. When the parent resets this to null,
   * the autocomplete clears its display value.
   */
  value: DestinationResult | null;

  /**
   * Called when the user selects a destination from the dropdown or clears the selection.
   * @param destination - The selected DestinationResult object, or null if the user
   *   clicked the clear (X) button or cleared the input.
   */
  onChange: (destination: DestinationResult | null) => void;

  /**
   * External error message to display below the input.
   * If provided, renders in red as helperText.
   * Typically not used (errors are managed internally), but available
   * for parent-level validation messages if needed.
   * @default undefined
   */
  error?: string;
}
```

### 3.2 Signature

```typescript
/**
 * DestinationAutocomplete — Client Component.
 *
 * MUI Autocomplete + TextField for searching destinations.
 *
 * Internal behavior:
 *   - Debounces input by 300ms before calling API
 *   - Requires minimum 3 characters to trigger search
 *   - Cancels in-flight requests when input changes (via AbortController)
 *   - Shows CircularProgress in input while loading
 *   - Shows contextual noOptionsText based on character count
 *   - Displays API errors as red helperText below the input
 *   - Renders each option with city name, country, and optional IATA code
 *
 * The selected value (DestinationResult | null) is controlled by the parent via props.
 * All other state (options, loading, inputValue, internal error) is local.
 */
export default function DestinationAutocomplete(
  props: DestinationAutocompleteProps
): JSX.Element;
```

### 3.3 Internal State

```typescript
// Local state — NOT exposed to parent
const [inputValue, setInputValue] = useState<string>('');
const [options, setOptions] = useState<DestinationResult[]>([]);
const [isLoading, setIsLoading] = useState<boolean>(false);
const [internalError, setInternalError] = useState<string | undefined>(undefined);
const debounceRef = useRef<ReturnType<typeof setTimeout>>();
const abortControllerRef = useRef<AbortController | null>(null);
```

### 3.4 Internal Callbacks

```typescript
/**
 * Handles raw input text changes from the Autocomplete.
 * Debounces by 300ms, then calls fetchDestinations.
 * Clears options if input < 3 chars.
 *
 * Only fires for reason === 'input' (not 'reset' or 'clear').
 */
const handleInputChange = (input: string): void => {
  setInputValue(input);
  setInternalError(undefined);
  if (debounceRef.current) clearTimeout(debounceRef.current);
  if (input.length < 3) {
    setOptions([]);
    return;
  }
  debounceRef.current = setTimeout(() => {
    fetchDestinations(input);
  }, 300); // SEARCH_DEBOUNCE_MS
};

/**
 * Fetches destinations from the API.
 * Cancels any in-flight request via AbortController.
 * On success: sets options. On error: sets internalError string.
 */
const fetchDestinations = async (query: string): Promise<void> => {
  if (abortControllerRef.current) abortControllerRef.current.abort();
  abortControllerRef.current = new AbortController();

  setIsLoading(true);
  setInternalError(undefined);
  try {
    const response = await api.get<DestinationResult[]>(
      '/api/v1/search/destinations',
      {
        params: { q: query },
        signal: abortControllerRef.current.signal,
      }
    );
    setOptions(response.data);
  } catch (err) {
    if (err instanceof Error && err.name === 'CanceledError') return; // ignore aborts
    setInternalError('Failed to search destinations. Please try again.');
    setOptions([]);
  } finally {
    setIsLoading(false);
  }
};
```

### 3.5 Cleanup

```typescript
useEffect(() => {
  return () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
  };
}, []);
```

### 3.6 Render Structure

```tsx
<Autocomplete<DestinationResult, false, false, false>
  fullWidth
  options={options}
  getOptionLabel={(option) => `${option.name}, ${option.country}`}
  isOptionEqualToValue={(option, val) =>
    option.name === val.name && option.country === val.country
  }
  filterOptions={(x) => x} // disable client-side filtering — server-side only
  loading={isLoading}
  value={value}
  inputValue={inputValue}
  onChange={(_event, newValue) => onChange(newValue)}
  onInputChange={(_event, newInput, reason) => {
    if (reason === 'input') handleInputChange(newInput);
    if (reason === 'clear') {
      setInputValue('');
      setOptions([]);
      onChange(null);
    }
  }}
  noOptionsText={
    inputValue.length < 3
      ? 'Type at least 3 characters'
      : 'No destinations found'
  }
  renderInput={(params) => (
    <TextField
      {...params}
      label="Destination"
      placeholder="e.g. Tokyo, Paris, New York"
      error={!!(error || internalError)}
      helperText={error || internalError || ' '}
      slotProps={{
        input: {
          ...params.InputProps,
          endAdornment: (
            <>
              {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
              {params.InputProps.endAdornment}
            </>
          ),
        },
      }}
    />
  )}
  renderOption={(props, option) => (
    <li {...props} key={`${option.name}-${option.iata_code ?? option.country}`}>
      <Box>
        <Typography variant="body1">
          {option.name}, {option.country}
        </Typography>
        {option.iata_code && (
          <Typography variant="caption" color="text.secondary">
            Airport: {option.iata_code}
          </Typography>
        )}
      </Box>
    </li>
  )}
/>
```

### 3.7 Validation Rules

| Rule | When Checked | Behavior |
|------|-------------|----------|
| Minimum 3 characters to search | On every keystroke | If < 3 chars: clear options, don't call API, show "Type at least 3 characters" in dropdown |
| API error | After failed API call | Show red helperText: "Failed to search destinations. Please try again." |
| External error prop | On render | Show red helperText from parent if provided (overrides internal error display) |
| No validation on the selected value itself | N/A | Once a DestinationResult is selected, it is assumed valid (comes from the API) |

### 3.8 Accessibility

- MUI Autocomplete provides `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"` automatically.
- `helperText` is linked via `aria-describedby` (MUI default).
- `error` prop sets `aria-invalid="true"`.
- Each option is a `<li>` with a unique `key`.

### 3.9 Import Map

```typescript
import { useState, useRef, useEffect } from 'react';
import { Autocomplete, TextField, CircularProgress, Box, Typography } from '@mui/material';
import { api } from '@/lib/api';
import type { DestinationResult } from '@/types/api';
```

---

## 4. OriginAirportInput

**File**: `frontend/src/components/OriginAirportInput.tsx`
**Directive**: `'use client'`
**Role**: Simple text field for entering a 3-letter IATA airport code. Fully controlled. Validates on blur.

### 4.1 Props Interface

```typescript
// frontend/src/components/OriginAirportInput.tsx

/**
 * Props for OriginAirportInput.
 *
 * A controlled text input for IATA airport codes.
 * Validates on blur that the value is exactly 3 uppercase alphabetic characters.
 */
export interface OriginAirportInputProps {
  /**
   * Current input value. Always uppercase (component forces uppercase on change).
   * Can be 0-3 characters. Empty string is the initial/cleared state.
   */
  value: string;

  /**
   * Called on every keystroke with the uppercased input value.
   * @param value - The new input value, automatically uppercased, max 3 chars.
   */
  onChange: (value: string) => void;

  /**
   * External error message to display.
   * If provided and non-empty, renders as red helperText.
   * Typically set by the parent when form-level validation detects an issue.
   * @default undefined
   */
  error?: string;
}
```

### 4.2 Signature

```typescript
/**
 * OriginAirportInput — Client Component.
 *
 * A controlled MUI TextField for entering a 3-letter IATA airport code.
 *
 * Behavior:
 *   - Forces input to uppercase on every change
 *   - Limits input to 3 characters via HTML maxLength
 *   - Validates on blur: must match /^[A-Z]{3}$/ when non-empty
 *   - Shows validation error as red helperText
 *   - No API calls — purely a text input
 *   - Always renders helperText (' ' when no error) to prevent layout shift
 */
export default function OriginAirportInput(
  props: OriginAirportInputProps
): JSX.Element;
```

### 4.3 Internal State

```typescript
// Only local state is the blur-triggered validation error
const [validationError, setValidationError] = useState<string | undefined>(undefined);
```

### 4.4 Internal Callbacks

```typescript
/**
 * Handles input change. Uppercases the value and limits to 3 chars.
 * Clears any existing validation error on change (re-validates on blur).
 */
const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
  const raw = e.target.value.toUpperCase().slice(0, 3);
  setValidationError(undefined);
  onChange(raw);
};

/**
 * Validates on blur. If value is non-empty and doesn't match /^[A-Z]{3}$/,
 * sets validation error.
 */
const handleBlur = (): void => {
  if (value.length > 0 && !/^[A-Z]{3}$/.test(value)) {
    setValidationError('Enter a 3-letter IATA airport code');
  }
};
```

### 4.5 Render Structure

```tsx
<TextField
  fullWidth
  label="Origin Airport (IATA)"
  placeholder="e.g. ICN, LAX, JFK"
  value={value}
  onChange={handleChange}
  onBlur={handleBlur}
  error={!!(error || validationError)}
  helperText={error || validationError || ' '}
  slotProps={{
    htmlInput: {
      maxLength: 3,
      style: { textTransform: 'uppercase' },
      'aria-label': 'Origin airport IATA code',
    },
  }}
/>
```

### 4.6 Validation Rules

| Rule | When Checked | Error Message | Behavior |
|------|-------------|---------------|----------|
| Must be exactly 3 uppercase letters (`/^[A-Z]{3}$/`) | On blur (only if value is non-empty) | "Enter a 3-letter IATA airport code" | Red helperText; error clears on next keystroke |
| Max 3 characters | On every keystroke | N/A (silently truncated via `slice(0, 3)`) | HTML `maxLength=3` also enforced |
| Auto-uppercase | On every keystroke | N/A | `toUpperCase()` applied before calling `onChange` |
| Empty is allowed | N/A | No error when empty | The parent form decides if origin is required for downstream API calls |

### 4.7 Import Map

```typescript
import { useState } from 'react';
import { TextField } from '@mui/material';
```

---

## 5. TravelerCountInput

**File**: `frontend/src/components/TravelerCountInput.tsx`
**Directive**: `'use client'`
**Role**: Numeric input for traveler count (1-100). Shows calculated room count in helperText.

### 5.1 Props Interface

```typescript
// frontend/src/components/TravelerCountInput.tsx

/**
 * Props for TravelerCountInput.
 *
 * A controlled numeric input for the number of travelers.
 * Always shows a helper text with the computed number of hotel rooms needed.
 */
export interface TravelerCountInputProps {
  /**
   * Current traveler count. Must be an integer, 1-100.
   * Default initial value (set by parent): 1.
   */
  value: number;

  /**
   * Called when the user changes the traveler count.
   * @param count - The new count. Only called with valid integers in range [1, 100].
   *   Invalid values (NaN, < 1, > 100, decimals) are silently rejected — onChange is NOT called.
   */
  onChange: (count: number) => void;
}
```

### 5.2 Signature

```typescript
/**
 * TravelerCountInput — Client Component.
 *
 * A controlled MUI TextField (type="number") for traveler count.
 *
 * Behavior:
 *   - Allows integer values from 1 to 100
 *   - HTML min/max/step attributes enforce range in browser
 *   - Invalid values (NaN, out of range, decimals) are silently rejected
 *   - helperText always shows room calculation: "X room(s) needed"
 *   - Room formula: Math.ceil(value / 2)
 *   - No error state — value is always constrained to valid range
 */
export default function TravelerCountInput(
  props: TravelerCountInputProps
): JSX.Element;
```

### 5.3 Internal State

None — fully controlled, no local state.

### 5.4 Internal Callbacks

```typescript
/**
 * Handles input change. Parses to integer, validates range, calls onChange.
 * If parsing fails or value is out of range, the event is ignored (onChange not called).
 */
const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
  const num = parseInt(e.target.value, 10);
  if (!isNaN(num) && num >= 1 && num <= 100) {
    onChange(num);
  }
};
```

### 5.5 Render Structure

```tsx
<TextField
  fullWidth
  label="Travelers"
  type="number"
  value={value}
  onChange={handleChange}
  slotProps={{
    htmlInput: {
      min: 1,
      max: 100,
      step: 1,
      'aria-label': 'Number of travelers',
    },
  }}
  helperText={`${Math.ceil(value / 2)} room${Math.ceil(value / 2) !== 1 ? 's' : ''} needed`}
/>
```

### 5.6 Validation Rules

| Rule | When Checked | Behavior |
|------|-------------|----------|
| Minimum: 1 | On every change | Values < 1 ignored; `onChange` not called |
| Maximum: 100 | On every change | Values > 100 ignored; `onChange` not called |
| Integer only | On every change | `parseInt` strips decimals; NaN ignored |
| HTML constraints | Browser level | `min=1`, `max=100`, `step=1` on `<input>` |

### 5.7 Import Map

```typescript
import { TextField } from '@mui/material';
```

---

## 6. CalendarSection (Weather Calendar + Date Range Picker)

**File**: `frontend/src/components/CalendarSection.tsx`
**Directive**: `'use client'`
**Role**: Renders a 2-month calendar grid with weather overlay data and allows the user to select a start and end date (date range). This component manages the calendar display and date selection interaction.

### 6.1 Props Interface

```typescript
// frontend/src/components/CalendarSection.tsx

import type { SelectedDestination, CalendarWeatherState, DateRange } from '@/types/frontend';
import type { CalendarDay } from '@/types/api';

/**
 * Props for CalendarSection.
 *
 * Renders a 2-month calendar grid with weather overlay and date range selection.
 * The calendar weather data is loaded by the parent and passed in.
 * Date selection state is also controlled by the parent.
 */
export interface CalendarSectionProps {
  /**
   * The selected destination. Used for display and for re-fetching calendar data.
   * Always non-null when this component is visible (parent gates visibility).
   */
  destination: SelectedDestination;

  /**
   * Calendar weather overlay state from POST /api/v1/calendar.
   * Contains loading state, CalendarDay[] data, or error.
   * - state: 'idle' | 'loading' | 'success' | 'error'
   * - data: CalendarDay[] | null
   * - error: string | null
   */
  calendarWeather: CalendarWeatherState;

  /**
   * The currently selected date range, or null if no range is selected.
   * - null: no dates selected (initial state)
   * - { startDate, endDate }: both dates selected
   */
  selectedRange: DateRange | null;

  /**
   * Called when the user completes a date range selection.
   * @param range - The selected date range with startDate and endDate in "YYYY-MM-DD" format.
   *   Both dates are inclusive.
   *
   * Date range selection interaction:
   *   1. User clicks a day → that day becomes startDate (endDate is null, selection in progress)
   *   2. User clicks a second day → that day becomes endDate
   *   3. If second click is before first click, swap them (start is always <= end)
   *   4. onRangeSelect is called only when BOTH dates are set (step 2/3)
   *   5. Clicking a third time starts a new selection (resets to step 1)
   */
  onRangeSelect: (range: DateRange) => void;

  /**
   * Called when the user clicks Retry after a calendar weather fetch error.
   * Parent will re-trigger the POST /api/v1/calendar request.
   */
  onRetry: () => void;
}
```

### 6.2 Signature

```typescript
/**
 * CalendarSection — Client Component.
 *
 * Renders a 2-month calendar grid with:
 *   - Month navigation (previous/next month buttons)
 *   - Day cells with weather overlay (color-coded backgrounds, temp range, rain indicator)
 *   - Click-to-select date range interaction
 *   - Visual highlight for selected range
 *   - Loading skeleton state
 *   - Error state with retry
 *   - Empty state (no weather data — calendar still functional for date selection)
 *
 * Calendar display:
 *   - Shows 2 months side by side (left: current month, right: next month)
 *   - Each month has a 7-column grid (Sun-Sat) with day cells
 *   - Navigation buttons allow shifting the displayed months forward/backward
 *   - Initial months: current month and next month (based on today's date)
 *   - Only future dates are selectable (past dates are visually dimmed and non-clickable)
 *
 * Internal state:
 *   - displayStartMonth: dayjs Dayjs — the first day of the left-side month
 *   - selectionStart: string | null — the first date clicked (before second click)
 *   - hoverDate: string | null — date currently hovered (for range preview highlight)
 */
export default function CalendarSection(props: CalendarSectionProps): JSX.Element;
```

### 6.3 Internal State

```typescript
/**
 * The first day of the left-side displayed month.
 * Right-side month is always displayStartMonth + 1 month.
 * Initialized to the 1st of the current month.
 */
const [displayStartMonth, setDisplayStartMonth] = useState<Dayjs>(
  dayjs().startOf('month')
);

/**
 * First date clicked during range selection (before second click completes the range).
 * null when no selection is in progress.
 * Stored as "YYYY-MM-DD" string.
 */
const [selectionStart, setSelectionStart] = useState<string | null>(null);

/**
 * Date currently being hovered. Used to show a preview highlight
 * of the range between selectionStart and hoverDate.
 * null when mouse is not over a date cell or no selectionStart is set.
 */
const [hoverDate, setHoverDate] = useState<string | null>(null);
```

### 6.4 Internal Callbacks

```typescript
/**
 * Handles clicking a day cell on the calendar.
 * Implements the two-click date range selection pattern:
 *   - First click: sets selectionStart
 *   - Second click: determines endDate, calls onRangeSelect, resets selectionStart
 *   - If second click is before first click, dates are swapped
 */
const handleDayClick = (dateStr: string): void => {
  // Only allow future dates
  if (dayjs(dateStr).isBefore(dayjs(), 'day')) return;

  if (selectionStart === null) {
    // First click — start new selection
    setSelectionStart(dateStr);
  } else {
    // Second click — complete selection
    const start = dayjs(selectionStart);
    const end = dayjs(dateStr);
    const range: DateRange = start.isBefore(end)
      ? { startDate: selectionStart, endDate: dateStr }
      : { startDate: dateStr, endDate: selectionStart };
    onRangeSelect(range);
    setSelectionStart(null);
    setHoverDate(null);
  }
};

/**
 * Handles mouse hover over a day cell.
 * Sets hoverDate for range preview highlight (only when selectionStart is set).
 */
const handleDayHover = (dateStr: string): void => {
  if (selectionStart !== null) {
    setHoverDate(dateStr);
  }
};

/**
 * Navigates the calendar display backward by 1 month.
 */
const handlePreviousMonth = (): void => {
  setDisplayStartMonth((prev) => prev.subtract(1, 'month'));
};

/**
 * Navigates the calendar display forward by 1 month.
 */
const handleNextMonth = (): void => {
  setDisplayStartMonth((prev) => prev.add(1, 'month'));
};
```

### 6.5 Helper Functions

```typescript
/**
 * Looks up weather data for a specific date from the calendarWeather data.
 * @returns CalendarDay data for the date, or null if not found.
 */
const getWeatherForDate = (dateStr: string): CalendarDay | null => {
  if (!calendarWeather.data) return null;
  return calendarWeather.data.find((d) => d.date === dateStr) ?? null;
};

/**
 * Determines if a date is within the currently selected or previewed range.
 * Used for visual highlighting.
 */
const isInRange = (dateStr: string): boolean => {
  // If a completed range exists (from parent), use that
  if (selectedRange) {
    return dateStr >= selectedRange.startDate && dateStr <= selectedRange.endDate;
  }
  // If selection is in progress (first click made, hovering), show preview
  if (selectionStart && hoverDate) {
    const min = selectionStart < hoverDate ? selectionStart : hoverDate;
    const max = selectionStart < hoverDate ? hoverDate : selectionStart;
    return dateStr >= min && dateStr <= max;
  }
  return false;
};

/**
 * Determines if a date is the start or end of the current selection.
 * Used for stronger visual emphasis on endpoints.
 */
const isRangeEndpoint = (dateStr: string): boolean => {
  if (selectedRange) {
    return dateStr === selectedRange.startDate || dateStr === selectedRange.endDate;
  }
  return dateStr === selectionStart;
};
```

### 6.6 Render Structure (Success State)

```tsx
<Box>
  {/* Month navigation */}
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
    <IconButton onClick={handlePreviousMonth} aria-label="Previous month">
      <ChevronLeftIcon />
    </IconButton>
    <Typography variant="h6">
      {displayStartMonth.format('MMMM YYYY')} — {displayStartMonth.add(1, 'month').format('MMMM YYYY')}
    </Typography>
    <IconButton onClick={handleNextMonth} aria-label="Next month">
      <ChevronRightIcon />
    </IconButton>
  </Box>

  {/* Two-month grid */}
  <Grid2 container spacing={3}>
    {/* Left month */}
    <Grid2 size={{ xs: 12, md: 6 }}>
      <CalendarMonthGrid
        month={displayStartMonth}
        weatherData={calendarWeather.data}
        onDayClick={handleDayClick}
        onDayHover={handleDayHover}
        isInRange={isInRange}
        isRangeEndpoint={isRangeEndpoint}
      />
    </Grid2>
    {/* Right month */}
    <Grid2 size={{ xs: 12, md: 6 }}>
      <CalendarMonthGrid
        month={displayStartMonth.add(1, 'month')}
        weatherData={calendarWeather.data}
        onDayClick={handleDayClick}
        onDayHover={handleDayHover}
        isInRange={isInRange}
        isRangeEndpoint={isRangeEndpoint}
      />
    </Grid2>
  </Grid2>

  {/* Selection hint */}
  {selectionStart && !selectedRange && (
    <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
      Click another date to complete your selection
    </Typography>
  )}
  {selectedRange && (
    <Typography variant="body2" color="primary" sx={{ mt: 2, textAlign: 'center' }}>
      Selected: {dayjs(selectedRange.startDate).format('MMM D')} – {dayjs(selectedRange.endDate).format('MMM D, YYYY')}
    </Typography>
  )}
</Box>
```

### 6.7 CalendarMonthGrid (Private Sub-Component)

This is a private sub-component rendered inside `CalendarSection.tsx` (not exported separately). It renders a single month's grid of day cells.

```typescript
/**
 * Private sub-component: Renders a single month's calendar grid.
 * NOT exported — defined within CalendarSection.tsx.
 */
interface CalendarMonthGridProps {
  /** The month to render (dayjs object pointing to 1st of month) */
  month: Dayjs;
  /** Calendar weather data array, or null */
  weatherData: CalendarDay[] | null;
  /** Click handler for a day cell */
  onDayClick: (dateStr: string) => void;
  /** Hover handler for a day cell */
  onDayHover: (dateStr: string) => void;
  /** Returns true if the date is in the selected/preview range */
  isInRange: (dateStr: string) => boolean;
  /** Returns true if the date is a range start or end */
  isRangeEndpoint: (dateStr: string) => boolean;
}
```

#### Day Cell Rendering

Each day cell renders as a `Box` with:
- Date number (Typography variant `body2`)
- Weather color-coded background if weather data exists for that date:
  - Great: `#e8f5e9` (green-50)
  - Good: `#e3f2fd` (blue-50)
  - Fair: `#fff8e1` (amber-50)
  - Poor: `#ffebee` (red-50)
  - No data: no background color
- Temperature range if available: `"{temp_high}° / {temp_low}°"` (Typography variant `caption`)
- Rain dot indicator if `rain_mm > 0`: small blue dot (Box with `width: 6, height: 6, borderRadius: '50%'`)
- Range highlight: `backgroundColor: 'primary.light'` with `opacity: 0.3` when `isInRange` returns true
- Endpoint highlight: `backgroundColor: 'primary.main'`, `color: 'primary.contrastText'` when `isRangeEndpoint` returns true
- Past dates: `opacity: 0.4`, `pointerEvents: 'none'`
- Cursor: `cursor: 'pointer'` for selectable dates

### 6.8 Loading State Render

```tsx
{calendarWeather.state === 'loading' && (
  <Grid2 container spacing={3}>
    {[0, 1].map((monthIdx) => (
      <Grid2 key={monthIdx} size={{ xs: 12, md: 6 }}>
        <Skeleton variant="text" width="50%" sx={{ mb: 1 }} />
        {/* 6 rows of 7 day skeletons */}
        {Array.from({ length: 6 }).map((_, row) => (
          <Box key={row} sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
            {Array.from({ length: 7 }).map((_, col) => (
              <Skeleton key={col} variant="rectangular" width="14%" height={48} />
            ))}
          </Box>
        ))}
      </Grid2>
    ))}
  </Grid2>
)}
```

### 6.9 Error State Render

```tsx
{calendarWeather.state === 'error' && (
  <InlineError
    message={calendarWeather.error ?? 'Failed to load calendar data.'}
    onRetry={onRetry}
  />
)}
```

### 6.10 Validation Rules

| Rule | Enforcement | Behavior |
|------|------------|----------|
| Only future dates selectable | `handleDayClick` checks `dayjs(dateStr).isBefore(dayjs(), 'day')` | Past dates: click ignored, visually dimmed |
| Start date <= end date | `handleDayClick` swaps if needed | Automatic swap on second click |
| Both dates required | Parent only receives `DateRange` when both are set | `onRangeSelect` only called on second click |

### 6.11 Import Map

```typescript
import { useState } from 'react';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { Box, Grid2, Typography, IconButton, Skeleton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InlineError from './shared/InlineError';
import type { CalendarDay } from '@/types/api';
import type { SelectedDestination, CalendarWeatherState, DateRange } from '@/types/frontend';
import { WEATHER_LABEL_COLORS } from '@/types/constants';
```

---

## 7. DateOptionBuilderSection

**File**: `frontend/src/components/DateOptionBuilderSection.tsx`
**Directive**: `'use client'`
**Role**: Renders the flight price card, hotel selection list, and weather summary card for a selected date range. Also contains the "Add to Queue" button. This is the third progressive section.

### 7.1 Props Interface

```typescript
// frontend/src/components/DateOptionBuilderSection.tsx

import type { SearchParams, DateRange, DateDetailResults } from '@/types/frontend';
import type { HotelOption } from '@/types/api';

/**
 * Props for DateOptionBuilderSection.
 *
 * Displays flight, hotel, and weather results for the selected date range.
 * Allows hotel selection and adding the completed option to the comparison queue.
 *
 * All three data fetches (flight, hotel, weather) run concurrently and each
 * has independent loading/error/success states.
 */
export interface DateOptionBuilderSectionProps {
  /**
   * Current search parameters (destination, origin, traveler count).
   * Used to display context and for constructing the queue item.
   */
  searchParams: SearchParams;

  /**
   * The selected date range. Always non-null when this section is visible.
   */
  dateRange: DateRange;

  /**
   * Results from the three parallel API calls.
   * Each has independent state: { state: LoadingState, data: T | null, error: string | null }.
   *   - flight: FlightPrice result
   *   - hotels: HotelOption[] result
   *   - weather: WeatherSummary result
   */
  results: DateDetailResults;

  /**
   * Called when the user clicks Retry on the flight price error.
   * Parent re-triggers POST /api/v1/flights/price.
   */
  onRetryFlight: () => void;

  /**
   * Called when the user clicks Retry on the hotel search error.
   * Parent re-triggers POST /api/v1/hotels/search.
   */
  onRetryHotels: () => void;

  /**
   * Called when the user clicks Retry on the weather error.
   * Parent re-triggers POST /api/v1/weather.
   */
  onRetryWeather: () => void;

  /**
   * Called when the user clicks "Add to Queue" with a valid, complete option.
   * @param selectedHotel - The hotel the user selected from the list.
   *
   * Parent responsibility:
   *   1. Construct a ComparisonQueueItem from searchParams, dateRange, flight, selectedHotel, weather
   *   2. Call addItem() on ComparisonQueueContext
   *   3. Handle duplicate/full-queue rejections
   */
  onAddToQueue: (selectedHotel: HotelOption) => void;
}
```

### 7.2 Signature

```typescript
/**
 * DateOptionBuilderSection — Client Component.
 *
 * Renders three data cards in a row (flight, hotels, weather) and the Add to Queue button.
 * Manages hotel selection state internally (which hotel the user has selected).
 *
 * Layout:
 *   - Grid2 row with 3 columns (each size={{ xs: 12, md: 4 }})
 *     - FlightPriceCard
 *     - HotelSelectionList
 *     - WeatherSummaryCard
 *   - Below: AddToQueueButton (full width)
 *
 * Internal state:
 *   - selectedHotelId: string | null — the hotel_id of the currently selected hotel
 *   - Auto-selects first hotel when hotel results arrive (cheapest)
 *   - Resets to null when hotel results change (re-fetch)
 */
export default function DateOptionBuilderSection(
  props: DateOptionBuilderSectionProps
): JSX.Element;
```

### 7.3 Internal State

```typescript
/**
 * The hotel_id of the currently selected hotel from the hotel list.
 * null if no hotel is selected (loading, error, or empty hotels state).
 * Auto-set to hotels[0].hotel_id when hotel results arrive.
 */
const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
```

### 7.4 Internal Effects

```typescript
/**
 * Auto-select first hotel when hotel results arrive or change.
 * Reset selection when hotels transition to non-success state.
 */
useEffect(() => {
  if (results.hotels.state === 'success' && results.hotels.data && results.hotels.data.length > 0) {
    setSelectedHotelId(results.hotels.data[0].hotel_id);
  } else {
    setSelectedHotelId(null);
  }
}, [results.hotels.state, results.hotels.data]);
```

### 7.5 Derived Values

```typescript
/**
 * The full HotelOption object for the currently selected hotel.
 * null if no hotel is selected or hotel data is not available.
 */
const selectedHotel: HotelOption | null =
  results.hotels.data?.find((h) => h.hotel_id === selectedHotelId) ?? null;

/**
 * Whether the Add to Queue button should be enabled.
 * Requires: flight success + hotel selected + weather success + queue not full + not a duplicate.
 */
const canAddToQueue: boolean =
  results.flight.state === 'success' &&
  results.flight.data !== null &&
  selectedHotel !== null &&
  results.weather.state === 'success' &&
  results.weather.data !== null;
```

### 7.6 Render Structure

```tsx
<Box>
  {/* Three data cards in a row */}
  <Grid2 container spacing={3}>
    <Grid2 size={{ xs: 12, md: 4 }}>
      <FlightPriceCard
        state={results.flight.state}
        data={results.flight.data}
        error={results.flight.error}
        onRetry={onRetryFlight}
      />
    </Grid2>
    <Grid2 size={{ xs: 12, md: 4 }}>
      <HotelSelectionList
        state={results.hotels.state}
        data={results.hotels.data}
        error={results.hotels.error}
        selectedHotelId={selectedHotelId}
        onSelectHotel={setSelectedHotelId}
        onRetry={onRetryHotels}
      />
    </Grid2>
    <Grid2 size={{ xs: 12, md: 4 }}>
      <WeatherSummaryCard
        state={results.weather.state}
        data={results.weather.data}
        error={results.weather.error}
        onRetry={onRetryWeather}
      />
    </Grid2>
  </Grid2>

  {/* Add to Queue button */}
  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
    <AddToQueueButton
      enabled={canAddToQueue}
      queueIsFull={/* from context */}
      isDuplicate={/* check against queue */}
      onClick={() => {
        if (selectedHotel) onAddToQueue(selectedHotel);
      }}
    />
  </Box>
</Box>
```

### 7.7 Import Map

```typescript
import { useState, useEffect } from 'react';
import { Box, Grid2 } from '@mui/material';
import FlightPriceCard from './FlightPriceCard';
import HotelSelectionList from './HotelSelectionList';
import WeatherSummaryCard from './WeatherSummaryCard';
import AddToQueueButton from './AddToQueueButton';
import { useComparisonQueue } from '@/context/ComparisonQueueContext';
import type { HotelOption } from '@/types/api';
import type { SearchParams, DateRange, DateDetailResults } from '@/types/frontend';
```

---

## 8. FlightPriceCard

**File**: `frontend/src/components/FlightPriceCard.tsx`
**Directive**: `'use client'`
**Role**: Displays flight price data in a Card, with loading/error/success states.

### 8.1 Props Interface

```typescript
// frontend/src/components/FlightPriceCard.tsx

import type { LoadingState } from '@/types/frontend';
import type { FlightPrice } from '@/types/api';

/**
 * Props for FlightPriceCard.
 *
 * Displays the flight price for the selected route and dates.
 * Handles loading, error, and success states.
 */
export interface FlightPriceCardProps {
  /** Current loading state: 'idle' | 'loading' | 'success' | 'error' */
  state: LoadingState;

  /** Flight price data from POST /api/v1/flights/price. null unless state is 'success'. */
  data: FlightPrice | null;

  /** Error message string. Non-null when state is 'error'. */
  error: string | null;

  /** Called when the user clicks Retry in the error state. */
  onRetry: () => void;
}
```

### 8.2 Signature

```typescript
/**
 * FlightPriceCard — Client Component.
 *
 * Renders a MUI Card with heading "Flight Price" and one of:
 *   - loading: Skeleton placeholders
 *   - error: InlineError with retry
 *   - success: Price, route, and dates
 *   - idle: nothing (shouldn't be visible)
 *
 * Success display:
 *   - "$342.50 USD" in Typography h4 (bold)
 *   - "ICN → NRT" in Typography body2 (text.secondary)
 *   - "May 1 – May 5, 2026" in Typography body2
 *   - "per person, round-trip" in Typography caption (text.secondary)
 */
export default function FlightPriceCard(props: FlightPriceCardProps): JSX.Element;
```

### 8.3 Import Map

```typescript
import { Card, CardContent, Typography, Skeleton } from '@mui/material';
import InlineError from './shared/InlineError';
import dayjs from 'dayjs';
import { CURRENCY_SYMBOL } from '@/types/constants';
import type { FlightPrice } from '@/types/api';
import type { LoadingState } from '@/types/frontend';
```

---

## 9. HotelSelectionList

**File**: `frontend/src/components/HotelSelectionList.tsx`
**Directive**: `'use client'`
**Role**: Displays a list of up to 5 hotels in a Card. User selects one hotel. Handles loading/error/empty/success states.

### 9.1 Props Interface

```typescript
// frontend/src/components/HotelSelectionList.tsx

import type { LoadingState } from '@/types/frontend';
import type { HotelOption } from '@/types/api';

/**
 * Props for HotelSelectionList.
 *
 * Displays hotel search results as a selectable list within a Card.
 * Exactly one hotel must be selected to enable adding to comparison queue.
 */
export interface HotelSelectionListProps {
  /** Current loading state: 'idle' | 'loading' | 'success' | 'error' */
  state: LoadingState;

  /** Hotel options from POST /api/v1/hotels/search. null unless state is 'success'. Max 5 items. */
  data: HotelOption[] | null;

  /** Error message string. Non-null when state is 'error'. */
  error: string | null;

  /**
   * The hotel_id of the currently selected hotel, or null if none selected.
   * Controlled by parent (DateOptionBuilderSection).
   */
  selectedHotelId: string | null;

  /**
   * Called when the user clicks a hotel in the list.
   * @param hotelId - The hotel_id of the clicked hotel.
   */
  onSelectHotel: (hotelId: string) => void;

  /** Called when the user clicks Retry in the error state. */
  onRetry: () => void;
}
```

### 9.2 Signature

```typescript
/**
 * HotelSelectionList — Client Component.
 *
 * Renders a MUI Card with heading "Hotels" and subtitle "(select one)" when in success state.
 *
 * States:
 *   - loading: 3 Skeleton rectangles (72px height each)
 *   - error: InlineError with retry
 *   - empty (success with 0 items): EmptyState "No hotels available"
 *   - success: MUI List with ListItemButton for each hotel
 *
 * Each hotel list item shows:
 *   - hotel_name (Typography subtitle1)
 *   - MUI Rating component (read-only, value=rating) — hidden if rating is null
 *   - "{distance} km from center" (Typography body2, text.secondary) — hidden if distance is null
 *   - "${total_price}" (Typography subtitle1, color primary, bold)
 *
 * Selected hotel has ListItemButton `selected={true}` visual highlight.
 */
export default function HotelSelectionList(
  props: HotelSelectionListProps
): JSX.Element;
```

### 9.3 Render Structure (Success)

```tsx
<Card>
  <CardContent>
    <Typography variant="h6" gutterBottom>
      Hotels
      {state === 'success' && data && data.length > 0 && (
        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
          (select one)
        </Typography>
      )}
    </Typography>

    {state === 'loading' && (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rectangular" height={72} />
        ))}
      </Box>
    )}

    {state === 'error' && (
      <InlineError message={error ?? 'Failed to load hotels.'} onRetry={onRetry} />
    )}

    {state === 'success' && data && data.length === 0 && (
      <EmptyState title="No hotels available" subtitle="Try adjusting your dates or destination." />
    )}

    {state === 'success' && data && data.length > 0 && (
      <List disablePadding>
        {data.map((hotel) => (
          <ListItemButton
            key={hotel.hotel_id}
            selected={hotel.hotel_id === selectedHotelId}
            onClick={() => onSelectHotel(hotel.hotel_id)}
            sx={{ borderRadius: 1, mb: 0.5 }}
          >
            <Box sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1">{hotel.hotel_name}</Typography>
                <Typography variant="subtitle1" color="primary" fontWeight={700}>
                  ${hotel.total_price.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                {hotel.rating !== null && (
                  <Rating value={hotel.rating} precision={0.1} readOnly size="small" />
                )}
                {hotel.distance !== null && (
                  <Typography variant="body2" color="text.secondary">
                    {hotel.distance.toFixed(1)} km from center
                  </Typography>
                )}
              </Box>
            </Box>
          </ListItemButton>
        ))}
      </List>
    )}
  </CardContent>
</Card>
```

### 9.4 Import Map

```typescript
import { Card, CardContent, Typography, List, ListItemButton, Box, Rating, Skeleton } from '@mui/material';
import InlineError from './shared/InlineError';
import EmptyState from './shared/EmptyState';
import type { HotelOption } from '@/types/api';
import type { LoadingState } from '@/types/frontend';
```

---

## 10. WeatherSummaryCard

**File**: `frontend/src/components/WeatherSummaryCard.tsx`
**Directive**: `'use client'`
**Role**: Displays weather summary data in a Card with a collapsible daily breakdown.

### 10.1 Props Interface

```typescript
// frontend/src/components/WeatherSummaryCard.tsx

import type { LoadingState } from '@/types/frontend';
import type { WeatherSummary } from '@/types/api';

/**
 * Props for WeatherSummaryCard.
 *
 * Displays weather summary and daily breakdown for the selected date range.
 * Handles loading, error, empty, and success states.
 */
export interface WeatherSummaryCardProps {
  /** Current loading state: 'idle' | 'loading' | 'success' | 'error' */
  state: LoadingState;

  /** Weather summary from POST /api/v1/weather. null unless state is 'success'. */
  data: WeatherSummary | null;

  /** Error message string. Non-null when state is 'error'. */
  error: string | null;

  /** Called when the user clicks Retry in the error state. */
  onRetry: () => void;
}
```

### 10.2 Signature

```typescript
/**
 * WeatherSummaryCard — Client Component.
 *
 * Renders a MUI Card with heading "Weather" and one of:
 *   - loading: Skeleton placeholders
 *   - error: InlineError with retry
 *   - empty (success but no daily data): EmptyState "No weather data available"
 *   - success: Weather label chip, score, temperature, rain signal, and daily breakdown
 *
 * Success display:
 *   - Chip with weather label (Great/Good/Fair/Poor), color-mapped:
 *     Great=success, Good=info, Fair=warning, Poor=error
 *   - "Score: 82.4/100" (Typography body1)
 *   - "Avg 21.3°C" (Typography body2)
 *   - "Rain: low" (Typography body2, color by rain signal)
 *   - Accordion for daily breakdown with a simple table:
 *     Date | High | Low | Rain | Description
 *
 * Internal state:
 *   - accordionExpanded: boolean (default false)
 */
export default function WeatherSummaryCard(
  props: WeatherSummaryCardProps
): JSX.Element;
```

### 10.3 Internal State

```typescript
/** Whether the daily breakdown accordion is expanded. Default: false. */
const [accordionExpanded, setAccordionExpanded] = useState<boolean>(false);
```

### 10.4 Label-to-Color Mapping

```typescript
/**
 * Maps weather label to MUI Chip color prop.
 * Used for the weather label badge.
 */
const labelChipColor: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
  Great: 'success',
  Good: 'info',
  Fair: 'warning',
  Poor: 'error',
};
```

### 10.5 Import Map

```typescript
import { useState } from 'react';
import {
  Card, CardContent, Typography, Chip, Box, Skeleton,
  Accordion, AccordionSummary, AccordionDetails,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InlineError from './shared/InlineError';
import EmptyState from './shared/EmptyState';
import dayjs from 'dayjs';
import { RAIN_SIGNAL_COLORS } from '@/types/constants';
import type { WeatherSummary } from '@/types/api';
import type { LoadingState } from '@/types/frontend';
```

---

## 11. AddToQueueButton

**File**: `frontend/src/components/AddToQueueButton.tsx`
**Directive**: `'use client'`
**Role**: The button that adds the current date option (flight + hotel + weather) to the comparison queue. Shows contextual disabled states and a brief "Added!" confirmation.

### 11.1 Props Interface

```typescript
// frontend/src/components/AddToQueueButton.tsx

/**
 * Props for AddToQueueButton.
 *
 * The button to add the current trip option to the comparison queue.
 * Disabled with a tooltip when conditions aren't met.
 */
export interface AddToQueueButtonProps {
  /**
   * Whether the button is enabled.
   * true when: flight is success + hotel is selected + weather is success.
   */
  enabled: boolean;

  /**
   * Whether the comparison queue is at maximum capacity (5 items).
   * When true, button is disabled regardless of `enabled`.
   */
  queueIsFull: boolean;

  /**
   * Whether an item with the same destination+date range already exists in the queue.
   * When true, button is disabled regardless of `enabled`.
   */
  isDuplicate: boolean;

  /**
   * Called when the user clicks the button (only called when button is truly enabled).
   */
  onClick: () => void;
}
```

### 11.2 Signature

```typescript
/**
 * AddToQueueButton — Client Component.
 *
 * Renders a MUI Button with contextual states:
 *
 * | State | Button Text | Visual | Tooltip |
 * |-------|------------|--------|---------|
 * | Enabled | "Add to Queue" | variant="contained", color="primary" | none |
 * | Disabled (data not ready) | "Add to Queue" | variant="contained", disabled | "Complete flight, hotel, and weather data first" |
 * | Disabled (queue full) | "Queue Full" | variant="contained", disabled | "Comparison queue is full (max 5)" |
 * | Disabled (duplicate) | "Already Added" | variant="contained", disabled | "This date range is already in your queue" |
 * | Just added (1.5s) | "Added! ✓" | variant="contained", color="success" | none |
 *
 * Internal state:
 *   - justAdded: boolean — true for 1.5 seconds after successful add
 *
 * Button size: large. Icon: AddIcon (from @mui/icons-material) when enabled, CheckIcon when justAdded.
 */
export default function AddToQueueButton(
  props: AddToQueueButtonProps
): JSX.Element;
```

### 11.3 Internal State

```typescript
/**
 * Whether the button just successfully added an item.
 * Shows "Added! ✓" for 1.5 seconds then reverts.
 */
const [justAdded, setJustAdded] = useState<boolean>(false);
```

### 11.4 Internal Callbacks

```typescript
/**
 * Handles button click. Calls props.onClick() and shows the "Added!" confirmation
 * for 1.5 seconds.
 */
const handleClick = (): void => {
  onClick();
  setJustAdded(true);
  setTimeout(() => setJustAdded(false), 1500);
};
```

### 11.5 Derived Values

```typescript
/** Whether the button is truly disabled (any disabling condition). */
const isDisabled: boolean = !enabled || queueIsFull || isDuplicate || justAdded;

/** The tooltip text to show, or empty string if no tooltip needed. */
const tooltipText: string = queueIsFull
  ? 'Comparison queue is full (max 5)'
  : isDuplicate
  ? 'This date range is already in your queue'
  : !enabled
  ? 'Complete flight, hotel, and weather data first'
  : '';

/** The button label text. */
const buttonText: string = justAdded
  ? 'Added!'
  : queueIsFull
  ? 'Queue Full'
  : isDuplicate
  ? 'Already Added'
  : 'Add to Queue';

/** Button color. */
const buttonColor: 'primary' | 'success' = justAdded ? 'success' : 'primary';
```

### 11.6 Render Structure

```tsx
<Tooltip title={tooltipText} arrow disableHoverListener={!isDisabled || justAdded}>
  <span> {/* span wrapper needed for Tooltip on disabled Button */}
    <Button
      variant="contained"
      color={buttonColor}
      size="large"
      disabled={isDisabled}
      onClick={handleClick}
      startIcon={justAdded ? <CheckIcon /> : <AddIcon />}
      sx={{ minWidth: 200 }}
    >
      {buttonText}
    </Button>
  </span>
</Tooltip>
```

### 11.7 Import Map

```typescript
import { useState } from 'react';
import { Button, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
```

---

## 12. ComparisonSection

**File**: `frontend/src/components/ComparisonSection.tsx`
**Directive**: `'use client'`
**Role**: The fourth progressive section. Renders the comparison queue list, the "Compare" button, and the comparison results table.

### 12.1 Props Interface

```typescript
// frontend/src/components/ComparisonSection.tsx

/**
 * Props for ComparisonSection.
 *
 * ComparisonSection takes NO props — it reads all state from ComparisonQueueContext.
 * This keeps it decoupled from page-level state.
 */
export interface ComparisonSectionProps {
  // Intentionally empty — all data from ComparisonQueueContext
}
```

### 12.2 Signature

```typescript
/**
 * ComparisonSection — Client Component.
 *
 * Renders:
 *   1. ComparisonQueueList — shows queued items with remove buttons
 *   2. "Compare" button — triggers POST /api/v1/compare
 *   3. ComparisonResultsTable — shows scored results (after compare)
 *
 * All state is read from ComparisonQueueContext:
 *   - queue: ComparisonQueueItem[] — items in the queue
 *   - count: number — queue length
 *   - isFull: boolean — queue at max
 *   - removeItem: (id) => void
 *   - clearQueue: () => void
 *   - comparisonResult: ComparisonResultState — { state, data, error }
 *   - compareTrips: () => Promise<void> — triggers comparison
 *   - resetComparison: () => void
 *
 * Compare button enabled when count >= 2 && comparisonResult.state !== 'loading'.
 */
export default function ComparisonSection(
  props: ComparisonSectionProps
): JSX.Element;
```

### 12.3 Internal Logic

```typescript
const {
  queue, count, isFull,
  removeItem, clearQueue,
  comparisonResult, compareTrips, resetComparison,
} = useComparisonQueue();

/** Whether the Compare button should be enabled. */
const canCompare: boolean = count >= 2 && comparisonResult.state !== 'loading';
```

### 12.4 Render Structure

```tsx
<Box>
  {/* Queue list */}
  <ComparisonQueueList
    queue={queue}
    onRemoveItem={removeItem}
    onClearAll={clearQueue}
    isComparing={comparisonResult.state === 'loading'}
  />

  {/* Compare button */}
  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, my: 3 }}>
    <Button
      variant="contained"
      color="primary"
      size="large"
      disabled={!canCompare}
      onClick={compareTrips}
      startIcon={
        comparisonResult.state === 'loading'
          ? <CircularProgress size={20} color="inherit" />
          : <CompareArrowsIcon />
      }
      sx={{ minWidth: 200 }}
    >
      {comparisonResult.state === 'loading' ? 'Comparing...' : 'Compare'}
    </Button>
    {count < 2 && (
      <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
        Add at least 2 date options to compare
      </Typography>
    )}
  </Box>

  {/* Results */}
  {comparisonResult.state === 'error' && (
    <InlineError
      message={comparisonResult.error ?? 'Comparison failed.'}
      onRetry={compareTrips}
    />
  )}
  {comparisonResult.state === 'success' && comparisonResult.data && (
    <ComparisonResultsTable data={comparisonResult.data} />
  )}
</Box>
```

### 12.5 Import Map

```typescript
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ComparisonQueueList from './ComparisonQueueList';
import ComparisonResultsTable from './ComparisonResultsTable';
import InlineError from './shared/InlineError';
import { useComparisonQueue } from '@/context/ComparisonQueueContext';
```

---

## 13. ComparisonQueueList

**File**: `frontend/src/components/ComparisonQueueList.tsx`
**Directive**: `'use client'`
**Role**: Displays the items currently in the comparison queue with remove functionality.

### 13.1 Props Interface

```typescript
// frontend/src/components/ComparisonQueueList.tsx

import type { ComparisonQueueItem } from '@/types/frontend';

/**
 * Props for ComparisonQueueList.
 *
 * Renders each queued trip option as a compact card/chip with a remove button.
 */
export interface ComparisonQueueListProps {
  /** The current queue items. */
  queue: ComparisonQueueItem[];

  /**
   * Called when the user clicks the remove button on a queue item.
   * @param id - The queue item id to remove.
   */
  onRemoveItem: (id: string) => void;

  /**
   * Called when the user clicks "Clear All".
   * Only shown when queue has 2+ items.
   */
  onClearAll: () => void;

  /**
   * Whether a comparison is currently in-flight.
   * When true, remove buttons are disabled (queue shouldn't change during comparison).
   */
  isComparing: boolean;
}
```

### 13.2 Signature

```typescript
/**
 * ComparisonQueueList — Client Component.
 *
 * Renders queued trip options as a horizontal row of compact Paper cards.
 *
 * Each card shows:
 *   - Destination name
 *   - Date range (formatted: "May 1 – May 5")
 *   - Flight price per person
 *   - Hotel name
 *   - Weather label chip
 *   - Remove (X) IconButton (disabled during comparison)
 *
 * Empty queue: shows Typography "No items in queue yet. Select dates and add trip options above."
 *
 * Header row: "Queue ({count}/5)" with "Clear All" text button (visible when count >= 2).
 *
 * Layout: horizontal scrollable row using flexbox with overflow-x: auto.
 * Each card has a fixed min-width of 220px.
 */
export default function ComparisonQueueList(
  props: ComparisonQueueListProps
): JSX.Element;
```

### 13.3 Render Structure

```tsx
<Box>
  {/* Header */}
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
    <Typography variant="subtitle1" fontWeight={600}>
      Queue ({queue.length}/5)
    </Typography>
    {queue.length >= 2 && (
      <Button
        size="small"
        color="error"
        onClick={onClearAll}
        disabled={isComparing}
      >
        Clear All
      </Button>
    )}
  </Box>

  {/* Queue items or empty state */}
  {queue.length === 0 ? (
    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
      No items in queue yet. Select dates and add trip options above.
    </Typography>
  ) : (
    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
      {queue.map((item) => (
        <Paper
          key={item.id}
          elevation={1}
          sx={{ p: 2, minWidth: 220, flexShrink: 0, position: 'relative' }}
        >
          <IconButton
            size="small"
            onClick={() => onRemoveItem(item.id)}
            disabled={isComparing}
            sx={{ position: 'absolute', top: 4, right: 4 }}
            aria-label={`Remove ${item.destination} ${item.startDate} - ${item.endDate}`}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          <Typography variant="subtitle2" fontWeight={600}>{item.destination}</Typography>
          <Typography variant="body2" color="text.secondary">
            {dayjs(item.startDate).format('MMM D')} – {dayjs(item.endDate).format('MMM D')}
          </Typography>
          <Typography variant="body2">Flight: ${item.flightPrice.toFixed(2)}/person</Typography>
          <Typography variant="body2">Hotel: {item.hotelName}</Typography>
          <Chip
            label={item.weather.label}
            size="small"
            color={labelChipColor[item.weather.label]}
            sx={{ mt: 0.5 }}
          />
        </Paper>
      ))}
    </Box>
  )}
</Box>
```

### 13.4 Import Map

```typescript
import { Box, Paper, Typography, IconButton, Button, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import dayjs from 'dayjs';
import type { ComparisonQueueItem } from '@/types/frontend';
```

---

## 14. ComparisonResultsTable

**File**: `frontend/src/components/ComparisonResultsTable.tsx`
**Directive**: `'use client'`
**Role**: Renders the side-by-side comparison table from scored trip options.

### 14.1 Props Interface

```typescript
// frontend/src/components/ComparisonResultsTable.tsx

import type { CompareResponse } from '@/types/api';

/**
 * Props for ComparisonResultsTable.
 *
 * Renders a comparison table from backend-scored trip options.
 * Only rendered when comparison state is 'success'.
 */
export interface ComparisonResultsTableProps {
  /**
   * The comparison response from POST /api/v1/compare.
   * Contains options[] sorted by overall_score descending, and best_option_index.
   */
  data: CompareResponse;
}
```

### 14.2 Signature

```typescript
/**
 * ComparisonResultsTable — Client Component.
 *
 * Renders a MUI Table with one column per trip option (horizontal comparison).
 *
 * Table structure:
 *   - First column: row labels (Dates, Flight, Hotel, Weather, Total Cost, Per Person, Score, Tags)
 *   - Subsequent columns: one per TripOption in data.options[]
 *
 * Best option (at data.best_option_index):
 *   - Column header has a "Best Overall" Chip
 *   - Column cells have light green background (alpha(theme.palette.success.light, 0.1))
 *
 * Tag rendering:
 *   - Each tag in option.tags[] renders as a MUI Chip:
 *     cheapest → color="success"
 *     best_weather → color="info"
 *     best_overall → color="warning"
 *
 * Number formatting:
 *   - Prices: "$1,005.00" (Intl.NumberFormat with USD, 2 decimal places)
 *   - Score: "90.5" (1 decimal place)
 *   - Dates: "May 1 – May 5" (dayjs format)
 *
 * The table is wrapped in MUI TableContainer with Paper for horizontal scroll
 * if there are many columns.
 */
export default function ComparisonResultsTable(
  props: ComparisonResultsTableProps
): JSX.Element;
```

### 14.3 Helper: Price Formatter

```typescript
/**
 * Formats a number as USD currency string.
 * E.g., 1005 → "$1,005.00"
 */
const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
```

### 14.4 Table Row Definitions

```typescript
/**
 * Each row in the comparison table.
 * Defined as an array of { label, accessor } to make the table data-driven.
 */
interface TableRowDef {
  /** Row label displayed in the first column */
  label: string;
  /** Function that extracts and formats the cell value from a TripOption */
  render: (option: TripOption) => React.ReactNode;
}

const tableRows: TableRowDef[] = [
  {
    label: 'Dates',
    render: (o) => `${dayjs(o.start_date).format('MMM D')} – ${dayjs(o.end_date).format('MMM D, YYYY')}`,
  },
  {
    label: 'Flight (per person)',
    render: (o) => formatCurrency(o.flight_price),
  },
  {
    label: 'Hotel',
    render: (o) => o.hotel_name,
  },
  {
    label: 'Hotel (total)',
    render: (o) => formatCurrency(o.hotel_price),
  },
  {
    label: 'Weather',
    render: (o) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip label={o.weather.label} size="small" color={labelChipColor[o.weather.label]} />
        <Typography variant="body2">{o.weather.weather_score.toFixed(1)}/100</Typography>
      </Box>
    ),
  },
  {
    label: 'Total Cost',
    render: (o) => (
      <Typography fontWeight={700}>{formatCurrency(o.total_trip_cost)}</Typography>
    ),
  },
  {
    label: 'Per Person',
    render: (o) => formatCurrency(o.cost_per_person),
  },
  {
    label: 'Score',
    render: (o) => (
      <Typography fontWeight={700} color="primary">
        {o.overall_score.toFixed(1)}
      </Typography>
    ),
  },
  {
    label: 'Tags',
    render: (o) => (
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {o.tags.map((tag) => (
          <Chip
            key={tag}
            label={TAG_LABELS[tag] ?? tag}
            size="small"
            color={TAG_COLORS[tag] ?? 'default'}
          />
        ))}
      </Box>
    ),
  },
];
```

### 14.5 Import Map

```typescript
import {
  Box, Paper, Typography, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import dayjs from 'dayjs';
import { TAG_COLORS, TAG_LABELS } from '@/types/constants';
import type { CompareResponse, TripOption } from '@/types/api';
```

---

## 15. Shared Sub-Components

These components are referenced across multiple sections. Full definitions are in the [UI States spec](./frontend-spec-ui-states.md), Sections 2.3. Summarized here for completeness.

### 15.1 LoadingIndicator

```typescript
// frontend/src/components/shared/LoadingIndicator.tsx

export interface LoadingIndicatorProps {
  /** Message displayed below the spinner. */
  message: string;
}

export default function LoadingIndicator(props: LoadingIndicatorProps): JSX.Element;
```

### 15.2 InlineError

```typescript
// frontend/src/components/shared/InlineError.tsx

export interface InlineErrorProps {
  /** Error message to display. */
  message: string;
  /** Callback invoked when the user clicks Retry. */
  onRetry: () => void;
}

export default function InlineError(props: InlineErrorProps): JSX.Element;
```

### 15.3 EmptyState

```typescript
// frontend/src/components/shared/EmptyState.tsx

export interface EmptyStateProps {
  /** Primary message, e.g. "No flights found". */
  title: string;
  /** Optional secondary hint, e.g. "Try different dates". */
  subtitle?: string;
}

export default function EmptyState(props: EmptyStateProps): JSX.Element;
```

---

## 16. Validation Rules Summary

Consolidated table of all validation rules across all form/input components.

| Component | Field | Rule | When Checked | Error Display | Error Message |
|-----------|-------|------|-------------|---------------|---------------|
| DestinationAutocomplete | search input | Min 3 characters to trigger search | On every keystroke | noOptionsText in dropdown | "Type at least 3 characters" |
| DestinationAutocomplete | search input | API error on search | After API call fails | Red helperText | "Failed to search destinations. Please try again." |
| OriginAirportInput | value | Must match `/^[A-Z]{3}$/` when non-empty | On blur | Red helperText | "Enter a 3-letter IATA airport code" |
| OriginAirportInput | value | Max 3 characters | On every keystroke | Silently truncated | N/A |
| OriginAirportInput | value | Auto-uppercase | On every keystroke | N/A | N/A |
| TravelerCountInput | value | Integer, min 1, max 100 | On every change | Invalid values ignored | N/A (constrained by input type) |
| CalendarSection | date selection | Only future dates | On click | Past dates dimmed, click ignored | N/A |
| CalendarSection | date range | Start <= end | On second click | Auto-swapped | N/A |
| AddToQueueButton | composite | Flight success + hotel selected + weather success | Continuous (derived) | Disabled button + tooltip | "Complete flight, hotel, and weather data first" |
| AddToQueueButton | composite | Queue not full (< 5 items) | Continuous (derived) | Disabled button + tooltip | "Comparison queue is full (max 5)" |
| AddToQueueButton | composite | Not a duplicate in queue | Continuous (derived) | Disabled button + tooltip | "This date range is already in your queue" |
| ComparisonSection | Compare button | Queue has >= 2 items | Continuous (derived) | Disabled button + hint text | "Add at least 2 date options to compare" |
| ComparisonSection | Compare button | Not currently comparing | Continuous (derived) | Button shows spinner | N/A |

---

## 17. Component Dependency Graph

Shows which components render which other components, and which context they consume.

```
HomePage (page.tsx)
├── reads: useComparisonQueue().count
├── renders: AppShell
│   ├── renders: Header
│   │   └── reads: useComparisonQueue().count
│   ├── renders: PageContainer
│   │   ├── SectionContainer[destination]
│   │   │   └── SearchSection
│   │   │       ├── DestinationAutocomplete  ← calls GET /api/v1/search/destinations
│   │   │       ├── OriginAirportInput
│   │   │       └── TravelerCountInput
│   │   ├── SectionContainer[calendar]
│   │   │   └── CalendarSection
│   │   │       ├── CalendarMonthGrid (private)
│   │   │       └── InlineError (on error)
│   │   ├── SectionContainer[dateDetails]
│   │   │   └── DateOptionBuilderSection
│   │   │       ├── FlightPriceCard
│   │   │       │   └── InlineError (on error)
│   │   │       ├── HotelSelectionList
│   │   │       │   ├── InlineError (on error)
│   │   │       │   └── EmptyState (on empty)
│   │   │       ├── WeatherSummaryCard
│   │   │       │   ├── InlineError (on error)
│   │   │       │   └── EmptyState (on empty)
│   │   │       └── AddToQueueButton
│   │   │           └── reads: useComparisonQueue().isFull, queue (for duplicate check)
│   │   └── SectionContainer[comparison]
│   │       └── ComparisonSection
│   │           ├── reads: useComparisonQueue() (all)
│   │           ├── ComparisonQueueList
│   │           ├── InlineError (on compare error)
│   │           └── ComparisonResultsTable (on compare success)
│   ├── ComparisonQueueFAB
│   │   └── reads: useComparisonQueue().count
│   └── Footer
```

### Context Consumer Summary

| Component | Context Hook | Fields Accessed |
|-----------|-------------|-----------------|
| Header | `useComparisonQueue()` | `count` |
| ComparisonQueueFAB | `useComparisonQueue()` | `count` |
| DateOptionBuilderSection | `useComparisonQueue()` | `isFull`, `queue` (for duplicate check) |
| AddToQueueButton | — (receives via props) | — |
| ComparisonSection | `useComparisonQueue()` | `queue`, `count`, `isFull`, `removeItem`, `clearQueue`, `comparisonResult`, `compareTrips`, `resetComparison` |
| HomePage | `useComparisonQueue()` | `count` |

---

*End of Section 3: Form & Input Component Signatures*
