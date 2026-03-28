# WhenToGo Frontend Specification — Custom Hooks & Context Providers

> **Audience**: Ralph Loop (autonomous implementation agent)
> **Scope**: Complete TypeScript signatures for all custom hooks and context providers, with exact state shapes, actions, return types, and integration points.
> **Cross-references**: Types from `frontend/src/types/api.ts`, frontend types from `frontend/src/types/frontend.ts`, constants from `frontend/src/types/constants.ts`, API service layer from `src/lib/api.ts`, comparison queue from `docs/frontend/frontend-spec-comparison-queue.md`.

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [File Locations](#2-file-locations)
3. [Context Provider: ComparisonQueueContext](#3-context-provider-comparisonqueuecontext)
4. [Hook: useComparisonQueue](#4-hook-usecomparisonqueue)
5. [Hook: useDestinationSearch](#5-hook-usedestinationsearch)
6. [Hook: useCalendarWeather](#6-hook-usecalendarweather)
7. [Hook: useDateDetails](#7-hook-usedatedetails)
8. [Hook: useSearchParams](#8-hook-usesearchparams)
9. [Hook: useDateRange](#9-hook-usedaterange)
10. [Hook: useHotelSelection](#10-hook-usehotelselection)
11. [Hook: useAddToQueue](#11-hook-useaddtoqueue)
12. [Hook: useDebounce](#12-hook-usedebounce)
13. [State Flow Diagram](#13-state-flow-diagram)
14. [Integration Matrix](#14-integration-matrix)

---

## 1. Overview & Architecture

The frontend uses a **minimal context + hooks** architecture:

- **One React Context**: `ComparisonQueueContext` — manages the comparison queue (up to 5 items) and comparison results. This is the ONLY context in the application.
- **Custom hooks**: Each hook encapsulates a specific data-fetching or UI-state concern. Hooks call the centralized API service layer (`src/lib/api.ts`) and manage their own `AsyncState`.
- **Page-level state**: The root page component (`src/app/page.tsx`) owns the search parameters, date range, and section visibility. It passes these down as props and coordinates progressive section reveal.

**Rules:**
- Hooks NEVER import `axios` directly. They import typed methods from `@/lib/api`.
- Hooks NEVER compute scoring (that is backend-only via `POST /api/v1/compare`).
- All hooks are client-side (`'use client'` directive in their files).
- All hooks use types from `@/types/frontend` and `@/types/api` — never redefine types.

---

## 2. File Locations

```
frontend/src/
├── context/
│   └── ComparisonQueueContext.tsx    # ComparisonQueueProvider + useComparisonQueue
├── hooks/
│   ├── useDestinationSearch.ts      # Autocomplete destination search
│   ├── useCalendarWeather.ts        # Calendar weather overlay data
│   ├── useDateDetails.ts            # Parallel flight/hotel/weather fetch
│   ├── useSearchParams.ts           # Search form state management
│   ├── useDateRange.ts              # Date range selection state
│   ├── useHotelSelection.ts         # Hotel selection from results
│   ├── useAddToQueue.ts             # Assembles & adds ComparisonQueueItem
│   └── useDebounce.ts               # Generic debounce utility hook
└── types/
    └── frontend.ts                  # All state types (already defined)
```

---

## 3. Context Provider: ComparisonQueueContext

> **File**: `frontend/src/context/ComparisonQueueContext.tsx`
> **Full behavior spec**: See `docs/frontend/frontend-spec-comparison-queue.md` for detailed algorithms.

### 3.1 Imports

```typescript
'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type {
  ComparisonQueueItem,
  ComparisonQueueContextValue,
  ComparisonResultState,
} from '@/types/frontend';
import type { CompareOptionInput } from '@/types/api';
import { MAX_QUEUE_SIZE, MIN_COMPARE_SIZE } from '@/types/constants';
import { compareTrips as apiCompareTrips, extractApiError } from '@/lib/api';
```

### 3.2 Context Creation

```typescript
const ComparisonQueueContext = createContext<ComparisonQueueContextValue | null>(null);
```

### 3.3 Provider Signature

```typescript
export function ComparisonQueueProvider({ children }: { children: React.ReactNode }): React.JSX.Element
```

### 3.4 Internal State

| State Variable | Type | Initial Value |
|---|---|---|
| `queue` | `ComparisonQueueItem[]` | `[]` |
| `comparisonResult` | `ComparisonResultState` | `{ state: 'idle', data: null, error: null }` |

### 3.5 Derived Values (computed in `useMemo`, not stored)

| Derived | Type | Computation |
|---|---|---|
| `count` | `number` | `queue.length` |
| `isFull` | `boolean` | `queue.length >= MAX_QUEUE_SIZE` |

### 3.6 Context Value Shape

```typescript
export interface ComparisonQueueContextValue {
  /** Current items in the comparison queue. Maximum 5. */
  queue: ComparisonQueueItem[];

  /**
   * Add an item to the queue.
   * @param item - The ComparisonQueueItem to add.
   * @returns true if added, false if queue is full (>=5) or duplicate id exists.
   * Side effect: resets comparisonResult to idle if it was not already idle.
   */
  addItem: (item: ComparisonQueueItem) => boolean;

  /**
   * Remove an item from the queue by its id.
   * @param id - The unique id (format: "${destination}-${startDate}-${endDate}").
   * No-op if id not found. Side effect: resets comparisonResult to idle.
   */
  removeItem: (id: string) => void;

  /**
   * Remove all items from the queue.
   * Side effect: resets comparisonResult to idle.
   */
  clearQueue: () => void;

  /** Whether the queue has reached maximum capacity (5 items). */
  isFull: boolean;

  /** Number of items currently in the queue (0–5). */
  count: number;

  /** Current comparison results state. */
  comparisonResult: ComparisonResultState;

  /**
   * Send the current queue to POST /api/v1/compare for scoring.
   * Requires queue.length >= 2. Sets comparisonResult.state to "loading",
   * then "success" or "error".
   * Converts ComparisonQueueItem[] to CompareOptionInput[] internally.
   */
  compareTrips: () => Promise<void>;

  /**
   * Reset comparison results to idle state.
   * Called automatically by addItem/removeItem/clearQueue.
   * Can also be called manually to dismiss results.
   */
  resetComparison: () => void;
}
```

### 3.7 Internal Helper: queueItemToCompareInput

```typescript
/**
 * Converts a frontend ComparisonQueueItem to the API's CompareOptionInput format.
 * Strips the `daily` array from weather (compare endpoint doesn't need it).
 * Converts camelCase frontend fields to snake_case API fields.
 */
function queueItemToCompareInput(item: ComparisonQueueItem): CompareOptionInput {
  return {
    destination: item.destination,
    start_date: item.startDate,
    end_date: item.endDate,
    flight_price: item.flightPrice,
    hotel_name: item.hotelName,
    hotel_price: item.hotelPrice,
    weather: {
      average_temp: item.weather.average_temp,
      rain_signal: item.weather.rain_signal,
      weather_score: item.weather.weather_score,
      label: item.weather.label,
    },
    traveler_count: item.travelerCount,
  };
}
```

### 3.8 Memoization Requirements

- All callback functions (`addItem`, `removeItem`, `clearQueue`, `compareTrips`, `resetComparison`) MUST be wrapped in `useCallback`.
- The context value object MUST be wrapped in `useMemo`, depending on `[queue, comparisonResult, addItem, removeItem, clearQueue, compareTrips, resetComparison]`.

### 3.9 Provider Placement

```
RootLayout (Server Component)
└── ThemeRegistry (Client Component — MUI + Emotion setup)
    └── ComparisonQueueProvider  ← wraps all page content
        └── <Box> page content
            ├── Header
            ├── SearchSection
            ├── CalendarSection
            ├── DateOptionBuilderSection
            ├── ComparisonSection
            ├── ComparisonQueueFAB
            └── Footer
```

---

## 4. Hook: useComparisonQueue

> **File**: `frontend/src/context/ComparisonQueueContext.tsx` (exported from same file as provider)

### 4.1 Signature

```typescript
/**
 * Access the comparison queue context.
 * MUST be called within a ComparisonQueueProvider.
 * @throws Error if called outside of ComparisonQueueProvider.
 * @returns ComparisonQueueContextValue
 */
export function useComparisonQueue(): ComparisonQueueContextValue {
  const ctx = useContext(ComparisonQueueContext);
  if (!ctx) {
    throw new Error('useComparisonQueue must be used within a ComparisonQueueProvider');
  }
  return ctx;
}
```

### 4.2 Return Type

Returns `ComparisonQueueContextValue` exactly as defined in Section 3.6 above.

### 4.3 Usage Examples

```typescript
// Reading queue state
const { queue, count, isFull, comparisonResult } = useComparisonQueue();

// Adding an item
const { addItem } = useComparisonQueue();
const success = addItem(newItem);
if (!success) {
  // Queue is full or duplicate — show feedback to user
}

// Triggering comparison
const { compareTrips, comparisonResult } = useComparisonQueue();
await compareTrips(); // comparisonResult.state transitions: idle → loading → success|error

// Removing an item
const { removeItem } = useComparisonQueue();
removeItem('Tokyo-2026-05-01-2026-05-05');
```

---

## 5. Hook: useDestinationSearch

> **File**: `frontend/src/hooks/useDestinationSearch.ts`

### 5.1 Purpose

Manages the debounced autocomplete search for destinations. Calls `GET /api/v1/search/destinations?q=...` when the user types >= 3 characters. Debounces input by 300ms.

### 5.2 Signature

```typescript
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { DestinationResult } from '@/types/api';
import type { LoadingState } from '@/types/frontend';
import { searchDestinations, extractApiError, type ApiErrorDisplay } from '@/lib/api';
import { MIN_SEARCH_QUERY_LENGTH, SEARCH_DEBOUNCE_MS } from '@/types/constants';

export interface UseDestinationSearchReturn {
  /** Current search query string (reflects user input). */
  query: string;

  /** Update the search query. Triggers debounced API call if length >= 3. */
  setQuery: (value: string) => void;

  /** Array of matching destination results. Empty array when idle, loading, or error. */
  results: DestinationResult[];

  /** Current loading state of the search operation. */
  status: LoadingState | 'empty';

  /** Error details if status is 'error'. null otherwise. */
  error: ApiErrorDisplay | null;

  /**
   * Whether the dropdown should be shown.
   * true when: status is 'loading', 'success', 'empty', or 'error' AND query.length >= 3.
   * false when: status is 'idle' OR query.length < 3 OR user has selected a destination.
   */
  isOpen: boolean;

  /**
   * Call this when the user selects a destination from the dropdown.
   * Sets query to the selected destination name, clears results, closes dropdown.
   */
  selectDestination: (destination: DestinationResult) => void;

  /**
   * Clear the search state entirely. Resets query, results, status, error.
   * Call this when the user clicks a "clear" button on the search field.
   */
  clear: () => void;

  /** The currently selected destination, or null if none selected. */
  selectedDestination: DestinationResult | null;
}

export function useDestinationSearch(): UseDestinationSearchReturn
```

### 5.3 Internal State

| State | Type | Initial | Description |
|---|---|---|---|
| `query` | `string` | `""` | Current input value |
| `results` | `DestinationResult[]` | `[]` | Search results |
| `status` | `LoadingState \| 'empty'` | `'idle'` | Current fetch state |
| `error` | `ApiErrorDisplay \| null` | `null` | Error from last failed fetch |
| `isOpen` | `boolean` | `false` | Dropdown visibility |
| `selectedDestination` | `DestinationResult \| null` | `null` | Currently selected result |

### 5.4 Behavior

1. **On `setQuery(value)`**:
   - Update `query` to `value`.
   - If `selectedDestination` is not null, set `selectedDestination` to null (user is re-searching).
   - If `value.length < MIN_SEARCH_QUERY_LENGTH` (3): set `status` to `'idle'`, clear `results`, set `isOpen` to `false`.
   - If `value.length >= 3`: set `isOpen` to `true`, start debounced fetch (300ms).

2. **Debounced fetch** (fires 300ms after last `setQuery` call where length >= 3):
   - Set `status` to `'loading'`, clear `error`.
   - Call `searchDestinations(query)`.
   - On success with results.length > 0: set `status` to `'success'`, set `results`.
   - On success with results.length === 0: set `status` to `'empty'`, set `results` to `[]`.
   - On error: set `status` to `'error'`, set `error` to `extractApiError(err)`.

3. **On `selectDestination(destination)`**:
   - Set `selectedDestination` to `destination`.
   - Set `query` to `destination.name`.
   - Set `results` to `[]`.
   - Set `isOpen` to `false`.
   - Set `status` to `'idle'`.

4. **On `clear()`**:
   - Set `query` to `""`.
   - Set `results` to `[]`.
   - Set `status` to `'idle'`.
   - Set `error` to `null`.
   - Set `isOpen` to `false`.
   - Set `selectedDestination` to `null`.

5. **Debounce cancellation**: When `setQuery` is called, cancel any pending debounced fetch. Use a `useRef` for the timeout ID and clear it on each new call. Also cancel on unmount via `useEffect` cleanup.

---

## 6. Hook: useCalendarWeather

> **File**: `frontend/src/hooks/useCalendarWeather.ts`

### 6.1 Purpose

Fetches the 2-month calendar weather overlay data when a destination is selected. Calls `POST /api/v1/calendar`.

### 6.2 Signature

```typescript
'use client';

import { useState, useCallback, useEffect } from 'react';
import type { CalendarDay } from '@/types/api';
import type { SelectedDestination, LoadingState } from '@/types/frontend';
import { getCalendarWeather, extractApiError, type ApiErrorDisplay } from '@/lib/api';
import { CALENDAR_MONTH_RANGE } from '@/types/constants';
import dayjs from 'dayjs';

export interface UseCalendarWeatherReturn {
  /** Array of calendar day weather data. null before first fetch. */
  days: CalendarDay[] | null;

  /** Current loading state. */
  status: LoadingState;

  /** Error details if status is 'error'. null otherwise. */
  error: ApiErrorDisplay | null;

  /**
   * Fetch calendar weather for a destination.
   * Calculates date range automatically: 1st of current month to end of (current month + CALENDAR_MONTH_RANGE - 1).
   * @param destination - The selected destination with coordinates.
   */
  fetch: (destination: SelectedDestination) => Promise<void>;

  /**
   * Retry the last fetch with the same parameters.
   * No-op if no previous fetch has been attempted.
   */
  retry: () => Promise<void>;

  /** Reset state to idle. Call when destination changes. */
  reset: () => void;
}

export function useCalendarWeather(): UseCalendarWeatherReturn
```

### 6.3 Internal State

| State | Type | Initial | Description |
|---|---|---|---|
| `days` | `CalendarDay[] \| null` | `null` | Calendar weather data |
| `status` | `LoadingState` | `'idle'` | Current fetch state |
| `error` | `ApiErrorDisplay \| null` | `null` | Error from last failed fetch |
| `lastDestination` | `SelectedDestination \| null` | `null` | Stored for retry |

### 6.4 Behavior

1. **On `fetch(destination)`**:
   - Store `destination` as `lastDestination` (for retry).
   - Set `status` to `'loading'`, clear `error`, set `days` to `null`.
   - Calculate date range:
     ```typescript
     const startDate = dayjs().startOf('month').format('YYYY-MM-DD');
     const endDate = dayjs().startOf('month').add(CALENDAR_MONTH_RANGE, 'month').subtract(1, 'day').format('YYYY-MM-DD');
     ```
   - Call `getCalendarWeather({ destination: destination.name, latitude: destination.latitude, longitude: destination.longitude, start_date: startDate, end_date: endDate })`.
   - On success: set `status` to `'success'`, set `days` to `response.days`.
   - On error: set `status` to `'error'`, set `error` to `extractApiError(err)`.

2. **On `retry()`**:
   - If `lastDestination` is null, do nothing.
   - Otherwise call `fetch(lastDestination)`.

3. **On `reset()`**:
   - Set `days` to `null`, `status` to `'idle'`, `error` to `null`, `lastDestination` to `null`.

---

## 7. Hook: useDateDetails

> **File**: `frontend/src/hooks/useDateDetails.ts`

### 7.1 Purpose

Manages the three parallel API calls (flights, hotels, weather) that fire when the user selects a date range. Each sub-fetch has independent loading/success/error state.

### 7.2 Signature

```typescript
'use client';

import { useState, useCallback } from 'react';
import type { FlightPrice, HotelOption, WeatherSummary } from '@/types/api';
import type { SelectedDestination, DateRange, DateDetailResults, LoadingState } from '@/types/frontend';
import {
  getFlightPrice,
  searchHotels,
  getWeather,
  extractApiError,
  type ApiErrorDisplay,
} from '@/lib/api';

export interface UseDateDetailsReturn {
  /** The full DateDetailResults state with independent flight/hotels/weather sub-states. */
  results: DateDetailResults;

  /**
   * Fetch all three data sources in parallel for the given destination and date range.
   * Each sub-fetch (flight, hotels, weather) settles independently.
   * @param destination - Selected destination with coordinates and IATA code.
   * @param dateRange - Selected start and end dates.
   * @param originAirport - Origin airport IATA code (e.g. "ICN").
   * @param travelerCount - Number of travelers (minimum 1).
   */
  fetchAll: (
    destination: SelectedDestination,
    dateRange: DateRange,
    originAirport: string,
    travelerCount: number,
  ) => Promise<void>;

  /**
   * Retry only the flight price fetch with the same parameters.
   * No-op if no previous fetch was attempted.
   */
  retryFlight: () => Promise<void>;

  /**
   * Retry only the hotel search with the same parameters.
   * No-op if no previous fetch was attempted.
   */
  retryHotels: () => Promise<void>;

  /**
   * Retry only the weather fetch with the same parameters.
   * No-op if no previous fetch was attempted.
   */
  retryWeather: () => Promise<void>;

  /** Reset all results to idle state. Call when date range or destination changes. */
  reset: () => void;
}

export function useDateDetails(): UseDateDetailsReturn
```

### 7.3 Internal State

| State | Type | Initial |
|---|---|---|
| `results` | `DateDetailResults` | `{ flight: { state: 'idle', data: null, error: null }, hotels: { state: 'idle', data: null, error: null }, weather: { state: 'idle', data: null, error: null } }` |
| `lastParams` | `{ destination, dateRange, originAirport, travelerCount } \| null` | `null` |

### 7.4 DateDetailResults Shape (from `@/types/frontend`)

```typescript
export interface DateDetailResults {
  flight: {
    state: LoadingState;
    data: FlightPrice | null;
    error: string | null;
  };
  hotels: {
    state: LoadingState;
    data: HotelOption[] | null;
    error: string | null;
  };
  weather: {
    state: LoadingState;
    data: WeatherSummary | null;
    error: string | null;
  };
}
```

### 7.5 Behavior

1. **On `fetchAll(destination, dateRange, originAirport, travelerCount)`**:
   - Store all params as `lastParams` for retry.
   - Set all three sub-states to `{ state: 'loading', data: null, error: null }`.
   - Fire three API calls in parallel (NOT sequentially). Each settles independently:

   **Flight fetch:**
   ```typescript
   try {
     const flight = await getFlightPrice({
       origin: originAirport,
       destination: destination.iata_code!, // caller ensures iata_code is not null
       departure_date: dateRange.startDate,
       return_date: dateRange.endDate,
       traveler_count: travelerCount,
     });
     setResults(prev => ({ ...prev, flight: { state: 'success', data: flight, error: null } }));
   } catch (err) {
     const apiErr = extractApiError(err);
     setResults(prev => ({ ...prev, flight: { state: 'error', data: null, error: apiErr.message } }));
   }
   ```

   **Hotel fetch:**
   ```typescript
   try {
     const hotels = await searchHotels({
       destination: destination.name,
       latitude: destination.latitude,
       longitude: destination.longitude,
       checkin_date: dateRange.startDate,
       checkout_date: dateRange.endDate,
       traveler_count: travelerCount,
     });
     if (hotels.length === 0) {
       setResults(prev => ({ ...prev, hotels: { state: 'error', data: null, error: 'No hotels found for this destination and dates.' } }));
     } else {
       setResults(prev => ({ ...prev, hotels: { state: 'success', data: hotels, error: null } }));
     }
   } catch (err) {
     const apiErr = extractApiError(err);
     setResults(prev => ({ ...prev, hotels: { state: 'error', data: null, error: apiErr.message } }));
   }
   ```

   **Weather fetch:**
   ```typescript
   try {
     const weather = await getWeather({
       latitude: destination.latitude,
       longitude: destination.longitude,
       start_date: dateRange.startDate,
       end_date: dateRange.endDate,
     });
     setResults(prev => ({ ...prev, weather: { state: 'success', data: weather, error: null } }));
   } catch (err) {
     const apiErr = extractApiError(err);
     setResults(prev => ({ ...prev, weather: { state: 'error', data: null, error: apiErr.message } }));
   }
   ```

   **Important**: Use `Promise.allSettled` or individual try/catch blocks — do NOT use `Promise.all` because one failure should not cancel the others.

2. **On `retryFlight()`**:
   - If `lastParams` is null, return.
   - Set `results.flight` to `{ state: 'loading', data: null, error: null }`.
   - Re-execute only the flight fetch using `lastParams`.

3. **On `retryHotels()`**:
   - Same pattern, re-execute only the hotel fetch.

4. **On `retryWeather()`**:
   - Same pattern, re-execute only the weather fetch.

5. **On `reset()`**:
   - Set `results` to initial idle state for all three.
   - Set `lastParams` to `null`.

---

## 8. Hook: useSearchParams

> **File**: `frontend/src/hooks/useSearchParams.ts`

### 8.1 Purpose

Manages the search form state (origin airport, traveler count) that sits alongside the destination autocomplete in the SearchSection. This is NOT the Next.js `useSearchParams` from `next/navigation` — it is a custom hook with a different name scope.

**Important**: Name this file `useSearchParams.ts` but the exported hook `useSearchFormParams` to avoid confusion with the Next.js built-in.

### 8.2 Signature

```typescript
'use client';

import { useState, useCallback } from 'react';
import type { SearchParams } from '@/types/frontend';

export interface UseSearchFormParamsReturn {
  /** Current search parameters state. */
  params: SearchParams;

  /**
   * Set the origin airport IATA code.
   * @param code - 3-letter IATA code (e.g. "ICN"). Stored as uppercase.
   */
  setOriginAirport: (code: string) => void;

  /**
   * Set the traveler count.
   * @param count - Number of travelers. Clamped to minimum 1, maximum 99.
   */
  setTravelerCount: (count: number) => void;

  /**
   * Set the selected destination. Called by the parent when DestinationAutocomplete fires selectDestination.
   * @param destination - The SelectedDestination or null to clear.
   */
  setDestination: (destination: SearchParams['destination']) => void;

  /**
   * Whether all required search parameters are complete:
   * - destination is not null
   * - destination.iata_code is not null (required for flight search)
   * - originAirport.length === 3
   * - travelerCount >= 1
   */
  isComplete: boolean;

  /** Reset all params to defaults. */
  reset: () => void;
}

export function useSearchFormParams(): UseSearchFormParamsReturn
```

### 8.3 Internal State

| State | Type | Initial |
|---|---|---|
| `params` | `SearchParams` | `{ destination: null, originAirport: "", travelerCount: 1 }` |

### 8.4 Derived Values

| Derived | Computation |
|---|---|
| `isComplete` | `params.destination !== null && params.destination.iata_code !== null && params.originAirport.length === 3 && params.travelerCount >= 1` |

### 8.5 Behavior

1. **`setOriginAirport(code)`**: Sets `params.originAirport` to `code.toUpperCase().slice(0, 3)`. Only alphabetic characters are accepted; strip non-alpha.
2. **`setTravelerCount(count)`**: Sets `params.travelerCount` to `Math.max(1, Math.min(99, Math.floor(count)))`.
3. **`setDestination(destination)`**: Sets `params.destination` to the provided value (or null).
4. **`reset()`**: Resets to `{ destination: null, originAirport: "", travelerCount: 1 }`.

---

## 9. Hook: useDateRange

> **File**: `frontend/src/hooks/useDateRange.ts`

### 9.1 Purpose

Manages the date range selection state from the calendar. Provides start/end date tracking and validation.

### 9.2 Signature

```typescript
'use client';

import { useState, useCallback } from 'react';
import type { DateRange } from '@/types/frontend';
import dayjs from 'dayjs';

export interface UseDateRangeReturn {
  /** Current date range, or null if not yet fully selected. */
  dateRange: DateRange | null;

  /** The start date being selected (for partial selection UI). null if no start date picked yet. */
  startDate: string | null;

  /**
   * Handle a date click on the calendar.
   * First click sets startDate. Second click sets endDate (must be after startDate).
   * If second click is before startDate, it becomes the new startDate.
   * @param date - ISO date string "YYYY-MM-DD"
   */
  handleDateClick: (date: string) => void;

  /**
   * Clear the current date range selection.
   * Resets both startDate and dateRange to null.
   */
  clear: () => void;

  /**
   * Whether a complete date range has been selected (both start and end).
   */
  isComplete: boolean;
}

export function useDateRange(): UseDateRangeReturn
```

### 9.3 Internal State

| State | Type | Initial |
|---|---|---|
| `startDate` | `string \| null` | `null` |
| `endDate` | `string \| null` | `null` |

### 9.4 Derived Values

| Derived | Type | Computation |
|---|---|---|
| `dateRange` | `DateRange \| null` | If both `startDate` and `endDate` are non-null: `{ startDate, endDate }`. Otherwise `null`. |
| `isComplete` | `boolean` | `startDate !== null && endDate !== null` |

### 9.5 Behavior

1. **`handleDateClick(date)`**:
   - If `startDate` is null: set `startDate` to `date`, set `endDate` to null.
   - If `startDate` is set and `endDate` is null:
     - If `dayjs(date).isAfter(dayjs(startDate))`: set `endDate` to `date`.
     - If `dayjs(date).isBefore(dayjs(startDate))`: set `startDate` to `date` (restart selection).
     - If `dayjs(date).isSame(dayjs(startDate))`: do nothing (same day click is a no-op).
   - If both `startDate` and `endDate` are set (user is re-selecting): set `startDate` to `date`, set `endDate` to null.

2. **`clear()`**: Set `startDate` to null, `endDate` to null.

3. **Date validation**: Only future dates are clickable on the calendar. The calendar component enforces this by disabling past dates. This hook does NOT validate — it trusts the caller.

---

## 10. Hook: useHotelSelection

> **File**: `frontend/src/hooks/useHotelSelection.ts`

### 10.1 Purpose

Tracks which hotel the user has selected from the hotel search results. Simple selection state.

### 10.2 Signature

```typescript
'use client';

import { useState, useCallback } from 'react';
import type { HotelOption } from '@/types/api';

export interface UseHotelSelectionReturn {
  /** The currently selected hotel, or null if none selected. */
  selectedHotel: HotelOption | null;

  /**
   * Select a hotel from the results list.
   * @param hotel - The HotelOption to select.
   */
  selectHotel: (hotel: HotelOption) => void;

  /** Clear the current selection. */
  clear: () => void;

  /** Whether a hotel has been selected. */
  hasSelection: boolean;
}

export function useHotelSelection(): UseHotelSelectionReturn
```

### 10.3 Internal State

| State | Type | Initial |
|---|---|---|
| `selectedHotel` | `HotelOption \| null` | `null` |

### 10.4 Derived

| Derived | Computation |
|---|---|
| `hasSelection` | `selectedHotel !== null` |

### 10.5 Behavior

1. **`selectHotel(hotel)`**: Set `selectedHotel` to `hotel`.
2. **`clear()`**: Set `selectedHotel` to null.

---

## 11. Hook: useAddToQueue

> **File**: `frontend/src/hooks/useAddToQueue.ts`

### 11.1 Purpose

Assembles a `ComparisonQueueItem` from the current search state (destination, dates, flight, hotel, weather) and adds it to the comparison queue. Provides feedback on whether the add succeeded.

### 11.2 Signature

```typescript
'use client';

import { useCallback, useState } from 'react';
import type {
  SelectedDestination,
  DateRange,
  ComparisonQueueItem,
} from '@/types/frontend';
import type { FlightPrice, HotelOption, WeatherSummary } from '@/types/api';
import { useComparisonQueue } from '@/context/ComparisonQueueContext';

export interface UseAddToQueueReturn {
  /**
   * Assemble and add a trip option to the comparison queue.
   * @param destination - Selected destination.
   * @param dateRange - Selected date range.
   * @param originAirport - Origin IATA code.
   * @param travelerCount - Number of travelers.
   * @param flightPrice - Flight price data from API.
   * @param hotel - Selected hotel from results.
   * @param weather - Weather summary from API.
   * @returns true if added, false if queue full or duplicate.
   */
  addToQueue: (
    destination: SelectedDestination,
    dateRange: DateRange,
    originAirport: string,
    travelerCount: number,
    flightPrice: FlightPrice,
    hotel: HotelOption,
    weather: WeatherSummary,
  ) => boolean;

  /**
   * Feedback status after last add attempt.
   * 'idle' - no attempt yet.
   * 'success' - item was added.
   * 'duplicate' - item was rejected because same destination+dates already in queue.
   * 'full' - item was rejected because queue has 5 items.
   */
  lastAddStatus: 'idle' | 'success' | 'duplicate' | 'full';

  /** Reset lastAddStatus to 'idle'. */
  resetStatus: () => void;
}

export function useAddToQueue(): UseAddToQueueReturn
```

### 11.3 Internal State

| State | Type | Initial |
|---|---|---|
| `lastAddStatus` | `'idle' \| 'success' \| 'duplicate' \| 'full'` | `'idle'` |

### 11.4 Behavior

1. **`addToQueue(...)`**:
   - Generate item ID: `const id = \`${destination.name}-${dateRange.startDate}-${dateRange.endDate}\`;`
   - Assemble `ComparisonQueueItem`:
     ```typescript
     const item: ComparisonQueueItem = {
       id,
       destination: destination.name,
       startDate: dateRange.startDate,
       endDate: dateRange.endDate,
       originAirport,
       flightPrice: flightPrice.price,
       hotelName: hotel.hotel_name,
       hotelPrice: hotel.total_price,
       weather,
       travelerCount,
     };
     ```
   - Check queue state from context:
     - If `isFull` is true: set `lastAddStatus` to `'full'`, return `false`.
     - If `queue.some(q => q.id === id)`: set `lastAddStatus` to `'duplicate'`, return `false`.
   - Call `addItem(item)` from context.
   - If returns `true`: set `lastAddStatus` to `'success'`, return `true`.
   - If returns `false`: set `lastAddStatus` to `'full'` (defensive — shouldn't happen given above checks), return `false`.

2. **`resetStatus()`**: Set `lastAddStatus` to `'idle'`.

---

## 12. Hook: useDebounce

> **File**: `frontend/src/hooks/useDebounce.ts`

### 12.1 Purpose

Generic debounce utility hook. Returns a debounced version of a value. Used internally by `useDestinationSearch` but exported for reuse.

### 12.2 Signature

```typescript
'use client';

import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of the input value.
 * The returned value only updates after `delay` milliseconds of inactivity.
 *
 * @param value - The value to debounce.
 * @param delay - Debounce delay in milliseconds.
 * @returns The debounced value.
 *
 * @example
 * const debouncedQuery = useDebounce(query, 300);
 * useEffect(() => {
 *   if (debouncedQuery.length >= 3) {
 *     fetchResults(debouncedQuery);
 *   }
 * }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay: number): T
```

### 12.3 Implementation Logic

```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

---

## 13. State Flow Diagram

This shows how hooks and context interconnect across the single-page progressive flow:

```
┌─────────────────────────────────────────────────────────────────┐
│  Page Component (src/app/page.tsx) — owns top-level state       │
│                                                                 │
│  Uses: useSearchFormParams(), useDateRange(), useCalendarWeather()│
│        useDateDetails(), useHotelSelection(), useAddToQueue()   │
│                                                                 │
│  State owned by page:                                           │
│    - searchParams: SearchParams  (via useSearchFormParams)       │
│    - dateRange: DateRange | null (via useDateRange)              │
│    - calendarWeather           (via useCalendarWeather)          │
│    - dateDetails               (via useDateDetails)             │
│    - hotelSelection            (via useHotelSelection)          │
│    - activeSection: SectionId  (derived from state completeness)│
│                                                                 │
│  Section Visibility Rules:                                       │
│    destination: always visible                                   │
│    calendar: visible when searchParams.isComplete                │
│    dateDetails: visible when dateRange.isComplete                │
│    comparison: visible when queue.count >= 2                     │
└────────────┬───────────────────┬────────────────────────────────┘
             │                   │
    ┌────────▼────────┐ ┌───────▼────────────────────────────┐
    │ useDestination  │ │ ComparisonQueueContext               │
    │ Search          │ │ (useComparisonQueue)                │
    │                 │ │                                     │
    │ query ──────►   │ │ queue: ComparisonQueueItem[]        │
    │ search API ──►  │ │ addItem() ◄── useAddToQueue         │
    │ results ◄────   │ │ removeItem()                        │
    │ selectDest() ►  │ │ clearQueue()                        │
    │ → setDestination│ │ compareTrips() → POST /api/v1/compare│
    │   in searchParams│ │ comparisonResult: ComparisonResultState│
    └─────────────────┘ └─────────────────────────────────────┘
```

### Progressive Flow Data Dependencies

```
Step 1: SearchSection
  └── useDestinationSearch → selects destination
  └── useSearchFormParams → sets origin, travelers
  └── When isComplete → reveals CalendarSection

Step 2: CalendarSection
  └── useCalendarWeather.fetch(destination) → auto-fetches on reveal
  └── useDateRange → user clicks dates
  └── When dateRange.isComplete → reveals DateOptionBuilderSection

Step 3: DateOptionBuilderSection
  └── useDateDetails.fetchAll(...) → auto-fetches on reveal
  └── useHotelSelection → user picks hotel
  └── useAddToQueue.addToQueue(...) → user clicks "Add to Compare"

Step 4: ComparisonSection (visible when queue.count >= 2)
  └── useComparisonQueue.compareTrips() → user clicks "Compare"
  └── Renders comparisonResult.data (TripOption[] table)
```

---

## 14. Integration Matrix

Shows which hook is used by which component/section:

| Hook | Used By | Reads From API | Writes To |
|---|---|---|---|
| `useDestinationSearch` | `DestinationAutocomplete` | `GET /api/v1/search/destinations` | — |
| `useSearchFormParams` | `SearchSection` | — | — |
| `useCalendarWeather` | `CalendarSection` | `POST /api/v1/calendar` | — |
| `useDateRange` | `CalendarSection` | — | — |
| `useDateDetails` | `DateOptionBuilderSection` | `POST /api/v1/flights/price`, `POST /api/v1/hotels/search`, `POST /api/v1/weather` | — |
| `useHotelSelection` | `DateOptionBuilderSection` | — | — |
| `useAddToQueue` | `DateOptionBuilderSection` | — | `ComparisonQueueContext.addItem` |
| `useComparisonQueue` | `Header`, `ComparisonQueueFAB`, `ComparisonSection`, `useAddToQueue` | — (context consumer) | `ComparisonQueueContext` |
| `useDebounce` | `useDestinationSearch` (internal) | — | — |

### Hook → API Method Mapping

| Hook Method | API Method (from `src/lib/api.ts`) | API Endpoint |
|---|---|---|
| `useDestinationSearch` (internal fetch) | `searchDestinations(query)` | `GET /api/v1/search/destinations?q=` |
| `useCalendarWeather.fetch()` | `getCalendarWeather(request)` | `POST /api/v1/calendar` |
| `useDateDetails.fetchAll()` | `getFlightPrice(request)` | `POST /api/v1/flights/price` |
| `useDateDetails.fetchAll()` | `searchHotels(request)` | `POST /api/v1/hotels/search` |
| `useDateDetails.fetchAll()` | `getWeather(request)` | `POST /api/v1/weather` |
| `ComparisonQueueProvider.compareTrips()` | `compareTrips(request)` | `POST /api/v1/compare` |

---

## 15. Edge Cases Summary

| Hook | Edge Case | Behavior |
|---|---|---|
| `useDestinationSearch` | Query < 3 chars | Reset to idle, close dropdown, clear results |
| `useDestinationSearch` | API returns empty array | Set status to `'empty'`, show "No destinations found" |
| `useDestinationSearch` | Rapid typing | Debounce cancels previous pending request timer |
| `useDestinationSearch` | Component unmount during pending fetch | Cleanup cancels timeout; stale setState is a no-op |
| `useCalendarWeather` | Destination has no coordinates | Cannot happen — DestinationResult always has lat/lon |
| `useCalendarWeather` | API timeout (504) | Set status to `'error'`, user can click Retry |
| `useDateDetails` | Destination iata_code is null | Flight fetch uses `destination.iata_code!` — page must ensure iata_code is non-null before enabling date selection (enforced by `searchParams.isComplete` check) |
| `useDateDetails` | One fetch fails, others succeed | Each sub-state independent; only the failed section shows error + retry |
| `useDateDetails` | Hotel results empty (0 results) | Set hotels state to error with "No hotels found" message |
| `useHotelSelection` | Hotels re-fetched (retry) | Clear selection — user must re-select |
| `useAddToQueue` | Queue is full (5 items) | Return false, set `lastAddStatus` to `'full'` |
| `useAddToQueue` | Duplicate destination+dates | Return false, set `lastAddStatus` to `'duplicate'` |
| `useAddToQueue` | Same dates, different hotel | Treated as duplicate (ID is destination-dates, not hotel) |
| `useComparisonQueue` | Compare with < 2 items | Defensive error; button disabled in UI when count < 2 |
| `useComparisonQueue` | Queue modified after comparison | Auto-resets comparisonResult to idle |
| `useComparisonQueue` | Compare API returns 422 | Set comparisonResult to error with backend message |
| `useDateRange` | Click same date twice | First click: set start. If start already set and same date clicked again: no-op |
| `useDateRange` | Click date before current start | Replaces start date, clears end date |
| `useDebounce` | Rapid value changes | Only the last value after `delay` ms of quiet is emitted |
