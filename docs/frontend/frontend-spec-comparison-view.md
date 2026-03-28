# WhenToGo Frontend Specification — Comparison View

> **Audience**: Ralph Loop (autonomous implementation agent)
> **Scope**: Complete specification for the side-by-side comparison results view — showing flight cost, hotel cost, weather score, total cost, scoring rankings, and auto-tags after `POST /api/v1/compare` returns.
> **Cross-references**: Types from `frontend/src/types/api.ts` (`TripOption`, `CompareResponse`, `WeatherSummary`), frontend types from `docs/frontend/frontend-spec.md` Section 1, comparison queue from `docs/frontend/frontend-spec-comparison-queue.md`, API layer from `src/lib/api.ts`.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Flow](#2-data-flow)
3. [Types Used](#3-types-used)
4. [Component Tree](#4-component-tree)
5. [ComparisonSection Container](#5-comparisonsection-container)
6. [ComparisonTable Component](#6-comparisontable-component)
7. [ComparisonColumn Component](#7-comparisoncolumn-component)
8. [TagChip Component](#8-tagchip-component)
9. [ScoreBar Component](#9-scorebar-component)
10. [BestOptionBanner Component](#10-bestoptionbanner-component)
11. [Layout & Wireframe](#11-layout--wireframe)
12. [Four UI States](#12-four-ui-states)
13. [Styling Specifications](#13-styling-specifications)
14. [Edge Cases & Boundary Conditions](#14-edge-cases--boundary-conditions)
15. [Accessibility](#15-accessibility)
16. [File Structure](#16-file-structure)

---

## 1. Overview

The Comparison View is the **final section** in the progressive-reveal single-page flow. It appears when the user clicks "Compare" in the comparison queue (requires 2–5 queued items). The backend scores and ranks the options via `POST /api/v1/compare` and returns `CompareResponse`. The frontend renders the results as a side-by-side table with columns for each trip option, sorted by `overall_score` descending (as returned by the backend).

**Key behaviors:**
- The comparison view is the last revealed section, appearing below the hotel selection area.
- Each trip option is rendered as a vertical column in a horizontal table layout.
- The best option (index 0 in the sorted response) is visually highlighted.
- Auto-tags (`cheapest`, `best_weather`, `best_overall`) are rendered as colored chips on the relevant columns.
- All scoring and cost calculations come from the backend response — the frontend displays them as-is without recalculating.
- The section includes a "Compare Again" button to allow the user to modify their queue and re-compare.
- The section scrolls into view automatically when results load.

---

## 2. Data Flow

### 2.1 Trigger

The comparison is triggered by calling `compareTrips()` from the `useComparisonQueue` context hook. This happens when the user clicks the "Compare" button in the `ComparisonQueuePanel` (see `docs/frontend/frontend-spec-comparison-queue.md` Section 8).

### 2.2 API Call

```
POST /api/v1/compare
Request body: { options: CompareOptionInput[] }  // 2–5 items assembled from queue
Response: CompareResponse { options: TripOption[], best_option_index: number }
```

The API service layer method (in `src/lib/api.ts`):

```typescript
compareTrips(options: CompareOptionInput[]): Promise<CompareResponse>
```

Where `CompareOptionInput` is the shape sent to the backend (assembled from `ComparisonQueueItem` fields):

```typescript
// Assembled per queue item before sending:
{
  destination: item.destination,
  start_date: item.startDate,
  end_date: item.endDate,
  flight_price: item.flightPrice,
  hotel_name: item.hotelName,
  hotel_price: item.hotelPrice,
  weather: item.weather,  // WeatherSummary without `daily` array
  traveler_count: item.travelerCount,
}
```

### 2.3 Response Handling

The `CompareResponse` is stored in the comparison queue context state:

```typescript
// In ComparisonQueueContext state:
compareResult: CompareResponse | null;
compareStatus: 'idle' | 'loading' | 'success' | 'error';
compareError: string | null;
```

The `ComparisonSection` reads these values via `useComparisonQueue()`.

### 2.4 State Transition

```
idle → (user clicks "Compare") → loading → success | error
success → (user clicks "Compare Again") → idle (clears compareResult, keeps queue)
error → (user clicks "Retry") → loading → success | error
```

---

## 3. Types Used

All types are imported — never redefined.

### From `frontend/src/types/api.ts`:

```typescript
import type {
  TripOption,
  CompareResponse,
  WeatherSummary,
} from '@/types/api';
```

Key fields of `TripOption` used in the comparison view:

| Field | Type | Display |
|-------|------|---------|
| `destination` | `string` | Column header subtitle |
| `start_date` | `string` | Formatted as "May 1" via dayjs |
| `end_date` | `string` | Formatted as "May 5" via dayjs |
| `flight_price` | `number` | Per-person price: `$342.50` |
| `hotel_name` | `string` | Hotel name text |
| `hotel_price` | `number` | Total hotel cost: `$320.00` |
| `weather.weather_score` | `number` | Score bar + numeric label |
| `weather.label` | `"Great" \| "Good" \| "Fair" \| "Poor"` | Weather label text |
| `weather.average_temp` | `number` | Temperature display: `21.3°C` |
| `weather.rain_signal` | `"low" \| "medium" \| "high"` | Rain indicator text |
| `traveler_count` | `number` | Shown in cost breakdown |
| `total_trip_cost` | `number` | Total trip cost: `$1,005.00` |
| `cost_per_person` | `number` | Per person: `$502.50` |
| `overall_score` | `number` | Score bar + numeric: `90.5` |
| `tags` | `string[]` | Rendered as `TagChip` components |

### From `frontend/src/types/frontend.ts`:

```typescript
// Tag display configuration (defined in frontend types)
export type AutoTag = 'cheapest' | 'best_weather' | 'best_overall';

export interface TagConfig {
  label: string;
  color: string;       // MUI color name for Chip
  icon: string;        // Emoji prefix
}

export const TAG_CONFIG: Record<AutoTag, TagConfig> = {
  cheapest:      { label: 'Cheapest',      color: 'success', icon: '💰' },
  best_weather:  { label: 'Best Weather',  color: 'info',    icon: '☀️' },
  best_overall:  { label: 'Best Overall',  color: 'warning', icon: '🏆' },
};
```

---

## 4. Component Tree

```
ComparisonSection (container — client component)
├── BestOptionBanner (summary of #1 ranked option)
├── ComparisonTable (horizontal scrollable container)
│   ├── ComparisonColumn (one per TripOption)
│   │   ├── TagChip[] (0–3 tag chips per column)
│   │   ├── ScoreBar (overall_score visualization)
│   │   ├── ScoreBar (weather_score visualization)
│   │   └── Cost breakdown rows
│   └── ... (2–5 columns)
└── "Compare Again" Button
```

All components are client components (`'use client'` directive) since they depend on context state.

---

## 5. ComparisonSection Container

### 5.1 File Location

`frontend/src/components/comparison/ComparisonSection.tsx`

### 5.2 Component Signature

```typescript
'use client';

import type { FC } from 'react';

/**
 * ComparisonSection — Container for comparison results.
 * No props — reads all data from ComparisonQueueContext.
 * Renders only when compareStatus !== 'idle'.
 */
const ComparisonSection: FC = () => { ... };
export default ComparisonSection;
```

### 5.3 State Dependencies

```typescript
const {
  compareResult,    // CompareResponse | null
  compareStatus,    // 'idle' | 'loading' | 'success' | 'error'
  compareError,     // string | null
  compareTrips,     // () => Promise<void>  — retry function
  clearCompareResult, // () => void — resets to idle
} = useComparisonQueue();
```

### 5.4 Rendering Logic

```
if (compareStatus === 'idle') → render nothing (return null)
if (compareStatus === 'loading') → render loading state
if (compareStatus === 'error') → render error state with retry
if (compareStatus === 'success' && compareResult) → render results
```

### 5.5 Auto-Scroll Behavior

When `compareStatus` transitions to `'success'`, the section scrolls into view:

```typescript
const sectionRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (compareStatus === 'success' && sectionRef.current) {
    sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}, [compareStatus]);
```

### 5.6 Section Wrapper

```tsx
<Box ref={sectionRef} sx={{ mt: 6, mb: 4 }}>
  <Typography variant="h4" component="h2" gutterBottom>
    Comparison Results
  </Typography>
  {/* State-dependent content */}
</Box>
```

---

## 6. ComparisonTable Component

### 6.1 File Location

`frontend/src/components/comparison/ComparisonTable.tsx`

### 6.2 Component Signature

```typescript
'use client';

import type { FC } from 'react';
import type { CompareResponse } from '@/types/api';

interface ComparisonTableProps {
  /** The compare API response containing scored & sorted options */
  data: CompareResponse;
}

const ComparisonTable: FC<ComparisonTableProps> = ({ data }) => { ... };
export default ComparisonTable;
```

### 6.3 Layout Structure

The table is a horizontal scrollable container using MUI `Box` with CSS Grid or flexbox. Each `TripOption` becomes a `ComparisonColumn`.

```tsx
<Box
  sx={{
    display: 'flex',
    gap: 2,
    overflowX: 'auto',
    pb: 2,  // space for scrollbar
  }}
>
  {/* Row labels column (sticky left) */}
  <Box sx={{ minWidth: 160, flexShrink: 0, pt: '72px' }}>
    {/* Row label items — see Section 6.4 */}
  </Box>

  {/* One ComparisonColumn per TripOption */}
  {data.options.map((option, index) => (
    <ComparisonColumn
      key={`${option.destination}-${option.start_date}-${option.end_date}`}
      option={option}
      rank={index + 1}
      isBest={index === data.best_option_index}
    />
  ))}
</Box>
```

### 6.4 Row Labels

The left-most sticky column contains labels for each data row. These labels align vertically with the corresponding data cells in each `ComparisonColumn`. The rows are (top to bottom):

| Row | Label Text | Description |
|-----|-----------|-------------|
| 1 | *(header area)* | Column header with rank, dates, tags — no label needed |
| 2 | `Overall Score` | Overall score bar |
| 3 | `Weather Score` | Weather score bar |
| 4 | `Weather` | Label + avg temp + rain signal |
| 5 | `Flight (per person)` | Per-person flight price |
| 6 | `Hotel` | Hotel name + total hotel price |
| 7 | `Total Trip Cost` | Total cost for all travelers |
| 8 | `Cost Per Person` | Per-person total cost |

Each label is rendered as:

```tsx
<Typography
  variant="body2"
  color="text.secondary"
  sx={{ height: ROW_HEIGHT, display: 'flex', alignItems: 'center' }}
>
  {label}
</Typography>
```

Where `ROW_HEIGHT = 48` (pixels) — a constant ensuring vertical alignment between labels and data cells.

---

## 7. ComparisonColumn Component

### 7.1 File Location

`frontend/src/components/comparison/ComparisonColumn.tsx`

### 7.2 Component Signature

```typescript
'use client';

import type { FC } from 'react';
import type { TripOption } from '@/types/api';

interface ComparisonColumnProps {
  /** Scored trip option from the compare API response */
  option: TripOption;
  /** Rank position (1-based). 1 = best, as returned sorted by overall_score desc */
  rank: number;
  /** Whether this is the best option (highlighted with border/background) */
  isBest: boolean;
}

const ComparisonColumn: FC<ComparisonColumnProps> = ({ option, rank, isBest }) => { ... };
export default ComparisonColumn;
```

### 7.3 Column Layout

Each column is an MUI `Paper` with fixed width and vertical data cells:

```tsx
<Paper
  elevation={isBest ? 4 : 1}
  sx={{
    minWidth: 240,
    maxWidth: 280,
    flexShrink: 0,
    border: isBest ? '2px solid' : '1px solid',
    borderColor: isBest ? 'primary.main' : 'divider',
    bgcolor: isBest ? 'primary.50' : 'background.paper',
    borderRadius: 2,
    overflow: 'hidden',
  }}
>
  {/* Header */}
  {/* Data rows */}
</Paper>
```

### 7.4 Column Header (top of each column)

```tsx
<Box sx={{ p: 2, bgcolor: isBest ? 'primary.100' : 'grey.50', textAlign: 'center' }}>
  {/* Rank badge */}
  <Typography variant="caption" color="text.secondary">
    #{rank}
  </Typography>

  {/* Date range */}
  <Typography variant="h6" sx={{ fontWeight: 600 }}>
    {dayjs(option.start_date).format('MMM D')} – {dayjs(option.end_date).format('MMM D')}
  </Typography>

  {/* Destination */}
  <Typography variant="body2" color="text.secondary">
    {option.destination}
  </Typography>

  {/* Tags row */}
  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap', mt: 1 }}>
    {option.tags.map((tag) => (
      <TagChip key={tag} tag={tag as AutoTag} />
    ))}
  </Box>
</Box>
```

Date formatting uses dayjs:
- `dayjs('2026-05-01').format('MMM D')` → `"May 1"`
- `dayjs('2026-05-05').format('MMM D')` → `"May 5"`

### 7.5 Data Rows

Each data row has a fixed height of `ROW_HEIGHT = 48px` and displays one metric. All rows use consistent padding `px: 2`.

#### Row 1: Overall Score

```tsx
<Box sx={{ height: ROW_HEIGHT, px: 2, display: 'flex', alignItems: 'center' }}>
  <ScoreBar score={option.overall_score} maxScore={100} variant="primary" />
</Box>
```

#### Row 2: Weather Score

```tsx
<Box sx={{ height: ROW_HEIGHT, px: 2, display: 'flex', alignItems: 'center' }}>
  <ScoreBar score={option.weather.weather_score} maxScore={100} variant="weather" />
</Box>
```

#### Row 3: Weather Details

```tsx
<Box sx={{ height: ROW_HEIGHT, px: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
  <Typography variant="body2" sx={{ fontWeight: 500 }}>
    {option.weather.label}
  </Typography>
  <Typography variant="caption" color="text.secondary">
    {option.weather.average_temp.toFixed(1)}°C · Rain: {option.weather.rain_signal}
  </Typography>
</Box>
```

#### Row 4: Flight Price (per person)

```tsx
<Box sx={{ height: ROW_HEIGHT, px: 2, display: 'flex', alignItems: 'center' }}>
  <Typography variant="body2">
    ${option.flight_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  </Typography>
</Box>
```

#### Row 5: Hotel

```tsx
<Box sx={{ height: ROW_HEIGHT, px: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
  <Typography variant="body2" noWrap title={option.hotel_name}>
    {option.hotel_name}
  </Typography>
  <Typography variant="caption" color="text.secondary">
    ${option.hotel_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  </Typography>
</Box>
```

#### Row 6: Total Trip Cost

```tsx
<Box sx={{ height: ROW_HEIGHT, px: 2, display: 'flex', alignItems: 'center' }}>
  <Typography variant="body1" sx={{ fontWeight: 700 }}>
    ${option.total_trip_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  </Typography>
</Box>
```

#### Row 7: Cost Per Person

```tsx
<Box sx={{ height: ROW_HEIGHT, px: 2, display: 'flex', alignItems: 'center' }}>
  <Typography variant="body2" color="text.secondary">
    ${option.cost_per_person.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    <Typography component="span" variant="caption" color="text.secondary"> /person</Typography>
  </Typography>
</Box>
```

### 7.6 Currency Formatting

All USD amounts use `toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })` prefixed with `$`. Examples:
- `342.5` → `$342.50`
- `1005` → `$1,005.00`
- `15320.75` → `$15,320.75`

A helper function can be extracted:

```typescript
// In src/lib/format.ts
export function formatUSD(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
```

---

## 8. TagChip Component

### 8.1 File Location

`frontend/src/components/comparison/TagChip.tsx`

### 8.2 Component Signature

```typescript
'use client';

import type { FC } from 'react';
import type { AutoTag } from '@/types/frontend';

interface TagChipProps {
  /** The auto-tag identifier from the API response */
  tag: AutoTag;
}

const TagChip: FC<TagChipProps> = ({ tag }) => { ... };
export default TagChip;
```

### 8.3 Rendering

Uses MUI `Chip` with `size="small"`:

```tsx
import { Chip } from '@mui/material';
import { TAG_CONFIG } from '@/types/frontend';

const config = TAG_CONFIG[tag];
// If tag is not in TAG_CONFIG (future-proofing), render a default grey chip

<Chip
  label={`${config.icon} ${config.label}`}
  color={config.color as any}
  size="small"
  variant="filled"
  sx={{ fontWeight: 500, fontSize: '0.75rem' }}
/>
```

### 8.4 Tag Visual Mapping

| Tag Value | Display Label | Emoji | MUI Chip Color | Resulting Color |
|-----------|--------------|-------|----------------|-----------------|
| `cheapest` | Cheapest | 💰 | `success` | Green |
| `best_weather` | Best Weather | ☀️ | `info` | Blue |
| `best_overall` | Best Overall | 🏆 | `warning` | Orange/Amber |

### 8.5 Unknown Tag Fallback

If the API returns a tag not in `TAG_CONFIG` (e.g., future API changes), render a default chip:

```tsx
const config = TAG_CONFIG[tag] ?? { label: tag, color: 'default', icon: '' };
```

---

## 9. ScoreBar Component

### 9.1 File Location

`frontend/src/components/comparison/ScoreBar.tsx`

### 9.2 Component Signature

```typescript
'use client';

import type { FC } from 'react';

interface ScoreBarProps {
  /** The score value (0–100) */
  score: number;
  /** Maximum possible score (always 100) */
  maxScore: number;
  /** Visual variant determining the bar color */
  variant: 'primary' | 'weather';
}

const ScoreBar: FC<ScoreBarProps> = ({ score, maxScore, variant }) => { ... };
export default ScoreBar;
```

### 9.3 Rendering

A horizontal bar with a numeric label showing the score value. Uses MUI `LinearProgress` with a score label alongside.

```tsx
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
  <LinearProgress
    variant="determinate"
    value={Math.min(100, Math.max(0, (score / maxScore) * 100))}
    sx={{
      flex: 1,
      height: 8,
      borderRadius: 4,
      bgcolor: 'grey.200',
      '& .MuiLinearProgress-bar': {
        borderRadius: 4,
        bgcolor: variant === 'primary' ? 'primary.main' : weatherScoreColor(score),
      },
    }}
  />
  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 36, textAlign: 'right' }}>
    {score.toFixed(1)}
  </Typography>
</Box>
```

### 9.4 Weather Score Color Function

```typescript
function weatherScoreColor(score: number): string {
  if (score >= 80) return '#4caf50'; // green — Great
  if (score >= 60) return '#2196f3'; // blue — Good
  if (score >= 40) return '#ff9800'; // orange — Fair
  return '#f44336';                   // red — Poor
}
```

This mapping mirrors the `WeatherSummary.label` thresholds from the API:
- `Great`: score >= 80 → green
- `Good`: score >= 60 → blue
- `Fair`: score >= 40 → orange
- `Poor`: score < 40 → red

### 9.5 Clamping

The score is clamped to [0, maxScore] before computing the percentage to prevent visual overflow:

```typescript
const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));
```

---

## 10. BestOptionBanner Component

### 10.1 File Location

`frontend/src/components/comparison/BestOptionBanner.tsx`

### 10.2 Component Signature

```typescript
'use client';

import type { FC } from 'react';
import type { TripOption } from '@/types/api';

interface BestOptionBannerProps {
  /** The highest-ranked trip option (index 0 of sorted response) */
  bestOption: TripOption;
}

const BestOptionBanner: FC<BestOptionBannerProps> = ({ bestOption }) => { ... };
export default BestOptionBanner;
```

### 10.3 Rendering

An MUI `Alert` with `severity="success"` displayed above the comparison table summarizing the recommended option:

```tsx
<Alert
  severity="success"
  icon={<EmojiEventsIcon />}  // MUI icon — trophy
  sx={{ mb: 3 }}
>
  <AlertTitle>Recommended: {dayjs(bestOption.start_date).format('MMM D')} – {dayjs(bestOption.end_date).format('MMM D')}</AlertTitle>
  <Typography variant="body2">
    {bestOption.destination} · {formatUSD(bestOption.total_trip_cost)} total
    ({formatUSD(bestOption.cost_per_person)}/person) · Weather: {bestOption.weather.label}
    ({bestOption.weather.weather_score.toFixed(1)}/100) · Score: {bestOption.overall_score.toFixed(1)}/100
  </Typography>
</Alert>
```

Import `EmojiEventsIcon` from `@mui/icons-material/EmojiEvents`. If `@mui/icons-material` is not available, use the emoji `🏆` as plain text instead.

### 10.4 When to Show

Always shown when `compareStatus === 'success'` and `compareResult` is non-null. The `bestOption` is always `compareResult.options[compareResult.best_option_index]`.

---

## 11. Layout & Wireframe

### 11.1 Overall Section Layout (top to bottom)

```
┌─────────────────────────────────────────────────────────────┐
│  <Typography variant="h4">                                  │
│    Comparison Results                                       │
│  </Typography>                                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ✅ Recommended: May 15 – May 19                        ││
│  │ Tokyo · $873.00 total ($436.50/person) · Weather: Good ││
│  │ (68.2/100) · Score: 90.5/100                           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌──────────┬────────────┬────────────┬────────────┐       │
│  │ Labels   │  Column 1  │  Column 2  │  Column 3  │  ...  │
│  │          │  (Best) ★  │            │            │       │
│  │          │ May 15–19  │ May 1–5    │ May 22–26  │       │
│  │          │ 💰🏆       │ ☀️         │            │       │
│  ├──────────┼────────────┼────────────┼────────────┤       │
│  │ Overall  │ ████░ 90.5 │ ██░░ 24.7  │ ███░ 65.2  │       │
│  │ Score    │            │            │            │       │
│  ├──────────┼────────────┼────────────┼────────────┤       │
│  │ Weather  │ ████░ 68.2 │ █████ 82.4 │ ███░ 55.0  │       │
│  │ Score    │            │            │            │       │
│  ├──────────┼────────────┼────────────┼────────────┤       │
│  │ Weather  │ Good       │ Great      │ Fair       │       │
│  │          │ 23.8°C·med │ 21.3°C·low │ 26.1°C·med │       │
│  ├──────────┼────────────┼────────────┼────────────┤       │
│  │ Flight   │ $289.00    │ $342.50    │ $310.00    │       │
│  │(per prsn)│            │            │            │       │
│  ├──────────┼────────────┼────────────┼────────────┤       │
│  │ Hotel    │ Tokyo Inn  │ Tokyo Inn  │ Grand Htl  │       │
│  │          │ $295.00    │ $320.00    │ $350.00    │       │
│  ├──────────┼────────────┼────────────┼────────────┤       │
│  │ Total    │ $873.00    │ $1,005.00  │ $970.00    │       │
│  │Trip Cost │ (bold)     │            │            │       │
│  ├──────────┼────────────┼────────────┼────────────┤       │
│  │ Cost Per │ $436.50    │ $502.50    │ $485.00    │       │
│  │ Person   │ /person    │ /person    │ /person    │       │
│  └──────────┴────────────┴────────────┴────────────┘       │
│                                                             │
│  ┌──────────────────┐                                       │
│  │  Compare Again   │ (outlined button, centered)           │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

### 11.2 Dimensions

| Element | Value |
|---------|-------|
| Section max-width | `1200px` (MUI Container `maxWidth="lg"`) |
| Column min-width | `240px` |
| Column max-width | `280px` |
| Row height | `48px` (constant `ROW_HEIGHT`) |
| Row label column width | `160px` |
| Gap between columns | `16px` (MUI spacing `gap: 2`) |
| Section top margin | `48px` (`mt: 6`) |
| Section bottom margin | `32px` (`mb: 4`) |

### 11.3 Horizontal Scroll

When there are 4+ columns, the table overflows horizontally. The row labels column stays visible (sticky left). The scrollable area has `overflowX: 'auto'` and `pb: 2` to ensure the scrollbar doesn't overlap content.

Row labels sticky positioning:

```tsx
<Box sx={{
  minWidth: 160,
  flexShrink: 0,
  position: 'sticky',
  left: 0,
  zIndex: 1,
  bgcolor: 'background.default',
}}>
```

---

## 12. Four UI States

### 12.1 Idle State

**When**: `compareStatus === 'idle'`
**Render**: Nothing — `ComparisonSection` returns `null`. The section is invisible until a comparison is triggered.

### 12.2 Loading State

**When**: `compareStatus === 'loading'`
**Render**:

```tsx
<Box sx={{ mt: 6, mb: 4 }}>
  <Typography variant="h4" component="h2" gutterBottom>
    Comparison Results
  </Typography>
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
    <CircularProgress size={48} />
    <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
      Scoring your trip options...
    </Typography>
  </Box>
</Box>
```

### 12.3 Error State

**When**: `compareStatus === 'error'`
**Render**:

```tsx
<Box sx={{ mt: 6, mb: 4 }}>
  <Typography variant="h4" component="h2" gutterBottom>
    Comparison Results
  </Typography>
  <Alert severity="error" sx={{ mb: 2 }}>
    <AlertTitle>Comparison Failed</AlertTitle>
    <Typography variant="body2">
      {compareError ?? 'An unexpected error occurred while comparing trip options.'}
    </Typography>
  </Alert>
  <Button variant="outlined" onClick={compareTrips}>
    Retry
  </Button>
</Box>
```

**Behavior**:
- The error message comes from `compareError` in context state.
- The "Retry" button calls `compareTrips()` from the context (re-sends the same queue to the API).
- No auto-retry — user must click the button.
- No toast — error is displayed inline in the section.

### 12.4 Success State

**When**: `compareStatus === 'success'` and `compareResult !== null`
**Render**: Full comparison view with BestOptionBanner, ComparisonTable, and "Compare Again" button.

```tsx
<Box ref={sectionRef} sx={{ mt: 6, mb: 4 }}>
  <Typography variant="h4" component="h2" gutterBottom>
    Comparison Results
  </Typography>

  <BestOptionBanner bestOption={compareResult.options[compareResult.best_option_index]} />

  <ComparisonTable data={compareResult} />

  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
    <Button variant="outlined" onClick={clearCompareResult}>
      Compare Again
    </Button>
  </Box>
</Box>
```

### 12.5 Empty Results Edge Case

The backend requires 2–5 options and always returns the same number of scored options. The `options` array in the response will never be empty if the request succeeds. However, as a defensive measure:

```typescript
if (compareResult && compareResult.options.length === 0) {
  // Treat as error — show fallback message
  return (
    <Alert severity="info">
      <AlertTitle>No Results</AlertTitle>
      No comparison results were returned. Please try again.
    </Alert>
  );
}
```

---

## 13. Styling Specifications

### 13.1 Best Option Highlight

The best option column (where `isBest === true`) receives distinct visual treatment:

| Property | Best Column | Other Columns |
|----------|-------------|---------------|
| `elevation` (Paper) | `4` | `1` |
| Border | `2px solid primary.main` | `1px solid divider` |
| Background | `primary.50` (very light primary) | `background.paper` |
| Header background | `primary.100` | `grey.50` |

Note: `primary.50` and `primary.100` are MUI 7 default palette tonal values. If not available in the default theme, use `alpha(theme.palette.primary.main, 0.04)` and `alpha(theme.palette.primary.main, 0.08)` respectively via `import { alpha } from '@mui/material/styles'`.

### 13.2 Dividers Between Rows

Each data row has a top border except the first:

```tsx
<Box sx={{
  height: ROW_HEIGHT,
  px: 2,
  display: 'flex',
  alignItems: 'center',
  borderTop: '1px solid',
  borderColor: 'divider',
}}>
```

### 13.3 Score Bar Colors

| Variant | Bar Color |
|---------|-----------|
| `primary` | MUI `primary.main` (default blue) |
| `weather` | Dynamic based on score (see Section 9.4) |

### 13.4 Total Trip Cost Row Emphasis

The "Total Trip Cost" row uses `variant="body1"` with `fontWeight: 700` to visually emphasize the most important cost figure.

---

## 14. Edge Cases & Boundary Conditions

### 14.1 Exactly 2 Options (Minimum)

- Table renders 2 columns plus the labels column.
- Both columns fill available space without horizontal scroll.
- `best_option_index` is always `0` (the first/best).

### 14.2 Exactly 5 Options (Maximum)

- Table renders 5 columns plus labels column — total ~1440px.
- Horizontal scroll activates since columns exceed `1200px` container.
- Row labels column is sticky-left so it remains visible during scroll.

### 14.3 Single Tag vs. Multiple Tags

- A `TripOption` can have 0, 1, 2, or 3 tags.
- Tags wrap within the header area if they exceed column width.
- If `tags` is an empty array `[]`, the tag row area renders but shows nothing (no placeholder text needed).

### 14.4 Very Long Hotel Names

- Hotel name uses `noWrap` with text overflow ellipsis.
- Full name available on hover via `title` attribute.
- Max display width constrained by column max-width (280px minus padding).

### 14.5 Very Large Cost Values

- `toLocaleString('en-US', ...)` handles comma-separated thousands automatically.
- Example: `$152,340.75` fits within column width with `body2` typography.

### 14.6 Score Edge Values

- `overall_score = 0`: ScoreBar shows empty bar, label reads `0.0`.
- `overall_score = 100`: ScoreBar shows full bar, label reads `100.0`.
- `weather_score = 0`: Bar is empty, color is red (Poor).
- `weather_score = 100`: Bar is full, color is green (Great).

### 14.7 API Error Responses

| HTTP Status | `compareError` Message | User Sees |
|-------------|----------------------|-----------|
| `400` | Backend error message from response body | Inline error alert + Retry button |
| `422` | `"At least 2 options are required for comparison"` | Inline error alert + Retry button |
| `500` | `"An unexpected error occurred"` | Inline error alert + Retry button |
| Network error | `"Network error. Please check your connection and try again."` | Inline error alert + Retry button |
| Timeout | `"Request timed out. Please try again."` | Inline error alert + Retry button |

Error messages are extracted from the Axios error response `error.response?.data?.message` with a fallback to a generic message.

### 14.8 "Compare Again" Behavior

When the user clicks "Compare Again":
1. `clearCompareResult()` sets `compareResult` to `null` and `compareStatus` to `'idle'`.
2. The `ComparisonSection` returns `null` (disappears).
3. The comparison queue items remain intact — the user can modify the queue (add/remove items) and re-compare.
4. The page scrolls back to the queue section (handled by the queue panel, not the comparison section).

### 14.9 Tie-Breaking in Tags

If two options have the same `total_trip_cost` or same `weather_score`, the backend decides which gets the tag. The frontend does NOT handle tie-breaking — it displays whatever tags the backend assigns.

### 14.10 Traveler Count Display

The traveler count is not shown as a separate row since it's the same across all options in a comparison (the user sets it once). However, it's implicitly referenced in the "Cost Per Person" row via the `/person` suffix. If future API changes allow mixed traveler counts, the column structure already supports per-option display.

---

## 15. Accessibility

### 15.1 Semantic Structure

- Section heading uses `<Typography variant="h4" component="h2">` for proper heading hierarchy.
- `BestOptionBanner` uses MUI `Alert` which has `role="alert"` by default.
- Score bars use `LinearProgress` which has `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` set automatically by MUI.

### 15.2 Keyboard Navigation

- "Retry" and "Compare Again" buttons are standard MUI `Button` components — focusable and activatable via Enter/Space.
- Horizontal scroll area is keyboard-scrollable via Tab to focus then arrow keys.

### 15.3 Color + Text Redundancy

- Tags have both color AND text labels — not color-only.
- Weather score has both a colored bar AND numeric score AND text label (Great/Good/Fair/Poor).
- Best option has both a border highlight AND rank number (#1).

### 15.4 Screen Reader Considerations

- `LinearProgress` with `variant="determinate"` automatically announces percentage.
- Tag chips include the text label (e.g., "💰 Cheapest") — the emoji is decorative but the text is meaningful.

---

## 16. File Structure

```
frontend/src/components/comparison/
├── ComparisonSection.tsx      # Container: reads context, handles 4 UI states
├── ComparisonTable.tsx        # Horizontal table layout with row labels + columns
├── ComparisonColumn.tsx       # Single column for one TripOption
├── TagChip.tsx                # Auto-tag chip (cheapest, best_weather, best_overall)
├── ScoreBar.tsx               # Horizontal score bar with numeric label
├── BestOptionBanner.tsx       # Success alert banner for #1 ranked option
└── index.ts                   # Barrel export

frontend/src/lib/
└── format.ts                  # formatUSD() helper (shared across components)
```

### 16.1 Barrel Export

```typescript
// frontend/src/components/comparison/index.ts
export { default as ComparisonSection } from './ComparisonSection';
export { default as ComparisonTable } from './ComparisonTable';
export { default as ComparisonColumn } from './ComparisonColumn';
export { default as TagChip } from './TagChip';
export { default as ScoreBar } from './ScoreBar';
export { default as BestOptionBanner } from './BestOptionBanner';
```

### 16.2 Integration with Page

The `ComparisonSection` is placed at the bottom of the root page component (`frontend/src/app/page.tsx`), after all other sections:

```tsx
// In page.tsx (simplified)
<ComparisonQueueProvider>
  {/* ... SearchSection, CalendarSection, HotelSection ... */}
  <ComparisonSection />
</ComparisonQueueProvider>
```

### 16.3 Constants

Define in `frontend/src/types/constants.ts` (or reuse existing constants file):

```typescript
/** Fixed height for each data row in the comparison table, in pixels */
export const COMPARISON_ROW_HEIGHT = 48;

/** Width of the row labels column in the comparison table, in pixels */
export const COMPARISON_LABEL_WIDTH = 160;

/** Min width for each comparison column, in pixels */
export const COMPARISON_COLUMN_MIN_WIDTH = 240;

/** Max width for each comparison column, in pixels */
export const COMPARISON_COLUMN_MAX_WIDTH = 280;
```
