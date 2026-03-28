# WhenToGo Frontend Specification — React Context Provider & Hooks for Comparison Queue State

> **Audience**: Ralph Loop (autonomous implementation agent)
> **Scope**: Complete, zero-ambiguity specification for the React Context provider, custom hooks, internal state, memoization strategy, and provider placement for the comparison queue.
> **File to create**: `frontend/src/context/ComparisonQueueContext.tsx`
> **Cross-references**: Types from `frontend/src/types/frontend.ts` (defined in `docs/frontend/frontend-spec.md` Section 1.3), API types from `frontend/src/types/api.ts`, constants from `frontend/src/types/constants.ts`, API service layer from `src/lib/api.ts`.

---

## Table of Contents

1. [Overview](#1-overview)
2. [File Location & Directive](#2-file-location--directive)
3. [Imports](#3-imports)
4. [Context Shape — ComparisonQueueContextValue](#4-context-shape--comparisonqueuecontextvalue)
5. [Internal State Variables](#5-internal-state-variables)
6. [Derived Values](#6-derived-values)
7. [Callback Implementations](#7-callback-implementations)
8. [Context Creation](#8-context-creation)
9. [Custom Hook — useComparisonQueue](#9-custom-hook--usecomparisonqueue)
10. [Provider Component — ComparisonQueueProvider](#10-provider-component--comparisonqueueprovider)
11. [Memoization Strategy](#11-memoization-strategy)
12. [Provider Placement in Component Tree](#12-provider-placement-in-component-tree)
13. [Helper Functions](#13-helper-functions)
14. [Consumer Components Reference](#14-consumer-components-reference)
15. [Complete Implementation Template](#15-complete-implementation-template)

---

## 1. Overview

The comparison queue is managed by a single React Context provider that holds two pieces of state:

1. **`queue`** — an array of `ComparisonQueueItem` objects (0–5 items).
2. **`comparisonResult`** — the result state from calling `POST /api/v1/compare`.

All derived values (`count`, `isFull`) are computed from `queue.length` — never stored as separate state. All mutations (`addItem`, `removeItem`, `clearQueue`, `compareTrips`, `resetComparison`) are exposed as stable callback references via `useCallback`.

**Key constraints:**
- In-memory only. No localStorage, no sessionStorage, no database. Queue resets on page refresh.
- Maximum 5 items (`MAX_QUEUE_SIZE` constant).
- Minimum 2 items to trigger comparison (`MIN_COMPARE_SIZE` constant).
- Scoring is backend-only. The frontend never computes `overall_score`, `cost_score`, `total_trip_cost`, or `cost_per_person`.
- The context value object is memoized with `useMemo` to prevent unnecessary re-renders.

---

## 2. File Location & Directive

```
frontend/src/context/ComparisonQueueContext.tsx
```

This file MUST start with the `'use client'` directive because it uses React hooks (`useState`, `useCallback`, `useMemo`, `useContext`, `createContext`).

```typescript
'use client';
```

---

## 3. Imports

Exact import statements for the file:

```typescript
'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import type {
  ComparisonQueueItem,
  ComparisonQueueContextValue,
  ComparisonResultState,
} from '@/types/frontend';
import type { CompareResponse, CompareOptionInput, WeatherSummaryInput } from '@/types/api';
import { MAX_QUEUE_SIZE, MIN_COMPARE_SIZE } from '@/types/constants';
import { compareTrips as apiCompareTrips } from '@/lib/api';
```

**Notes:**
- `axios` is imported directly (not from `@/lib/api`) solely for the `axios.isAxiosError()` type guard used in error extraction. All actual HTTP calls go through the centralized API service (`apiCompareTrips`).
- `CompareOptionInput` and `WeatherSummaryInput` are needed for the `queueItemToCompareInput` conversion function.

---

## 4. Context Shape — ComparisonQueueContextValue

The context exposes this exact interface (defined in `frontend/src/types/frontend.ts`):

```typescript
export interface ComparisonQueueContextValue {
  /** Current items in the comparison queue. Maximum 5. Read-only array — never mutate directly. */
  queue: ComparisonQueueItem[];

  /**
   * Add an item to the queue.
   * @param item - The ComparisonQueueItem to add.
   * @returns true if added successfully, false if queue is full (5 items) or duplicate exists.
   * Duplicate check: items with the same `id` (format: `${destination}-${startDate}-${endDate}`) are rejected.
   * Side effect: If comparison results exist (state !== 'idle'), calls resetComparison() to invalidate them.
   */
  addItem: (item: ComparisonQueueItem) => boolean;

  /**
   * Remove an item from the queue by its id.
   * @param id - The unique identifier of the item to remove.
   * No-op if id does not match any item. No error thrown.
   * Side effect: If comparison results exist (state !== 'idle'), calls resetComparison() to invalidate them.
   */
  removeItem: (id: string) => void;

  /**
   * Remove all items from the queue.
   * Side effect: If comparison results exist (state !== 'idle'), calls resetComparison() to invalidate them.
   */
  clearQueue: () => void;

  /** Whether the queue has reached maximum capacity (5 items). Derived: queue.length >= MAX_QUEUE_SIZE. */
  isFull: boolean;

  /** Number of items currently in the queue. Derived: queue.length. */
  count: number;

  /** Comparison results from the backend. Tracks loading/success/error states. */
  comparisonResult: ComparisonResultState;

  /**
   * Send the current queue to POST /api/v1/compare and store results.
   * Requires queue.length >= MIN_COMPARE_SIZE (2).
   * Sets comparisonResult.state to "loading" → then "success" or "error".
   * Does NOT modify the queue itself.
   */
  compareTrips: () => Promise<void>;

  /**
   * Reset comparison results to idle state.
   * Sets comparisonResult to { state: 'idle', data: null, error: null }.
   * Called automatically by addItem, removeItem, clearQueue when results exist.
   * Can also be called directly if needed.
   */
  resetComparison: () => void;
}
```

---

## 5. Internal State Variables

The provider component uses exactly two `useState` calls:

| # | State Variable | Type | Initial Value | Purpose |
|---|---|---|---|---|
| 1 | `queue` | `ComparisonQueueItem[]` | `[]` | The ordered list of queued trip options |
| 2 | `comparisonResult` | `ComparisonResultState` | `{ state: 'idle', data: null, error: null }` | Tracks the compare API call lifecycle |

```typescript
const [queue, setQueue] = useState<ComparisonQueueItem[]>([]);
const [comparisonResult, setComparisonResult] = useState<ComparisonResultState>({
  state: 'idle',
  data: null,
  error: null,
});
```

**Do NOT create additional state variables** for `count`, `isFull`, or any other derived value. These are computed inline in the `useMemo` block.

---

## 6. Derived Values

These are computed from `queue` — never stored as state:

| Derived Value | Type | Computation | Where Computed |
|---|---|---|---|
| `count` | `number` | `queue.length` | Inside `useMemo` block |
| `isFull` | `boolean` | `queue.length >= MAX_QUEUE_SIZE` | Inside `useMemo` block |

---

## 7. Callback Implementations

Each callback is wrapped in `useCallback` with appropriate dependencies.

### 7.1 `resetComparison`

```typescript
const resetComparison = useCallback(() => {
  setComparisonResult({ state: 'idle', data: null, error: null });
}, []);
```

**Dependencies**: `[]` (empty — only calls a state setter which has a stable reference).

### 7.2 `addItem`

```typescript
const addItem = useCallback((item: ComparisonQueueItem): boolean => {
  // 1. Check capacity
  if (queue.length >= MAX_QUEUE_SIZE) {
    return false;
  }

  // 2. Check for duplicate
  if (queue.some((existing) => existing.id === item.id)) {
    return false;
  }

  // 3. Add item
  setQueue((prev) => [...prev, item]);

  // 4. Invalidate stale comparison results
  if (comparisonResult.state !== 'idle') {
    resetComparison();
  }

  return true;
}, [queue, comparisonResult.state, resetComparison]);
```

**Dependencies**: `[queue, comparisonResult.state, resetComparison]`

**Why `queue` is a dependency (not using functional updater for checks):** The `addItem` function needs to read the current queue to check capacity and duplicates *before* deciding whether to proceed. The functional updater form `setQueue(prev => ...)` only allows reading `prev` inside the updater. We need the checks to happen synchronously to return `true`/`false`. Therefore, `queue` must be in the dependency array.

**Return value:**
- `true` — item was successfully added.
- `false` — item was NOT added (queue full OR duplicate). The caller (`DateOptionBuilderSection`) uses `isFull` and its own duplicate check to determine the reason and show the appropriate tooltip. The `addItem` return value is a final safety check.

### 7.3 `removeItem`

```typescript
const removeItem = useCallback((id: string): void => {
  setQueue((prev) => prev.filter((item) => item.id !== id));

  // Invalidate stale comparison results
  if (comparisonResult.state !== 'idle') {
    resetComparison();
  }
}, [comparisonResult.state, resetComparison]);
```

**Dependencies**: `[comparisonResult.state, resetComparison]`

**Edge case**: If `id` does not match any item, `filter` returns the same-length array. React's state comparison will detect no change and skip re-render. No error is thrown.

### 7.4 `clearQueue`

```typescript
const clearQueue = useCallback((): void => {
  setQueue([]);

  // Invalidate stale comparison results
  if (comparisonResult.state !== 'idle') {
    resetComparison();
  }
}, [comparisonResult.state, resetComparison]);
```

**Dependencies**: `[comparisonResult.state, resetComparison]`

### 7.5 `compareTrips`

```typescript
const compareTrips = useCallback(async (): Promise<void> => {
  // 1. Defensive check: minimum 2 items required
  if (queue.length < MIN_COMPARE_SIZE) {
    setComparisonResult({
      state: 'error',
      data: null,
      error: 'At least 2 options are required for comparison',
    });
    return;
  }

  // 2. Set loading state
  setComparisonResult({ state: 'loading', data: null, error: null });

  try {
    // 3. Convert queue items to API request format
    const options: CompareOptionInput[] = queue.map(queueItemToCompareInput);

    // 4. Call the centralized API service
    const response: CompareResponse = await apiCompareTrips({ options });

    // 5. Store success result
    setComparisonResult({ state: 'success', data: response, error: null });
  } catch (error: unknown) {
    // 6. Extract and store error message
    const message = extractErrorMessage(error);
    setComparisonResult({ state: 'error', data: null, error: message });
  }
}, [queue]);
```

**Dependencies**: `[queue]`

**Important behavior when queue is modified during loading:**
If the user modifies the queue while the compare API call is in-flight (e.g., removes an item), `removeItem`/`addItem`/`clearQueue` will call `resetComparison()`, which sets `comparisonResult` to idle. When the in-flight API call completes, its `setComparisonResult` call will overwrite the idle state with success/error. This is acceptable — the results will reflect the *previous* queue contents. The "Compare" button re-enables so the user can re-compare with the updated queue.

**No explicit request cancellation** is implemented. The API call completes naturally, and its result is stored. This simplifies the implementation and avoids AbortController complexity.

---

## 8. Context Creation

```typescript
const ComparisonQueueContext = createContext<ComparisonQueueContextValue | null>(null);
```

**The default value is `null`**, not an object with mock functions. This is intentional:
- It forces consumers to use the `useComparisonQueue` hook (which throws if context is null).
- It prevents silent bugs where a component accidentally renders outside the provider and gets no-op functions.

**Do NOT export `ComparisonQueueContext` directly.** Only export `ComparisonQueueProvider` and `useComparisonQueue`.

---

## 9. Custom Hook — useComparisonQueue

```typescript
/**
 * Custom hook to access the comparison queue context.
 *
 * @returns ComparisonQueueContextValue — the full context value.
 * @throws Error if called outside of ComparisonQueueProvider.
 *
 * Usage:
 *   const { queue, addItem, removeItem, count, isFull, compareTrips, comparisonResult } = useComparisonQueue();
 */
export function useComparisonQueue(): ComparisonQueueContextValue {
  const ctx = useContext(ComparisonQueueContext);
  if (ctx === null) {
    throw new Error('useComparisonQueue must be used within a ComparisonQueueProvider');
  }
  return ctx;
}
```

**Exports:**
- This hook is a **named export** (not default).
- Components import it as: `import { useComparisonQueue } from '@/context/ComparisonQueueContext';`

**Error message**: The exact string `'useComparisonQueue must be used within a ComparisonQueueProvider'` — not a generic message. This helps debug provider placement issues.

---

## 10. Provider Component — ComparisonQueueProvider

```typescript
/**
 * ComparisonQueueProvider wraps the application and provides comparison queue state
 * to all descendant components via React Context.
 *
 * @param props.children - Child components to render within the provider.
 * @returns JSX.Element wrapping children in the context provider.
 *
 * Placement: Inside ThemeRegistry, wrapping AppShell and all page content.
 * See Section 12 for exact component tree.
 */
export function ComparisonQueueProvider({ children }: { children: React.ReactNode }): JSX.Element {
  // ... state, callbacks, and memoized value (see Sections 5–7, 11)

  return (
    <ComparisonQueueContext.Provider value={value}>
      {children}
    </ComparisonQueueContext.Provider>
  );
}
```

**Exports:**
- This component is a **named export** (not default).
- Layout imports it as: `import { ComparisonQueueProvider } from '@/context/ComparisonQueueContext';`

**Props interface** (inline, not separately exported):

```typescript
{ children: React.ReactNode }
```

No other props. The provider is stateless from the parent's perspective — all state is internal.

---

## 11. Memoization Strategy

### 11.1 Context Value Memoization

The context value object MUST be memoized with `useMemo` to prevent unnecessary re-renders of all consumer components on every provider render:

```typescript
const value = useMemo<ComparisonQueueContextValue>(
  () => ({
    queue,
    addItem,
    removeItem,
    clearQueue,
    isFull: queue.length >= MAX_QUEUE_SIZE,
    count: queue.length,
    comparisonResult,
    compareTrips,
    resetComparison,
  }),
  [queue, comparisonResult, addItem, removeItem, clearQueue, compareTrips, resetComparison]
);
```

### 11.2 Callback Stability

All five callbacks MUST be wrapped in `useCallback` (as shown in Section 7). This ensures:
- The `useMemo` dependency array only changes when actual state changes.
- Consumer components that destructure individual callbacks (e.g., `const { addItem } = useComparisonQueue()`) get stable references.

### 11.3 Re-render Triggers

The context value changes (and consumers re-render) ONLY when:

| Trigger | What changes | Which consumers are affected |
|---|---|---|
| `addItem()` succeeds | `queue` changes → `count`, `isFull` update; `addItem`, `clearQueue`, `removeItem`, `compareTrips` get new references (queue dependency) | All consumers |
| `removeItem()` called | `queue` changes (same as above) | All consumers |
| `clearQueue()` called | `queue` changes (same as above) | All consumers |
| `compareTrips()` starts | `comparisonResult` → `{ state: 'loading', ... }` | ComparisonSection |
| `compareTrips()` succeeds | `comparisonResult` → `{ state: 'success', data: ... }` | ComparisonSection |
| `compareTrips()` fails | `comparisonResult` → `{ state: 'error', error: ... }` | ComparisonSection |
| `resetComparison()` called | `comparisonResult` → `{ state: 'idle', ... }` | ComparisonSection |

**Note:** All consumers re-render when queue changes because the entire context value object is replaced. This is acceptable for this application's scale (max 6 consumers). If performance were a concern, the context could be split into separate queue and comparison contexts — but this is NOT required for this MVP.

---

## 12. Provider Placement in Component Tree

### 12.1 Exact Component Hierarchy

```
// frontend/src/app/layout.tsx (Server Component)
<html>
  <body>
    <ThemeRegistry>                          {/* Client Component — MUI theme + Emotion */}
      <ComparisonQueueProvider>              {/* ← THE PROVIDER — Client Component */}
        {children}                           {/* Page content from page.tsx */}
      </ComparisonQueueProvider>
    </ThemeRegistry>
  </body>
</html>
```

### 12.2 layout.tsx Implementation

```typescript
// frontend/src/app/layout.tsx
import type { Metadata } from 'next';
import ThemeRegistry from '@/theme/ThemeRegistry';
import { ComparisonQueueProvider } from '@/context/ComparisonQueueContext';

export const metadata: Metadata = {
  title: 'WhenToGo — Find the Best Travel Dates',
  description: 'Compare flight prices, hotel rates, and weather to find your optimal travel window.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <ComparisonQueueProvider>
            {children}
          </ComparisonQueueProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
```

**Key points:**
- `RootLayout` is a Server Component (no `'use client'` directive). It can import Client Components.
- `ThemeRegistry` is the outermost Client Component (provides MUI theme context).
- `ComparisonQueueProvider` is nested inside `ThemeRegistry` so it can use MUI components if needed in the future.
- All page content (`{children}`) is wrapped by the provider, so every component in the tree can call `useComparisonQueue()`.

### 12.3 Full Consumer Tree

```
ComparisonQueueProvider
├── AppShell
│   ├── Header                               → useComparisonQueue() reads: count
│   ├── PageContainer
│   │   ├── SearchSection                    → does NOT use the hook
│   │   ├── CalendarSection                  → does NOT use the hook
│   │   ├── DateOptionBuilderSection         → useComparisonQueue() reads: isFull, queue; writes: addItem
│   │   └── ComparisonSection                → useComparisonQueue() reads: queue, count, comparisonResult; writes: removeItem, clearQueue, compareTrips
│   ├── ComparisonQueueFAB                   → useComparisonQueue() reads: count
│   └── Footer                               → does NOT use the hook
└── (HomePage reads queueCount for progressive reveal visibility)
```

---

## 13. Helper Functions

These are module-level functions defined in `ComparisonQueueContext.tsx`, NOT exported. They are implementation details of the provider.

### 13.1 queueItemToCompareInput

Converts a frontend `ComparisonQueueItem` to the API request format `CompareOptionInput`:

```typescript
/**
 * Convert a ComparisonQueueItem (frontend camelCase) to CompareOptionInput (API snake_case).
 * Intentionally omits weather.daily[] — the compare endpoint only needs summary scores.
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
    } satisfies WeatherSummaryInput,
    traveler_count: item.travelerCount,
  };
}
```

**Field mapping (camelCase → snake_case):**

| ComparisonQueueItem (frontend) | CompareOptionInput (API) |
|---|---|
| `destination` | `destination` |
| `startDate` | `start_date` |
| `endDate` | `end_date` |
| `flightPrice` | `flight_price` |
| `hotelName` | `hotel_name` |
| `hotelPrice` | `hotel_price` |
| `weather.average_temp` | `weather.average_temp` |
| `weather.rain_signal` | `weather.rain_signal` |
| `weather.weather_score` | `weather.weather_score` |
| `weather.label` | `weather.label` |
| `travelerCount` | `traveler_count` |
| `id` | *(not sent)* |
| `originAirport` | *(not sent)* |
| `weather.daily` | *(not sent)* |

### 13.2 extractErrorMessage

Extracts a user-friendly error message from caught exceptions:

```typescript
/**
 * Extract a human-readable error message from an unknown error.
 * Handles AxiosError responses, network errors, timeouts, and unknown errors.
 */
function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // Server returned an error response with a message
    if (error.response?.data?.message) {
      return error.response.data.message as string;
    }
    // Server returned an error response with an error code
    if (error.response?.data?.error) {
      return error.response.data.error as string;
    }
    // Request timed out
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }
    // No response received (network error)
    if (!error.response) {
      return 'Network error. Please check your connection and try again.';
    }
  }
  // Fallback for non-Axios errors
  return 'Failed to compare trip options. Please try again.';
}
```

**Error message mapping:**

| Scenario | Axios Property | Returned Message |
|---|---|---|
| 400 Bad Request | `error.response.data.message` | Server-provided message (e.g., "Query parameter 'q' is required") |
| 422 Validation Error | `error.response.data.message` | Server-provided message (e.g., "At least 2 options are required for comparison") |
| 500 Internal Error | `error.response.data.message` | Server-provided message (e.g., "An unexpected error occurred") |
| 504 Gateway Timeout | `error.response.data.message` | Server-provided message (e.g., "External API request timed out after 10 seconds") |
| Client timeout | `error.code === 'ECONNABORTED'` | "Request timed out. Please try again." |
| Network error | `!error.response` | "Network error. Please check your connection and try again." |
| Unknown error | *(none of the above)* | "Failed to compare trip options. Please try again." |

---

## 14. Consumer Components Reference

Quick reference for how each consumer accesses the context:

### 14.1 Header (read-only)

```typescript
// frontend/src/components/layout/Header.tsx
'use client';

import { useComparisonQueue } from '@/context/ComparisonQueueContext';

export default function Header() {
  const { count } = useComparisonQueue();
  // Renders Badge with count when count > 0
}
```

### 14.2 ComparisonQueueFAB (read-only)

```typescript
// frontend/src/components/layout/ComparisonQueueFAB.tsx
'use client';

import { useComparisonQueue } from '@/context/ComparisonQueueContext';
import { MAX_QUEUE_SIZE } from '@/types/constants';

export default function ComparisonQueueFAB() {
  const { count } = useComparisonQueue();
  // Returns null when count === 0
  // Renders Fab with Badge when count > 0
  // Badge color changes to 'error' when count >= MAX_QUEUE_SIZE
}
```

### 14.3 DateOptionBuilderSection (read + write)

```typescript
// frontend/src/components/sections/DateOptionBuilderSection.tsx
'use client';

import { useComparisonQueue } from '@/context/ComparisonQueueContext';

export default function DateOptionBuilderSection(/* props */) {
  const { addItem, isFull, queue } = useComparisonQueue();

  // Uses isFull to disable "Add to Compare" button
  // Uses queue to check for duplicate IDs
  // Calls addItem(assembledItem) on button click
}
```

### 14.4 ComparisonSection (read + write)

```typescript
// frontend/src/components/sections/ComparisonSection.tsx
'use client';

import { useComparisonQueue } from '@/context/ComparisonQueueContext';

export default function ComparisonSection(/* props */) {
  const {
    queue,
    count,
    removeItem,
    clearQueue,
    comparisonResult,
    compareTrips,
  } = useComparisonQueue();

  // Renders queue items as QueueItemCard components
  // Calls removeItem(id) from QueueItemCard's onRemove callback
  // Calls clearQueue() from "Clear All" button
  // Calls compareTrips() from "Compare" button
  // Renders comparison results based on comparisonResult.state
}
```

### 14.5 HomePage (read-only, for progressive reveal)

```typescript
// frontend/src/app/page.tsx
'use client';

import { useComparisonQueue } from '@/context/ComparisonQueueContext';

export default function HomePage() {
  const { count: queueCount } = useComparisonQueue();

  // Uses queueCount >= 1 to control ComparisonSection visibility
}
```

---

## 15. Complete Implementation Template

This is the full file that Ralph Loop should create. All logic, types, and patterns are specified — implement exactly as shown:

```typescript
// frontend/src/context/ComparisonQueueContext.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import type {
  ComparisonQueueItem,
  ComparisonQueueContextValue,
  ComparisonResultState,
} from '@/types/frontend';
import type { CompareResponse, CompareOptionInput, WeatherSummaryInput } from '@/types/api';
import { MAX_QUEUE_SIZE, MIN_COMPARE_SIZE } from '@/types/constants';
import { compareTrips as apiCompareTrips } from '@/lib/api';

// ── Helper Functions (not exported) ─────────────────────────

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
    } satisfies WeatherSummaryInput,
    traveler_count: item.travelerCount,
  };
}

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message as string;
    }
    if (error.response?.data?.error) {
      return error.response.data.error as string;
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }
    if (!error.response) {
      return 'Network error. Please check your connection and try again.';
    }
  }
  return 'Failed to compare trip options. Please try again.';
}

// ── Context ─────────────────────────────────────────────────

const ComparisonQueueContext = createContext<ComparisonQueueContextValue | null>(null);

// ── Hook ────────────────────────────────────────────────────

export function useComparisonQueue(): ComparisonQueueContextValue {
  const ctx = useContext(ComparisonQueueContext);
  if (ctx === null) {
    throw new Error('useComparisonQueue must be used within a ComparisonQueueProvider');
  }
  return ctx;
}

// ── Provider ────────────────────────────────────────────────

export function ComparisonQueueProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [queue, setQueue] = useState<ComparisonQueueItem[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResultState>({
    state: 'idle',
    data: null,
    error: null,
  });

  const resetComparison = useCallback(() => {
    setComparisonResult({ state: 'idle', data: null, error: null });
  }, []);

  const addItem = useCallback(
    (item: ComparisonQueueItem): boolean => {
      if (queue.length >= MAX_QUEUE_SIZE) {
        return false;
      }
      if (queue.some((existing) => existing.id === item.id)) {
        return false;
      }
      setQueue((prev) => [...prev, item]);
      if (comparisonResult.state !== 'idle') {
        resetComparison();
      }
      return true;
    },
    [queue, comparisonResult.state, resetComparison]
  );

  const removeItem = useCallback(
    (id: string): void => {
      setQueue((prev) => prev.filter((item) => item.id !== id));
      if (comparisonResult.state !== 'idle') {
        resetComparison();
      }
    },
    [comparisonResult.state, resetComparison]
  );

  const clearQueue = useCallback((): void => {
    setQueue([]);
    if (comparisonResult.state !== 'idle') {
      resetComparison();
    }
  }, [comparisonResult.state, resetComparison]);

  const compareTrips = useCallback(async (): Promise<void> => {
    if (queue.length < MIN_COMPARE_SIZE) {
      setComparisonResult({
        state: 'error',
        data: null,
        error: 'At least 2 options are required for comparison',
      });
      return;
    }

    setComparisonResult({ state: 'loading', data: null, error: null });

    try {
      const options: CompareOptionInput[] = queue.map(queueItemToCompareInput);
      const response: CompareResponse = await apiCompareTrips({ options });
      setComparisonResult({ state: 'success', data: response, error: null });
    } catch (error: unknown) {
      const message = extractErrorMessage(error);
      setComparisonResult({ state: 'error', data: null, error: message });
    }
  }, [queue]);

  const value = useMemo<ComparisonQueueContextValue>(
    () => ({
      queue,
      addItem,
      removeItem,
      clearQueue,
      isFull: queue.length >= MAX_QUEUE_SIZE,
      count: queue.length,
      comparisonResult,
      compareTrips,
      resetComparison,
    }),
    [queue, comparisonResult, addItem, removeItem, clearQueue, compareTrips, resetComparison]
  );

  return (
    <ComparisonQueueContext.Provider value={value}>
      {children}
    </ComparisonQueueContext.Provider>
  );
}
```

**Exports from this file:**
- `useComparisonQueue` (named export — custom hook)
- `ComparisonQueueProvider` (named export — provider component)

**NOT exported:**
- `ComparisonQueueContext` (internal implementation detail)
- `queueItemToCompareInput` (internal helper)
- `extractErrorMessage` (internal helper)

---

## Summary: Implementation Checklist

1. Create `frontend/src/context/ComparisonQueueContext.tsx` using the template in Section 15.
2. Ensure `ComparisonQueueContextValue`, `ComparisonQueueItem`, and `ComparisonResultState` are defined in `frontend/src/types/frontend.ts` (see `docs/frontend/frontend-spec.md` Section 1.3).
3. Ensure `MAX_QUEUE_SIZE = 5` and `MIN_COMPARE_SIZE = 2` are defined in `frontend/src/types/constants.ts`.
4. Ensure `compareTrips` function is defined in `frontend/src/lib/api.ts` (see `docs/frontend/frontend-spec-api-service-layer.md` or `frontend-spec.md`).
5. Wrap `{children}` in `ComparisonQueueProvider` inside `layout.tsx`, nested within `ThemeRegistry`.
6. In every consumer component, import `useComparisonQueue` from `@/context/ComparisonQueueContext` and destructure only the fields needed.
7. Never create a second context for comparison state — everything goes through this single provider.
