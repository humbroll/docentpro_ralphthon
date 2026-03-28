# WhenToGo Frontend Spec — 2-Month Weather Calendar: Temperature & Rainfall Indicators

> Sub-specification: Detailed visual representation of temperature and rainfall data within the calendar day cells.
> Companion to: `docs/frontend/frontend-spec-calendar-section.md` (layout, navigation, date selection)

---

## 1. Overview

The 2-month weather calendar is the second section in the single-page progressive flow. After the user selects a destination, calendar weather data is fetched via `POST /api/v1/calendar` and rendered as visual indicators inside each day cell. This document specifies exactly how **temperature** and **rainfall** data from the `CalendarDay` type are displayed, styled, and color-coded.

### 1.1 Data Source

- **API endpoint**: `POST /api/v1/calendar`
- **Request type**: `CalendarRequest` (destination, latitude, longitude, start_date, end_date)
- **Response type**: `CalendarResponse` — contains `destination: string` and `days: CalendarDay[]`
- **Data origin**: Historical weather from the previous year (same date range, last year) via Open-Meteo

### 1.2 CalendarDay Type (from `frontend/src/types/api.ts`)

```typescript
export interface CalendarDay {
  date: string;                    // "YYYY-MM-DD"
  temp_high: number | null;        // Daily high in °C
  temp_low: number | null;         // Daily low in °C
  rain_mm: number | null;          // Daily rainfall in millimeters
  weather_label: string | null;    // "Great" | "Good" | "Fair" | "Poor"
}
```

All numeric fields are nullable — `null` means data is unavailable for that day.

---

## 2. Calendar Day Cell Content Layout

Each day cell is 80px tall and fills 1/7 of the month grid width (~75px at 1200px viewport). The cell content is a vertical stack:

### 2.1 Cell Content Stack (top to bottom)

```
┌────────────────────────┐
│ 15                     │  ← Line 1: Day number
│ 24° / 16°             │  ← Line 2: Temperature (high / low)
│ 💧 2.5mm              │  ← Line 3: Rainfall amount
│ Great                  │  ← Line 4: Weather label
└────────────────────────┘
```

### 2.2 Content Rendering Rules

| Line | Condition to Render | Content | Typography | Notes |
|------|-------------------|---------|------------|-------|
| **Day number** | Always (if cell is not empty) | `{dayjs.date()}` | `variant="caption"`, `fontWeight={600}`, `lineHeight: 1.2` | Top-left of cell |
| **Temperature** | `temp_high !== null && temp_low !== null` | `{Math.round(temp_high)}° / {Math.round(temp_low)}°` | `variant="caption"`, `fontSize: '0.65rem'`, `lineHeight: 1.3` | Rounded to integer, degree symbol only (no "C") |
| **Rainfall** | `rain_mm !== null && rain_mm > 0` | `💧 {rain_mm.toFixed(1)}mm` | `variant="caption"`, `fontSize: '0.6rem'`, `lineHeight: 1.3`, `color: 'info.main'` | Hidden when `rain_mm === 0` or `null` to avoid clutter |
| **Weather label** | `weather_label !== null` | `{weather_label}` | `variant="caption"`, `fontWeight={500}`, `fontSize: '0.6rem'`, `lineHeight: 1.3` | Text matches the cell background tint color semantically |

### 2.3 Content Priority (Vertical Space Management)

At 80px cell height with 4px padding top and bottom, there are ~72px of usable height. With the specified font sizes and line heights, all 4 lines fit. However, if space is tight (e.g., narrow viewports), the rendering priority is:

1. **Day number** — always shown
2. **Temperature** — shown if data available
3. **Weather label** — shown if data available
4. **Rainfall** — shown if data available and `rain_mm > 0`

If the cell has no weather data (`temp_high`, `temp_low`, `rain_mm`, and `weather_label` are all `null`), only the day number is displayed.

---

## 3. Temperature Indicator Specification

### 3.1 Display Format

```
{Math.round(temp_high)}° / {Math.round(temp_low)}°
```

**Examples**:
- `temp_high: 24.3, temp_low: 16.8` → `24° / 17°`
- `temp_high: -2.1, temp_low: -8.7` → `-2° / -9°`
- `temp_high: 30.0, temp_low: 22.0` → `30° / 22°`

### 3.2 Formatting Rules

| Rule | Detail |
|------|--------|
| **Rounding** | `Math.round()` — standard rounding to nearest integer |
| **Unit** | Degree symbol `°` only. No `C` or `F` suffix. All values are Celsius. |
| **Separator** | ` / ` (space, forward slash, space) between high and low |
| **Negative values** | Display the minus sign: `-2°` |
| **Null handling** | If either `temp_high` or `temp_low` is `null`, do not render the temperature line at all |
| **Both null** | No temperature line rendered |

### 3.3 Temperature Typography

```tsx
<Typography
  variant="caption"
  sx={{
    fontSize: '0.65rem',
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }}
>
  {Math.round(weatherData.temp_high!)}° / {Math.round(weatherData.temp_low!)}°
</Typography>
```

### 3.4 Temperature's Role in Weather Scoring (Context Only)

The backend calculates the weather score using temperature:
```
temp_score = max(0, 100 - |avg_temp - 22| * 5)
```
- Ideal temperature: 22°C
- Each 1°C deviation from 22°C costs 5 points

The frontend does NOT calculate or display this score per day. The `weather_label` field already encodes the score as a qualitative label. Temperature is displayed as **raw data** for the user's reference.

---

## 4. Rainfall Indicator Specification

### 4.1 Display Format

```
💧 {rain_mm.toFixed(1)}mm
```

**Examples**:
- `rain_mm: 0.0` → **Not shown** (hidden when zero)
- `rain_mm: 1.2` → `💧 1.2mm`
- `rain_mm: 0.5` → `💧 0.5mm`
- `rain_mm: 12.8` → `💧 12.8mm`
- `rain_mm: null` → **Not shown**

### 4.2 Rendering Rules

| Rule | Detail |
|------|--------|
| **Visibility** | Only rendered when `rain_mm !== null && rain_mm > 0` |
| **Zero rainfall** | NOT displayed — avoids visual clutter on dry days |
| **Precision** | `toFixed(1)` — always one decimal place: `1.0mm`, `2.5mm` |
| **Icon** | Water droplet emoji `💧` (U+1F4A7) used inline before the value |
| **Unit** | `mm` immediately after the number (no space): `2.5mm` |
| **Null handling** | If `rain_mm` is `null`, rainfall line is not rendered |
| **Text color** | `color: 'info.main'` (MUI default: blue `#0288d1`) to differentiate from temperature |

### 4.3 Rainfall Typography

```tsx
{weatherData.rain_mm !== null && weatherData.rain_mm > 0 && (
  <Typography
    variant="caption"
    sx={{
      fontSize: '0.6rem',
      lineHeight: 1.3,
      color: 'info.main',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}
  >
    💧 {weatherData.rain_mm.toFixed(1)}mm
  </Typography>
)}
```

### 4.4 Rainfall's Role in Weather Scoring (Context Only)

The backend calculates:
```
rain_score = max(0, 100 - daily_rain_mm * 10)
```
- 0mm rain = 100 points (best)
- ≥10mm rain = 0 points (worst)

The `rain_signal` field summarizes this as:
- `"low"`: avg daily rain < 2mm
- `"medium"`: avg daily rain 2–5mm
- `"high"`: avg daily rain > 5mm

The `rain_signal` is part of the `WeatherSummary` type (used in trip comparison), NOT the `CalendarDay` type. Each calendar day shows `rain_mm` as raw data. The qualitative assessment is encoded in the `weather_label`.

---

## 5. Weather Label Color Coding

### 5.1 Color Mapping (Constant Definition)

Defined in `frontend/src/types/constants.ts`:

```typescript
export const WEATHER_LABEL_COLORS: Record<string, string> = {
  Great: '#4caf50',   // MUI green[500]
  Good:  '#8bc34a',   // MUI lightGreen[500]
  Fair:  '#ff9800',   // MUI orange[500]
  Poor:  '#f44336',   // MUI red[500]
};
```

### 5.2 Label-to-Score Mapping (Backend-Defined)

| Label | Score Range | Color | Meaning |
|-------|-----------|-------|---------|
| `"Great"` | ≥ 80 | Green (`#4caf50`) | Ideal travel weather |
| `"Good"` | ≥ 60, < 80 | Light Green (`#8bc34a`) | Good travel weather |
| `"Fair"` | ≥ 40, < 60 | Orange (`#ff9800`) | Acceptable, but not ideal |
| `"Poor"` | < 40 | Red (`#f44336`) | Not recommended |

### 5.3 Cell Background Tinting

The `weather_label` determines the background tint of each day cell:

```typescript
import { alpha } from '@mui/material/styles';

// Default state: subtle 15% opacity tint
backgroundColor: weatherData?.weather_label
  ? alpha(WEATHER_LABEL_COLORS[weatherData.weather_label], 0.15)
  : theme.palette.background.paper;
```

**Alpha by interaction state** (overrides weather color):

| Cell State | Background Treatment |
|-----------|---------------------|
| Default (with data) | Weather color at `alpha(color, 0.15)` |
| Default (no data) | `background.paper` (white) |
| Hovered (with data) | Weather color at `alpha(color, 0.30)` |
| Hovered (no data) | `action.hover` |
| Selected (start/end) | `primary.main` — weather color overridden |
| In range | `alpha(primary.light, 0.20)` — weather color overridden |
| Hover preview | `alpha(primary.light, 0.12)` + `1px dashed primary.light` — weather color overridden |
| Disabled | `action.disabledBackground` — weather color overridden |
| Empty cell | `background.default` |

### 5.4 Text Color on Selected Cells

When a cell is in the `Selected` state (solid `primary.main` blue background):
- All text (day number, temperature, rainfall, label) switches to `primary.contrastText` (white)
- The rainfall `color: 'info.main'` is overridden to `primary.contrastText` to maintain readability

```tsx
// In CalendarDayCell, override rainfall color when selected
<Typography
  variant="caption"
  sx={{
    fontSize: '0.6rem',
    lineHeight: 1.3,
    color: isSelected ? 'primary.contrastText' : 'info.main',
    whiteSpace: 'nowrap',
  }}
>
  💧 {weatherData.rain_mm.toFixed(1)}mm
</Typography>
```

---

## 6. Weather Legend Component

### 6.1 Component: `WeatherLegend`

**File**: `frontend/src/components/WeatherLegend.tsx`
**Directive**: `'use client'`

The legend sits between the month navigation bar and the calendar grids to help the user interpret the color coding.

### 6.2 Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ■ Great    ■ Good    ■ Fair    ■ Poor    □ No data                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 MUI Structure

```tsx
<Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', ...sx }}>
  {(['Great', 'Good', 'Fair', 'Poor'] as const).map((label) => (
    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box
        sx={{
          width: 16,
          height: 16,
          borderRadius: '2px',
          backgroundColor: WEATHER_LABEL_COLORS[label],
        }}
      />
      <Typography variant="caption">{label}</Typography>
    </Box>
  ))}
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    <Box
      sx={{
        width: 16,
        height: 16,
        borderRadius: '2px',
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'transparent',
      }}
    />
    <Typography variant="caption">No data</Typography>
  </Box>
</Box>
```

### 6.4 Props

```typescript
interface WeatherLegendProps {
  sx?: import('@mui/material').SxProps;
}
```

### 6.5 Swatch Colors (at full opacity — in legend only)

| Label | Swatch Color | Hex |
|-------|-------------|-----|
| Great | Solid green | `#4caf50` |
| Good | Solid light green | `#8bc34a` |
| Fair | Solid orange | `#ff9800` |
| Poor | Solid red | `#f44336` |
| No data | Transparent with 1px `divider` border | — |

Legend swatches use full opacity (not 0.15 alpha). This makes the legend swatches distinct and recognizable, even though the actual cell backgrounds use 15% opacity.

---

## 7. Updated CalendarDayCell Rendering (Complete)

This section provides the **complete** rendering implementation for `CalendarDayCell` including both temperature and rainfall indicators.

### 7.1 File: `frontend/src/components/CalendarDayCell.tsx`

```tsx
'use client';

import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { WEATHER_LABEL_COLORS } from '@/types/constants';
import type { CalendarDay } from '@/types/api';

interface CalendarDayCellProps {
  cell: { date: string; dayjs: import('dayjs').Dayjs } | null;
  weatherData?: CalendarDay;
  isSelected: boolean;
  isInRange: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isHoverPreview: boolean;
  isDisabled: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function CalendarDayCell({
  cell,
  weatherData,
  isSelected,
  isInRange,
  isRangeStart,
  isRangeEnd,
  isHoverPreview,
  isDisabled,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: CalendarDayCellProps) {
  const theme = useTheme();

  // --- Background color computation ---
  const computedBg = (() => {
    if (!cell) return theme.palette.background.default;
    if (isDisabled) return theme.palette.action.disabledBackground;
    if (isSelected) return theme.palette.primary.main;
    if (isInRange) return alpha(theme.palette.primary.light, 0.20);
    if (isHoverPreview) return alpha(theme.palette.primary.light, 0.12);
    if (weatherData?.weather_label) {
      return alpha(WEATHER_LABEL_COLORS[weatherData.weather_label], 0.15);
    }
    return theme.palette.background.paper;
  })();

  // --- Hover background ---
  const hoverBg = (() => {
    if (!cell || isDisabled) return undefined;
    if (isSelected || isInRange || isHoverPreview) return undefined;
    if (weatherData?.weather_label) {
      return alpha(WEATHER_LABEL_COLORS[weatherData.weather_label], 0.30);
    }
    return theme.palette.action.hover;
  })();

  // --- Text color: white on selected cells ---
  const textColor = isSelected ? 'primary.contrastText' : 'text.primary';
  const rainfallColor = isSelected ? 'primary.contrastText' : 'info.main';

  return (
    <Box
      onClick={!isDisabled && cell ? onClick : undefined}
      onMouseEnter={!isDisabled && cell ? onMouseEnter : undefined}
      onMouseLeave={onMouseLeave}
      sx={{
        height: 80,
        p: 0.5,
        backgroundColor: computedBg,
        border: isHoverPreview ? '1px dashed' : 'none',
        borderColor: isHoverPreview ? 'primary.light' : 'transparent',
        cursor: isDisabled || !cell ? 'default' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        transition: 'background-color 0.15s ease',
        '&:hover': hoverBg ? { backgroundColor: hoverBg } : {},
        color: textColor,
      }}
      role="button"
      aria-label={
        cell
          ? `${cell.dayjs.format('MMMM D, YYYY')}${
              weatherData?.weather_label ? `, ${weatherData.weather_label} weather` : ''
            }${
              weatherData?.temp_high != null ? `, high ${Math.round(weatherData.temp_high)}°C` : ''
            }${
              weatherData?.rain_mm != null && weatherData.rain_mm > 0
                ? `, rainfall ${weatherData.rain_mm.toFixed(1)}mm`
                : ''
            }`
          : undefined
      }
      aria-disabled={isDisabled}
      tabIndex={isDisabled || !cell ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {cell && (
        <>
          {/* Line 1: Day number */}
          <Typography variant="caption" fontWeight={600} sx={{ lineHeight: 1.2 }}>
            {cell.dayjs.date()}
          </Typography>

          {/* Line 2: Temperature high / low */}
          {weatherData && weatherData.temp_high !== null && weatherData.temp_low !== null && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.65rem',
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {Math.round(weatherData.temp_high)}° / {Math.round(weatherData.temp_low)}°
            </Typography>
          )}

          {/* Line 3: Rainfall (only if > 0) */}
          {weatherData && weatherData.rain_mm !== null && weatherData.rain_mm > 0 && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.6rem',
                lineHeight: 1.3,
                color: rainfallColor,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              💧 {weatherData.rain_mm.toFixed(1)}mm
            </Typography>
          )}

          {/* Line 4: Weather label */}
          {weatherData && weatherData.weather_label !== null && (
            <Typography
              variant="caption"
              fontWeight={500}
              sx={{ fontSize: '0.6rem', lineHeight: 1.3 }}
            >
              {weatherData.weather_label}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}
```

---

## 8. Visual Examples by Weather Condition

### 8.1 Great Weather Day (Score ≥ 80)

```
┌────────────────────────┐
│ 15                     │  Background: rgba(76, 175, 80, 0.15) — light green tint
│ 24° / 16°             │
│                        │  (no rainfall line — 0mm)
│ Great                  │
└────────────────────────┘
```

### 8.2 Good Weather Day with Light Rain (Score ≥ 60)

```
┌────────────────────────┐
│ 16                     │  Background: rgba(139, 195, 74, 0.15) — light lime tint
│ 23° / 17°             │
│ 💧 1.2mm              │  Blue text (info.main)
│ Good                   │
└────────────────────────┘
```

### 8.3 Fair Weather Day with Moderate Rain (Score ≥ 40)

```
┌────────────────────────┐
│ 17                     │  Background: rgba(255, 152, 0, 0.15) — light orange tint
│ 18° / 12°             │
│ 💧 4.8mm              │  Blue text (info.main)
│ Fair                   │
└────────────────────────┘
```

### 8.4 Poor Weather Day with Heavy Rain (Score < 40)

```
┌────────────────────────┐
│ 18                     │  Background: rgba(244, 67, 54, 0.15) — light red tint
│ 10° / 4°              │
│ 💧 12.5mm             │  Blue text (info.main)
│ Poor                   │
└────────────────────────┘
```

### 8.5 No Weather Data

```
┌────────────────────────┐
│ 19                     │  Background: white (background.paper)
│                        │
│                        │  (no temperature, no rainfall, no label)
│                        │
└────────────────────────┘
```

### 8.6 Selected Day (Start or End of Range)

```
┌────────────────────────┐
│ 15                     │  Background: primary.main (solid blue)
│ 24° / 16°             │  All text: white (primary.contrastText)
│ 💧 0.5mm              │  Rainfall also white (overrides info.main)
│ Great                  │
└────────────────────────┘
```

### 8.7 Disabled Day (Past Date)

```
┌────────────────────────┐
│ 3                      │  Background: action.disabledBackground (light gray)
│                        │  Text: text.disabled (muted)
│                        │  cursor: default (not clickable)
│                        │
└────────────────────────┘
```

### 8.8 Empty Cell (Outside Month)

```
┌────────────────────────┐
│                        │  Background: background.default
│                        │  No content — padding cell for grid alignment
│                        │
│                        │
└────────────────────────┘
```

---

## 9. Two-Month Layout with Weather Data

### 9.1 Side-by-Side Calendar (Desktop ≥ 900px)

```
┌─────────────────────── May 2026 ───────────────────────┐  32px  ┌─────────────────────── Jun 2026 ───────────────────────┐
│  Sun     Mon     Tue     Wed     Thu     Fri     Sat   │  gap   │  Sun     Mon     Tue     Wed     Thu     Fri     Sat   │
├────────┬────────┬────────┬────────┬────────┬────────┬──│        ├────────┬────────┬────────┬────────┬────────┬────────┬──│
│        │        │        │        │        │  1     │ 2│        │        │  1     │  2     │  3     │  4     │  5     │ 6│
│        │        │        │        │        │ 24°/16°│23│        │        │ 26°/19°│ 25°/18°│ 27°/20°│ 24°/17°│ 23°/16°│28│
│        │        │        │        │        │ Great  │Go│        │        │💧1.2mm │ Good   │💧3.1mm │ Great  │ Great  │💧│
│        │        │        │        │        │[green] │[l│        │        │ Good   │        │ Fair   │        │        │Fa│
├────────┼────────┼────────┼────────┼────────┼────────┼──│        ├────────┼────────┼────────┼────────┼────────┼────────┼──│
│  3     │  4     │  5     │  6     │  7     │  8     │ 9│        │  7     │  8     │  9     │  10    │  11    │  12    │13│
│ 22°/16°│ 25°/18°│ 21°/17°│ 20°/15°│ 23°/17°│ 26°/19°│24│       │ 25°/18°│ 28°/21°│ 29°/22°│ 30°/23°│ 26°/19°│ 24°/17°│22│
│ Great  │💧0.5mm │ Good   │💧2.3mm │ Great  │ Great  │Go│        │ Good   │💧5.2mm │💧7.8mm │💧8.1mm │💧1.5mm │ Great  │Go│
│        │ Good   │        │ Fair   │        │        │  │        │        │ Fair   │ Poor   │ Poor   │ Good   │        │  │
└────────┴────────┴────────┴────────┴────────┴────────┴──┘        └────────┴────────┴────────┴────────┴────────┴────────┴──┘
```

### 9.2 Key Visual Patterns Users Can Spot

- **Green tinted cells** → safe to travel (Great weather)
- **Orange/red tinted cells** → weather risk (Fair/Poor)
- **Blue `💧` indicators** → rainy days at a glance
- **No rainfall line** → dry day (0mm or no data)
- **Clusters of red/orange with 💧 icons** → rainy season visible at a glance

---

## 10. Calendar Weather Data Flow

### 10.1 Fetch Trigger

```typescript
// CalendarSection internal state
const [calendarWeather, setCalendarWeather] = useState<CalendarWeatherState>({
  state: 'idle',     // 'idle' | 'loading' | 'success' | 'error'
  data: null,        // CalendarDay[] | null
  error: null,       // string | null
});

// useEffect triggers fetch when section becomes visible or month navigates
useEffect(() => {
  if (visible && destination) {
    fetchCalendarWeather();
  }
}, [viewMonth, destination?.name, visible]);
```

### 10.2 Fetch Implementation

```typescript
const fetchCalendarWeather = async () => {
  if (!destination) return;

  setCalendarWeather({ state: 'loading', data: null, error: null });

  const startDate = viewMonth.format('YYYY-MM-DD');
  const endDate = viewMonth.add(2, 'month').subtract(1, 'day').format('YYYY-MM-DD');

  try {
    const response = await api.getCalendarWeather({
      destination: destination.name,
      latitude: destination.latitude,
      longitude: destination.longitude,
      start_date: startDate,
      end_date: endDate,
    });

    setCalendarWeather({ state: 'success', data: response.days, error: null });
  } catch (err) {
    const message = axios.isAxiosError(err) && err.response?.data?.message
      ? err.response.data.message
      : 'Failed to load weather data. Please try again.';
    setCalendarWeather({ state: 'error', data: null, error: message });
  }
};
```

### 10.3 Data Map Construction

```typescript
// Convert CalendarDay[] to Map for O(1) lookup per day cell
const calendarWeatherMap: Map<string, CalendarDay> = useMemo(() => {
  const map = new Map<string, CalendarDay>();
  if (calendarWeather.data) {
    for (const day of calendarWeather.data) {
      map.set(day.date, day);
    }
  }
  return map;
}, [calendarWeather.data]);
```

### 10.4 Weather Data Lookup in Grid

Each `CalendarMonthGrid` receives the full `calendarWeatherMap`. For each day cell:

```typescript
const weatherForDay: CalendarDay | undefined = weatherData.get(cell.date);
// cell.date is "YYYY-MM-DD" string
// If weatherForDay is undefined → no data → plain white cell
```

---

## 11. Four UI States for Weather Calendar

### 11.1 Idle State

- **When**: Section just became visible, before first fetch completes
- **Calendar grids**: Rendered with day numbers only, no weather colors
- **Temperature/rainfall**: Not displayed
- **Legend**: Still visible (for context)
- **User can**: Still click dates to select range

### 11.2 Loading State

- **When**: API call in progress
- **Display**: `CircularProgress` centered within the Paper, replaces calendar grids
- **Month nav**: Still visible and functional (but navigating triggers a new load)
- **Legend**: Still visible
- **User cannot**: Select dates during loading (grids are hidden)

### 11.3 Success State

- **When**: API returned `CalendarDay[]` data
- **Calendar grids**: Rendered with weather-colored backgrounds
- **Temperature**: Shown on each day with data (`high° / low°`)
- **Rainfall**: Shown on each day with `rain_mm > 0` (`💧 Xmm`)
- **Weather label**: Shown on each day with data
- **Legend**: Visible, colors match cell tinting

### 11.4 Error State

- **When**: API call failed (network error, 500, 504, etc.)
- **Calendar grids**: Rendered WITHOUT weather colors (plain white cells with day numbers)
- **Temperature/rainfall**: Not displayed
- **Error message**: `Alert severity="error"` below the grids with the error text
- **Recovery**: "Retry" button in the Alert's `action` slot
- **User can**: Still select dates — weather data is informational, not a blocker

---

## 12. Edge Cases

### 12.1 All Days Have rain_mm = 0

All cells show temperature and weather label but no rainfall indicator. This is normal for arid destinations.

### 12.2 All Days Have rain_mm > 0

All cells show the blue 💧 indicator. This pattern helps users visually identify monsoon/rainy seasons.

### 12.3 Some Days Have null Fields

Any `CalendarDay` with `temp_high: null, temp_low: null, rain_mm: null, weather_label: null` renders as a plain white cell with only the day number. This can happen if the historical data source (Open-Meteo) has gaps.

### 12.4 Very High Rainfall Values

`rain_mm` values like `35.2` display as `💧 35.2mm`. No upper-bound formatting is needed. The `toFixed(1)` ensures consistent decimal formatting.

### 12.5 Negative Temperatures

`temp_high: -5.3, temp_low: -12.7` displays as `-5° / -13°`. The negative sign is part of `Math.round()` output. No special handling needed.

### 12.6 temp_high Is Lower Than temp_low

This should not happen with correct weather data, but if it does, render as-is. No frontend validation or swap needed. Display: `{high}° / {low}°` regardless of relative values.

### 12.7 Weather Data for Dates Outside the Calendar Grid

The API may return data for dates outside the currently visible 2-month window (e.g., if `viewMonth` changes after the response). The `Map.get()` lookup simply returns `undefined` for non-matching dates, so extra data is safely ignored.

### 12.8 Month Navigation During Loading

If the user clicks next/previous month while weather data is loading:
- The current fetch is NOT cancelled (no AbortController)
- A new fetch is triggered by the `useEffect` (since `viewMonth` changed)
- The state transitions to `loading` again, replacing any pending result
- The last-completed fetch's result is used (natural race condition resolution via React state updates)

### 12.9 Destination Changes While Viewing Calendar

When a new destination is selected:
1. `calendarWeather` resets to `idle`
2. `viewMonth` resets to current month
3. Date selection clears
4. New weather fetch triggers
5. Calendar renders with fresh data for the new destination's coordinates

---

## 13. Accessibility for Weather Indicators

### 13.1 aria-label on Day Cells

Each day cell's `aria-label` includes weather data when available:

```
"May 15, 2026, Good weather, high 23°C, rainfall 1.2mm"
```

Structure:
```
{date}{, weather_label weather}{, high X°C}{, rainfall X.Xmm}
```

- Date is always included
- Weather label appended if not null
- Temperature appended if `temp_high` not null
- Rainfall appended only if `rain_mm > 0`

### 13.2 Color-Blind Consideration

Weather information is NOT conveyed by color alone:
- The `weather_label` text (`Great`, `Good`, `Fair`, `Poor`) is always displayed in the cell
- The `WeatherLegend` includes text labels alongside color swatches
- Rainfall uses the 💧 icon as a non-color indicator

### 13.3 Screen Reader Behavior

- Day cells with `role="button"` and descriptive `aria-label` are announced with full weather details
- The legend is visible text, naturally readable by screen readers
- Temperature and rainfall values are in the DOM as text, not images or canvases

---

## 14. Import Dependencies for Weather Indicators

```typescript
// Required imports for CalendarDayCell.tsx
import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { WEATHER_LABEL_COLORS } from '@/types/constants';
import type { CalendarDay } from '@/types/api';

// Required imports for WeatherLegend.tsx
import { Box, Typography } from '@mui/material';
import type { SxProps } from '@mui/material';
import { WEATHER_LABEL_COLORS } from '@/types/constants';

// Required constant definition in frontend/src/types/constants.ts
export const WEATHER_LABEL_COLORS: Record<string, string> = {
  Great: '#4caf50',
  Good:  '#8bc34a',
  Fair:  '#ff9800',
  Poor:  '#f44336',
};
```

---

## 15. Summary: What Each Calendar Cell Shows

| Data Point | Source Field | Format | When Shown | Color |
|-----------|-------------|--------|-----------|-------|
| Day number | Derived from `dayjs` | `15` | Always | Inherits cell text color |
| Temperature | `CalendarDay.temp_high`, `.temp_low` | `24° / 16°` | Both non-null | Inherits cell text color |
| Rainfall | `CalendarDay.rain_mm` | `💧 2.5mm` | Non-null AND > 0 | `info.main` (blue) or `primary.contrastText` (white on selected) |
| Weather label | `CalendarDay.weather_label` | `Great` | Non-null | Inherits cell text color |
| Background tint | `CalendarDay.weather_label` | — | Non-null | `WEATHER_LABEL_COLORS[label]` at 15% alpha |
