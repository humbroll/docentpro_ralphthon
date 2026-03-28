# WhenToGo Frontend Spec — Hotel Selection Section Layout

> Sub-specification: Wireframe-level layout for the Hotel Selection sub-section within the DateOptionBuilderSection of the single-page progressive flow.

---

## 1. Section Overview

The **Hotel Selection** sub-section is one of three result panels rendered inside the `DateOptionBuilderSection` (alongside Flight Price and Weather Summary). It displays hotel search results from `POST /api/v1/hotels/search` and allows the user to select exactly one hotel to include in a comparison queue entry.

**Key facts**:
- The API returns a maximum of **5 hotels**, pre-sorted by `total_price` ascending (cheapest first)
- The first (cheapest) hotel is **auto-selected** on successful load
- The user **must** select a hotel before the "Add to Queue" button in the parent section is enabled
- Hotel data uses the `HotelOption` type from `frontend/src/types/api.ts`
- No client-side filtering or sorting is needed — the API already returns a small, pre-sorted list
- No list/grid toggle is needed — the fixed maximum of 5 results is best served by a single list layout
- No pagination is needed — maximum 5 items always fit on screen

---

## 2. Position Within DateOptionBuilderSection

```
┌──────────────────────── SectionContainer sectionId="dateDetails" ────────────────────────┐
│  Title: "Trip Details"                                                                    │
│  Subtitle: "Review flight, hotel, and weather options for your selected dates."           │
│                                                                                           │
│  ┌── Grid2 container spacing={3} ──────────────────────────────────────────────────────┐  │
│  │                                                                                      │  │
│  │  ┌─ Grid2 size={{ xs:12, md:4 }} ──┐                                                │  │
│  │  │  FlightPriceCard                │                                                │  │
│  │  └─────────────────────────────────┘                                                │  │
│  │                                                                                      │  │
│  │  ┌─ Grid2 size={{ xs:12, md:4 }} ──┐                                                │  │
│  │  │  HotelSelectionCard  ◄── THIS SPEC                                               │  │
│  │  └─────────────────────────────────┘                                                │  │
│  │                                                                                      │  │
│  │  ┌─ Grid2 size={{ xs:12, md:4 }} ──┐                                                │  │
│  │  │  WeatherSummaryCard             │                                                │  │
│  │  └─────────────────────────────────┘                                                │  │
│  │                                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                           │
│  mt: 3 (24px)                                                                             │
│                                                                                           │
│  ┌── Box (full width, text-align right) ───────────────────────────────────────────────┐  │
│  │  [Add to Queue] Button                                                               │  │
│  └──────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                           │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

The three result cards sit in a 3-column MUI `Grid2` layout (`md:4` each = 4/12 columns = one-third width). On smaller viewports they stack vertically (`xs:12`), though the spec is desktop-first.

---

## 3. HotelSelectionCard Component

### 3.1 File Location

```
frontend/src/components/HotelSelectionCard.tsx
```

Directive: `'use client'` — this component manages interactive state (hotel selection).

### 3.2 Props Interface

```typescript
// frontend/src/components/HotelSelectionCard.tsx

import type { HotelOption } from '@/types/api';
import type { LoadingState } from '@/types/frontend';

interface HotelSelectionCardProps {
  /** Current loading state of the hotel search request */
  state: LoadingState;
  /** Array of hotel options returned by the API (null if not yet loaded or error) */
  hotels: HotelOption[] | null;
  /** Error message to display (null if no error) */
  error: string | null;
  /** Callback when user clicks the Retry button after an error */
  onRetry: () => void;
  /** Currently selected hotel (null if none selected yet) */
  selectedHotel: HotelOption | null;
  /** Callback when user selects a hotel from the list */
  onSelectHotel: (hotel: HotelOption) => void;
}
```

### 3.3 Component Hierarchy (ASCII Wireframe — All States)

#### 3.3.1 Loading State

```
┌─────────────────── Card ────────────────────┐
│                                              │
│  ┌── CardHeader ──────────────────────────┐  │
│  │  title="Hotels"                        │  │
│  │  Typography variant="h6"               │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌── CardContent ─────────────────────────┐  │
│  │                                         │  │
│  │  ┌── Skeleton variant="rectangular" ─┐  │  │
│  │  │  height: 72px, width: 100%        │  │  │
│  │  └───────────────────────────────────┘  │  │
│  │  8px gap                                │  │
│  │  ┌── Skeleton variant="rectangular" ─┐  │  │
│  │  │  height: 72px, width: 100%        │  │  │
│  │  └───────────────────────────────────┘  │  │
│  │  8px gap                                │  │
│  │  ┌── Skeleton variant="rectangular" ─┐  │  │
│  │  │  height: 72px, width: 100%        │  │  │
│  │  └───────────────────────────────────┘  │  │
│  │                                         │  │
│  └─────────────────────────────────────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

- 3 skeleton items stacked vertically with `spacing={1}` (8px gap) using a MUI `Stack`
- Each skeleton is `variant="rectangular"`, `height={72}`, `width="100%"`
- Mimics the visual height of 3 hotel list items in the success state

#### 3.3.2 Error State

```
┌─────────────────── Card ────────────────────┐
│                                              │
│  ┌── CardHeader ──────────────────────────┐  │
│  │  title="Hotels"                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌── CardContent ─────────────────────────┐  │
│  │                                         │  │
│  │  ┌── InlineError ───────────────────┐   │  │
│  │  │                                   │   │  │
│  │  │  ┌── Alert severity="error" ───┐  │   │  │
│  │  │  │  "{error message text}"     │  │   │  │
│  │  │  └─────────────────────────────┘  │   │  │
│  │  │  mt: 1                            │   │  │
│  │  │  ┌── Button variant="outlined" ┐  │   │  │
│  │  │  │  "Retry"                    │  │   │  │
│  │  │  └─────────────────────────────┘  │   │  │
│  │  │                                   │   │  │
│  │  └───────────────────────────────────┘   │  │
│  │                                         │  │
│  └─────────────────────────────────────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

- Uses the shared `InlineError` component (defined in `src/components/shared/InlineError.tsx`)
- **Special 404 handling**: If the HTTP status code is 404, the error message reads: **"No hotels found for this destination and dates."**
- For all other errors (400, 500, 504, network timeout), the message comes from `extractApiError()`
- The Retry button calls `onRetry` which re-invokes `POST /api/v1/hotels/search` with the same parameters

#### 3.3.3 Empty State

```
┌─────────────────── Card ────────────────────┐
│                                              │
│  ┌── CardHeader ──────────────────────────┐  │
│  │  title="Hotels"                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌── CardContent ─────────────────────────┐  │
│  │                                         │  │
│  │  ┌── EmptyState ────────────────────┐   │  │
│  │  │                                   │   │  │
│  │  │  Typography variant="h6"          │   │  │
│  │  │  color="text.secondary"           │   │  │
│  │  │  textAlign="center"               │   │  │
│  │  │  "No hotels available"            │   │  │
│  │  │                                   │   │  │
│  │  │  Typography variant="body2"       │   │  │
│  │  │  color="text.disabled"            │   │  │
│  │  │  textAlign="center"               │   │  │
│  │  │  "Try adjusting your dates or     │   │  │
│  │  │   destination."                   │   │  │
│  │  │                                   │   │  │
│  │  └───────────────────────────────────┘   │  │
│  │                                         │  │
│  └─────────────────────────────────────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

- Uses the shared `EmptyState` component with `title="No hotels available"` and `subtitle="Try adjusting your dates or destination."`
- When in empty state, `selectedHotel` is `null`, which disables the "Add to Queue" button in the parent section

#### 3.3.4 Success State (Full Hotel List)

```
┌─────────────────── Card ────────────────────────────────────────────────┐
│                                                                          │
│  ┌── CardHeader ──────────────────────────────────────────────────────┐  │
│  │  title="Hotels"                                                    │  │
│  │  subheader="Select one" (Typography variant="body2"                │  │
│  │            color="text.secondary")                                 │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌── CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }} ───────────┐  │
│  │                                                                     │  │
│  │  ┌── List disablePadding ───────────────────────────────────────┐   │  │
│  │  │                                                               │   │  │
│  │  │  ┌── HotelListItem (selected=true) ───────────────────────┐   │   │  │
│  │  │  │                                                         │   │   │  │
│  │  │  │  ┌─ ListItemButton selected={true} ─────────────────┐   │   │   │  │
│  │  │  │  │                                                   │   │   │   │  │
│  │  │  │  │  ┌── ListItemText ─────────────────────────────┐  │   │   │   │  │
│  │  │  │  │  │                                              │  │   │   │   │  │
│  │  │  │  │  │  ┌── Box display="flex"                   ┐  │  │   │   │   │  │
│  │  │  │  │  │  │  justifyContent="space-between"        │  │  │   │   │   │  │
│  │  │  │  │  │  │  alignItems="flex-start"               │  │  │   │   │   │  │
│  │  │  │  │  │  │                                        │  │  │   │   │   │  │
│  │  │  │  │  │  │  ┌─ Left column ────────────────────┐  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  Typography variant="subtitle1"  │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  "Tokyo Inn"                     │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │                                  │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  Box display="flex" gap={1}      │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  alignItems="center"             │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  ┌─ Rating (if rating != null) ┐ │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  │  value={4.2} readOnly        │ │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  │  size="small"                │ │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  │  precision={0.1}             │ │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  └──────────────────────────────┘ │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  Typography variant="body2" ───── │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  color="text.secondary"           │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  "4.2" (if rating != null)        │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │                                  │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  Typography variant="body2" ───── │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  color="text.secondary"           │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  "1.2 km from center"             │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  (if distance != null)            │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  └──────────────────────────────────┘  │  │  │   │   │   │  │
│  │  │  │  │  │  │                                        │  │  │   │   │   │  │
│  │  │  │  │  │  │  ┌─ Right column ───────────────────┐  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  Typography variant="subtitle1"  │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  color="primary"                 │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  fontWeight={700}                │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  "$320.00"                       │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │                                  │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  Typography variant="caption"    │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  color="text.secondary"          │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  │  "total"                         │  │  │  │   │   │   │  │
│  │  │  │  │  │  │  └──────────────────────────────────┘  │  │  │   │   │   │  │
│  │  │  │  │  │  │                                        │  │  │   │   │   │  │
│  │  │  │  │  │  └────────────────────────────────────────┘  │  │   │   │   │  │
│  │  │  │  │  │                                              │  │   │   │   │  │
│  │  │  │  │  └──────────────────────────────────────────────┘  │   │   │   │  │
│  │  │  │  │                                                   │   │   │   │  │
│  │  │  │  └───────────────────────────────────────────────────┘   │   │   │  │
│  │  │  │                                                         │   │   │  │
│  │  │  └─────────────────────────────────────────────────────────┘   │   │  │
│  │  │                                                               │   │  │
│  │  │  ┌── Divider ─────────────────────────────────────────────┐   │   │  │
│  │  │  └─────────────────────────────────────────────────────────┘   │   │  │
│  │  │                                                               │   │  │
│  │  │  ┌── HotelListItem (selected=false) ──────────────────────┐   │   │  │
│  │  │  │  (same layout as above, no selected highlight)          │   │   │  │
│  │  │  └─────────────────────────────────────────────────────────┘   │   │  │
│  │  │                                                               │   │  │
│  │  │  ┌── Divider ─────────────────────────────────────────────┐   │   │  │
│  │  │  └─────────────────────────────────────────────────────────┘   │   │  │
│  │  │                                                               │   │  │
│  │  │  ┌── HotelListItem (selected=false) ──────────────────────┐   │   │  │
│  │  │  │  ...                                                    │   │   │  │
│  │  │  └─────────────────────────────────────────────────────────┘   │   │  │
│  │  │                                                               │   │  │
│  │  │  (up to 5 items total, separated by Dividers)                 │   │  │
│  │  │                                                               │   │  │
│  │  └───────────────────────────────────────────────────────────────┘   │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Layout Specifications

### 4.1 Card Container

| Property | Value | Notes |
|----------|-------|-------|
| Component | MUI `Card` | Default elevation (1) |
| Variant | `outlined` | `variant="outlined"` for consistent visual weight with sibling cards |
| Height | Auto — grows to fit content | No fixed height; card stretches to fit 1–5 hotel items |
| Min-height | None | Skeleton state visually mimics ~3 items for consistent height during loading |

### 4.2 CardHeader

| Property | Value | Notes |
|----------|-------|-------|
| `title` | `"Hotels"` | Typography variant `h6` (MUI CardHeader default) |
| `subheader` | `"Select one"` | Only shown in **success** state. Hidden in loading, error, and empty states. Typography variant `body2`, color `text.secondary`. |
| `sx` | `{ pb: 0 }` | Remove bottom padding from header to reduce gap before content |

### 4.3 CardContent

| Property | Value | Notes |
|----------|-------|-------|
| `sx` | `{ p: 0, '&:last-child': { pb: 0 } }` | Remove all padding in success state so the `List` extends edge-to-edge within the card. The `'&:last-child'` override prevents MUI's default 24px bottom padding on the last CardContent. |

**Exception**: In loading, error, and empty states, use default CardContent padding (`sx={{ p: 2 }}`) so skeleton/error/empty content has breathing room.

### 4.4 Hotel List Layout (Success State)

| Property | Value | Notes |
|----------|-------|-------|
| Component | MUI `List` | `disablePadding` prop removes default 8px top/bottom padding |
| Items | 1–5 `ListItemButton` elements | One per `HotelOption` in the API response |
| Separators | MUI `Divider` between each item | `component="li"` for semantic HTML. No divider after the last item. |
| Item height | Auto (~72px) | Content determines height; no forced height |

### 4.5 Individual Hotel List Item Layout

Each hotel is rendered as a `ListItemButton` within the `List`. The item layout uses a horizontal `Box` with `display: "flex"` and `justifyContent: "space-between"`.

#### Left Column (hotel info)

| Element | MUI Component | Variant | Content | Condition |
|---------|---------------|---------|---------|-----------|
| Hotel name | `Typography` | `subtitle1` | `hotel.hotel_name` | Always shown |
| Star rating | `Rating` | N/A | `value={hotel.rating}`, `readOnly`, `size="small"`, `precision={0.1}` | Only rendered if `hotel.rating !== null` |
| Rating number | `Typography` | `body2`, `color="text.secondary"` | `hotel.rating.toFixed(1)` (e.g., "4.2") | Only rendered if `hotel.rating !== null`. Displayed inline next to the `Rating` stars. |
| Distance | `Typography` | `body2`, `color="text.secondary"` | `"${hotel.distance} km from center"` | Only rendered if `hotel.distance !== null` |

The rating stars and rating number sit together in a horizontal `Box` with `display="flex"`, `gap={0.5}`, `alignItems="center"`. The distance text sits below the rating row.

#### Right Column (price)

| Element | MUI Component | Variant | Content |
|---------|---------------|---------|---------|
| Price | `Typography` | `subtitle1`, `color="primary"`, `fontWeight={700}` | `"$${hotel.total_price.toFixed(2)}"` (e.g., "$320.00") |
| Price label | `Typography` | `caption`, `color="text.secondary"` | `"total"` |

The right column is a vertical stack (`Box` with `display="flex"`, `flexDirection="column"`, `alignItems="flex-end"`) anchoring the price to the right edge of the list item.

### 4.6 Selected Item Visual Treatment

| Property | Selected (`selected={true}`) | Unselected (`selected={false}`) |
|----------|------------------------------|----------------------------------|
| `ListItemButton.selected` | `true` | `false` |
| Background | MUI `ListItemButton` default selected style: `action.selected` (rgba(25, 118, 210, 0.08)) | Default (transparent) |
| Hover | MUI default: slightly darker tint on hover | MUI default hover |
| Border-left | None — rely on MUI's built-in `selected` styling | None |
| Cursor | `pointer` | `pointer` |

**No additional custom styling is needed** — MUI's `ListItemButton` with `selected={true}` provides sufficient visual differentiation (a subtle primary-tinted background).

### 4.7 Price Formatting

All prices are displayed in USD with exactly 2 decimal places:

```typescript
// Formatting rule for hotel price display
const formatPrice = (price: number): string => `$${price.toFixed(2)}`;

// Examples:
// 320.00  → "$320.00"
// 1250.5  → "$1250.50"
// 99      → "$99.00"
```

Use the `CURRENCY_SYMBOL` constant from `@/types/constants` for the `$` prefix.

### 4.8 Nullable Field Handling

| Field | When `null` | Behavior |
|-------|-------------|----------|
| `hotel.rating` | Rating unavailable from LiteAPI | Do NOT render the `Rating` component or the rating number text. The hotel name is followed directly by the distance (if available) or nothing. |
| `hotel.distance` | Distance unavailable (coordinates missing) | Do NOT render the distance text line. The hotel name is followed by the rating row (if available) or nothing. |
| Both `null` | No rating and no distance | The left column shows only the hotel name. No extra whitespace for the missing rows. |

---

## 5. Sorting and Filtering

### 5.1 No Client-Side Sorting Controls

The API returns hotels **pre-sorted by `total_price` ascending** (cheapest first). Since the maximum result count is 5, adding sort controls would add unnecessary complexity for no user benefit. The list is always displayed in the order received from the API.

**Ralph Loop**: Do NOT implement any sort dropdowns, sort buttons, or column header sorting for the hotel list.

### 5.2 No Client-Side Filtering Controls

The 5-hotel maximum means filtering would potentially leave 0–1 results, which is not useful. All filtering is implicitly handled by the API (location-based search, date availability).

**Ralph Loop**: Do NOT implement any filter inputs, checkboxes, sliders, or filter chips for the hotel list.

### 5.3 No List/Grid View Toggle

A grid layout is not appropriate for this component because:
1. The card already sits in a `Grid2 size={{ md:4 }}` column — roughly 370px wide at the `lg` breakpoint
2. At that width, a grid-of-cards layout would make each hotel card too narrow to read
3. The list layout is the most space-efficient for 1–5 items in a narrow column

**Ralph Loop**: Do NOT implement a list/grid toggle, ViewListIcon/ViewModuleIcon buttons, or any alternative layout mode.

---

## 6. Interaction Behaviors

### 6.1 Hotel Selection

| Aspect | Behavior |
|--------|----------|
| **Click target** | The entire `ListItemButton` row is clickable |
| **Selection mode** | Single-select only — clicking one hotel deselects the previously selected hotel |
| **Default selection** | On success state entry, the **first hotel** (index 0, cheapest) is auto-selected |
| **Selection callback** | `onSelectHotel(hotel: HotelOption)` is called with the clicked hotel object |
| **Visual feedback** | MUI `ListItemButton` `selected` prop provides immediate background color change |
| **Keyboard support** | MUI `ListItemButton` provides built-in keyboard navigation — `Tab` to focus, `Enter`/`Space` to select |
| **aria-selected** | Set `aria-selected={true}` on the selected `ListItemButton` for accessibility |
| **aria-label** | Each `ListItemButton` gets `aria-label="${hotel.hotel_name}, $${hotel.total_price.toFixed(2)}"` |

### 6.2 Selection Reset on Re-fetch

When the date range changes (user picks new dates on the calendar), the hotel search re-fetches. During and after re-fetch:

1. State transitions to `loading` → `selectedHotel` is set to `null` in the parent
2. On successful re-fetch → the first hotel in the new results is auto-selected
3. On error or empty → `selectedHotel` remains `null`

### 6.3 Selection State Ownership

The `selectedHotel` state is **owned by the parent** (`DateOptionBuilderSection` or `HomePage`), not by `HotelSelectionCard`. This allows the parent to:
- Read the selected hotel when building a `ComparisonQueueItem`
- Reset the selection when dates change
- Disable the "Add to Queue" button when `selectedHotel === null`

```typescript
// In the parent component (DateOptionBuilderSection or HomePage):
const [selectedHotel, setSelectedHotel] = useState<HotelOption | null>(null);

// Auto-select first hotel when data arrives:
useEffect(() => {
  if (dateDetailResults.hotels.state === 'success' && dateDetailResults.hotels.data && dateDetailResults.hotels.data.length > 0) {
    setSelectedHotel(dateDetailResults.hotels.data[0]);
  } else {
    setSelectedHotel(null);
  }
}, [dateDetailResults.hotels.state, dateDetailResults.hotels.data]);
```

### 6.4 Retry Behavior

| Aspect | Behavior |
|--------|----------|
| **Retry button** | Rendered by `InlineError` component inside the card, in the error state only |
| **Click action** | Calls `onRetry` prop → parent re-invokes `POST /api/v1/hotels/search` with the same parameters |
| **During retry** | State transitions to `loading` → skeletons replace the error display |
| **After retry success** | First hotel auto-selected, list renders normally |
| **After retry failure** | Error state re-renders with new error message |

---

## 7. Render Logic (Pseudocode)

```typescript
export default function HotelSelectionCard({
  state,
  hotels,
  error,
  onRetry,
  selectedHotel,
  onSelectHotel,
}: HotelSelectionCardProps): JSX.Element {
  // Determine subheader visibility
  const showSubheader = state === 'success' && hotels && hotels.length > 0;

  return (
    <Card variant="outlined">
      <CardHeader
        title="Hotels"
        titleTypographyProps={{ variant: 'h6' }}
        subheader={showSubheader ? 'Select one' : undefined}
        subheaderTypographyProps={{ variant: 'body2' }}
        sx={{ pb: 0 }}
      />

      {/* Loading state */}
      {state === 'loading' && (
        <CardContent sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Skeleton variant="rectangular" height={72} />
            <Skeleton variant="rectangular" height={72} />
            <Skeleton variant="rectangular" height={72} />
          </Stack>
        </CardContent>
      )}

      {/* Error state */}
      {state === 'error' && error && (
        <CardContent sx={{ p: 2 }}>
          <InlineError message={error} onRetry={onRetry} />
        </CardContent>
      )}

      {/* Empty state — success with 0 results */}
      {state === 'success' && (!hotels || hotels.length === 0) && (
        <CardContent sx={{ p: 2 }}>
          <EmptyState
            title="No hotels available"
            subtitle="Try adjusting your dates or destination."
          />
        </CardContent>
      )}

      {/* Success state — 1+ hotels */}
      {state === 'success' && hotels && hotels.length > 0 && (
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <List disablePadding>
            {hotels.map((hotel, index) => (
              <React.Fragment key={hotel.hotel_id}>
                {index > 0 && <Divider component="li" />}
                <ListItemButton
                  selected={selectedHotel?.hotel_id === hotel.hotel_id}
                  onClick={() => onSelectHotel(hotel)}
                  aria-selected={selectedHotel?.hotel_id === hotel.hotel_id}
                  aria-label={`${hotel.hotel_name}, $${hotel.total_price.toFixed(2)}`}
                >
                  <ListItemText
                    disableTypography
                    primary={
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        {/* Left column: name, rating, distance */}
                        <Box>
                          <Typography variant="subtitle1">
                            {hotel.hotel_name}
                          </Typography>
                          {hotel.rating !== null && (
                            <Box display="flex" gap={0.5} alignItems="center">
                              <Rating
                                value={hotel.rating}
                                readOnly
                                size="small"
                                precision={0.1}
                              />
                              <Typography variant="body2" color="text.secondary">
                                {hotel.rating.toFixed(1)}
                              </Typography>
                            </Box>
                          )}
                          {hotel.distance !== null && (
                            <Typography variant="body2" color="text.secondary">
                              {hotel.distance} km from center
                            </Typography>
                          )}
                        </Box>

                        {/* Right column: price */}
                        <Box
                          display="flex"
                          flexDirection="column"
                          alignItems="flex-end"
                        >
                          <Typography
                            variant="subtitle1"
                            color="primary"
                            fontWeight={700}
                          >
                            ${hotel.total_price.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            total
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItemButton>
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      )}
    </Card>
  );
}
```

---

## 8. Import Map

```typescript
import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Typography,
  Box,
  Stack,
  Skeleton,
  Rating,
} from '@mui/material';
import type { HotelOption } from '@/types/api';
import type { LoadingState } from '@/types/frontend';
import { InlineError } from '@/components/shared/InlineError';
import { EmptyState } from '@/components/shared/EmptyState';
import { CURRENCY_SYMBOL } from '@/types/constants';
```

---

## 9. Edge Cases and Boundary Conditions

### 9.1 Exactly 1 Hotel Result

- List renders with a single `ListItemButton`, no `Divider` (dividers only appear between items)
- That single hotel is auto-selected
- User cannot deselect — clicking the same hotel again is a no-op (it remains selected)

### 9.2 Exactly 5 Hotel Results (Maximum)

- All 5 hotels render in the list with 4 `Divider` elements between them
- The card height grows to accommodate all 5 items (~360px for the list content)
- No scrolling within the card — all items are visible
- No "show more" or pagination — 5 is the API maximum

### 9.3 Hotels with All Nullable Fields as Null

When a hotel has `rating: null` AND `distance: null`:
- The left column shows only the hotel name (`Typography variant="subtitle1"`)
- No `Rating` component, no rating text, no distance text
- The right column (price) remains unchanged
- The list item is shorter in height (~48px instead of ~72px) but this is acceptable

### 9.4 Very Long Hotel Names

- Hotel names can be long (e.g., "The Ritz-Carlton Tokyo Pacific Grand Ballroom Suite Hotel")
- Allow text wrapping — do NOT truncate with ellipsis
- The `ListItemText` uses `disableTypography` so the content flows naturally within the flex layout
- The right column (price) has `flexShrink: 0` to prevent the price from being compressed

```typescript
// Add to the left column Box:
<Box sx={{ flexGrow: 1, minWidth: 0, mr: 2 }}>
  {/* hotel name, rating, distance */}
</Box>

// Add to the right column Box:
<Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
  {/* price */}
</Box>
```

### 9.5 Very Large Prices

- Prices can be large (e.g., $12,450.00 for luxury hotels)
- The price text will wrap within the right column if needed, but at typical widths (370px card) even 5-digit prices fit on one line
- No special formatting for thousands separators — use `toFixed(2)` only (e.g., "$12450.00" not "$12,450.00") to keep implementation simple

### 9.6 Duplicate Hotel IDs in Response

- Use `hotel.hotel_id` as the React `key` prop
- The API guarantees unique `hotel_id` values — no deduplication logic needed on the frontend
- Selection comparison uses `hotel_id`: `selectedHotel?.hotel_id === hotel.hotel_id`

### 9.7 Re-selecting the Already-Selected Hotel

- Clicking the already-selected hotel calls `onSelectHotel` again with the same hotel
- The parent should handle this idempotently — the state doesn't change
- No toggle behavior — clicking a selected hotel does NOT deselect it (a hotel must always be selected when results are available)

### 9.8 Rapid Date Changes

- If the user changes dates rapidly, the previous hotel search request should be cancelled
- Cancellation is handled in the parent via `AbortController` (same pattern as destination search)
- The `HotelSelectionCard` component itself does not manage fetch logic — it only renders based on the `state`, `hotels`, and `error` props passed in

---

## 10. Relationship to Parent Section and "Add to Queue" Button

The `HotelSelectionCard` is a **child** of `DateOptionBuilderSection`. The parent section controls:

1. **Three result cards** in a `Grid2` row: FlightPriceCard, HotelSelectionCard, WeatherSummaryCard
2. **"Add to Queue" button** below the cards row

The "Add to Queue" button is **disabled** when ANY of these conditions are true:
- `dateDetailResults.flight.state !== 'success'` (no flight price yet)
- `selectedHotel === null` (no hotel selected — either loading, error, empty, or user hasn't picked)
- `dateDetailResults.weather.state !== 'success'` (no weather data yet)
- Comparison queue is full (`isFull === true` from context, i.e., 5 items already in queue)

The "Add to Queue" button is **enabled** only when:
- Flight price loaded successfully
- A hotel is selected (non-null)
- Weather data loaded successfully
- Queue is not full

When clicked, the parent assembles a `ComparisonQueueItem` using:
```typescript
const queueItem = buildQueueItem(
  searchParams.destination!,
  dateRange,
  searchParams.originAirport,
  dateDetailResults.flight.data!,
  selectedHotel,            // ← from HotelSelectionCard
  dateDetailResults.weather.data!,
  searchParams.travelerCount,
);
```

---

## 11. Accessibility

| Aspect | Implementation |
|--------|----------------|
| **Card heading** | `CardHeader title="Hotels"` renders as an `h6` — provides a landmark heading for screen readers |
| **List semantics** | MUI `List` renders `<ul>`, `ListItemButton` renders `<li>` with `role="option"` implied by `selected` |
| **aria-selected** | Set on each `ListItemButton` to indicate the currently selected hotel |
| **aria-label** | Each `ListItemButton` has an `aria-label` with hotel name and price for screen readers |
| **Rating** | MUI `Rating` with `readOnly` includes built-in `aria-label` like "4.2 Stars" |
| **Keyboard** | `Tab` navigates between hotel items, `Enter`/`Space` selects |
| **Focus visible** | MUI default focus-visible ring on `ListItemButton` |

---

*End of Hotel Selection Section Layout Specification*
