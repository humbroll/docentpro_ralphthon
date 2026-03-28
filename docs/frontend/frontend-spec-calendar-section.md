# WhenToGo Frontend Spec — Calendar / Date Selection Section Layout

> Sub-specification: Wireframe-level layout for the Calendar / Date Selection section of the single-page progressive flow.

---

## 1. Section Overview

The **Calendar / Date Selection section** is the second section on the root route (`/`). It is **always visible** on page load, displayed alongside the Search section. Before a destination is selected, it shows an empty calendar grid without weather data. Once a destination is selected, weather data is fetched and overlaid on the calendar days.

Its purpose is to:

1. **Display a 2-month weather-overlay calendar** — showing daily weather quality (temperature + rainfall) as color-coded cells using data from `POST /api/v1/calendar`
2. **Allow month navigation** — the user can navigate forward/backward through months to explore weather patterns
3. **Enable date range selection** — the user clicks a start date and an end date on the calendar grid to define their trip window
4. **Trigger the next section** — upon confirming a valid date range, the Date Option Builder section is revealed below

The calendar fetches weather data for a 2-month window starting from the currently viewed month. Each day cell is color-coded by its `weather_label` value (`Great` / `Good` / `Fair` / `Poor`).

---

## 2. Section Position in Page Flow

```
<Container maxWidth="lg">
  <SearchSection />                           // always visible
  ─── 48px gap (mb: 6) ───
  <CalendarSection visible={true} />   ◄── THIS SPEC (always visible)
  ─── 48px gap (mb: 6) ───
  <DateOptionBuilderSection />                // revealed after date range confirmed
  ...
</Container>
```

When `visible` is `false`, the component returns `null` (not rendered at all — no hidden DOM, no CSS display:none).

---

## 3. CalendarSection Component

### 3.1 File Location

```
frontend/src/components/CalendarSection.tsx
```

Directive: `'use client'` — this component manages interactive state (month navigation, date range selection, calendar weather data loading).

### 3.2 Props Interface

```ts
interface CalendarSectionProps {
  /** Whether the section is visible (destination has been selected) */
  visible: boolean;
  /** The selected destination — needed for the calendar API call */
  destination: SelectedDestination;
  /** Callback when user confirms a date range selection */
  onDateRangeConfirm: (dateRange: DateRange) => void;
  /** Currently confirmed date range, if any (null until user confirms) */
  confirmedDateRange: DateRange | null;
}
```

### 3.3 Internal State

```ts
// The first day of the currently displayed left month (always the 1st of that month)
const [viewMonth, setViewMonth] = useState<dayjs.Dayjs>(() => dayjs().startOf('month'));

// Selected start date (null until user clicks a day)
const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);

// Selected end date (null until user clicks a second day after start)
const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);

// Hovered date (for range preview highlight)
const [hoveredDate, setHoveredDate] = useState<dayjs.Dayjs | null>(null);

// Calendar weather data
const [calendarWeather, setCalendarWeather] = useState<CalendarWeatherState>({
  state: 'idle',
  data: null,
  error: null,
});
```

### 3.4 Component Hierarchy (ASCII Wireframe)

```
┌─────────────────────────────── CalendarSection ─────────────────────────────────┐
│                                                                                  │
│  ┌── Typography variant="h5" ─────────────────────────────────────────────────┐  │
│  │  "Select Your Travel Dates"                                                │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│  ┌── Typography variant="body2" color="text.secondary" ───────────────────────┐  │
│  │  "Click a start date, then an end date. Weather data is based on last      │  │
│  │   year's historical records."                                              │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  mt: 3 (24px)                                                                    │
│                                                                                  │
│  ┌── Paper elevation={2} sx={{ p: 4 }} ───────────────────────────────────────┐  │
│  │                                                                             │  │
│  │  ┌── Month Navigation Bar ──────────────────────────────────────────────┐   │  │
│  │  │ [◀ IconButton]   "May 2026 — Jun 2026"   [▶ IconButton]             │   │  │
│  │  └──────────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                             │  │
│  │  mt: 3 (24px)                                                               │  │
│  │                                                                             │  │
│  │  ┌── Weather Legend ────────────────────────────────────────────────────┐   │  │
│  │  │  [■ Great]  [■ Good]  [■ Fair]  [■ Poor]  [□ No data]              │   │  │
│  │  └──────────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                             │  │
│  │  mt: 2 (16px)                                                               │  │
│  │                                                                             │  │
│  │  ┌─── Grid2 container spacing={4} ─────────────────────────────────────┐   │  │
│  │  │                                                                      │   │  │
│  │  │  ┌─ Grid2 size={{ xs:12, md:6 }} ──┐  ┌─ Grid2 size={{ xs:12, md:6 }} ──┐  │
│  │  │  │                                  │  │                                  │  │
│  │  │  │  CalendarMonthGrid              │  │  CalendarMonthGrid              │  │
│  │  │  │  (Left month: viewMonth)        │  │  (Right month: viewMonth + 1)   │  │
│  │  │  │                                  │  │                                  │  │
│  │  │  └──────────────────────────────────┘  └──────────────────────────────────┘  │
│  │  │                                                                      │   │  │
│  │  └──────────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                             │  │
│  │  mt: 3 (24px)                                                               │  │
│  │                                                                             │  │
│  │  ┌── Date Range Summary + Confirm ─────────────────────────────────────┐   │  │
│  │  │  "May 1, 2026 → May 5, 2026 (4 nights)"     [Confirm Dates] Button │   │  │
│  │  └──────────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                             │  │
│  │  ┌── Error Display (conditional) ──────────────────────────────────────┐   │  │
│  │  │  Alert severity="error": "Failed to load weather data."  [Retry]    │   │  │
│  │  └──────────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                             │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 3.5 MUI Component Structure (JSX Skeleton)

```tsx
{visible && (
  <Box sx={{ mb: 6 }}>
    {/* Section title */}
    <Typography variant="h5" component="h2" fontWeight={600} gutterBottom>
      Select Your Travel Dates
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
      Click a start date, then an end date. Weather data is based on last year&apos;s historical records.
    </Typography>

    <Paper elevation={2} sx={{ p: 4 }}>
      {/* Month navigation bar */}
      <MonthNavigationBar
        viewMonth={viewMonth}
        onPrevious={handlePreviousMonth}
        onNext={handleNextMonth}
        canGoPrevious={canGoPrevious}
      />

      {/* Weather legend */}
      <WeatherLegend sx={{ mt: 3 }} />

      {/* Loading state */}
      {calendarWeather.state === 'loading' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Calendar grids (shown when data loaded or idle) */}
      {calendarWeather.state !== 'loading' && (
        <Grid2 container spacing={4} sx={{ mt: 2 }}>
          <Grid2 size={{ xs: 12, md: 6 }}>
            <CalendarMonthGrid
              month={viewMonth}
              weatherData={calendarWeatherMap}
              startDate={startDate}
              endDate={endDate}
              hoveredDate={hoveredDate}
              onDateClick={handleDateClick}
              onDateHover={setHoveredDate}
              minDate={dayjs().add(1, 'day')}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, md: 6 }}>
            <CalendarMonthGrid
              month={viewMonth.add(1, 'month')}
              weatherData={calendarWeatherMap}
              startDate={startDate}
              endDate={endDate}
              hoveredDate={hoveredDate}
              onDateClick={handleDateClick}
              onDateHover={setHoveredDate}
              minDate={dayjs().add(1, 'day')}
            />
          </Grid2>
        </Grid2>
      )}

      {/* Date range summary + confirm button */}
      <DateRangeSummary
        startDate={startDate}
        endDate={endDate}
        onConfirm={handleConfirmDates}
        sx={{ mt: 3 }}
      />

      {/* Error display */}
      {calendarWeather.state === 'error' && (
        <Alert
          severity="error"
          sx={{ mt: 2 }}
          action={
            <Button color="inherit" size="small" onClick={handleRetryCalendar}>
              Retry
            </Button>
          }
        >
          {calendarWeather.error}
        </Alert>
      )}
    </Paper>
  </Box>
)}
```

---

## 4. Sub-Components

### 4.1 MonthNavigationBar

**File**: `frontend/src/components/MonthNavigationBar.tsx`
**Directive**: `'use client'`

#### Layout

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│  [◀ IconButton]          "May 2026 — Jun 2026"          [▶ IconButton]        │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

#### MUI Structure

```tsx
<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  <IconButton
    onClick={onPrevious}
    disabled={!canGoPrevious}
    aria-label="Previous month"
  >
    <ChevronLeftIcon />
  </IconButton>

  <Typography variant="h6" fontWeight={500}>
    {viewMonth.format('MMMM YYYY')} — {viewMonth.add(1, 'month').format('MMMM YYYY')}
  </Typography>

  <IconButton
    onClick={onNext}
    aria-label="Next month"
  >
    <ChevronRightIcon />
  </IconButton>
</Box>
```

#### Props Interface

```ts
interface MonthNavigationBarProps {
  /** The first day of the left month being displayed */
  viewMonth: dayjs.Dayjs;
  /** Go to previous month */
  onPrevious: () => void;
  /** Go to next month */
  onNext: () => void;
  /** Whether the "previous" button is enabled */
  canGoPrevious: boolean;
}
```

#### Behavior

| Aspect | Detail |
|--------|--------|
| **Previous button disabled** | When `viewMonth` is the current month (cannot navigate to past months). Computed as: `viewMonth.isSame(dayjs().startOf('month'))` or `viewMonth.isBefore(dayjs().startOf('month'))` |
| **Next button** | Always enabled (no upper bound) |
| **Navigation step** | Each click shifts `viewMonth` by ±1 month. The calendar always shows `viewMonth` (left) and `viewMonth + 1` (right). |
| **Month label format** | dayjs `.format('MMMM YYYY')` → "May 2026" |
| **Icons** | Use `@mui/icons-material/ChevronLeft` and `@mui/icons-material/ChevronRight` |

---

### 4.2 WeatherLegend

**File**: `frontend/src/components/WeatherLegend.tsx`
**Directive**: `'use client'`

#### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  ■ Great    ■ Good    ■ Fair    ■ Poor    □ No data                 │
└──────────────────────────────────────────────────────────────────────┘
```

#### MUI Structure

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
  {/* No data swatch */}
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

#### Props Interface

```ts
interface WeatherLegendProps {
  sx?: import('@mui/material').SxProps;
}
```

#### Color Values (from `constants.ts`)

| Label | Color | MUI Equivalent |
|-------|-------|---------------|
| Great | `#4caf50` | green[500] |
| Good | `#8bc34a` | lightGreen[500] |
| Fair | `#ff9800` | orange[500] |
| Poor | `#f44336` | red[500] |
| No data | transparent with `divider` border | — |

---

### 4.3 CalendarMonthGrid

**File**: `frontend/src/components/CalendarMonthGrid.tsx`
**Directive**: `'use client'`

This is the core calendar grid component. It renders a single month as a 7-column grid of day cells.

#### Layout (Single Month)

```
┌──────────────────────────────────────────────────────────┐
│                       May 2026                           │
├────────┬────────┬────────┬────────┬────────┬────────┬────────┤
│  Sun   │  Mon   │  Tue   │  Wed   │  Thu   │  Fri   │  Sat   │
├────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│        │        │        │        │        │  1     │  2     │
│        │        │        │        │        │ 24°/16°│ 23°/17°│
│        │        │        │        │        │ ☀ Great│ ⛅ Good │
│        │        │        │        │        │[green] │[l.grn] │
├────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│  3     │  4     │  5     │  6     │  7     │  8     │  9     │
│ 22°/16°│ 25°/18°│ 21°/17°│ ...    │ ...    │ ...    │ ...    │
│ ☀ Great│ ⛅ Good │ ☀ Fair │ ...    │ ...    │ ...    │ ...    │
│[green] │[l.grn] │[orange]│ ...    │ ...    │ ...    │ ...    │
├────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│  ...   │  ...   │  ...   │  ...   │  ...   │  ...   │  ...   │
│        │        │        │        │        │        │        │
├────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│  ...   │  ...   │  ...   │  31    │        │        │        │
└────────┴────────┴────────┴────────┴────────┴────────┴────────┘
```

#### MUI Structure

```tsx
<Box>
  {/* Month label */}
  <Typography variant="subtitle1" fontWeight={600} align="center" sx={{ mb: 1 }}>
    {month.format('MMMM YYYY')}
  </Typography>

  {/* Day-of-week headers */}
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '1px',
      mb: '1px',
    }}
  >
    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dow) => (
      <Typography
        key={dow}
        variant="caption"
        fontWeight={600}
        align="center"
        color="text.secondary"
        sx={{ py: 0.5 }}
      >
        {dow}
      </Typography>
    ))}
  </Box>

  {/* Day cells grid */}
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '1px',
      backgroundColor: 'divider', // creates visible grid lines between cells
    }}
  >
    {calendarCells.map((cell, index) => (
      <CalendarDayCell
        key={cell?.date ?? `empty-${index}`}
        cell={cell}
        weatherData={cell ? weatherData.get(cell.date) : undefined}
        isSelected={isDateSelected(cell?.date)}
        isInRange={isDateInRange(cell?.date)}
        isRangeStart={isRangeStart(cell?.date)}
        isRangeEnd={isRangeEnd(cell?.date)}
        isHoverPreview={isHoverPreview(cell?.date)}
        isDisabled={isDateDisabled(cell?.date)}
        onClick={() => cell && onDateClick(cell.dayjs)}
        onMouseEnter={() => cell && onDateHover(cell.dayjs)}
        onMouseLeave={() => onDateHover(null)}
      />
    ))}
  </Box>
</Box>
```

#### Props Interface

```ts
interface CalendarMonthGridProps {
  /** The first day of the month to render (dayjs object, always the 1st) */
  month: dayjs.Dayjs;
  /** Weather data map: key is "YYYY-MM-DD" string, value is CalendarDay */
  weatherData: Map<string, CalendarDay>;
  /** Currently selected start date (null if none) */
  startDate: dayjs.Dayjs | null;
  /** Currently selected end date (null if none) */
  endDate: dayjs.Dayjs | null;
  /** Currently hovered date for range preview (null if no hover) */
  hoveredDate: dayjs.Dayjs | null;
  /** Called when user clicks a day cell */
  onDateClick: (date: dayjs.Dayjs) => void;
  /** Called when user hovers over a day cell (null on mouse leave) */
  onDateHover: (date: dayjs.Dayjs | null) => void;
  /** Minimum selectable date (dates before this are disabled). Typically tomorrow. */
  minDate: dayjs.Dayjs;
}
```

#### Calendar Grid Generation Logic

```ts
/**
 * Generates an array of cells for the month grid.
 * The array length is always a multiple of 7 (complete rows).
 * Leading/trailing cells for days outside the month are null (empty cells).
 */
function generateCalendarCells(month: dayjs.Dayjs): Array<{ date: string; dayjs: dayjs.Dayjs } | null> {
  const firstDay = month.startOf('month');
  const lastDay = month.endOf('month');
  const startDayOfWeek = firstDay.day(); // 0 = Sunday
  const daysInMonth = month.daysInMonth();

  const cells: Array<{ date: string; dayjs: dayjs.Dayjs } | null> = [];

  // Leading empty cells (before the 1st of the month)
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(null);
  }

  // Day cells for each day of the month
  for (let d = 1; d <= daysInMonth; d++) {
    const date = month.date(d);
    cells.push({ date: date.format('YYYY-MM-DD'), dayjs: date });
  }

  // Trailing empty cells (to complete the last row)
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}
```

---

### 4.4 CalendarDayCell

**File**: `frontend/src/components/CalendarDayCell.tsx`
**Directive**: `'use client'`

This renders a single day cell in the calendar grid with weather overlay and selection/range styling.

#### Cell Layout (Single Day)

```
┌──────────────────┐
│  15              │  ← day number (top-left, Typography caption fontWeight 600)
│  24° / 16°      │  ← temp high / low (Typography caption)
│  ☀ Great        │  ← weather label (Typography caption, bold)
│                  │
│ [background:     │
│  weather color   │
│  at 15% opacity] │
└──────────────────┘
```

**Cell dimensions**: The cell is rendered inside a CSS Grid cell. It fills the available width (1/7 of the grid). The height is fixed at `80px` to ensure uniform rows.

#### Cell States and Visual Treatments

| State | Background | Border | Text Color | Cursor |
|-------|-----------|--------|------------|--------|
| **Default (with weather data)** | `WEATHER_LABEL_COLORS[label]` at `0.15` alpha | none | `text.primary` | `pointer` |
| **Default (no weather data)** | `background.paper` (white) | none | `text.primary` | `pointer` |
| **Hovered** | `WEATHER_LABEL_COLORS[label]` at `0.30` alpha (or `action.hover` if no data) | none | `text.primary` | `pointer` |
| **Selected (start or end)** | `primary.main` (MUI blue) | none | `primary.contrastText` (white) | `pointer` |
| **In range (between start and end)** | `primary.light` at `0.20` alpha | none | `text.primary` | `pointer` |
| **Hover preview (between start and hovered, when only start is selected)** | `primary.light` at `0.12` alpha | `1px dashed primary.light` | `text.primary` | `pointer` |
| **Disabled (past date or before minDate)** | `action.disabledBackground` | none | `text.disabled` | `default` (not clickable) |
| **Empty cell (outside month)** | `background.default` (light gray) | none | — | `default` |

#### MUI Structure

```tsx
<Box
  onClick={!isDisabled && cell ? onClick : undefined}
  onMouseEnter={!isDisabled && cell ? onMouseEnter : undefined}
  onMouseLeave={onMouseLeave}
  sx={{
    height: 80,
    p: 0.5,
    backgroundColor: computedBackgroundColor,
    border: isHoverPreview ? '1px dashed' : 'none',
    borderColor: isHoverPreview ? 'primary.light' : 'transparent',
    cursor: isDisabled || !cell ? 'default' : 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    transition: 'background-color 0.15s ease',
    '&:hover': !isDisabled && cell ? {
      backgroundColor: hoverBackgroundColor,
    } : {},
    // Ensure white text on selected (dark) background
    color: isSelected ? 'primary.contrastText' : 'text.primary',
  }}
  role="button"
  aria-label={cell ? `${cell.dayjs.format('MMMM D, YYYY')}${weatherData ? `, ${weatherData.weather_label} weather` : ''}` : undefined}
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
      {/* Day number */}
      <Typography
        variant="caption"
        fontWeight={600}
        sx={{ lineHeight: 1.2 }}
      >
        {cell.dayjs.date()}
      </Typography>

      {/* Weather info (only if data available) */}
      {weatherData && weatherData.temp_high !== null && (
        <>
          <Typography
            variant="caption"
            sx={{ fontSize: '0.65rem', lineHeight: 1.3 }}
          >
            {Math.round(weatherData.temp_high)}° / {Math.round(weatherData.temp_low!)}°
          </Typography>
          <Typography
            variant="caption"
            fontWeight={500}
            sx={{ fontSize: '0.6rem', lineHeight: 1.3 }}
          >
            {weatherData.weather_label}
          </Typography>
        </>
      )}
    </>
  )}
</Box>
```

#### Props Interface

```ts
interface CalendarDayCellProps {
  /** Cell data (null for empty cells outside the month) */
  cell: { date: string; dayjs: dayjs.Dayjs } | null;
  /** Weather data for this day (undefined if no data available) */
  weatherData?: CalendarDay;
  /** Whether this day is a selected start or end date */
  isSelected: boolean;
  /** Whether this day falls between the selected start and end dates */
  isInRange: boolean;
  /** Whether this day is the range start date */
  isRangeStart: boolean;
  /** Whether this day is the range end date */
  isRangeEnd: boolean;
  /** Whether this day is in the hover preview range (start selected, hovering over potential end) */
  isHoverPreview: boolean;
  /** Whether this day is disabled (past date, before minDate) */
  isDisabled: boolean;
  /** Click handler */
  onClick: () => void;
  /** Mouse enter handler (for hover preview) */
  onMouseEnter: () => void;
  /** Mouse leave handler */
  onMouseLeave: () => void;
}
```

#### Background Color Computation Logic

```ts
/**
 * Determines the background color for a calendar day cell.
 * Priority order (highest to lowest):
 * 1. Selected (start/end) → primary.main
 * 2. In confirmed range → primary.light at 0.20 alpha
 * 3. Hover preview → primary.light at 0.12 alpha
 * 4. Disabled → action.disabledBackground
 * 5. Weather data present → WEATHER_LABEL_COLORS[label] at 0.15 alpha
 * 6. No weather data → background.paper
 * 7. Empty cell → background.default
 */
function computeCellBackground(props: CalendarDayCellProps): string {
  if (!props.cell) return theme.palette.background.default;          // empty cell
  if (props.isDisabled) return theme.palette.action.disabledBackground;
  if (props.isSelected) return theme.palette.primary.main;
  if (props.isInRange) return alpha(theme.palette.primary.light, 0.20);
  if (props.isHoverPreview) return alpha(theme.palette.primary.light, 0.12);
  if (props.weatherData?.weather_label) {
    return alpha(WEATHER_LABEL_COLORS[props.weatherData.weather_label], 0.15);
  }
  return theme.palette.background.paper;
}
```

Use MUI's `alpha()` utility from `@mui/material/styles` for alpha transparency.

---

### 4.5 DateRangeSummary

**File**: `frontend/src/components/DateRangeSummary.tsx`
**Directive**: `'use client'`

This component displays the currently selected date range and a confirm button.

#### Layout States

**State A: No dates selected**

```
┌──────────────────────────────────────────────────────────────────────┐
│  "Click on the calendar to select your trip start date"             │
└──────────────────────────────────────────────────────────────────────┘
```

**State B: Only start date selected**

```
┌──────────────────────────────────────────────────────────────────────┐
│  "Start: May 1, 2026 — Now click your return date"                  │
└──────────────────────────────────────────────────────────────────────┘
```

**State C: Both dates selected (range complete)**

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  "May 1, 2026 → May 5, 2026 (4 nights)"        [Reset] [Confirm Dates]      │
└────────────────────────────────────────────────────────────────────────────────┘
```

#### MUI Structure

```tsx
<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, ...sx }}>
  <Typography variant="body1" color={startDate && endDate ? 'text.primary' : 'text.secondary'}>
    {!startDate && 'Click on the calendar to select your trip start date'}
    {startDate && !endDate && `Start: ${startDate.format('MMM D, YYYY')} — Now click your return date`}
    {startDate && endDate && (
      <>
        {startDate.format('MMM D, YYYY')} → {endDate.format('MMM D, YYYY')}{' '}
        <Typography component="span" color="text.secondary">
          ({endDate.diff(startDate, 'day')} night{endDate.diff(startDate, 'day') !== 1 ? 's' : ''})
        </Typography>
      </>
    )}
  </Typography>

  {startDate && endDate && (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button variant="outlined" size="small" onClick={onReset}>
        Reset
      </Button>
      <Button variant="contained" onClick={onConfirm}>
        Confirm Dates
      </Button>
    </Box>
  )}
</Box>
```

#### Props Interface

```ts
interface DateRangeSummaryProps {
  /** Selected start date (null if not yet selected) */
  startDate: dayjs.Dayjs | null;
  /** Selected end date (null if not yet selected) */
  endDate: dayjs.Dayjs | null;
  /** Called when user clicks "Confirm Dates" */
  onConfirm: () => void;
  /** Called when user clicks "Reset" to clear selection */
  onReset: () => void;
  /** Optional MUI sx props */
  sx?: import('@mui/material').SxProps;
}
```

---

## 5. Date Selection Interaction Flow

### 5.1 Click-to-Select State Machine

```
State: NO_SELECTION
  startDate = null, endDate = null

  User clicks day →
    IF day is disabled: do nothing
    ELSE: set startDate = clicked day → transition to START_SELECTED

State: START_SELECTED
  startDate = [date], endDate = null

  User clicks day →
    IF day is disabled: do nothing
    IF clicked day === startDate: reset startDate to null → transition to NO_SELECTION
    IF clicked day is BEFORE startDate: set startDate = clicked day (replace start)
    IF clicked day is AFTER startDate: set endDate = clicked day → transition to RANGE_COMPLETE

State: RANGE_COMPLETE
  startDate = [date], endDate = [date]

  User clicks day →
    Reset: set startDate = clicked day, endDate = null → transition to START_SELECTED
    (Any new click restarts the selection)

  User clicks "Confirm Dates" →
    Call onDateRangeConfirm({ startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') })
    → Next section (DateOptionBuilder) is revealed

  User clicks "Reset" →
    Clear startDate and endDate → transition to NO_SELECTION
```

### 5.2 Hover Preview Behavior

- **Only active when**: `startDate` is selected AND `endDate` is NOT selected (i.e., `START_SELECTED` state)
- **Preview range**: All dates between `startDate` and `hoveredDate` (inclusive) receive the `isHoverPreview` style (dashed border + light blue background)
- **Direction-aware**: If `hoveredDate` is before `startDate`, no preview is shown (user would replace startDate instead)
- **Mouse leave**: When mouse leaves the calendar area, `hoveredDate` is reset to `null` and preview disappears

### 5.3 Validation Rules

| Rule | Enforcement | User Feedback |
|------|------------|---------------|
| Start date must be in the future | Days ≤ today are `isDisabled` | Disabled days have muted background and `cursor: default` |
| End date must be after start date | Clicking a day before start replaces start | Visual: start moves to new position |
| Minimum trip length: 1 night | End date must be at least 1 day after start | If user clicks same day as start, selection resets to NO_SELECTION |
| No maximum trip length | No enforcement | — |

---

## 6. Calendar Weather Data Loading

### 6.1 When to Fetch

Calendar weather data is fetched via `POST /api/v1/calendar` in these scenarios:

1. **Initial load**: When the Calendar section first becomes visible (destination was just selected). Fetch weather for a 2-month window starting from the current month's 1st day.
2. **Month navigation**: When the user clicks previous/next month. Fetch weather for the new 2-month window.
3. **Retry**: When the user clicks the "Retry" button after a failed load.

### 6.2 API Request Construction

```ts
// Triggered when calendar section becomes visible or month changes
const fetchCalendarWeather = async () => {
  if (!destination) return;

  setCalendarWeather({ state: 'loading', data: null, error: null });

  const startDate = viewMonth.format('YYYY-MM-DD');                 // e.g. "2026-05-01"
  const endDate = viewMonth.add(2, 'month').subtract(1, 'day').format('YYYY-MM-DD'); // e.g. "2026-06-30"

  try {
    const response = await api.post<CalendarResponse>('/api/v1/calendar', {
      destination: destination.name,
      latitude: destination.latitude,
      longitude: destination.longitude,
      start_date: startDate,
      end_date: endDate,
    });

    setCalendarWeather({ state: 'success', data: response.data.days, error: null });
  } catch (err) {
    const message = axios.isAxiosError(err) && err.response?.data?.message
      ? err.response.data.message
      : 'Failed to load weather data. Please try again.';
    setCalendarWeather({ state: 'error', data: null, error: message });
  }
};
```

### 6.3 Weather Data Map

Convert the `CalendarDay[]` array into a `Map<string, CalendarDay>` for O(1) lookup by date:

```ts
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

### 6.4 Loading & Error States

| State | Display |
|-------|---------|
| `idle` | Empty calendar grids with no weather colors (just day numbers on white cells) |
| `loading` | `CircularProgress` centered within the Paper, replacing the calendar grids. MonthNavigationBar and WeatherLegend remain visible. |
| `success` | Calendar grids with weather-colored cells |
| `error` | Calendar grids without weather colors + `Alert` component below the grids with error message and "Retry" button |

**Important**: On error, the calendar grids are still rendered (with plain white/default cells). Users can still select dates — weather overlay is a nice-to-have, not a blocker for date selection.

### 6.5 Re-fetch Triggers (useEffect dependencies)

```ts
useEffect(() => {
  if (visible && destination) {
    fetchCalendarWeather();
  }
}, [viewMonth, destination?.name, visible]);
// Re-fetches when:
// - viewMonth changes (month navigation)
// - destination changes (user selects a new destination)
// - section becomes visible for the first time
```

---

## 7. Grid Layout Breakdown

### 7.1 Desktop (md and above: ≥900px)

The two month grids sit **side by side** in a single row:

| Column | Grid `size.md` | Width Fraction | Content |
|--------|----------------|----------------|---------|
| Left | 6 | 6/12 = 50% | CalendarMonthGrid for `viewMonth` |
| Right | 6 | 6/12 = 50% | CalendarMonthGrid for `viewMonth + 1` |

**Spacing**: `spacing={4}` = 32px gap between the two month grids.

### 7.2 Below md (<900px)

Each month grid takes `xs: 12` (full width), stacking vertically:

```
Row 1: CalendarMonthGrid (viewMonth)      — full width
        32px gap
Row 2: CalendarMonthGrid (viewMonth + 1)  — full width
```

### 7.3 Calendar Day Grid (CSS Grid)

Each `CalendarMonthGrid` uses CSS Grid (not MUI Grid2) for the 7-column day layout:

```css
display: grid;
grid-template-columns: repeat(7, 1fr);
gap: 1px;
background-color: theme.palette.divider; /* creates visible grid lines */
```

- Each cell fills `1fr` of available width (equal column widths)
- The `1px` gap with `divider` background creates visual grid lines between cells
- Cell height: fixed `80px`
- At ~530px available width per month (at 1200px viewport), each cell is ~75px wide

### 7.4 Width Math at 1200px Viewport

```
Container content: 1200px - 2×24px padding = 1152px
Paper content: 1152px - 2×32px padding = 1088px
Two month grids: (1088px - 32px gap) / 2 = 528px each
Seven day columns: 528px / 7 ≈ 75px each
Day cell content area: ~75px × 80px
```

---

## 8. Spacing and Sizing Summary

| Element | Property | Value | Pixels (at 8px unit) |
|---------|----------|-------|---------------------|
| CalendarSection outer Box | `mb` | 6 | 48px bottom margin |
| Section title to subtitle | `gutterBottom` on h5 | — | ~8px (MUI default) |
| Subtitle to Paper | `mb` on subtitle | 3 | 24px |
| Paper internal padding | `p` | 4 | 32px all sides |
| Paper elevation | `elevation` | 2 | subtle shadow |
| Nav bar to legend | `mt` on legend | 3 | 24px |
| Legend to calendar grids | `mt` on grid container | 2 | 16px |
| Month grids spacing | `spacing` | 4 | 32px between grids |
| Calendar grids to summary | `mt` on summary | 3 | 24px |
| Error alert | `mt` | 2 | 16px |
| Day cell height | `height` | — | 80px |
| Day cell internal padding | `p` | 0.5 | 4px |
| Day-of-week header height | `py` | 0.5 | 4px vertical |
| Month label to headers | `mb` on month label | 1 | 8px |

---

## 9. Color-Coded Scoring Visualization

### 9.1 Weather Label to Color Mapping

Each calendar day cell is tinted based on the `weather_label` value from the `CalendarDay` API response:

| `weather_label` | Background Color | Alpha | Visual Meaning |
|----------------|-----------------|-------|----------------|
| `"Great"` | `#4caf50` (green) | 0.15 | Ideal travel weather (score ≥ 80) |
| `"Good"` | `#8bc34a` (light green) | 0.15 | Good travel weather (score ≥ 60) |
| `"Fair"` | `#ff9800` (orange) | 0.15 | Acceptable weather (score ≥ 40) |
| `"Poor"` | `#f44336` (red) | 0.15 | Poor weather (score < 40) |
| `null` | `background.paper` | 1.0 | No weather data available |

### 9.2 Alpha Values by State

The weather color alpha changes based on interaction state:

| Interaction State | Alpha | Reason |
|------------------|-------|--------|
| Default | 0.15 | Subtle tint — readable text on light background |
| Hovered | 0.30 | Slightly more prominent to indicate interactivity |
| Selected (start/end) | — | Overridden by `primary.main` solid blue |
| In range | — | Overridden by `primary.light` at 0.20 |
| Hover preview | — | Overridden by `primary.light` at 0.12 with dashed border |

### 9.3 Temperature Display Format

- High and low temperatures are shown as: `{high}° / {low}°`
- Values are rounded to the nearest integer: `Math.round(temp_high)` / `Math.round(temp_low)`
- Celsius only (no unit symbol, just the degree sign `°`)
- Example: `24° / 16°`

### 9.4 Weather Label Display

- The weather label text (`Great`, `Good`, `Fair`, `Poor`) is displayed below the temperature
- Font size: `0.6rem` (smaller than the temperature to fit in the cell)
- Font weight: 500 (medium)

---

## 10. Month Navigation Behavior

### 10.1 Initial View Month

When the calendar section first becomes visible:
```ts
const [viewMonth, setViewMonth] = useState<dayjs.Dayjs>(() => dayjs().startOf('month'));
```
The left month shows the **current month**, the right month shows **next month**.

### 10.2 Navigation Rules

| Action | Effect | Constraint |
|--------|--------|-----------|
| Click `◀` (previous) | `viewMonth = viewMonth.subtract(1, 'month')` | Disabled when `viewMonth` ≤ current month |
| Click `▶` (next) | `viewMonth = viewMonth.add(1, 'month')` | Always enabled (no upper limit) |

### 10.3 Navigation and Weather Re-fetch

Each month navigation triggers a new API call for the new 2-month window:

```
Navigate to ◀:
  viewMonth = April 2026
  API fetches: April 2026 – May 2026

Navigate to ▶:
  viewMonth = June 2026
  API fetches: June 2026 – July 2026
```

### 10.4 Date Selection Persistence Across Navigation

- Selected `startDate` and `endDate` **persist** when navigating months
- If the user selects May 1–5 and navigates to June–July, the selection is still stored
- When navigating back, the selection highlights re-appear
- The "Confirm Dates" button and summary remain visible below the calendar regardless of which months are shown

---

## 11. Error Handling

| Error Scenario | Display Location | Message Text | Recovery |
|----------------|-----------------|--------------|----------|
| Calendar weather API fails (network/500/504) | `Alert` component below calendar grids | API error message or `"Failed to load weather data. Please try again."` | "Retry" button in Alert, which calls `fetchCalendarWeather()` |
| Calendar weather API returns empty days array | Calendar renders with no weather colors | No explicit error — cells show day numbers without weather info | User can still select dates; weather is informational only |
| Calendar weather loading | `CircularProgress` replaces calendar grids | — | Wait for response |

**Key principle**: Calendar weather data failure does NOT block date selection. The calendar grids are always interactive (except during the loading state). Weather overlay is enhancement, not a gate.

---

## 12. Accessibility Notes (Best-Effort)

- Each day cell has `role="button"` and `aria-label` describing the date and weather (e.g., "May 1, 2026, Great weather")
- Disabled cells have `aria-disabled="true"` and `tabIndex={-1}`
- Active cells have `tabIndex={0}` and respond to `Enter`/`Space` key presses
- Month navigation buttons have `aria-label` ("Previous month" / "Next month")
- The weather legend uses visible text labels (no color-only information)
- The date range summary provides textual confirmation of the selection

---

## 13. Import Map

```ts
// CalendarSection.tsx imports
import { Box, Paper, Typography, Grid2, CircularProgress, Alert, Button } from '@mui/material';
import dayjs from 'dayjs';
import { MonthNavigationBar } from './MonthNavigationBar';
import { WeatherLegend } from './WeatherLegend';
import { CalendarMonthGrid } from './CalendarMonthGrid';
import { DateRangeSummary } from './DateRangeSummary';
import { api } from '@/lib/api';
import type { CalendarResponse, CalendarDay } from '@/types/api';
import type { SelectedDestination, DateRange, CalendarWeatherState } from '@/types/frontend';

// MonthNavigationBar.tsx imports
import { Box, Typography, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type dayjs from 'dayjs';

// WeatherLegend.tsx imports
import { Box, Typography } from '@mui/material';
import { WEATHER_LABEL_COLORS } from '@/types/constants';

// CalendarMonthGrid.tsx imports
import { Box, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { CalendarDayCell } from './CalendarDayCell';
import type { CalendarDay } from '@/types/api';

// CalendarDayCell.tsx imports
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { WEATHER_LABEL_COLORS } from '@/types/constants';
import type { CalendarDay } from '@/types/api';

// DateRangeSummary.tsx imports
import { Box, Typography, Button } from '@mui/material';
import type dayjs from 'dayjs';
```

---

## 14. Visual Reference (Approximate Pixel Layout at 1200px Viewport)

```
├──── 24px padding (Container) ────┤
│                                   │
│  Select Your Travel Dates        (h5, ~24px font, semibold)
│  Click a start date, then...     (body2, ~14px font, secondary color)
│                                   │
│  ┌── 24px gap ──────────────────────────────────────────────────────────────────┐
│  │                                                                               │
│  │  ┌── Paper (32px padding, shadow) ─────────────────────────────────────────┐  │
│  │  │                                                                         │  │
│  │  │  [◀]              "May 2026 — Jun 2026"                          [▶]   │  │
│  │  │                                                                         │  │
│  │  │  ─── 24px gap ───                                                       │  │
│  │  │                                                                         │  │
│  │  │  ■ Great   ■ Good   ■ Fair   ■ Poor   □ No data                        │  │
│  │  │                                                                         │  │
│  │  │  ─── 16px gap ───                                                       │  │
│  │  │                                                                         │  │
│  │  │  ┌──── 528px ────────────────────┐  32px  ┌──── 528px ────────────────────┐
│  │  │  │        May 2026               │  gap   │        Jun 2026               │
│  │  │  │  Sun Mon Tue Wed Thu Fri Sat  │        │  Sun Mon Tue Wed Thu Fri Sat  │
│  │  │  │ ┌───┬───┬───┬───┬───┬───┬───┐│        │ ┌───┬───┬───┬───┬───┬───┬───┐│
│  │  │  │ │   │   │   │   │   │ 1 │ 2 ││        │ │   │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 ││
│  │  │  │ │   │   │   │   │   │75 │75 ││        │ │   │75 │75 │75 │75 │75 │75 ││
│  │  │  │ │   │   │   │   │   │×80│×80││        │ │   │×80│×80│×80│×80│×80│×80││
│  │  │  │ ├───┼───┼───┼───┼───┼───┼───┤│        │ ├───┼───┼───┼───┼───┼───┼───┤│
│  │  │  │ │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 │ 9 ││       │ │ 7 │ 8 │...│...│...│...│...││
│  │  │  │ │   │   │   │   │   │   │   ││        │ │   │   │   │   │   │   │   ││
│  │  │  │ ├───┼───┼───┼───┼───┼───┼───┤│        │ ├───┼───┼───┼───┼───┼───┼───┤│
│  │  │  │ │...│...│...│...│...│...│...││        │ │...│...│...│...│...│...│...││
│  │  │  │ ├───┼───┼───┼───┼───┼───┼───┤│        │ ├───┼───┼───┼───┼───┼───┼───┤│
│  │  │  │ │...│...│...│...│...│...│...││        │ │...│...│...│30 │   │   │   ││
│  │  │  │ ├───┼───┼───┼───┼───┼───┼───┤│        │ └───┴───┴───┴───┴───┴───┴───┘│
│  │  │  │ │...│...│...│31 │   │   │   ││        │                               │
│  │  │  │ └───┴───┴───┴───┴───┴───┴───┘│        └───────────────────────────────┘
│  │  │  └───────────────────────────────┘                                        │
│  │  │                                                                         │  │
│  │  │  ─── 24px gap ───                                                       │  │
│  │  │                                                                         │  │
│  │  │  "May 1, 2026 → May 5, 2026 (4 nights)"    [Reset] [Confirm Dates]    │  │
│  │  │                                                                         │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │
│  │                                                                               │
│  └───────────────────────────────────────────────────────────────────────────────┘
│                                   │
├──── 48px margin-bottom to next section ────┤
```

---

## 15. Responsive Behavior (Desktop-First)

This is a desktop-first layout. No special mobile/tablet-specific styling is required. The responsive fallbacks exist only to prevent overflow on smaller viewports.

### Breakpoint Behavior

| Viewport Width | Calendar Layout | Day Cell Size |
|---------------|----------------|---------------|
| ≥900px (md+) | Two months **side by side** (50% / 50%) | ~75px × 80px |
| <900px | Two months **stacked vertically** (100% each) | Wider cells (full container width / 7) |

### What Does NOT Change by Viewport

- Day cell height is always `80px`
- Weather legend is always a horizontal flex row (with `flexWrap: wrap` for safety)
- Month navigation bar is always a flex row (prev / title / next)
- Date range summary is always below the calendar grids
- Font sizes in day cells remain the same (they are small enough to fit at any reasonable width)

### No Specific Mobile Layouts

- No hamburger menus, bottom sheets, or swipe gestures
- No touch-specific interactions (standard click/hover applies)
- The `xs: 12` grid sizing simply ensures vertical stacking below the `md` breakpoint

---

## 16. Destination Change Behavior

When the user changes the destination in the Search section (selects a different city):

1. **Calendar weather data is cleared** — `calendarWeather` resets to `{ state: 'idle', data: null, error: null }`
2. **View month resets to current month** — `viewMonth = dayjs().startOf('month')`
3. **Date selection is cleared** — `startDate = null`, `endDate = null`
4. **New weather data is fetched** — the `useEffect` dependency on `destination.name` triggers a re-fetch
5. **Downstream sections (DateOptionBuilder) are hidden** — because `confirmedDateRange` is reset to `null`

This ensures the user starts fresh when exploring a different destination.
