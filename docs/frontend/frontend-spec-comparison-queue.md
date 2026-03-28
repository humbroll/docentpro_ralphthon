# WhenToGo Frontend Specification — Comparison Queue Mechanism

> **Audience**: Ralph Loop (autonomous implementation agent)
> **Scope**: Complete specification for the comparison queue — add/remove up to 5 date options, React Context state management, UI components, edge cases, and integration with the comparison endpoint.
> **Cross-references**: Types from `frontend/src/types/api.ts`, frontend types from `docs/frontend/frontend-spec.md` Section 1, layout from Section 2, API layer from `src/lib/api.ts`.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Model](#2-data-model)
3. [React Context Provider](#3-react-context-provider)
4. [Queue Operations — Detailed Behavior](#4-queue-operations--detailed-behavior)
5. [Components That Read/Write the Queue](#5-components-that-readwrite-the-queue)
6. [Add-to-Queue Flow (Step-by-Step)](#6-add-to-queue-flow-step-by-step)
7. [Remove-from-Queue Flow](#7-remove-from-queue-flow)
8. [Compare Flow (Queue → Backend → Results)](#8-compare-flow-queue--backend--results)
9. [Queue UI Components — Signatures & Layout](#9-queue-ui-components--signatures--layout)
10. [Edge Cases & Boundary Conditions](#10-edge-cases--boundary-conditions)
11. [State Transition Diagrams](#11-state-transition-diagrams)
12. [Integration Points with Other Sections](#12-integration-points-with-other-sections)
13. [Constants Reference](#13-constants-reference)

---

## 1. Overview

The comparison queue is a **frontend-local, in-memory** collection of up to 5 `ComparisonQueueItem` objects. It is the central mechanism for the "build and compare" workflow:

1. User assembles a date option by selecting dates, viewing flights/hotels/weather, and picking a hotel.
2. User clicks "Add to Compare" to enqueue the assembled option.
3. User repeats steps 1–2 for different date ranges (up to 5 total).
4. When the queue has ≥2 items, user clicks "Compare" to send all items to `POST /api/v1/compare`.
5. Backend scores and ranks options; results are displayed in the ComparisonSection.

**Key constraints:**
- Maximum 5 items in the queue (constant `MAX_QUEUE_SIZE = 5`).
- Minimum 2 items required for comparison (constant `MIN_COMPARE_SIZE = 2`).
- Queue resets on page refresh (no persistence — no localStorage, no sessionStorage, no database).
- Duplicate detection by item `id` (format: `${destination}-${startDate}-${endDate}`).
- Scoring is **backend-only** — the frontend never computes `overall_score`, `cost_score`, `total_trip_cost`, or `cost_per_person`. These are returned by `POST /api/v1/compare`.

---

## 2. Data Model

### 2.1 ComparisonQueueItem

Defined in `frontend/src/types/frontend.ts` (see `docs/frontend/frontend-spec.md` Section 1.3):

```typescript
export interface ComparisonQueueItem {
  /** Unique ID: `${destination}-${startDate}-${endDate}` */
  id: string;
  /** Destination city name, e.g. "Tokyo" */
  destination: string;
  /** Trip start date "YYYY-MM-DD" */
  startDate: string;
  /** Trip end date "YYYY-MM-DD" */
  endDate: string;
  /** Origin airport IATA code, e.g. "ICN" */
  originAirport: string;
  /** Flight price per person in USD */
  flightPrice: number;
  /** Selected hotel name */
  hotelName: string;
  /** Total hotel cost in USD (all nights, all rooms) */
  hotelPrice: number;
  /** Weather summary for the date range */
  weather: WeatherSummary;
  /** Number of travelers */
  travelerCount: number;
}
```

### 2.2 ComparisonResultState

Tracks the response from `POST /api/v1/compare`:

```typescript
export interface ComparisonResultState {
  state: LoadingState; // "idle" | "loading" | "success" | "error"
  data: CompareResponse | null;
  error: string | null;
}
```

### 2.3 ComparisonQueueContextValue

The full shape of the React Context value:

```typescript
export interface ComparisonQueueContextValue {
  queue: ComparisonQueueItem[];
  addItem: (item: ComparisonQueueItem) => boolean;
  removeItem: (id: string) => void;
  clearQueue: () => void;
  isFull: boolean;
  count: number;
  comparisonResult: ComparisonResultState;
  compareTrips: () => Promise<void>;
  resetComparison: () => void;
}
```

### 2.4 ID Generation Formula

```typescript
// Used when assembling a ComparisonQueueItem:
const id = `${destination.name}-${dateRange.startDate}-${dateRange.endDate}`;
// Example: "Tokyo-2026-05-01-2026-05-05"
```

Two items with the same `id` are considered duplicates. Same destination + same dates = duplicate, **even if different hotels are selected**. This is intentional: users should compare different date ranges, not different hotels for the same dates.

---

## 3. React Context Provider

### 3.1 File Location

```
frontend/src/context/ComparisonQueueContext.tsx
```

### 3.2 Provider Component

```typescript
// frontend/src/context/ComparisonQueueContext.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ComparisonQueueItem, ComparisonQueueContextValue, ComparisonResultState } from '@/types/frontend';
import type { CompareResponse } from '@/types/api';
import { MAX_QUEUE_SIZE } from '@/types/constants';
import { compareTrips as apiCompareTrips } from '@/lib/api';
```

### 3.3 Implementation Specification

```typescript
/**
 * ComparisonQueueProvider wraps the application and provides queue state.
 * Placed inside ThemeRegistry in the component tree (see layout spec).
 *
 * Internal state:
 *   - queue: ComparisonQueueItem[] — initialized as []
 *   - comparisonResult: ComparisonResultState — initialized as { state: 'idle', data: null, error: null }
 *
 * All derived values (count, isFull) are computed from queue.length, not stored separately.
 */
export function ComparisonQueueProvider({ children }: { children: React.ReactNode }): JSX.Element;
```

**Internal state variables:**

| State Variable | Type | Initial Value |
|---|---|---|
| `queue` | `ComparisonQueueItem[]` | `[]` |
| `comparisonResult` | `ComparisonResultState` | `{ state: 'idle', data: null, error: null }` |

**Derived values (computed, not stored):**

| Derived | Computation |
|---|---|
| `count` | `queue.length` |
| `isFull` | `queue.length >= MAX_QUEUE_SIZE` |

### 3.4 Context Creation & Hook

```typescript
const ComparisonQueueContext = createContext<ComparisonQueueContextValue | null>(null);

/**
 * Custom hook to access the comparison queue context.
 * Throws if used outside ComparisonQueueProvider.
 */
export function useComparisonQueue(): ComparisonQueueContextValue {
  const ctx = useContext(ComparisonQueueContext);
  if (!ctx) {
    throw new Error('useComparisonQueue must be used within a ComparisonQueueProvider');
  }
  return ctx;
}
```

### 3.5 Provider Placement in Component Tree

```
RootLayout (Server Component)
└── ThemeRegistry (Client Component)
    └── ComparisonQueueProvider  ← HERE
        └── AppShell
            ├── Header          ← reads count via useComparisonQueue
            ├── PageContainer
            │   ├── SearchSection
            │   ├── CalendarSection
            │   ├── DateOptionBuilderSection  ← calls addItem
            │   └── ComparisonSection          ← reads queue, calls compareTrips
            ├── ComparisonQueueFAB            ← reads count via useComparisonQueue
            └── Footer
```

---

## 4. Queue Operations — Detailed Behavior

### 4.1 `addItem(item: ComparisonQueueItem) => boolean`

**Purpose**: Add a new date option to the comparison queue.

**Algorithm:**

```
1. IF queue.length >= MAX_QUEUE_SIZE (5):
     RETURN false   // Queue is full, item NOT added
2. IF queue.some(existing => existing.id === item.id):
     RETURN false   // Duplicate detected, item NOT added
3. Append item to queue:
     setQueue(prev => [...prev, item])
4. IF comparisonResult.state !== 'idle':
     Call resetComparison()   // Invalidate stale comparison results
5. RETURN true   // Item successfully added
```

**Return value semantics:**
- `true` — item was successfully added to the queue.
- `false` — item was NOT added. Caller must check `isFull` and duplicate to determine reason.

**Side effect on comparison results:** Any modification to the queue (add, remove, clear) invalidates existing comparison results by calling `resetComparison()`. This ensures the user always sees results that reflect the current queue contents.

### 4.2 `removeItem(id: string) => void`

**Purpose**: Remove a specific date option from the queue by its ID.

**Algorithm:**

```
1. setQueue(prev => prev.filter(item => item.id !== id))
2. IF comparisonResult.state !== 'idle':
     Call resetComparison()   // Invalidate stale comparison results
```

**Edge case:** If `id` does not match any item in the queue, the operation is a no-op (no error thrown, no state change).

### 4.3 `clearQueue() => void`

**Purpose**: Remove all items from the queue.

**Algorithm:**

```
1. setQueue([])
2. IF comparisonResult.state !== 'idle':
     Call resetComparison()   // Invalidate stale comparison results
```

### 4.4 `compareTrips() => Promise<void>`

**Purpose**: Send all queued items to `POST /api/v1/compare` for scoring and ranking.

**Precondition**: `queue.length >= MIN_COMPARE_SIZE (2)`. The "Compare" button is disabled when `count < 2`, so this should never be called with fewer than 2 items. But defensively:

**Algorithm:**

```
1. IF queue.length < MIN_COMPARE_SIZE (2):
     Set comparisonResult to { state: 'error', data: null, error: 'At least 2 options are required for comparison' }
     RETURN

2. Set comparisonResult to { state: 'loading', data: null, error: null }

3. Convert queue items to API format:
     const options: CompareOptionInput[] = queue.map(queueItemToCompareInput)

4. TRY:
     const response: CompareResponse = await apiCompareTrips({ options })
     Set comparisonResult to { state: 'success', data: response, error: null }

5. CATCH (error):
     Extract error message:
       - If AxiosError with response.data.message: use that message
       - If AxiosError with response.data.error: use that error string
       - Otherwise: use 'Failed to compare trip options. Please try again.'
     Set comparisonResult to { state: 'error', data: null, error: extractedMessage }
```

**Type conversion** (see Section 1.7 of `frontend-spec.md`):

```typescript
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
      // daily[] intentionally omitted — compare endpoint doesn't need it
    },
    traveler_count: item.travelerCount,
  };
}
```

### 4.5 `resetComparison() => void`

**Purpose**: Reset comparison results to idle state.

**Algorithm:**

```
1. Set comparisonResult to { state: 'idle', data: null, error: null }
```

**Called by**: `addItem`, `removeItem`, `clearQueue` — any mutation that changes queue contents.

### 4.6 Memoization

The context value object MUST be memoized with `useMemo` to prevent unnecessary re-renders of consumers:

```typescript
const value = useMemo<ComparisonQueueContextValue>(() => ({
  queue,
  addItem,
  removeItem,
  clearQueue,
  isFull: queue.length >= MAX_QUEUE_SIZE,
  count: queue.length,
  comparisonResult,
  compareTrips,
  resetComparison,
}), [queue, comparisonResult, addItem, removeItem, clearQueue, compareTrips, resetComparison]);
```

All callback functions (`addItem`, `removeItem`, `clearQueue`, `compareTrips`, `resetComparison`) MUST be wrapped in `useCallback` to maintain stable references.

---

## 5. Components That Read/Write the Queue

| Component | File | Reads | Writes | How |
|---|---|---|---|---|
| **Header** | `src/components/layout/Header.tsx` | `count` | — | Displays badge with queue count |
| **ComparisonQueueFAB** | `src/components/layout/ComparisonQueueFAB.tsx` | `count` | — | Shows/hides FAB, displays count badge |
| **DateOptionBuilderSection** | `src/components/sections/DateOptionBuilderSection.tsx` | `isFull`, `queue` | `addItem` | "Add to Compare" button; checks full/duplicate |
| **ComparisonSection** | `src/components/sections/ComparisonSection.tsx` | `queue`, `count`, `comparisonResult` | `removeItem`, `clearQueue`, `compareTrips` | Queue list, compare button, results display |
| **HomePage** | `src/app/page.tsx` | `count` | — | Controls ComparisonSection visibility (`count >= 1`) |

---

## 6. Add-to-Queue Flow (Step-by-Step)

This describes the complete user interaction from assembling a date option to adding it to the queue.

### 6.1 Prerequisites (state that must exist before "Add to Compare" is enabled)

All of the following must be non-null and in `success` state:

| Data | Source | Stored in |
|---|---|---|
| `selectedDestination` | User selected from autocomplete | `HomePage` local state |
| `dateRange` (`startDate`, `endDate`) | User selected from calendar | `HomePage` local state |
| `originAirport` | User entered IATA code | `HomePage` local state (from SearchParams) |
| `travelerCount` | User entered count | `HomePage` local state (from SearchParams) |
| `flightPrice` | `POST /api/v1/flights/price` response | `DateOptionBuilderSection` local state |
| `selectedHotel` | User clicked "Select" on a HotelOption | `DateOptionBuilderSection` local state |
| `weatherSummary` | `POST /api/v1/weather` response | `DateOptionBuilderSection` local state |

### 6.2 "Add to Compare" Button State

Located in `DateOptionBuilderSection`, at the bottom of the section after hotel selection.

```typescript
interface AddToCompareButtonState {
  /** Button is disabled if any prerequisite is missing OR queue is full AND this would be a duplicate */
  disabled: boolean;
  /** Tooltip text explaining why button is disabled, or null if enabled */
  tooltipText: string | null;
}
```

**Button disable logic:**

```
IF selectedHotel is null:
  disabled = true, tooltip = "Select a hotel first"
ELSE IF isFull:
  disabled = true, tooltip = "Comparison queue is full (maximum 5)"
ELSE IF queue.some(item => item.id === generatedId):
  disabled = true, tooltip = "This date range is already in the queue"
ELSE:
  disabled = false, tooltip = null
```

Where `generatedId = ${destination.name}-${startDate}-${endDate}`.

### 6.3 "Add to Compare" Click Handler

```typescript
const handleAddToCompare = () => {
  // 1. Assemble the ComparisonQueueItem
  const item: ComparisonQueueItem = {
    id: `${selectedDestination.name}-${dateRange.startDate}-${dateRange.endDate}`,
    destination: selectedDestination.name,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    originAirport: searchParams.originAirport,
    flightPrice: flightData.price,
    hotelName: selectedHotel.hotel_name,
    hotelPrice: selectedHotel.total_price,
    weather: weatherData, // full WeatherSummary object
    travelerCount: searchParams.travelerCount,
  };

  // 2. Attempt to add
  const success = addItem(item);

  // 3. Handle result
  if (success) {
    // Show inline success feedback (see Section 6.4)
    setAddFeedback('success');
    // Reset hotel selection so user can pick new dates
    setSelectedHotel(null);
  } else {
    // This should not happen if button disable logic is correct,
    // but defensively handle it
    setAddFeedback('error');
  }
};
```

### 6.4 Post-Add Feedback

After successfully adding an item, the `DateOptionBuilderSection` shows:

- **Inline success message**: An MUI `Alert` with `severity="success"` below the "Add to Compare" button:
  - Text: `"Added to comparison queue (${count}/5). Select new dates to add another option."`
  - Auto-dismiss: The alert remains visible until the user interacts with the calendar to select new dates (at which point `DateOptionBuilderSection` resets its local state).
- **Button text change**: The button briefly shows "✓ Added" (for 2 seconds via `setTimeout`), then reverts to "Add to Compare".

### 6.5 Post-Add Reset Behavior

After adding an item to the queue, the following local state in `DateOptionBuilderSection` resets:

| State | Resets to | Why |
|---|---|---|
| `selectedHotel` | `null` | User should pick a hotel for the next date range |
| `addFeedback` | Remains `'success'` until new dates are selected | Shows confirmation |

The following state does **NOT** reset (preserved for convenience):

| State | Why preserved |
|---|---|
| `selectedDestination` | User likely compares different dates for the same destination |
| `originAirport` | Doesn't change between comparisons |
| `travelerCount` | Doesn't change between comparisons |
| `flightPrice` (data) | Cleared when new dates are selected from calendar |
| `weatherSummary` (data) | Cleared when new dates are selected from calendar |
| `hotelResults` (data) | Cleared when new dates are selected from calendar |

---

## 7. Remove-from-Queue Flow

### 7.1 Where Removal Happens

Items can be removed from two places in the ComparisonSection:

1. **Individual remove button** on each queue item card — calls `removeItem(id)`.
2. **"Clear All" button** in the queue header — calls `clearQueue()`.

### 7.2 Queue Item Card — Remove Button

Each item in the queue list displays a card with a remove button:

```typescript
// Inside ComparisonSection's queue list
<IconButton
  onClick={() => removeItem(item.id)}
  aria-label={`Remove ${item.destination} ${item.startDate} to ${item.endDate} from comparison`}
  size="small"
>
  <CloseIcon fontSize="small" />
</IconButton>
```

**No confirmation dialog** is shown for individual removal. The action is immediate and reversible only by re-adding the item through the full flow.

### 7.3 "Clear All" Button

Displayed in the ComparisonSection header, next to the queue count:

```typescript
<Button
  variant="text"
  color="error"
  size="small"
  startIcon={<DeleteOutlineIcon />}
  onClick={clearQueue}
  disabled={count === 0}
>
  Clear All
</Button>
```

**No confirmation dialog** for "Clear All" either. The operation is instant.

### 7.4 Side Effects of Removal

When any item is removed (individually or via clear):

1. **Queue count updates** immediately in Header badge, ComparisonQueueFAB badge, and ComparisonSection header.
2. **Comparison results reset to idle** if they were in `success` or `error` state. This means the scored results table disappears and the user must click "Compare" again.
3. **ComparisonSection visibility**: The section remains visible as long as `count >= 1`. If the last item is removed (`count` drops to 0), the ComparisonSection hides via the progressive reveal mechanism.
4. **ComparisonQueueFAB**: Hides when `count` drops to 0.
5. **"Compare" button** in ComparisonSection: Becomes disabled when `count < 2`.

---

## 8. Compare Flow (Queue → Backend → Results)

### 8.1 "Compare" Button

Located in the ComparisonSection, below the queue item list.

```typescript
<Button
  variant="contained"
  color="primary"
  size="large"
  startIcon={<CompareArrowsIcon />}
  onClick={compareTrips}
  disabled={count < MIN_COMPARE_SIZE || comparisonResult.state === 'loading'}
  fullWidth={false}
  sx={{ minWidth: 200 }}
>
  {comparisonResult.state === 'loading' ? 'Comparing...' : `Compare ${count} Options`}
</Button>
```

**Button states:**

| Condition | Disabled | Text |
|---|---|---|
| `count < 2` | Yes | `"Compare ${count} Option${count !== 1 ? 's' : ''}"` (still shows count) |
| `count >= 2` and `comparisonResult.state === 'idle'` | No | `"Compare ${count} Options"` |
| `comparisonResult.state === 'loading'` | Yes | `"Comparing..."` |
| `comparisonResult.state === 'success'` | No | `"Re-compare ${count} Options"` |
| `comparisonResult.state === 'error'` | No | `"Retry Compare"` |

### 8.2 Loading State During Comparison

While `comparisonResult.state === 'loading'`:

- The "Compare" button shows a `CircularProgress` (size 20) replacing the `CompareArrowsIcon`.
- The button text changes to "Comparing...".
- The button is disabled to prevent double submission.
- The queue item list remains visible and interactive (user can still remove items, which cancels the comparison by resetting state).
- Below the button, show a `LinearProgress` bar spanning the full width of the ComparisonSection content area.

### 8.3 Success State — Results Display

When `comparisonResult.state === 'success'` and `comparisonResult.data` is not null:

The ComparisonSection renders a results table/grid below the queue. This is covered in detail by the comparison view spec (`frontend-spec-comparison-view.md`). The queue list remains visible above the results so the user can modify it and re-compare.

### 8.4 Error State

When `comparisonResult.state === 'error'`:

Display an inline error message below the "Compare" button:

```typescript
<Alert severity="error" sx={{ mt: 2 }}>
  <AlertTitle>Comparison Failed</AlertTitle>
  {comparisonResult.error}
  <Button
    variant="text"
    size="small"
    onClick={compareTrips}
    sx={{ ml: 1 }}
  >
    Retry
  </Button>
</Alert>
```

The retry button calls `compareTrips()` again. No auto-retry.

### 8.5 API Call Details

The `compareTrips` function in the context provider calls the centralized API service:

```typescript
// In src/lib/api.ts:
export async function compareTrips(request: CompareRequest): Promise<CompareResponse> {
  const response = await axios.post<CompareResponse>(
    `${API_BASE_URL}/api/v1/compare`,
    request
  );
  return response.data;
}
```

The context provider converts queue items before calling:

```typescript
const request: CompareRequest = {
  options: queue.map(queueItemToCompareInput),
};
const response = await apiCompareTrips(request);
```

---

## 9. Queue UI Components — Signatures & Layout

### 9.1 ComparisonSection

**File**: `frontend/src/components/sections/ComparisonSection.tsx`

```typescript
'use client';

/**
 * ComparisonSection — the fourth section in the progressive reveal flow.
 * Visible when comparison queue count >= 1.
 *
 * Layout (top to bottom):
 * 1. Queue header: count display + "Clear All" button
 * 2. Queue item list: horizontally scrollable row of QueueItemCard components
 * 3. Compare button (centered)
 * 4. Comparison results (loading / error / success states)
 */
export interface ComparisonSectionProps {
  /** Controls section visibility via SectionContainer */
  visible: boolean;
}

export default function ComparisonSection(props: ComparisonSectionProps): JSX.Element | null;
```

**Internal state**: None — all state comes from `useComparisonQueue()`.

**Layout specification:**

```
┌─────────────────────────────────────────────────────────┐
│ Comparison Queue (3/5)                    [Clear All]   │  ← Queue header
├─────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │  ← Queue item cards
│ │ Tokyo    │ │ Tokyo    │ │ Tokyo    │                 │     (horizontal row)
│ │ May 1-5  │ │ May 15-19│ │ Jun 1-5  │                 │
│ │ $342/pp  │ │ $289/pp  │ │ $310/pp  │                 │
│ │ Tokyo Inn│ │ Shinjuku │ │ Park Htl │                 │
│ │ ☀ Great  │ │ 🌤 Good  │ │ ☀ Great  │                 │
│ │    [✕]   │ │    [✕]   │ │    [✕]   │                 │
│ └──────────┘ └──────────┘ └──────────┘                 │
├─────────────────────────────────────────────────────────┤
│              [ Compare 3 Options ]                      │  ← Compare button
├─────────────────────────────────────────────────────────┤
│ (Comparison results appear here after compare)          │  ← Results area
└─────────────────────────────────────────────────────────┘
```

### 9.2 QueueItemCard

**File**: `frontend/src/components/comparison/QueueItemCard.tsx`

```typescript
'use client';

/**
 * QueueItemCard — displays a single ComparisonQueueItem in the queue list.
 * Shown as an MUI Card inside the ComparisonSection queue row.
 */
export interface QueueItemCardProps {
  /** The queue item to display */
  item: ComparisonQueueItem;
  /** Callback to remove this item from the queue */
  onRemove: (id: string) => void;
  /** 1-based position index in the queue (displayed as "Option 1", "Option 2", etc.) */
  index: number;
}

export default function QueueItemCard(props: QueueItemCardProps): JSX.Element;
```

**Layout specification:**

```
┌─────────────────────────────────┐
│ Option 1                   [✕]  │  ← CardHeader: "Option {index}", remove IconButton
├─────────────────────────────────┤
│ 📍 Tokyo                        │  ← Destination
│ 📅 May 1 – May 5, 2026         │  ← Date range (formatted with dayjs)
│ 👥 2 travelers                  │  ← Traveler count
│─────────────────────────────────│
│ ✈ Flight: $342.50/person       │  ← Flight price per person
│ 🏨 Tokyo Inn: $320.00 total    │  ← Hotel name + total price
│─────────────────────────────────│
│ ☀ Weather: Great (82.4)        │  ← Weather label + score
│   Avg 21.3°C · Rain: low       │  ← Temperature + rain signal
└─────────────────────────────────┘
```

**Card dimensions:**
- Width: `280px` fixed
- Min-height: auto (content-driven)
- MUI Card with `variant="outlined"` and `sx={{ width: 280, flexShrink: 0 }}`

**Data formatting rules:**

| Field | Format | Example |
|---|---|---|
| Date range | `dayjs(startDate).format('MMM D') + ' – ' + dayjs(endDate).format('MMM D, YYYY')` | "May 1 – May 5, 2026" |
| Flight price | `$${flightPrice.toFixed(2)}/person` | "$342.50/person" |
| Hotel price | `$${hotelPrice.toFixed(2)} total` | "$320.00 total" |
| Weather score | `${weather.label} (${weather.weather_score.toFixed(1)})` | "Great (82.4)" |
| Temperature | `Avg ${weather.average_temp.toFixed(1)}°C` | "Avg 21.3°C" |
| Rain signal | `Rain: ${weather.rain_signal}` | "Rain: low" |
| Traveler count | `${travelerCount} traveler${travelerCount !== 1 ? 's' : ''}` | "2 travelers" |

**Weather label color**: Use the `WEATHER_LABEL_COLORS` constant from `@/types/constants` to color the weather label text:

```typescript
import { WEATHER_LABEL_COLORS } from '@/types/constants';
// ...
<Typography sx={{ color: WEATHER_LABEL_COLORS[item.weather.label] }}>
  {item.weather.label} ({item.weather.weather_score.toFixed(1)})
</Typography>
```

### 9.3 Queue Item List Container

The queue items are rendered in a **horizontal scrollable row** using MUI's `Stack`:

```typescript
<Stack
  direction="row"
  spacing={2}
  sx={{
    overflowX: 'auto',
    py: 2,
    px: 1,
    // Scrollbar styling for desktop
    '&::-webkit-scrollbar': { height: 8 },
    '&::-webkit-scrollbar-thumb': { backgroundColor: 'grey.400', borderRadius: 4 },
  }}
>
  {queue.map((item, index) => (
    <QueueItemCard
      key={item.id}
      item={item}
      onRemove={removeItem}
      index={index + 1}
    />
  ))}
</Stack>
```

### 9.4 Queue Header

```typescript
<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
  <Typography variant="h6">
    Comparison Queue ({count}/{MAX_QUEUE_SIZE})
  </Typography>
  <Button
    variant="text"
    color="error"
    size="small"
    startIcon={<DeleteOutlineIcon />}
    onClick={clearQueue}
    disabled={count === 0}
  >
    Clear All
  </Button>
</Box>
```

### 9.5 Empty Queue State

When `count === 0` within the ComparisonSection (which shouldn't normally be visible, but can occur momentarily if user removes the last item):

```typescript
<Box sx={{ textAlign: 'center', py: 4 }}>
  <CompareArrowsIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
  <Typography variant="body1" color="text.secondary">
    No date options in queue yet.
  </Typography>
  <Typography variant="body2" color="text.secondary">
    Select dates from the calendar and add options to compare.
  </Typography>
</Box>
```

### 9.6 ComparisonQueueFAB

**File**: `frontend/src/components/layout/ComparisonQueueFAB.tsx`

A floating action button fixed to the bottom-right corner. Provides quick navigation to the ComparisonSection from anywhere on the page.

```typescript
export interface ComparisonQueueFABProps {}

/**
 * - Hidden (returns null) when count === 0
 * - Shows count as a Badge on a Fab containing CompareArrowsIcon
 * - On click: scrolls to #comparison section
 */
export default function ComparisonQueueFAB(props: ComparisonQueueFABProps): JSX.Element | null;
```

**Behavior:**

| `count` | Rendered | Badge |
|---|---|---|
| 0 | `null` (not rendered) | — |
| 1 | Visible | Badge shows "1" |
| 2–4 | Visible | Badge shows count |
| 5 | Visible | Badge shows "5" with `color="error"` (indicating full) |

**Click handler:**

```typescript
const handleClick = () => {
  document.getElementById('comparison')?.scrollIntoView({ behavior: 'smooth' });
};
```

**Position:**

```typescript
<Fab
  sx={{
    position: 'fixed',
    bottom: 24,
    right: 24,
    zIndex: (theme) => theme.zIndex.fab,
  }}
  color="primary"
  aria-label={`View ${count} item${count !== 1 ? 's' : ''} in comparison queue`}
  onClick={handleClick}
>
  <Badge badgeContent={count} color={count >= MAX_QUEUE_SIZE ? 'error' : 'secondary'}>
    <CompareArrowsIcon />
  </Badge>
</Fab>
```

### 9.7 Header Queue Badge

In the `Header` component, a badge displays the queue count:

```typescript
// Visible only when count > 0
{count > 0 && (
  <Badge
    badgeContent={count}
    color="primary"
    aria-label={`${count} item${count !== 1 ? 's' : ''} in comparison queue`}
  >
    <CompareArrowsIcon />
  </Badge>
)}
```

---

## 10. Edge Cases & Boundary Conditions

### 10.1 Queue Full (5 items)

| Scenario | Behavior |
|---|---|
| User tries to add 6th item | `addItem` returns `false`. "Add to Compare" button is disabled with tooltip "Comparison queue is full (maximum 5)". |
| User is on DateOptionBuilderSection with queue at 5 | The button shows disabled state immediately. No need to click to discover it. |
| `isFull` updates reactively | As soon as queue reaches 5, all consumers re-render and disable their add controls. |

### 10.2 Duplicate Detection

| Scenario | Behavior |
|---|---|
| Same destination + same dates, different hotel | Rejected as duplicate (same ID). Button disabled with tooltip "This date range is already in the queue". |
| Same destination + different dates | Allowed (different ID). |
| Different destination + same dates | Allowed (different ID). |
| Case sensitivity | IDs are case-sensitive. "Tokyo-2026-05-01-2026-05-05" ≠ "tokyo-2026-05-01-2026-05-05". Since destination names come from the API (DestinationResult.name), they are consistently cased. |

### 10.3 Queue at Minimum (1 item)

| Scenario | Behavior |
|---|---|
| Queue has 1 item, user clicks "Compare" | Button is disabled. Text shows "Compare 1 Option" (singular). |
| Queue has 1 item, user removes it | Queue drops to 0. ComparisonSection hides. ComparisonQueueFAB hides. |

### 10.4 Queue Modified After Comparison

| Scenario | Behavior |
|---|---|
| Comparison results are showing (success), user removes an item | `resetComparison()` is called. Results disappear. User must click "Compare" again. |
| Comparison results are showing (success), user adds an item | Same — results reset. User must re-compare. |
| Comparison is loading, user removes an item | Queue state changes, `resetComparison()` is called, loading state resets to idle. The in-flight API request completes but its result is discarded because the state was already reset. (No explicit request cancellation — the result is simply ignored because `comparisonResult` was already set to idle.) |

### 10.5 API Errors During Comparison

| Error Type | Error Message | Behavior |
|---|---|---|
| 400 Bad Request | Server-provided message or "Invalid comparison request" | Inline error with retry button |
| 422 Validation Error | "At least 2 options are required for comparison" (from server) | Inline error with retry button |
| 500 Internal Error | Server-provided message or "An unexpected error occurred" | Inline error with retry button |
| Network Error | "Network error. Please check your connection and try again." | Inline error with retry button |
| Timeout | "Request timed out. Please try again." | Inline error with retry button |

Error extraction logic in the context provider:

```typescript
function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
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
```

### 10.6 Rapid Add/Remove

Users clicking add/remove rapidly will trigger multiple state updates. Since React 19 batches state updates automatically, this is handled correctly. No debouncing or throttling is needed for queue mutations.

### 10.7 Page Refresh

All queue state is lost on page refresh. No warning dialog is shown — this is the expected behavior per constraints (in-memory only, no persistence).

### 10.8 Empty Queue in ComparisonSection

If the user navigates to the ComparisonSection while the queue is empty (possible if all items are removed), the section shows the empty state (Section 9.5). The progressive reveal mechanism hides the section when `count === 0`, so the empty state is only briefly visible during the animation out.

---

## 11. State Transition Diagrams

### 11.1 Queue State Machine

```
                    ┌─────────┐
                    │ EMPTY   │  count = 0
                    │ (start) │
                    └────┬────┘
                         │ addItem()
                         ▼
                    ┌─────────┐
              ┌─────│ 1 ITEM  │─────┐
              │     └────┬────┘     │
              │          │          │
    removeItem│  addItem │          │ clearQueue
              │          ▼          │
              │     ┌─────────┐    │
              ├─────│ 2 ITEMS │────┤
              │     └────┬────┘    │       Compare enabled
              │          │         │       at 2+ items
    removeItem│  addItem │         │
              │          ▼         │
              │     ┌─────────┐   │
              ├─────│ 3 ITEMS │───┤
              │     └────┬────┘   │
              │          │        │
    removeItem│  addItem │        │ clearQueue
              │          ▼        │
              │     ┌─────────┐   │
              ├─────│ 4 ITEMS │───┤
              │     └────┬────┘   │
              │          │        │
    removeItem│  addItem │        │ clearQueue
              │          ▼        │
              │     ┌─────────┐   │
              └─────│ 5 ITEMS │───┘
                    │ (FULL)  │
                    └─────────┘
                    addItem() → returns false
```

### 11.2 Comparison Result State Machine

```
         ┌──────┐
    ┌────│ IDLE │◄───────────────────────────────┐
    │    └──┬───┘                                 │
    │       │ compareTrips()                      │ resetComparison()
    │       ▼                                     │ (called by add/remove/clear)
    │    ┌─────────┐                              │
    │    │ LOADING │──────────────────────────────┤
    │    └──┬──┬───┘                              │
    │       │  │                                  │
    │  OK   │  │  Error                           │
    │       ▼  ▼                                  │
    │ ┌─────────┐  ┌─────────┐                    │
    │ │ SUCCESS │  │  ERROR  │                    │
    │ └────┬────┘  └────┬────┘                    │
    │      │            │                         │
    │      │ queue      │ retry (compareTrips())  │
    │      │ modified   │         ┌───────────┐   │
    │      └────────────┴────────►│ resets to │───┘
    │                             │   IDLE    │
    │                             └───────────┘
    │
    │  (on success, results remain until queue is modified)
    │
    └─── compareTrips() can be called again from SUCCESS state
         ("Re-compare" button) — goes back to LOADING
```

---

## 12. Integration Points with Other Sections

### 12.1 DateOptionBuilderSection → Queue

The DateOptionBuilderSection is the **only** component that creates and adds `ComparisonQueueItem` objects. It:

1. Calls `useComparisonQueue()` to get `addItem`, `isFull`, and `queue` (for duplicate checking).
2. Assembles the item from its local state (flight data, hotel selection, weather data, destination, dates, traveler count).
3. Calls `addItem(item)` and shows feedback.

### 12.2 CalendarSection → DateOptionBuilderSection → Queue

When the user selects a new date range on the calendar:
1. CalendarSection passes the new `DateRange` to the parent `HomePage`.
2. `HomePage` updates `dateRange` state and passes it down to `DateOptionBuilderSection`.
3. `DateOptionBuilderSection` detects the date change and resets its local API call states (flight, hotel, weather) to trigger new fetches.
4. The "Add to Compare" button becomes disabled until all new data loads and user selects a hotel.

### 12.3 ComparisonSection → Queue

The ComparisonSection is the **only** component that:
- Renders the queue items as `QueueItemCard` components.
- Calls `removeItem` and `clearQueue`.
- Calls `compareTrips` to trigger the backend comparison.
- Displays comparison results.

### 12.4 Progressive Reveal Integration

The ComparisonSection's visibility in `HomePage`:

```typescript
// In HomePage (src/app/page.tsx):
const { count: queueCount } = useComparisonQueue();

// ...

<SectionContainer
  sectionId="comparison"
  visible={queueCount >= 1}
  title="Compare Your Options"
  subtitle="Add at least 2 date options to compare. Maximum 5."
>
  <ComparisonSection visible={queueCount >= 1} />
</SectionContainer>
```

The section appears as soon as the first item is added to the queue (count goes from 0 to 1). This provides immediate feedback that the item was queued.

---

## 13. Constants Reference

All constants from `frontend/src/types/constants.ts` relevant to the comparison queue:

| Constant | Value | Usage |
|---|---|---|
| `MAX_QUEUE_SIZE` | `5` | Maximum items in queue. Used by `isFull` check, "Add to Compare" disable logic, queue header display. |
| `MIN_COMPARE_SIZE` | `2` | Minimum items for comparison. Used by "Compare" button disable logic. |
| `TAG_COLORS` | `{ cheapest: "success", best_weather: "info", best_overall: "warning" }` | MUI Chip color for tags in comparison results. |
| `TAG_LABELS` | `{ cheapest: "Cheapest", best_weather: "Best Weather", best_overall: "Best Overall" }` | Human-readable tag labels. |
| `WEATHER_LABEL_COLORS` | `{ Great: "#4caf50", Good: "#8bc34a", Fair: "#ff9800", Poor: "#f44336" }` | Color for weather label text in QueueItemCard. |
| `CURRENCY_SYMBOL` | `"$"` | Prefix for price display. |
| `API_BASE_URL` | `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"` | Base URL for API calls including compare endpoint. |

---

## Summary: Key Implementation Checklist for Ralph Loop

1. **Create** `frontend/src/context/ComparisonQueueContext.tsx` with the `ComparisonQueueProvider` and `useComparisonQueue` hook as specified in Section 3.
2. **Place** `ComparisonQueueProvider` inside `ThemeRegistry` in `layout.tsx` (Section 3.5).
3. **Implement** `addItem`, `removeItem`, `clearQueue`, `compareTrips`, `resetComparison` with exact algorithms from Section 4.
4. **Create** `QueueItemCard` component at `src/components/comparison/QueueItemCard.tsx` (Section 9.2).
5. **Create** `ComparisonSection` at `src/components/sections/ComparisonSection.tsx` (Section 9.1).
6. **Integrate** the "Add to Compare" button into `DateOptionBuilderSection` with disable logic from Section 6.2.
7. **Wire** the ComparisonQueueFAB badge color to change to `error` when full (Section 9.6).
8. **Handle** all edge cases from Section 10 (full queue, duplicates, post-compare modifications, API errors).
9. **Use** `useMemo` and `useCallback` for context value memoization (Section 4.6).
10. **Import** all types from `@/types/frontend` and `@/types/api` — never redefine them.
