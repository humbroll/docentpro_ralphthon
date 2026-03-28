# WhenToGo Frontend Specification — Queue & Capacity Limit Edge Cases

> **Audience**: Ralph Loop (autonomous implementation agent)
> **Scope**: Exhaustive edge case documentation for comparison queue capacity limits (max 5 items), minimum comparison requirements (min 2 items), duplicate detection, and all boundary UI states.
> **Cross-references**: Context provider in `docs/frontend/frontend-spec-context-provider.md`, queue mechanism in `docs/frontend/frontend-spec-comparison-queue.md`, UI states in `docs/frontend/frontend-spec-ui-states.md`, types from `frontend/src/types/api.ts` and `frontend/src/types/frontend.ts`, constants from `frontend/src/types/constants.ts`.

---

## Table of Contents

1. [Constants & Invariants](#1-constants--invariants)
2. [Edge Case: Queue Full (5/5 Items)](#2-edge-case-queue-full-55-items)
3. [Edge Case: Duplicate Item Detection](#3-edge-case-duplicate-item-detection)
4. [Edge Case: Minimum Items for Comparison (< 2)](#4-edge-case-minimum-items-for-comparison--2)
5. [Edge Case: Removing Items from a Full Queue](#5-edge-case-removing-items-from-a-full-queue)
6. [Edge Case: Clearing the Queue](#6-edge-case-clearing-the-queue)
7. [Edge Case: Queue Transitions Through Capacity Boundaries](#7-edge-case-queue-transitions-through-capacity-boundaries)
8. [Edge Case: Queue Modification During Comparison Loading](#8-edge-case-queue-modification-during-comparison-loading)
9. [Edge Case: Queue at Exactly 5 with Comparison Results Visible](#9-edge-case-queue-at-exactly-5-with-comparison-results-visible)
10. [Edge Case: Page Refresh Resets Queue](#10-edge-case-page-refresh-resets-queue)
11. [Component-Level Disabled States Matrix](#11-component-level-disabled-states-matrix)
12. [Complete User Flow Scenarios](#12-complete-user-flow-scenarios)

---

## 1. Constants & Invariants

These constants are defined in `frontend/src/types/constants.ts` and govern all capacity logic:

```typescript
export const MAX_QUEUE_SIZE = 5;      // Maximum items in comparison queue
export const MIN_COMPARE_SIZE = 2;    // Minimum items required to trigger comparison
```

**Invariants that must ALWAYS hold:**

| Invariant | Enforcement |
|---|---|
| `queue.length` is always in range `[0, 5]` | `addItem()` returns `false` if `queue.length >= MAX_QUEUE_SIZE` |
| `isFull` is always `queue.length >= MAX_QUEUE_SIZE` | Derived value, never stored as separate state |
| `count` is always `queue.length` | Derived value, never stored as separate state |
| No two items share the same `id` | `addItem()` returns `false` if duplicate `id` exists |
| Item `id` format is always `${destination}-${startDate}-${endDate}` | Constructed by `DateOptionBuilderSection` before calling `addItem()` |
| Comparison requires `count >= MIN_COMPARE_SIZE` | `compareTrips()` defensively checks; "Compare" button disabled when `count < 2` |

---

## 2. Edge Case: Queue Full (5/5 Items)

### 2.1 When Does This Occur?

The queue reaches capacity when `queue.length === 5` (i.e., `isFull === true`). This can happen after the user adds the 5th item via the "Add to Compare" button in `DateOptionBuilderSection`.

### 2.2 Affected Components and Their Exact States

#### 2.2.1 "Add to Compare" Button (`DateOptionBuilderSection`)

| Property | Value |
|---|---|
| `disabled` | `true` |
| `variant` | `"contained"` (unchanged) |
| `color` | `"primary"` (unchanged — do NOT change to `"error"`) |
| Visual appearance | Greyed out (MUI default disabled styling) |
| Tooltip | Wrap in `<Tooltip title="Comparison queue is full (maximum 5)">` |
| Tooltip trigger | Hover over the disabled button — MUI Tooltip on disabled buttons requires wrapping in a `<span>`: `<Tooltip title="..."><span><Button disabled>...</Button></span></Tooltip>` |
| `aria-label` | `"Add to compare — queue full"` |
| Click handler | No-op (button is disabled, `onClick` does not fire) |

**Exact JSX for the disabled state:**

```tsx
<Tooltip title={tooltipText ?? ''} disableHoverListener={!tooltipText}>
  <span> {/* span wrapper required for MUI Tooltip on disabled elements */}
    <Button
      variant="contained"
      color="primary"
      size="large"
      startIcon={<AddIcon />}
      disabled={disabled}
      onClick={handleAddToCompare}
      aria-label={disabled ? `Add to compare — ${tooltipText}` : 'Add to compare'}
    >
      Add to Compare
    </Button>
  </span>
</Tooltip>
```

**Tooltip text determination logic (priority order):**

```typescript
function getAddButtonTooltip(
  selectedHotel: HotelOption | null,
  isFull: boolean,
  isDuplicate: boolean
): string | null {
  if (selectedHotel === null) return 'Select a hotel first';
  if (isFull) return 'Comparison queue is full (maximum 5)';
  if (isDuplicate) return 'This date range is already in the queue';
  return null; // enabled — no tooltip
}
```

**Priority reasoning:** Hotel selection is checked first because it's the most actionable (user can fix it immediately). Queue full is checked second because it requires removing an existing item. Duplicate is checked last because it's the least common scenario.

#### 2.2.2 Queue Header (`ComparisonSection`)

```
Comparison Queue (5/5)                    [Clear All]
```

- The count display reads `"(5/5)"` — format is always `({count}/{MAX_QUEUE_SIZE})`.
- The `"Clear All"` button remains **enabled** (it is only disabled when `count === 0`).
- No special color change or warning indicator on the header when full. The `(5/5)` text itself is sufficient.

#### 2.2.3 Header Badge

```typescript
// In Header.tsx
<Badge badgeContent={count} color={count >= MAX_QUEUE_SIZE ? 'error' : 'primary'}>
  <CompareArrowsIcon />
</Badge>
```

| Queue Count | Badge Color | Badge Content |
|---|---|---|
| 0 | *(badge hidden — `badgeContent={0}` with `showZero={false}`)* | — |
| 1–4 | `"primary"` (MUI default blue) | `{count}` |
| 5 | `"error"` (MUI red) | `5` |

**Why red at 5**: Visual signal that the queue is at capacity. The user needs to remove an item before adding more.

#### 2.2.4 ComparisonQueueFAB

```typescript
// In ComparisonQueueFAB.tsx
<Badge badgeContent={count} color={count >= MAX_QUEUE_SIZE ? 'error' : 'primary'}>
  <CompareArrowsIcon />
</Badge>
```

Same color logic as the Header badge:

| Queue Count | FAB Visible | Badge Color |
|---|---|---|
| 0 | **Hidden** (component returns `null`) | — |
| 1–4 | Visible | `"primary"` |
| 5 | Visible | `"error"` |

#### 2.2.5 "Compare" Button (`ComparisonSection`)

When queue is full (5 items), the "Compare" button is **enabled** (since `count >= MIN_COMPARE_SIZE`):

| Property | Value |
|---|---|
| `disabled` | `false` |
| Text | `"Compare 5 Options"` |
| Behavior | Calls `compareTrips()` normally |

#### 2.2.6 Queue Item Cards

All 5 `QueueItemCard` components render normally. Each has its `[✕]` remove button enabled. The horizontal scroll container may require scrolling to see all 5 cards (5 × 280px = 1400px + spacing).

### 2.3 `addItem()` Return Value at Full Queue

When `addItem(item)` is called on a full queue:

```
1. queue.length (5) >= MAX_QUEUE_SIZE (5) → true
2. Return false immediately
3. Item is NOT added
4. No state change occurs
5. comparisonResult is NOT reset (no mutation happened)
```

The caller (`DateOptionBuilderSection`) should **never** call `addItem()` when `isFull === true` because the button is disabled. But if it did (defensive), the function returns `false` silently with no side effects.

### 2.4 User Recovery from Full Queue

The user has exactly two ways to make room:

1. **Remove one item**: Click the `[✕]` button on any `QueueItemCard` in `ComparisonSection`. This calls `removeItem(id)`, which reduces `count` to 4, sets `isFull` to `false`, and re-enables the "Add to Compare" button.

2. **Clear all items**: Click the "Clear All" button in `ComparisonSection`. This calls `clearQueue()`, which sets `count` to 0 and `isFull` to `false`.

After either action, if `comparisonResult.state !== 'idle'`, the comparison results are automatically cleared (reset to idle).

---

## 3. Edge Case: Duplicate Item Detection

### 3.1 What Constitutes a Duplicate?

Two items are duplicates if they have the same `id`. The `id` is constructed as:

```typescript
const id = `${destination.name}-${startDate}-${endDate}`;
```

**Examples of duplicate pairs:**

| Item A ID | Item B ID | Duplicate? |
|---|---|---|
| `"Tokyo-2026-05-01-2026-05-05"` | `"Tokyo-2026-05-01-2026-05-05"` | **Yes** — same destination and dates |
| `"Tokyo-2026-05-01-2026-05-05"` | `"Tokyo-2026-05-15-2026-05-19"` | No — different dates |
| `"Tokyo-2026-05-01-2026-05-05"` | `"Osaka-2026-05-01-2026-05-05"` | No — different destination |
| `"Tokyo-2026-05-01-2026-05-05"` | `"tokyo-2026-05-01-2026-05-05"` | No — string comparison is case-sensitive; destination names from the API are returned with consistent casing |

**Note**: Two items with the same destination and dates but different hotels, flight prices, or traveler counts are still considered duplicates. The `id` only uses destination + date range. Rationale: the same destination + date range will always produce the same flight price and weather; only the hotel selection might differ. Re-adding with a different hotel is not supported — the user should remove the existing item first and re-add.

### 3.2 Where Duplicate Detection Occurs

Duplicate detection happens at **two levels**:

1. **UI level (preventive)** — `DateOptionBuilderSection` checks `queue.some(item => item.id === generatedId)` to disable the button *before* the user clicks.
2. **Context level (defensive)** — `addItem()` checks `queue.some(existing => existing.id === item.id)` and returns `false` if a duplicate exists.

### 3.3 UI States for Duplicate Detection

#### "Add to Compare" Button When Duplicate Exists

| Property | Value |
|---|---|
| `disabled` | `true` |
| Tooltip | `"This date range is already in the queue"` |
| Button text | `"Add to Compare"` (unchanged) |
| Visual appearance | Greyed out (MUI disabled styling) |

**When does this tooltip show?** When the user has the *exact same* destination + start_date + end_date currently in the queue, AND a hotel is selected (so the hotel check passes), AND the queue is not full (so the full check passes). The duplicate check is the lowest priority in the tooltip hierarchy.

#### Duplicate Check Re-evaluation

The duplicate check is re-evaluated whenever:

- The user selects new dates on the calendar (changes `startDate` or `endDate`).
- The user selects a new destination (changes `destination`).
- An item is removed from the queue (the previously duplicated entry may no longer exist).
- An item is added to the queue (extremely rare — would only matter if somehow two components tried to add simultaneously, which cannot happen in single-threaded React).

The `generatedId` is computed on every render of `DateOptionBuilderSection`:

```typescript
const generatedId = selectedDestination && dateRange
  ? `${selectedDestination.name}-${dateRange.startDate}-${dateRange.endDate}`
  : null;

const isDuplicate = generatedId !== null && queue.some(item => item.id === generatedId);
```

### 3.4 User Recovery from Duplicate

1. **Select different dates** on the calendar — this changes the `generatedId`, and the duplicate check will likely pass.
2. **Remove the existing duplicate** from the queue — click `[✕]` on the matching `QueueItemCard` in `ComparisonSection`, then the "Add to Compare" button re-enables.

---

## 4. Edge Case: Minimum Items for Comparison (< 2)

### 4.1 "Compare" Button States by Queue Count

| Queue Count | Button Disabled | Button Text | Tooltip |
|---|---|---|---|
| 0 | Yes | `"Compare 0 Options"` | `"Add at least 2 date options to compare"` |
| 1 | Yes | `"Compare 1 Option"` | `"Add at least 1 more option to compare"` |
| 2 | No | `"Compare 2 Options"` | *(none)* |
| 3 | No | `"Compare 3 Options"` | *(none)* |
| 4 | No | `"Compare 4 Options"` | *(none)* |
| 5 | No | `"Compare 5 Options"` | *(none)* |

**Tooltip implementation for disabled "Compare" button:**

```tsx
const compareTooltip = count < MIN_COMPARE_SIZE
  ? (count === 0
    ? 'Add at least 2 date options to compare'
    : 'Add at least 1 more option to compare')
  : '';

<Tooltip title={compareTooltip} disableHoverListener={count >= MIN_COMPARE_SIZE}>
  <span>
    <Button
      variant="contained"
      color="primary"
      size="large"
      startIcon={
        comparisonResult.state === 'loading'
          ? <CircularProgress size={20} color="inherit" />
          : <CompareArrowsIcon />
      }
      onClick={compareTrips}
      disabled={count < MIN_COMPARE_SIZE || comparisonResult.state === 'loading'}
      sx={{ minWidth: 200 }}
    >
      {comparisonResult.state === 'loading'
        ? 'Comparing...'
        : comparisonResult.state === 'success'
          ? `Re-compare ${count} Options`
          : comparisonResult.state === 'error'
            ? 'Retry Compare'
            : `Compare ${count} Option${count !== 1 ? 's' : ''}`}
    </Button>
  </span>
</Tooltip>
```

### 4.2 Defensive Backend Validation

Even if the button is disabled when `count < 2`, the `compareTrips()` function in the context provider includes a defensive check:

```typescript
if (queue.length < MIN_COMPARE_SIZE) {
  setComparisonResult({
    state: 'error',
    data: null,
    error: 'At least 2 options are required for comparison',
  });
  return;
}
```

If this defensive path is triggered (it shouldn't be under normal UI flow), the error displays inline in the ComparisonSection using the standard error pattern:

```
┌──────────────────────────────────────────────┐
│ ⚠ Error                                      │
│ At least 2 options are required for comparison│
│ [Retry]                                       │
└──────────────────────────────────────────────┘
```

The backend also validates this and returns HTTP 422 with:

```json
{
  "error": "validation_error",
  "message": "At least 2 options are required for comparison"
}
```

### 4.3 Transition from 2 → 1 Item (Removing Below Minimum)

When the user removes an item and `count` drops from 2 to 1:

| Effect | Detail |
|---|---|
| "Compare" button | Becomes **disabled** with tooltip `"Add at least 1 more option to compare"` |
| Comparison results | If `comparisonResult.state !== 'idle'`, reset to `{ state: 'idle', data: null, error: null }` — the results table disappears |
| Queue header | Updates to `"(1/5)"` |
| Header/FAB badge | Updates to `1`, color `"primary"` |
| ComparisonSection visibility | Remains visible (`count >= 1`) |
| Queue item cards | The single remaining card renders normally with its `[✕]` button enabled |

### 4.4 Transition from 1 → 0 Items (Queue Emptied)

When the user removes the last item:

| Effect | Detail |
|---|---|
| ComparisonSection | **Hides** (progressive reveal gate: `count >= 1`) |
| ComparisonQueueFAB | **Hides** (returns `null` when `count === 0`) |
| Header badge | **Hides** (`showZero={false}` on MUI Badge) |
| "Compare" button | Disabled (but section is hidden, so not visible) |
| "Clear All" button | Disabled (but section is hidden, so not visible) |

**Important**: The ComparisonSection does NOT render empty queue state messaging in this case because the entire section is hidden. The empty queue state (`count === 0` within a visible ComparisonSection) only appears momentarily during the transition frame before the progressive reveal hides the section.

---

## 5. Edge Case: Removing Items from a Full Queue

### 5.1 Removing One Item from a Full Queue (5 → 4)

When the user clicks `[✕]` on a `QueueItemCard` while `count === 5`:

| Step | What Happens |
|---|---|
| 1 | `removeItem(id)` is called |
| 2 | `queue` state updates: the filtered array has 4 items |
| 3 | `count` becomes `4`, `isFull` becomes `false` |
| 4 | If `comparisonResult.state !== 'idle'`, `resetComparison()` is called (results table clears) |
| 5 | Header badge color changes from `"error"` (red) to `"primary"` (blue) |
| 6 | FAB badge color changes from `"error"` to `"primary"` |
| 7 | Queue header updates from `"(5/5)"` to `"(4/5)"` |
| 8 | "Add to Compare" button in `DateOptionBuilderSection` re-enables (assuming hotel is selected and no duplicate) |

### 5.2 Rapid Successive Removals

If the user quickly clicks `[✕]` on multiple cards:

- Each `removeItem()` call processes independently via React's functional state updater `setQueue(prev => prev.filter(...))`.
- React batches state updates within the same event handler, but each click is a separate event, so each triggers a re-render.
- No race conditions are possible — React state updates are serialized.
- Each removal triggers a `resetComparison()` if results exist — calling it multiple times is idempotent (all set the same idle state).

### 5.3 Removing the Item Whose Duplicate Was Blocking "Add to Compare"

Scenario: The user has `"Tokyo-2026-05-01-2026-05-05"` in the queue, and the current form shows the same destination + dates. The "Add to Compare" button shows tooltip `"This date range is already in the queue"`.

When the user removes the matching queue item:

1. `removeItem("Tokyo-2026-05-01-2026-05-05")` is called.
2. Queue updates — the item is gone.
3. `DateOptionBuilderSection` re-renders (context consumer re-render).
4. `isDuplicate` re-evaluates: `queue.some(item => item.id === "Tokyo-2026-05-01-2026-05-05")` → `false`.
5. If `isFull` is also `false` and `selectedHotel !== null`: button becomes **enabled**, tooltip is removed.

---

## 6. Edge Case: Clearing the Queue

### 6.1 "Clear All" with Comparison Results Visible

Scenario: User has 3 items in the queue and has already clicked "Compare" (results are showing in success state).

When user clicks "Clear All":

| Step | What Happens |
|---|---|
| 1 | `clearQueue()` is called |
| 2 | `queue` becomes `[]` — `count` becomes `0`, `isFull` becomes `false` |
| 3 | `comparisonResult.state` was `'success'`, so `resetComparison()` is called |
| 4 | `comparisonResult` becomes `{ state: 'idle', data: null, error: null }` |
| 5 | Comparison results table disappears |
| 6 | ComparisonSection hides (progressive reveal: `count >= 1` fails) |
| 7 | Header badge hides |
| 8 | FAB hides |
| 9 | "Add to Compare" button re-enables (no full queue, no duplicate) |

### 6.2 "Clear All" During Comparison Loading

Scenario: User clicked "Compare", the API call is in-flight (`comparisonResult.state === 'loading'`), and user clicks "Clear All".

| Step | What Happens |
|---|---|
| 1 | `clearQueue()` is called |
| 2 | `queue` becomes `[]` |
| 3 | `comparisonResult.state` is `'loading'`, so `resetComparison()` is called |
| 4 | `comparisonResult` becomes `{ state: 'idle', data: null, error: null }` |
| 5 | The in-flight API call continues (no AbortController) |
| 6 | When the API call resolves, `setComparisonResult` is called with success/error |
| 7 | This **overwrites** the idle state with the stale result |
| 8 | ComparisonSection is already hidden (count is 0), so the stale result is invisible |
| 9 | If user later adds new items and the section reappears, the stale result may be visible |

**Acceptable behavior**: This race condition is documented and accepted. The stale result will be replaced when the user clicks "Compare" again with new items. Since the ComparisonSection is hidden when `count === 0` and the "Compare" button is disabled when `count < 2`, the user will always re-trigger comparison before seeing the stale result in a meaningful context.

### 6.3 "Clear All" Button States

| Queue Count | Button Disabled | Visual |
|---|---|---|
| 0 | Yes | Greyed out, no click handler fires |
| 1–5 | No | Active, red text with delete icon |

The "Clear All" button does NOT show a confirmation dialog. The action is immediate and irreversible (items can only be re-added through the full flow: select dates → fetch data → select hotel → add).

---

## 7. Edge Case: Queue Transitions Through Capacity Boundaries

### 7.1 Transition: 4 → 5 (Reaching Full)

When the user adds the 5th item:

| Component | Before (4/5) | After (5/5) |
|---|---|---|
| Queue header | `"(4/5)"` | `"(5/5)"` |
| Header badge | `4`, color `primary` | `5`, color `error` |
| FAB badge | `4`, color `primary` | `5`, color `error` |
| "Add to Compare" button | Enabled (if hotel selected, no dup) | **Disabled**, tooltip: `"Comparison queue is full (maximum 5)"` |
| "Compare" button | Enabled, `"Compare 4 Options"` | Enabled, `"Compare 5 Options"` |
| "Clear All" button | Enabled | Enabled |
| Success feedback | *(before add)* | Shows Alert: `"Added to comparison queue (5/5). Select new dates to add another option."` — note the feedback message does NOT warn about capacity. The disabled button + tooltip is sufficient. |
| Queue item cards | 4 cards | 5 cards (may require horizontal scroll) |

### 7.2 Transition: 5 → 4 (Freeing Capacity)

When the user removes one item from a full queue:

| Component | Before (5/5) | After (4/5) |
|---|---|---|
| Queue header | `"(5/5)"` | `"(4/5)"` |
| Header badge | `5`, color `error` | `4`, color `primary` |
| FAB badge | `5`, color `error` | `4`, color `primary` |
| "Add to Compare" button | Disabled | **Enabled** (if hotel selected and no duplicate) |
| Comparison results | May have been showing | **Cleared** (reset to idle — user must re-compare) |

### 7.3 Transition: 1 → 2 (Reaching Minimum for Comparison)

When the user adds the 2nd item:

| Component | Before (1/5) | After (2/5) |
|---|---|---|
| "Compare" button | Disabled, `"Compare 1 Option"`, tooltip: `"Add at least 1 more option to compare"` | **Enabled**, `"Compare 2 Options"`, no tooltip |
| Queue header | `"(1/5)"` | `"(2/5)"` |
| All other components | Normal | Normal |

### 7.4 Transition: 2 → 1 (Dropping Below Minimum)

When the user removes one item leaving only 1:

| Component | Before (2/5) | After (1/5) |
|---|---|---|
| "Compare" button | Enabled | **Disabled**, tooltip: `"Add at least 1 more option to compare"` |
| Comparison results | If showing, **cleared** (reset to idle) | N/A (results gone) |
| ComparisonSection | Visible | Visible (still `count >= 1`) |

---

## 8. Edge Case: Queue Modification During Comparison Loading

### 8.1 Removing an Item While Compare is Loading

Scenario: User clicked "Compare" with 3 items, API call is in-flight.

**What the user can do:**

- The queue item cards remain visible during loading.
- Each card's `[✕]` remove button is **enabled** during loading (not disabled).
- Clicking `[✕]` calls `removeItem(id)`.

**What happens:**

| Step | Detail |
|---|---|
| 1 | `removeItem(id)` filters the item from the queue |
| 2 | `comparisonResult.state` is `'loading'`, so `resetComparison()` is called |
| 3 | `comparisonResult` becomes `{ state: 'idle', ... }` |
| 4 | The loading indicator (LinearProgress, button spinner) disappears |
| 5 | The in-flight API call continues (no cancellation) |
| 6 | When the API call resolves, its `setComparisonResult` call overwrites the idle state |
| 7 | The user sees stale results that include the removed item |
| 8 | The user can click "Compare" again to get correct results with the updated queue |

**Note on remove button disabling**: The remove buttons are NOT disabled during loading. Rationale: the user should be able to cancel/modify the queue at any time. The trade-off (stale results appearing briefly) is acceptable. The comparison results are always invalidated on the next queue modification.

### 8.2 Adding an Item While Compare is Loading

This scenario is unlikely (the user would need to navigate back to the date selection flow, assemble a new option, and click "Add to Compare" while the comparison API call is still in-flight). But if it happens:

| Step | Detail |
|---|---|
| 1 | `addItem(item)` succeeds (assuming queue not full, no duplicate) |
| 2 | `comparisonResult.state` is `'loading'`, so `resetComparison()` is called |
| 3 | `comparisonResult` becomes `{ state: 'idle', ... }` |
| 4 | Loading indicators disappear |
| 5 | In-flight API call eventually resolves and overwrites state (stale result) |
| 6 | User must click "Compare" again |

### 8.3 Clearing Queue While Compare is Loading

Same pattern as Section 6.2. The queue empties, results reset to idle, the section hides, and the stale API response may arrive but will be invisible.

---

## 9. Edge Case: Queue at Exactly 5 with Comparison Results Visible

### 9.1 Scenario

User has 5 items, clicked "Compare", results table is showing (`comparisonResult.state === 'success'`).

**Current UI state:**

- Queue header: `"(5/5)"`
- Header/FAB badge: `5`, color `error`
- "Compare" button: Enabled, text `"Re-compare 5 Options"`
- "Add to Compare" button: Disabled, tooltip `"Comparison queue is full (maximum 5)"`
- Results table: Showing all 5 scored/ranked `TripOption` objects
- Queue item cards: 5 cards in horizontal scroll row

### 9.2 User Removes an Item While Results Are Showing

When the user clicks `[✕]` on any queue item card:

| Step | Result |
|---|---|
| 1 | The item is removed from the queue (`count` → 4) |
| 2 | **Comparison results are immediately cleared** (reset to idle) |
| 3 | Results table disappears |
| 4 | "Compare" button changes to `"Compare 4 Options"` (enabled since `count >= 2`) |
| 5 | Header/FAB badge: `4`, color `primary` |
| 6 | "Add to Compare" button: re-enables (if hotel selected, no duplicate) |
| 7 | User must click "Compare" again to see updated results |

**Rationale for clearing results**: The comparison scores are **relative** — the `cost_score` is calculated via linear interpolation across all options. Removing one option changes the scores of all remaining options. Displaying stale scores would be misleading.

### 9.3 User Clicks "Clear All" While Results Are Showing

All items removed, results cleared, section hides. See Section 6.1 for full details.

---

## 10. Edge Case: Page Refresh Resets Queue

### 10.1 Behavior on Page Refresh

When the user refreshes the browser page (F5, Cmd+R, or navigation):

| State | What Happens |
|---|---|
| `queue` | Reset to `[]` |
| `comparisonResult` | Reset to `{ state: 'idle', data: null, error: null }` |
| `count` | `0` |
| `isFull` | `false` |
| All sections | Return to initial progressive reveal state (only Search visible) |
| ComparisonSection | Hidden |
| Header badge | Hidden |
| FAB | Hidden |

**No persistence mechanism exists.** No localStorage, no sessionStorage, no URL state, no database. This is by design — the comparison queue is ephemeral.

### 10.2 No "Unsaved Changes" Warning

There is NO `beforeunload` event handler. If the user has 5 items in the queue and refreshes, they lose everything without warning. This is intentional for the MVP — adding persistence or warnings is out of scope.

---

## 11. Component-Level Disabled States Matrix

This matrix maps every relevant component's disabled/enabled state across all queue count values:

### 11.1 "Add to Compare" Button

| Count | isFull | Hotel Selected | Duplicate | **Button State** | **Tooltip** |
|---|---|---|---|---|---|
| 0 | No | No | N/A | Disabled | `"Select a hotel first"` |
| 0 | No | Yes | No | **Enabled** | *(none)* |
| 0 | No | Yes | Yes | Disabled | `"This date range is already in the queue"` |
| 1–4 | No | No | N/A | Disabled | `"Select a hotel first"` |
| 1–4 | No | Yes | No | **Enabled** | *(none)* |
| 1–4 | No | Yes | Yes | Disabled | `"This date range is already in the queue"` |
| 5 | Yes | No | N/A | Disabled | `"Select a hotel first"` |
| 5 | Yes | Yes | No | Disabled | `"Comparison queue is full (maximum 5)"` |
| 5 | Yes | Yes | Yes | Disabled | `"Comparison queue is full (maximum 5)"` |

**Note on row for count=5, hotel=Yes, dup=Yes**: The tooltip shows the "full" message, not the "duplicate" message, because `isFull` is checked before `isDuplicate` in the priority order. Even if both conditions are true, the more constraining message (full queue requires removing items) takes precedence.

### 11.2 "Compare" Button

| Count | comparisonResult.state | **Button State** | **Button Text** | **Tooltip** |
|---|---|---|---|---|
| 0 | idle | Disabled | `"Compare 0 Options"` | `"Add at least 2 date options to compare"` |
| 1 | idle | Disabled | `"Compare 1 Option"` | `"Add at least 1 more option to compare"` |
| 2 | idle | **Enabled** | `"Compare 2 Options"` | *(none)* |
| 3 | idle | **Enabled** | `"Compare 3 Options"` | *(none)* |
| 4 | idle | **Enabled** | `"Compare 4 Options"` | *(none)* |
| 5 | idle | **Enabled** | `"Compare 5 Options"` | *(none)* |
| 2–5 | loading | Disabled | `"Comparing..."` | *(none)* |
| 2–5 | success | **Enabled** | `"Re-compare {count} Options"` | *(none)* |
| 2–5 | error | **Enabled** | `"Retry Compare"` | *(none)* |

### 11.3 "Clear All" Button

| Count | **Button State** |
|---|---|
| 0 | Disabled |
| 1–5 | **Enabled** |

### 11.4 Queue Item Card Remove Button (`[✕]`)

| comparisonResult.state | **Remove Button State** |
|---|---|
| idle | **Enabled** |
| loading | **Enabled** |
| success | **Enabled** |
| error | **Enabled** |

Remove buttons are **always enabled** regardless of comparison state. The user can always modify the queue.

### 11.5 Header Badge Visibility & Color

| Count | Visible | Color |
|---|---|---|
| 0 | No (hidden) | — |
| 1–4 | Yes | `primary` (blue) |
| 5 | Yes | `error` (red) |

### 11.6 ComparisonQueueFAB Visibility & Badge Color

| Count | FAB Visible | Badge Color |
|---|---|---|
| 0 | No (returns `null`) | — |
| 1–4 | Yes | `primary` (blue) |
| 5 | Yes | `error` (red) |

### 11.7 ComparisonSection Visibility

| Count | Visible |
|---|---|
| 0 | No (hidden by progressive reveal) |
| 1–5 | Yes |

---

## 12. Complete User Flow Scenarios

### 12.1 Scenario: User Fills Queue to Capacity

```
State: queue = [], count = 0, isFull = false

User adds option 1 (Tokyo, May 1–5):
  → count = 1, isFull = false
  → Header badge: "1" (blue), FAB: visible (blue)
  → ComparisonSection: visible, "Compare 1 Option" (disabled)
  → "Add to Compare": enabled

User adds option 2 (Tokyo, May 15–19):
  → count = 2, isFull = false
  → "Compare 2 Options" becomes enabled
  → "Add to Compare": enabled

User adds option 3 (Tokyo, Jun 1–5):
  → count = 3, isFull = false

User adds option 4 (Osaka, May 1–5):
  → count = 4, isFull = false

User adds option 5 (Osaka, May 15–19):
  → count = 5, isFull = true
  → Header badge: "5" (RED), FAB badge: "5" (RED)
  → Queue header: "(5/5)"
  → "Add to Compare": DISABLED, tooltip "Comparison queue is full (maximum 5)"
  → "Compare 5 Options": enabled
  → Success alert: "Added to comparison queue (5/5). Select new dates to add another option."

User tries to add another option:
  → Cannot — button is disabled, cannot be clicked
  → Tooltip visible on hover: "Comparison queue is full (maximum 5)"
```

### 12.2 Scenario: User Attempts to Add Duplicate

```
State: queue = [{ id: "Tokyo-2026-05-01-2026-05-05", ... }], count = 1

User selects same destination (Tokyo) and same dates (May 1–5):
  → generatedId = "Tokyo-2026-05-01-2026-05-05"
  → isDuplicate = true (matches existing item)
  → "Add to Compare": DISABLED, tooltip "This date range is already in the queue"

User changes end date to May 10:
  → generatedId = "Tokyo-2026-05-01-2026-05-10"
  → isDuplicate = false
  → "Add to Compare": enabled (assuming hotel selected)
```

### 12.3 Scenario: User Removes Item to Make Room, Then Adds

```
State: queue = [5 items], count = 5, isFull = true
       comparisonResult.state = "success" (results showing)

User clicks [✕] on item 3:
  → count = 4, isFull = false
  → Comparison results CLEARED (reset to idle) — table disappears
  → Header badge: "4" (blue)
  → "Add to Compare": re-enabled
  → "Compare 4 Options": enabled, user must re-compare

User selects new dates and adds option:
  → count = 5, isFull = true
  → Badge: "5" (red)
  → "Add to Compare": disabled again

User clicks "Compare 5 Options":
  → comparisonResult.state = "loading"
  → Button: disabled, "Comparing..."
  → API call fires with 5 items

API returns success:
  → comparisonResult.state = "success"
  → Results table shows 5 scored options
  → Button: "Re-compare 5 Options" (enabled)
```

### 12.4 Scenario: User Has 1 Item and Tries to Compare

```
State: queue = [1 item], count = 1

"Compare" button:
  → Disabled
  → Text: "Compare 1 Option"
  → Tooltip on hover: "Add at least 1 more option to compare"

User clicks button:
  → No-op (button is disabled, onClick does not fire)

(Defensive) If compareTrips() were called programmatically:
  → Sets comparisonResult to error state
  → Error message: "At least 2 options are required for comparison"
  → Inline error with Retry button appears below Compare button
```

### 12.5 Scenario: User Clears Queue with Results Showing

```
State: queue = [3 items], count = 3, comparisonResult.state = "success"

User clicks "Clear All":
  → queue = [], count = 0, isFull = false
  → comparisonResult reset to idle
  → Results table disappears
  → ComparisonSection HIDES (count < 1)
  → Header badge hides
  → FAB hides
  → "Add to Compare" button: re-enabled (if hotel selected)
  → User is back to "build first option" state
```

---

## Summary: Key Takeaways for Implementation

1. **`isFull` is derived, never stored** — always `queue.length >= MAX_QUEUE_SIZE`. Never create a separate `useState` for it.
2. **Tooltip priority on "Add to Compare"**: hotel check → full check → duplicate check. First matching condition wins.
3. **Badge color switch at capacity**: Both Header and FAB badges change from `primary` to `error` at exactly `count === 5`.
4. **Comparison results are invalidated on ANY queue mutation** — add, remove, or clear. The user must always re-compare after modifying the queue.
5. **No confirmation dialogs anywhere** — not for remove, not for clear, not for overwriting stale results.
6. **No request cancellation** — in-flight compare API calls complete naturally. Stale results may briefly appear but are acceptable.
7. **The "Add to Compare" button requires a `<span>` wrapper** for MUI Tooltip to work on disabled buttons.
8. **Section visibility is controlled by progressive reveal** — ComparisonSection hides entirely when `count === 0`, not just shows an empty state.
