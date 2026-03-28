# WhenToGo Frontend Spec — Data Display & Visualization Component Signatures

> **Audience**: Ralph Loop (autonomous implementation agent)
> **Scope**: Exact TypeScript props interfaces, data-binding contracts, computed values, and rendering rules for every read-only data display and visualization component.
> **Cross-references**: `frontend/src/types/api.ts` (API types), `docs/frontend/frontend-spec.md` §1 (frontend types), `docs/frontend/frontend-spec-ui-states.md` (AsyncState model), `docs/frontend/frontend-spec-component-signatures.md` (form/input component signatures)

---

## Table of Contents

1. [Component Inventory](#1-component-inventory)
2. [ScoreCard](#2-scorecard)
3. [DestinationCard](#3-destinationcard)
4. [FlightPriceCard](#4-flightpricecard)
5. [HotelResultsList](#5-hotelresultslist)
6. [WeatherSummaryCard](#6-weathersummarycard)
7. [WeatherTimeline](#7-weathertimeline)
8. [CalendarHeatmap](#8-calendarheatmap)
9. [CostBreakdownChart](#9-costbreakdownchart)
10. [ComparisonResultsTable](#10-comparisonresultstable)
11. [TagChip](#11-tagchip)
12. [WeatherLabelChip](#12-weatherlabelchip)
13. [RainSignalIndicator](#13-rainsignalindicator)
14. [ScoreBadge](#14-scorebadge)
15. [CurrencyDisplay](#15-currencydisplay)
16. [Shared Constants](#16-shared-constants)
17. [Complete Import Map](#17-complete-import-map)

---

## 1. Component Inventory

All data display and visualization components, their file paths, directives, and roles:

| # | Component | File Path | Directive | Role |
|---|-----------|-----------|-----------|------|
| 1 | `ScoreCard` | `src/components/display/ScoreCard.tsx` | `'use client'` | Displays a single numeric score (0–100) with label and color coding |
| 2 | `DestinationCard` | `src/components/display/DestinationCard.tsx` | `'use client'` | Shows selected destination summary (name, country, IATA code) |
| 3 | `FlightPriceCard` | `src/components/FlightPriceCard.tsx` | `'use client'` | Flight price display with per-person and group totals |
| 4 | `HotelResultsList` | `src/components/display/HotelResultsList.tsx` | `'use client'` | Renders the list of hotel options inside HotelSelectionCard |
| 5 | `WeatherSummaryCard` | `src/components/WeatherSummaryCard.tsx` | `'use client'` | Weather summary display with expandable daily breakdown |
| 6 | `WeatherTimeline` | `src/components/display/WeatherTimeline.tsx` | `'use client'` | Horizontal day-by-day weather strip inside WeatherSummaryCard |
| 7 | `CalendarHeatmap` | `src/components/display/CalendarHeatmap.tsx` | `'use client'` | 2-month calendar grid with weather-colored day cells |
| 8 | `CostBreakdownChart` | `src/components/display/CostBreakdownChart.tsx` | `'use client'` | Stacked horizontal bar showing flight vs hotel cost breakdown |
| 9 | `ComparisonResultsTable` | `src/components/ComparisonResultsTable.tsx` | `'use client'` | Side-by-side scored comparison table after POST /api/v1/compare |
| 10 | `TagChip` | `src/components/display/TagChip.tsx` | `'use client'` | Renders a single auto-tag ("cheapest", "best_weather", "best_overall") as a colored MUI Chip |
| 11 | `WeatherLabelChip` | `src/components/display/WeatherLabelChip.tsx` | `'use client'` | Renders a weather label ("Great"/"Good"/"Fair"/"Poor") as a colored MUI Chip |
| 12 | `RainSignalIndicator` | `src/components/display/RainSignalIndicator.tsx` | `'use client'` | Visual indicator for rain signal level (low/medium/high) |
| 13 | `ScoreBadge` | `src/components/display/ScoreBadge.tsx` | `'use client'` | Compact circular score badge for use in table cells and queue items |
| 14 | `CurrencyDisplay` | `src/components/display/CurrencyDisplay.tsx` | `'use client'` | Formatted currency value with optional "per person" or "total" label |
| 15 | `EmptyState` | `src/components/shared/EmptyState.tsx` | `'use client'` | Reusable empty-state placeholder (see shared utility components) |

---

## 2. ScoreCard

**File**: `frontend/src/components/display/ScoreCard.tsx`
**Directive**: `'use client'`
**Purpose**: Displays a single numeric score (0–100) prominently, with a label, descriptive subtitle, and color that reflects the score quality. Used in the DateOptionBuilderSection to show the weather score for the selected date range, and in the ComparisonResultsTable for the overall score column.

### 2.1 Props Interface

```typescript
interface ScoreCardProps {
  /**
   * Numeric score value, 0–100.
   * Rendered as a large bold number with one decimal place.
   * Example: 82.4 → "82.4"
   */
  score: number;

  /**
   * Short label displayed above the score.
   * Example: "Weather Score", "Overall Score"
   */
  label: string;

  /**
   * Optional subtitle displayed below the score number.
   * Example: "Great", "Good", "Fair", "Poor"
   * When provided, rendered as Typography variant="body2", color="text.secondary".
   */
  subtitle?: string;

  /**
   * Size variant controlling the visual prominence.
   * - "large": Used standalone in cards. Score font: Typography variant="h3".
   *   Card wrapper: MUI Paper with p={3}.
   * - "compact": Used inside table cells. Score font: Typography variant="h6".
   *   No card wrapper, renders inline.
   * Default: "large"
   */
  size?: 'large' | 'compact';
}
```

### 2.2 Internal State

```typescript
// No internal state. Pure display component.
```

### 2.3 Computed Values

```typescript
/**
 * Score-to-color mapping. Determines the color of the score number text.
 * Uses MUI theme palette colors.
 */
const getScoreColor = (score: number): string => {
  if (score >= 80) return 'success.main';   // green
  if (score >= 60) return 'info.main';      // blue
  if (score >= 40) return 'warning.main';   // orange
  return 'error.main';                       // red
};

/**
 * Format the score for display.
 * Always shows one decimal place.
 */
const formattedScore = score.toFixed(1);
```

### 2.4 Rendering Rules

| size | Wrapper | Score Typography | Label Typography | Layout |
|------|---------|-----------------|------------------|--------|
| `large` | `<Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>` | `variant="h3"` with `color={getScoreColor(score)}` and `fontWeight: 700` | `variant="overline"` with `color="text.secondary"` | Vertical stack: label → score → subtitle |
| `compact` | `<Box sx={{ textAlign: 'center' }}>` (no Paper) | `variant="h6"` with `color={getScoreColor(score)}` and `fontWeight: 700` | `variant="caption"` with `color="text.secondary"` | Vertical stack: label → score |

### 2.5 Export

```typescript
export function ScoreCard(props: ScoreCardProps): JSX.Element;
```

---

## 3. DestinationCard

**File**: `frontend/src/components/display/DestinationCard.tsx`
**Directive**: `'use client'`
**Purpose**: Displays a read-only summary of the currently selected destination. Shown in the SearchSection after a destination is selected, and referenced in the DateOptionBuilderSection header. Provides visual confirmation of which city is active.

### 3.1 Props Interface

```typescript
import type { DestinationResult } from '@/types/api';

interface DestinationCardProps {
  /**
   * The selected destination to display.
   * All fields come from the DestinationResult returned by the search API.
   */
  destination: DestinationResult;

  /**
   * Whether to show a compact inline version (true) or a full card (false).
   * - Compact: Single line — "Tokyo, Japan (TYO)" — no Paper wrapper.
   * - Full: Card with icon, city name, country, and IATA code on separate lines.
   * Default: false (full card).
   */
  compact?: boolean;
}
```

### 3.2 Internal State

```typescript
// No internal state. Pure display component.
```

### 3.3 Rendering Rules

**Full card layout** (`compact === false`):
```
┌─────────────────────────────────────┐
│  📍 Tokyo                           │
│     Japan                           │
│     Airport: TYO                    │
│     (35.68°N, 139.65°E)            │
└─────────────────────────────────────┘
```

- Wrapper: `<Paper variant="outlined" sx={{ p: 2 }}>`
- City name: `Typography variant="h6"` with `PlaceIcon` (MUI `@mui/icons-material/Place`)
- Country: `Typography variant="body2" color="text.secondary"`
- IATA code: `Typography variant="body2" color="text.secondary"`. If `iata_code` is `null`, display `"Airport: N/A"` with `color="text.disabled"`.
- Coordinates: `Typography variant="caption" color="text.disabled"` — format: `{latitude.toFixed(2)}°{N|S}, {longitude.toFixed(2)}°{E|W}` using absolute values with direction suffix.

**Compact layout** (`compact === true`):
- No wrapper. Single line: `<Typography variant="body1">{name}, {country}{iata_code ? ` (${iata_code})` : ''}</Typography>`

### 3.4 Export

```typescript
export function DestinationCard(props: DestinationCardProps): JSX.Element;
```

---

## 4. FlightPriceCard

**File**: `frontend/src/components/FlightPriceCard.tsx`
**Directive**: `'use client'`
**Purpose**: Displays the flight price lookup result. Shows the per-person round-trip price and calculated group total. Handles idle, loading, error, and success states.

> **Note**: The full props and state machine are defined in `docs/frontend/frontend-spec-component-signatures.md` §8. This section specifies the **data display rendering** within the success state.

### 4.1 Props Interface

```typescript
import type { FlightPrice } from '@/types/api';
import type { LoadingState } from '@/types/frontend';

interface FlightPriceCardProps {
  /** Current loading state of the flight price request. */
  state: LoadingState;

  /** Flight price data from POST /api/v1/flights/price. null when not loaded/error. */
  flight: FlightPrice | null;

  /** Error message when state is "error". null otherwise. */
  error: string | null;

  /** Retry callback for error state. */
  onRetry: () => void;

  /** Traveler count for computing group total. */
  travelerCount: number;
}
```

### 4.2 Success State Data Rendering

When `state === 'success'` and `flight` is non-null, render the following layout:

```
┌─────────────────────────────────────┐
│  ✈ Flights                          │
│                                     │
│  $342.50 /person                    │
│  Round-trip economy · ICN → NRT     │
│                                     │
│  ─────────────────────────────────  │
│  Group Total (2 travelers)          │
│  $685.00                            │
└─────────────────────────────────────┘
```

**Computed values**:

```typescript
/** Group total flight cost */
const groupFlightTotal: number = flight.price * travelerCount;

/** Route display string */
const routeDisplay: string = `${flight.origin} → ${flight.destination}`;

/** Date range display */
const dateDisplay: string = `${dayjs(flight.departure_date).format('MMM D')} – ${dayjs(flight.return_date).format('MMM D, YYYY')}`;
```

**Typography mapping**:

| Element | Variant | Weight | Color | Value |
|---------|---------|--------|-------|-------|
| Section title | `h6` | 600 | `text.primary` | `"Flights"` with `FlightIcon` |
| Price per person | `h4` | 700 | `text.primary` | `$${flight.price.toFixed(2)}` |
| "/person" suffix | `body2` | 400 | `text.secondary` | `"/person"` inline after price |
| Route + class | `body2` | 400 | `text.secondary` | `"Round-trip economy · ${routeDisplay}"` |
| Group label | `overline` | 400 | `text.secondary` | `"Group Total (${travelerCount} traveler${travelerCount !== 1 ? 's' : ''})"` |
| Group total | `h5` | 700 | `primary.main` | `$${groupFlightTotal.toFixed(2)}` |
| Date range | `caption` | 400 | `text.disabled` | `dateDisplay` |

**Wrapper**: `<Paper elevation={1} sx={{ p: 2 }}>`

**Divider**: `<Divider sx={{ my: 1.5 }} />` between per-person section and group total.

### 4.3 Export

```typescript
export function FlightPriceCard(props: FlightPriceCardProps): JSX.Element;
```

---

## 5. HotelResultsList

**File**: `frontend/src/components/display/HotelResultsList.tsx`
**Directive**: `'use client'`
**Purpose**: Renders the list of hotel options as selectable rows inside HotelSelectionCard. Each row shows hotel name, price, rating, and distance. One hotel can be selected at a time (radio-button behavior). This is the inner display component; HotelSelectionCard wraps it with loading/error/empty states.

### 5.1 Props Interface

```typescript
import type { HotelOption } from '@/types/api';

interface HotelResultsListProps {
  /**
   * Array of hotel options to render.
   * Pre-sorted by total_price ascending (cheapest first).
   * Maximum 5 items.
   */
  hotels: HotelOption[];

  /**
   * Currently selected hotel, identified by hotel_id.
   * null if no hotel is selected.
   */
  selectedHotelId: string | null;

  /**
   * Callback when user clicks a hotel row.
   * Called with the full HotelOption object.
   */
  onSelectHotel: (hotel: HotelOption) => void;
}
```

### 5.2 Internal State

```typescript
// No internal state. Selection is fully controlled via props.
```

### 5.3 Per-Row Rendering

Each hotel renders as a row using MUI `List` / `ListItem`:

```
┌─────────────────────────────────────────────────┐
│ ○ Tokyo Inn                              $320.00 │
│   ★ 4.2  ·  1.2 km from center                  │
├─────────────────────────────────────────────────┤
│ ● Shinjuku Grand Hotel                   $480.00 │  ← selected
│   ★ 4.5  ·  0.5 km from center                  │
└─────────────────────────────────────────────────┘
```

**Per-row data binding**:

```typescript
// For each hotel in hotels:
{
  // Selection indicator: Radio or selected background
  isSelected: hotel.hotel_id === selectedHotelId,

  // Primary text: hotel name
  primaryText: hotel.hotel_name,

  // Price: right-aligned
  priceText: `$${hotel.total_price.toFixed(2)}`,

  // Secondary line parts:
  ratingText: hotel.rating !== null
    ? `★ ${hotel.rating.toFixed(1)}`
    : '★ N/A',

  distanceText: hotel.distance !== null
    ? `${hotel.distance.toFixed(1)} km from center`
    : 'Distance unknown',
}
```

**Selection styling**:
- Selected row: `sx={{ bgcolor: 'action.selected', borderRadius: 1 }}`
- Unselected row: `sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}`
- Radio button: `<Radio checked={isSelected} />` as `ListItemIcon`

**Rating color**:
- Rating >= 4.0: `color="success.main"`
- Rating >= 3.0: `color="warning.main"`
- Rating < 3.0 or null: `color="text.disabled"`

### 5.4 Export

```typescript
export function HotelResultsList(props: HotelResultsListProps): JSX.Element;
```

---

## 6. WeatherSummaryCard

**File**: `frontend/src/components/WeatherSummaryCard.tsx`
**Directive**: `'use client'`
**Purpose**: Displays the weather summary for a selected date range. Shows average temperature, rain signal, weather score, label chip, and an expandable daily breakdown. Handles idle, loading, error, and success states.

> **Note**: Full props and state machine are defined in `docs/frontend/frontend-spec-component-signatures.md` §9. This section specifies the **data display rendering** within the success state.

### 6.1 Props Interface

```typescript
import type { WeatherSummary } from '@/types/api';
import type { LoadingState } from '@/types/frontend';

interface WeatherSummaryCardProps {
  /** Current loading state of the weather request. */
  state: LoadingState;

  /** Weather summary data from POST /api/v1/weather. null when not loaded/error. */
  weather: WeatherSummary | null;

  /** Error message when state is "error". null otherwise. */
  error: string | null;

  /** Retry callback for error state. */
  onRetry: () => void;
}
```

### 6.2 Internal State

```typescript
/**
 * Whether the daily weather breakdown accordion is expanded.
 * Default: false (collapsed).
 */
const [dailyExpanded, setDailyExpanded] = useState<boolean>(false);
```

### 6.3 Success State Data Rendering

```
┌─────────────────────────────────────┐
│  🌤 Weather                         │
│                                     │
│  82.4 /100       [Great]  ← chip   │
│                                     │
│  Avg Temp: 21.3°C                   │
│  Rain: low  ← RainSignalIndicator  │
│                                     │
│  ▼ Daily Breakdown (5 days)         │
│  ┌─────────────────────────────────┐│
│  │ May 1: 24°/16° · 0mm · Clear  ││
│  │ May 2: 24°/17° · 1mm · Cloudy ││
│  │ ...                             ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

**Computed values**:

```typescript
/** Number of daily entries */
const dayCount: number = weather.daily.length;

/** Accordion summary text */
const accordionSummary: string = `Daily Breakdown (${dayCount} day${dayCount !== 1 ? 's' : ''})`;
```

**Typography mapping**:

| Element | Variant | Color | Value |
|---------|---------|-------|-------|
| Section title | `h6` with `WbSunnyIcon` | `text.primary` | `"Weather"` |
| Score value | `h4`, fontWeight 700 | `getScoreColor(weather.weather_score)` (same as ScoreCard §2.3) | `${weather.weather_score.toFixed(1)}` |
| "/100" suffix | `body2` | `text.secondary` | `"/100"` inline |
| Label chip | `<WeatherLabelChip label={weather.label} />` | (see §12) | weather.label |
| Avg temp | `body1` | `text.primary` | `"Avg Temp: ${weather.average_temp.toFixed(1)}°C"` |
| Rain signal | `<RainSignalIndicator signal={weather.rain_signal} />` | (see §13) | weather.rain_signal |

**Daily breakdown** (inside MUI `Accordion`):
- Each day in `weather.daily` renders as a row in the accordion details.
- Use `WeatherTimeline` component (see §7) for the daily rows.

### 6.4 Export

```typescript
export function WeatherSummaryCard(props: WeatherSummaryCardProps): JSX.Element;
```

---

## 7. WeatherTimeline

**File**: `frontend/src/components/display/WeatherTimeline.tsx`
**Directive**: `'use client'`
**Purpose**: Renders a horizontal day-by-day weather strip. Each day shows date, temperature range, rainfall, and description. Used inside WeatherSummaryCard's expandable daily breakdown section.

### 7.1 Props Interface

```typescript
import type { WeatherDay } from '@/types/api';

interface WeatherTimelineProps {
  /**
   * Array of daily weather entries to display.
   * These come from WeatherSummary.daily[].
   * Note: dates are from the PREVIOUS year (historical data).
   * Display format should use the current year's equivalent date
   * (already handled since the API sends dates as-is and we format with dayjs).
   */
  days: WeatherDay[];
}
```

### 7.2 Internal State

```typescript
// No internal state. Pure display component.
```

### 7.3 Per-Day Rendering

Each WeatherDay renders as a compact row:

```
  Mon, May 1   24°/16°C   0.0mm   Clear sky
  Tue, May 2   24°/17°C   1.2mm   Partly cloudy
  Wed, May 3   22°/16°C   0.0mm   Clear sky
```

**Per-day data binding**:

```typescript
// For each day in days:
{
  dateLabel: dayjs(day.date).format('ddd, MMM D'),
  tempRange: `${day.temp_high.toFixed(0)}°/${day.temp_low.toFixed(0)}°C`,
  rainfall: `${day.rain_mm.toFixed(1)}mm`,
  description: day.description,

  // Rain intensity color for the rainfall value text:
  rainColor: day.rain_mm === 0
    ? 'text.disabled'
    : day.rain_mm < 2
      ? 'info.main'
      : day.rain_mm < 5
        ? 'warning.main'
        : 'error.main',
}
```

**Layout**: MUI `Table` with compact density (`size="small"`).

| Column | Width | Align | Typography |
|--------|-------|-------|-----------|
| Date | 120px | left | `body2`, `text.secondary` |
| Temp | 80px | right | `body2`, `text.primary` |
| Rain | 60px | right | `body2`, `rainColor` (computed above) |
| Description | auto | left | `body2`, `text.secondary` |

### 7.4 Export

```typescript
export function WeatherTimeline(props: WeatherTimelineProps): JSX.Element;
```

---

## 8. CalendarHeatmap

**File**: `frontend/src/components/display/CalendarHeatmap.tsx`
**Directive**: `'use client'`
**Purpose**: Renders a 2-month calendar grid where each day cell is colored based on the weather quality label from historical data. This is the inner display grid used by `CalendarDateRangePicker`. It handles ONLY the visual rendering of the day grid — selection logic lives in the parent.

### 8.1 Props Interface

```typescript
import type { CalendarDay } from '@/types/api';
import type { Dayjs } from 'dayjs';

interface CalendarHeatmapProps {
  /**
   * The first month to display. The component renders this month
   * and the following month side-by-side.
   */
  month: Dayjs;

  /**
   * Weather data for each day in the visible range.
   * Keyed by ISO date string for O(1) lookup.
   * null when calendar weather data hasn't loaded yet
   * (all cells render with no weather overlay).
   */
  calendarDays: Map<string, CalendarDay> | null;

  /**
   * Currently selected start date (ISO string), or null.
   */
  selectedStart: string | null;

  /**
   * Currently selected end date (ISO string), or null.
   */
  selectedEnd: string | null;

  /**
   * Callback when a day cell is clicked.
   * Called with the ISO date string ("YYYY-MM-DD") of the clicked day.
   * Disabled days (past dates) do NOT trigger this callback.
   */
  onDayClick: (dateStr: string) => void;

  /**
   * Today's date as ISO string, for disabling past dates.
   * Passed as prop (not computed internally) to enable deterministic rendering.
   */
  today: string;
}
```

### 8.2 Internal State

```typescript
// No internal state. All visual state is derived from props.
```

### 8.3 Day Cell Rendering

Each day cell displays:

```
┌──────┐
│  15  │  ← day number
│ 24°C │  ← temp_high (if available)
│  🌧  │  ← weather icon (if rain_mm > 2)
└──────┘
```

**Per-cell data binding**:

```typescript
// For a given dateStr:
const dayData: CalendarDay | undefined = calendarDays?.get(dateStr);

const cellProps = {
  /** Day of month number */
  dayNumber: dayjs(dateStr).date(),

  /** Whether this day is before today (greyed out, not clickable) */
  isPast: dateStr < today,

  /** Whether this day is within the selected range */
  isInRange: selectedStart !== null && selectedEnd !== null
    && dateStr >= selectedStart && dateStr <= selectedEnd,

  /** Whether this day is the start or end of the selection */
  isEndpoint: dateStr === selectedStart || dateStr === selectedEnd,

  /** Background color based on weather label */
  bgColor: dayData?.weather_label
    ? WEATHER_LABEL_BG_COLORS[dayData.weather_label]
    : 'transparent',

  /** Temperature display (high only, for compact cell) */
  tempDisplay: dayData?.temp_high !== null && dayData?.temp_high !== undefined
    ? `${dayData.temp_high.toFixed(0)}°`
    : null,

  /** Rain indicator (show icon when rain_mm > 2) */
  showRainIcon: dayData?.rain_mm !== null && dayData?.rain_mm !== undefined
    && dayData.rain_mm > 2,
};
```

**Cell styling**:

| Condition | Background | Border | Text Color | Cursor |
|-----------|------------|--------|------------|--------|
| Past date | `action.disabledBackground` | none | `text.disabled` | `default` |
| Normal (no weather) | `transparent` | `1px solid divider` | `text.primary` | `pointer` |
| Weather: Great | `rgba(76, 175, 80, 0.12)` | `1px solid divider` | `text.primary` | `pointer` |
| Weather: Good | `rgba(139, 195, 74, 0.12)` | `1px solid divider` | `text.primary` | `pointer` |
| Weather: Fair | `rgba(255, 152, 0, 0.12)` | `1px solid divider` | `text.primary` | `pointer` |
| Weather: Poor | `rgba(244, 67, 54, 0.12)` | `1px solid divider` | `text.primary` | `pointer` |
| In selected range | (weather bg) + `primary.main` at 15% alpha overlay | `2px solid primary.main` | `text.primary` | `pointer` |
| Selection endpoint | `primary.main` | `2px solid primary.dark` | `primary.contrastText` | `pointer` |

### 8.4 Grid Layout

- Two months side-by-side using CSS Grid or `<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>`
- Each month: 7 columns (Sun–Sat), variable rows depending on month length.
- Day-of-week header row: `Typography variant="caption"` with `color="text.secondary"`, single letter abbreviations: `S M T W T F S`.
- Month header: `Typography variant="subtitle1"` with `fontWeight: 600`, format: `dayjs(month).format('MMMM YYYY')`.
- Cell dimensions: `width: 48px, height: 56px` minimum per cell.

### 8.5 Shared Color Constants

```typescript
/** Background colors for weather labels. Used in CalendarHeatmap and CalendarDateRangePicker. */
const WEATHER_LABEL_BG_COLORS: Record<string, string> = {
  Great: 'rgba(76, 175, 80, 0.12)',
  Good:  'rgba(139, 195, 74, 0.12)',
  Fair:  'rgba(255, 152, 0, 0.12)',
  Poor:  'rgba(244, 67, 54, 0.12)',
};
```

### 8.6 Export

```typescript
export function CalendarHeatmap(props: CalendarHeatmapProps): JSX.Element;
```

---

## 9. CostBreakdownChart

**File**: `frontend/src/components/display/CostBreakdownChart.tsx`
**Directive**: `'use client'`
**Purpose**: Renders a simple stacked horizontal bar chart showing the cost breakdown (flight vs hotel) for a trip option. Used inside the ComparisonResultsTable to provide a visual cost comparison across options. Implemented with pure CSS (no charting library required).

### 9.1 Props Interface

```typescript
interface CostBreakdownChartProps {
  /**
   * Total flight cost for the group (flight_price * traveler_count).
   * In USD. Always >= 0.
   */
  flightCost: number;

  /**
   * Total hotel cost (all nights, all rooms).
   * In USD. Always >= 0.
   */
  hotelCost: number;

  /**
   * Total trip cost (flightCost + hotelCost).
   * Passed explicitly to avoid recomputation and match backend value.
   */
  totalCost: number;

  /**
   * Maximum total cost across all compared options.
   * Used to scale the bar width relative to the most expensive option.
   * When all options have the same cost, bars fill 100%.
   */
  maxCost: number;

  /**
   * Whether to show dollar amounts as labels on the bar segments.
   * Default: true.
   */
  showLabels?: boolean;
}
```

### 9.2 Internal State

```typescript
// No internal state. Pure display component.
```

### 9.3 Computed Values

```typescript
/** Bar total width as percentage of the max cost across all options */
const barWidthPercent: number = maxCost > 0
  ? (totalCost / maxCost) * 100
  : 100;

/** Flight segment width as percentage of this option's total */
const flightPercent: number = totalCost > 0
  ? (flightCost / totalCost) * 100
  : 50;

/** Hotel segment width as percentage of this option's total */
const hotelPercent: number = totalCost > 0
  ? (hotelCost / totalCost) * 100
  : 50;
```

### 9.4 Rendering

```
┌─ Flight ──────┬── Hotel ───┐
│  $685.00      │  $320.00   │  ← labels (optional)
└───────────────┴────────────┘
  ← barWidthPercent of container →
```

- Outer container: `<Box sx={{ width: '100%' }}>` — sets the reference width.
- Bar wrapper: `<Box sx={{ width: `${barWidthPercent}%`, display: 'flex', height: 24, borderRadius: 1, overflow: 'hidden' }}>`
- Flight segment: `<Box sx={{ width: `${flightPercent}%`, bgcolor: 'primary.main', ...flexCenter }}>` with optional white label text.
- Hotel segment: `<Box sx={{ width: `${hotelPercent}%`, bgcolor: 'secondary.main', ...flexCenter }}>` with optional white label text.
- Label text: `Typography variant="caption"` with `color="common.white"`, `fontWeight: 600`. Only rendered when `showLabels !== false` and segment is wide enough (> 15% of bar).
- Legend below bar: Two small colored squares with labels: `"✈ Flight: $X"` and `"🏨 Hotel: $Y"` using `Typography variant="caption"`.

### 9.5 Export

```typescript
export function CostBreakdownChart(props: CostBreakdownChartProps): JSX.Element;
```

---

## 10. ComparisonResultsTable

**File**: `frontend/src/components/ComparisonResultsTable.tsx`
**Directive**: `'use client'`
**Purpose**: The main comparison view. Renders a side-by-side table of scored trip options after POST /api/v1/compare returns. Highlights the best option, displays auto-tags, and provides visual cost/weather comparisons. Handles loading, error, and success states.

### 10.1 Props Interface

```typescript
import type { CompareResponse, TripOption } from '@/types/api';
import type { LoadingState } from '@/types/frontend';

interface ComparisonResultsTableProps {
  /**
   * Loading state of the comparison request.
   * - "idle": Section not visible (comparison not triggered yet).
   * - "loading": Show skeleton table with 3 placeholder columns.
   * - "error": Show InlineError with retry button.
   * - "success": Render the full comparison table.
   */
  state: LoadingState;

  /**
   * Comparison results from POST /api/v1/compare.
   * null when not yet loaded, loading, or error.
   * Contains options sorted by overall_score descending.
   * best_option_index is always 0 (highest score first).
   */
  results: CompareResponse | null;

  /**
   * Error message when state is "error". null otherwise.
   */
  error: string | null;

  /**
   * Retry callback for error state.
   */
  onRetry: () => void;
}
```

### 10.2 Internal State

```typescript
/**
 * Which column (option index) is currently hovered for visual emphasis.
 * null when no column is hovered.
 */
const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
```

### 10.3 Table Structure

The table renders with **rows as data fields** and **columns as trip options** (transposed layout for side-by-side comparison):

```
┌──────────────────┬────────────────┬────────────────┬────────────────┐
│                  │ ★ Option 1     │ Option 2       │ Option 3       │
│                  │ [best_overall] │                │                │
├──────────────────┼────────────────┼────────────────┼────────────────┤
│ Destination      │ Tokyo          │ Tokyo          │ Tokyo          │
│ Dates            │ May 1–5        │ May 15–19      │ Jun 1–5        │
│ Flight /person   │ $342.50        │ $289.00        │ $310.00        │
│ Hotel            │ Tokyo Inn      │ Tokyo Inn      │ Grand Hotel    │
│ Hotel total      │ $320.00        │ $295.00        │ $420.00        │
│ Weather          │ [Great] 82.4   │ [Good] 68.2    │ [Fair] 55.0    │
│ Cost Breakdown   │ ████████████   │ ██████████     │ █████████████  │
│ Total Cost       │ $1,005.00      │ $873.00        │ $1,040.00      │
│ Per Person       │ $502.50        │ $436.50        │ $520.00        │
│ Overall Score    │ 24.7           │ 90.5           │ 48.3           │
│ Tags             │ [best_weather] │ [cheapest]     │                │
│                  │                │ [best_overall] │                │
└──────────────────┴────────────────┴────────────────┴────────────────┘
```

### 10.4 Row Definitions

```typescript
import type { TripOption } from '@/types/api';

/**
 * Row definitions for the comparison table.
 * Each row defines a label and a render function that receives a TripOption.
 */
interface TableRowDef {
  label: string;
  render: (option: TripOption, index: number, allOptions: TripOption[]) => React.ReactNode;
}

const tableRows: TableRowDef[] = [
  {
    label: 'Destination',
    render: (opt) => opt.destination,
  },
  {
    label: 'Dates',
    render: (opt) => `${dayjs(opt.start_date).format('MMM D')} – ${dayjs(opt.end_date).format('MMM D, YYYY')}`,
  },
  {
    label: 'Flight /person',
    render: (opt) => <CurrencyDisplay amount={opt.flight_price} suffix="/person" />,
  },
  {
    label: 'Hotel',
    render: (opt) => opt.hotel_name,
  },
  {
    label: 'Hotel (total)',
    render: (opt) => <CurrencyDisplay amount={opt.hotel_price} />,
  },
  {
    label: 'Weather',
    render: (opt) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WeatherLabelChip label={opt.weather.label} />
        <ScoreBadge score={opt.weather.weather_score} />
      </Box>
    ),
  },
  {
    label: 'Cost Breakdown',
    render: (opt, _idx, allOptions) => {
      const flightTotal = opt.flight_price * opt.traveler_count;
      const maxCost = Math.max(...allOptions.map((o) => o.total_trip_cost));
      return (
        <CostBreakdownChart
          flightCost={flightTotal}
          hotelCost={opt.hotel_price}
          totalCost={opt.total_trip_cost}
          maxCost={maxCost}
          showLabels={false}
        />
      );
    },
  },
  {
    label: 'Total Cost',
    render: (opt) => <CurrencyDisplay amount={opt.total_trip_cost} bold />,
  },
  {
    label: 'Per Person',
    render: (opt) => <CurrencyDisplay amount={opt.cost_per_person} suffix="/person" />,
  },
  {
    label: 'Overall Score',
    render: (opt) => <ScoreCard score={opt.overall_score} label="" size="compact" />,
  },
  {
    label: 'Tags',
    render: (opt) => (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {opt.tags.map((tag) => <TagChip key={tag} tag={tag} />)}
      </Box>
    ),
  },
];
```

### 10.5 Best Option Highlight

The column at `best_option_index` (always index 0 since results are sorted by `overall_score` descending) receives visual emphasis:

```typescript
const bestColumnStyle = {
  bgcolor: 'primary.main',            // column header background
  headerColor: 'primary.contrastText', // column header text
  cellBgColor: 'rgba(25, 118, 210, 0.04)', // very subtle blue tint on data cells
  borderTop: '3px solid',
  borderTopColor: 'primary.main',
};
```

- Column header for best option: `Typography variant="subtitle1"` with `fontWeight: 700`, star icon (`StarIcon`) prefix, and `color={bestColumnStyle.headerColor}`.
- All other column headers: `Typography variant="subtitle1"` with `fontWeight: 500`.

### 10.6 Empty / Edge Cases

| Condition | Behavior |
|-----------|----------|
| `state === 'idle'` | Render nothing (return `null`) |
| `state === 'loading'` | Render skeleton: 3 placeholder columns × 11 rows of `<Skeleton variant="text" />` inside a `<Table>` |
| `state === 'error'` | Render `<InlineError message={error} onRetry={onRetry} />` |
| `results !== null && results.options.length === 0` | Should never happen (API requires min 2 options), but defensively render `<EmptyState title="No comparison results" />` |
| Tags array is empty for an option | Render `<Typography variant="caption" color="text.disabled">—</Typography>` |

### 10.7 Export

```typescript
export function ComparisonResultsTable(props: ComparisonResultsTableProps): JSX.Element;
```

---

## 11. TagChip

**File**: `frontend/src/components/display/TagChip.tsx`
**Directive**: `'use client'`
**Purpose**: Renders a single auto-tag as a colored MUI Chip. Used in ComparisonResultsTable and ComparisonQueuePanel.

### 11.1 Props Interface

```typescript
interface TagChipProps {
  /**
   * The tag string from TripOption.tags[].
   * Expected values: "cheapest", "best_weather", "best_overall".
   * Any unrecognized tag is rendered with default styling.
   */
  tag: string;
}
```

### 11.2 Internal State

```typescript
// No internal state. Pure display component.
```

### 11.3 Tag Display Mapping

```typescript
interface TagDisplayConfig {
  label: string;     // Human-readable label
  color: 'success' | 'info' | 'warning' | 'primary' | 'default';
  icon: React.ReactElement; // MUI icon
}

const TAG_CONFIG: Record<string, TagDisplayConfig> = {
  cheapest: {
    label: 'Cheapest',
    color: 'success',
    icon: <AttachMoneyIcon fontSize="small" />,
  },
  best_weather: {
    label: 'Best Weather',
    color: 'info',
    icon: <WbSunnyIcon fontSize="small" />,
  },
  best_overall: {
    label: 'Best Overall',
    color: 'primary',
    icon: <StarIcon fontSize="small" />,
  },
};

// Fallback for unrecognized tags:
const DEFAULT_TAG_CONFIG: TagDisplayConfig = {
  label: tag, // use raw string as label
  color: 'default',
  icon: <LabelIcon fontSize="small" />,
};
```

### 11.4 Rendering

```typescript
const config = TAG_CONFIG[tag] ?? DEFAULT_TAG_CONFIG;

return (
  <Chip
    label={config.label}
    color={config.color}
    icon={config.icon}
    size="small"
    variant="outlined"
  />
);
```

### 11.5 Export

```typescript
export function TagChip(props: TagChipProps): JSX.Element;
```

---

## 12. WeatherLabelChip

**File**: `frontend/src/components/display/WeatherLabelChip.tsx`
**Directive**: `'use client'`
**Purpose**: Renders a weather quality label ("Great", "Good", "Fair", "Poor") as a color-coded MUI Chip. Used in WeatherSummaryCard, ComparisonResultsTable, and ComparisonQueuePanel.

### 12.1 Props Interface

```typescript
interface WeatherLabelChipProps {
  /**
   * Weather quality label.
   * Expected values: "Great", "Good", "Fair", "Poor".
   */
  label: string;

  /**
   * Size of the chip.
   * Default: "small".
   */
  size?: 'small' | 'medium';
}
```

### 12.2 Internal State

```typescript
// No internal state. Pure display component.
```

### 12.3 Label-to-Color Mapping

```typescript
const WEATHER_LABEL_CHIP_COLOR: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
  Great: 'success',
  Good:  'info',
  Fair:  'warning',
  Poor:  'error',
};
```

### 12.4 Rendering

```typescript
const chipColor = WEATHER_LABEL_CHIP_COLOR[label] ?? 'default';

return (
  <Chip
    label={label}
    color={chipColor}
    size={size ?? 'small'}
    variant="filled"
  />
);
```

### 12.5 Export

```typescript
export function WeatherLabelChip(props: WeatherLabelChipProps): JSX.Element;
```

---

## 13. RainSignalIndicator

**File**: `frontend/src/components/display/RainSignalIndicator.tsx`
**Directive**: `'use client'`
**Purpose**: Visual indicator for rain signal level (low/medium/high). Combines an icon, colored text label, and brief description.

### 13.1 Props Interface

```typescript
interface RainSignalIndicatorProps {
  /**
   * Rain signal level from WeatherSummary.rain_signal.
   * Expected values: "low", "medium", "high".
   */
  signal: 'low' | 'medium' | 'high';

  /**
   * Whether to show the description text alongside the label.
   * Default: true.
   */
  showDescription?: boolean;
}
```

### 13.2 Internal State

```typescript
// No internal state. Pure display component.
```

### 13.3 Signal Display Mapping

```typescript
interface RainSignalConfig {
  label: string;
  description: string;
  color: string; // MUI theme color path
  icon: React.ReactElement;
}

const RAIN_SIGNAL_CONFIG: Record<string, RainSignalConfig> = {
  low: {
    label: 'Low Rain',
    description: '< 2mm avg/day',
    color: 'success.main',
    icon: <WaterDropIcon sx={{ color: 'success.main' }} fontSize="small" />,
  },
  medium: {
    label: 'Moderate Rain',
    description: '2–5mm avg/day',
    color: 'warning.main',
    icon: <WaterDropIcon sx={{ color: 'warning.main' }} fontSize="small" />,
  },
  high: {
    label: 'Heavy Rain',
    description: '> 5mm avg/day',
    color: 'error.main',
    icon: <WaterDropIcon sx={{ color: 'error.main' }} fontSize="small" />,
  },
};
```

### 13.4 Rendering

```typescript
const config = RAIN_SIGNAL_CONFIG[signal];

return (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    {config.icon}
    <Typography variant="body2" sx={{ color: config.color, fontWeight: 500 }}>
      {config.label}
    </Typography>
    {showDescription !== false && (
      <Typography variant="caption" color="text.disabled">
        ({config.description})
      </Typography>
    )}
  </Box>
);
```

### 13.5 Export

```typescript
export function RainSignalIndicator(props: RainSignalIndicatorProps): JSX.Element;
```

---

## 14. ScoreBadge

**File**: `frontend/src/components/display/ScoreBadge.tsx`
**Directive**: `'use client'`
**Purpose**: Compact circular badge displaying a numeric score. Used inline in table cells and queue item rows where the full ScoreCard is too large.

### 14.1 Props Interface

```typescript
interface ScoreBadgeProps {
  /**
   * Numeric score value, 0–100.
   * Displayed as integer (rounded) inside the badge.
   */
  score: number;

  /**
   * Diameter of the badge in pixels.
   * Default: 36.
   */
  diameter?: number;

  /**
   * Optional tooltip text shown on hover.
   * When provided, wraps the badge in an MUI Tooltip.
   * Example: "Weather Score: 82.4"
   */
  tooltip?: string;
}
```

### 14.2 Internal State

```typescript
// No internal state. Pure display component.
```

### 14.3 Computed Values

```typescript
/** Score rounded to nearest integer for display */
const displayScore: number = Math.round(score);

/** Background color based on score range */
const bgColor: string = score >= 80
  ? 'success.main'
  : score >= 60
    ? 'info.main'
    : score >= 40
      ? 'warning.main'
      : 'error.main';
```

### 14.4 Rendering

```typescript
const badge = (
  <Box
    sx={{
      width: diameter ?? 36,
      height: diameter ?? 36,
      borderRadius: '50%',
      bgcolor: bgColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Typography
      variant="caption"
      sx={{ color: 'common.white', fontWeight: 700 }}
    >
      {displayScore}
    </Typography>
  </Box>
);

return tooltip ? <Tooltip title={tooltip}>{badge}</Tooltip> : badge;
```

### 14.5 Export

```typescript
export function ScoreBadge(props: ScoreBadgeProps): JSX.Element;
```

---

## 15. CurrencyDisplay

**File**: `frontend/src/components/display/CurrencyDisplay.tsx`
**Directive**: `'use client'`
**Purpose**: Consistently formats and displays a USD currency amount. Used throughout the application wherever dollar amounts are shown.

### 15.1 Props Interface

```typescript
interface CurrencyDisplayProps {
  /**
   * The numeric amount in USD.
   */
  amount: number;

  /**
   * Optional suffix displayed after the formatted amount.
   * Examples: "/person", " total"
   */
  suffix?: string;

  /**
   * Whether to render the amount with bold font weight (700).
   * Default: false (400).
   */
  bold?: boolean;

  /**
   * Typography variant to use.
   * Default: "body1".
   */
  variant?: 'body1' | 'body2' | 'h4' | 'h5' | 'h6' | 'caption';

  /**
   * Text color. Uses MUI theme color path.
   * Default: "text.primary".
   */
  color?: string;
}
```

### 15.2 Internal State

```typescript
// No internal state. Pure display component.
```

### 15.3 Formatting

```typescript
/**
 * Format amount as USD currency string.
 * Uses toFixed(2) for consistent decimal places.
 * Adds thousands separators via toLocaleString.
 */
const formattedAmount: string = `$${amount.toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;
```

### 15.4 Rendering

```typescript
return (
  <Typography
    variant={variant ?? 'body1'}
    sx={{
      fontWeight: bold ? 700 : 400,
      color: color ?? 'text.primary',
    }}
    component="span"
  >
    {formattedAmount}
    {suffix && (
      <Typography
        variant="caption"
        component="span"
        sx={{ color: 'text.secondary', ml: 0.5 }}
      >
        {suffix}
      </Typography>
    )}
  </Typography>
);
```

### 15.5 Export

```typescript
export function CurrencyDisplay(props: CurrencyDisplayProps): JSX.Element;
```

---

## 16. Shared Constants

Define in `frontend/src/types/constants.ts` (or extend if file already exists):

```typescript
// ── Score Color Thresholds ──────────────────────────────────

/** Score ranges for color mapping. Used by ScoreCard, ScoreBadge. */
export const SCORE_THRESHOLDS = {
  GREAT: 80,  // >= 80 → success (green)
  GOOD: 60,   // >= 60 → info (blue)
  FAIR: 40,   // >= 40 → warning (orange)
  // < 40 → error (red)
} as const;

// ── Weather Label Colors ────────────────────────────────────

/** Background colors for weather labels (with alpha for subtle cell backgrounds). */
export const WEATHER_LABEL_BG_COLORS: Record<string, string> = {
  Great: 'rgba(76, 175, 80, 0.12)',
  Good:  'rgba(139, 195, 74, 0.12)',
  Fair:  'rgba(255, 152, 0, 0.12)',
  Poor:  'rgba(244, 67, 54, 0.12)',
};

/** MUI Chip color mapping for weather labels. */
export const WEATHER_LABEL_CHIP_COLORS: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
  Great: 'success',
  Good:  'info',
  Fair:  'warning',
  Poor:  'error',
};

// ── Tag Display Config ──────────────────────────────────────

/** Human-readable labels for auto-tags. */
export const TAG_LABELS: Record<string, string> = {
  cheapest: 'Cheapest',
  best_weather: 'Best Weather',
  best_overall: 'Best Overall',
};

/** MUI Chip color for auto-tags. */
export const TAG_CHIP_COLORS: Record<string, 'success' | 'info' | 'primary' | 'default'> = {
  cheapest: 'success',
  best_weather: 'info',
  best_overall: 'primary',
};

// ── Rain Signal Config ──────────────────────────────────────

export const RAIN_SIGNAL_LABELS: Record<string, string> = {
  low: 'Low Rain',
  medium: 'Moderate Rain',
  high: 'Heavy Rain',
};

export const RAIN_SIGNAL_DESCRIPTIONS: Record<string, string> = {
  low: '< 2mm avg/day',
  medium: '2–5mm avg/day',
  high: '> 5mm avg/day',
};

export const RAIN_SIGNAL_COLORS: Record<string, string> = {
  low: 'success.main',
  medium: 'warning.main',
  high: 'error.main',
};

// ── Currency ────────────────────────────────────────────────

/** Currency code used for all prices (fixed for MVP). */
export const CURRENCY_CODE = 'USD' as const;

/** Currency symbol used for display. */
export const CURRENCY_SYMBOL = '$' as const;
```

---

## 17. Complete Import Map

Reference of which API types each display component imports from `@/types/api`:

| Component | Imports from `@/types/api` |
|-----------|---------------------------|
| `ScoreCard` | (none — receives primitive `number`) |
| `DestinationCard` | `DestinationResult` |
| `FlightPriceCard` | `FlightPrice` |
| `HotelResultsList` | `HotelOption` |
| `WeatherSummaryCard` | `WeatherSummary` |
| `WeatherTimeline` | `WeatherDay` |
| `CalendarHeatmap` | `CalendarDay` |
| `CostBreakdownChart` | (none — receives primitive `number` values) |
| `ComparisonResultsTable` | `CompareResponse`, `TripOption` |
| `TagChip` | (none — receives primitive `string`) |
| `WeatherLabelChip` | (none — receives primitive `string`) |
| `RainSignalIndicator` | (none — receives `'low' | 'medium' | 'high'` literal) |
| `ScoreBadge` | (none — receives primitive `number`) |
| `CurrencyDisplay` | (none — receives primitive `number`) |

Reference of which frontend types each component imports from `@/types/frontend`:

| Component | Imports from `@/types/frontend` |
|-----------|--------------------------------|
| `FlightPriceCard` | `LoadingState` |
| `WeatherSummaryCard` | `LoadingState` |
| `ComparisonResultsTable` | `LoadingState` |
| `CalendarHeatmap` | (none — uses `Dayjs` from dayjs) |

Reference of which shared constants each component imports from `@/types/constants`:

| Component | Imports from `@/types/constants` |
|-----------|----------------------------------|
| `ScoreCard` | `SCORE_THRESHOLDS` |
| `CalendarHeatmap` | `WEATHER_LABEL_BG_COLORS` |
| `WeatherLabelChip` | `WEATHER_LABEL_CHIP_COLORS` |
| `TagChip` | `TAG_LABELS`, `TAG_CHIP_COLORS` |
| `RainSignalIndicator` | `RAIN_SIGNAL_LABELS`, `RAIN_SIGNAL_DESCRIPTIONS`, `RAIN_SIGNAL_COLORS` |
| `CurrencyDisplay` | `CURRENCY_SYMBOL` |
| `ScoreBadge` | `SCORE_THRESHOLDS` |

---

## Appendix: Component Composition Map

How display components compose into parent containers:

```
ComparisonResultsTable
├── CurrencyDisplay          (for all price columns)
├── WeatherLabelChip         (for weather column)
├── ScoreBadge               (for weather score inline)
├── ScoreCard (compact)      (for overall score column)
├── CostBreakdownChart       (for cost breakdown row)
└── TagChip                  (for tags row)

WeatherSummaryCard
├── ScoreCard (large)        (optional, or inline score display)
├── WeatherLabelChip         (for label display)
├── RainSignalIndicator      (for rain signal)
└── WeatherTimeline          (inside accordion for daily breakdown)

FlightPriceCard
└── CurrencyDisplay          (for price per person and group total)

HotelSelectionCard
└── HotelResultsList         (for the selectable hotel list)
    └── CurrencyDisplay      (for hotel prices)

CalendarDateRangePicker
└── CalendarHeatmap          (for the 2-month grid with weather overlay)

DateOptionBuilderSection
├── FlightPriceCard
├── HotelSelectionCard
│   └── HotelResultsList
└── WeatherSummaryCard
    └── WeatherTimeline

ComparisonQueuePanel
├── CurrencyDisplay          (for price summary in queue items)
├── WeatherLabelChip         (for weather label in queue items)
└── ScoreBadge               (optional, for score in queue items)
```
