# WhenToGo Frontend — Build Progress

## Step 1 — Foundation — COMPLETED
**Files created/modified**:
- `src/theme/ThemeRegistry.tsx` — MUI 7 theme + Emotion cache provider
- `src/types/frontend.ts` — Frontend-only types (UI state, component props)
- `src/types/constants.ts` — Shared constants (MAX_QUEUE_SIZE, WEATHER_LABEL_COLORS, etc.)
- `src/lib/api.ts` — Centralized Axios API service layer (7 endpoints)
- `src/context/ComparisonQueueContext.tsx` — React Context for comparison queue state
- `src/app/layout.tsx` — Updated with ThemeRegistry + ComparisonQueueProvider
- `src/app/globals.css` — Emptied (CssBaseline handles reset)
- `next.config.ts` — Added API rewrites for `/api/*` proxy
- `.env.local` — Created with NEXT_PUBLIC_API_URL

**Decisions made**:
- MUI 7 renamed `Grid2` to `Grid` — used `@mui/material/Grid` everywhere
- React 19 requires explicit initial value for `useRef` — used `useRef<T | undefined>(undefined)`
- `'use client'` directive on all interactive components

**Next**: Step 2

## Step 2 — Search Section — COMPLETED
**Files created**:
- `src/components/search/SearchSection.tsx` — Main search container with title + 3-column grid
- `src/components/search/DestinationAutocomplete.tsx` — City autocomplete with debounce (300ms)
- `src/components/search/OriginAirportInput.tsx` — IATA code text input (3-letter, uppercase)
- `src/components/search/TravelerCountInput.tsx` — Numeric input with rooms helper text

**Decisions made**: Used centralized `searchDestinations()` from `@/lib/api` instead of raw axios.

**Next**: Step 3

## Step 3 — Calendar Section — COMPLETED
**Files created**:
- `src/components/calendar/CalendarSection.tsx` — 2-month weather calendar with month navigation
- `src/components/calendar/CalendarMonthGrid.tsx` — Month grid with weekday headers + day cells
- `src/components/calendar/CalendarDayCell.tsx` — Day cell with temp/rain/weather-label indicators
- `src/components/shared/InlineError.tsx` — Reusable inline error + retry button

**Decisions made**: Calendar fetches weather on mount and on viewMonth/destination change.

**Next**: Step 4

## Step 4 — Date Option Builder — COMPLETED
**Files created**:
- `src/components/dateOption/DateOptionBuilderSection.tsx` — 3-column card layout + Add to Queue
- `src/components/dateOption/FlightPriceCard.tsx` — Flight price display (per person + group total)
- `src/components/dateOption/HotelSelectionCard.tsx` — Hotel list with selection + auto-select cheapest
- `src/components/dateOption/WeatherSummaryCard.tsx` — Weather score, label chip, rain signal

**Decisions made**: Hotels auto-select the cheapest on load. Add to Queue disabled until all data loaded.

**Next**: Step 5

## Step 5 — Comparison Section — COMPLETED
**Files created**:
- `src/components/comparison/ComparisonSection.tsx` — Queue panel + results zone
- `src/components/comparison/QueueItemCard.tsx` — Compact queue item with remove button
- `src/components/comparison/ComparisonTable.tsx` — Side-by-side scoring table

**Decisions made**: Winner banner uses MUI Alert with EmojiEvents icon. Tags displayed as colored Chips.

**Next**: Step 6

## Step 6 — Progressive Reveal + Polish — COMPLETED
**Files created**:
- `src/components/layout/SectionContainer.tsx` — Fade-in visibility wrapper
- `src/app/page.tsx` — Full HomePage with progressive reveal state machine

**Decisions made**:
- Visibility derived from state (not stored): `showCalendar = dest !== null`, etc.
- Three parallel API calls on date range confirm (flights, hotels, weather)
- Cascading reset: changing destination clears date range and all results

**Next**: Step 7 — Verify

## Step 7 — Verify & Cross-Reference — COMPLETED
**Files created/modified**:
- `src/components/layout/Header.tsx` — AppBar with WhenToGo branding + queue badge
- `src/components/layout/Footer.tsx` — Simple informational footer
- `src/components/layout/AppShell.tsx` — Full-viewport flex layout shell
- `src/components/layout/ComparisonQueueFAB.tsx` — Fixed FAB with queue count badge
- `src/components/shared/EmptyState.tsx` — Reusable empty state placeholder
- `src/lib/mock.ts` — Mock data for all endpoints (destinations, flights, hotels, weather, calendar, compare)
- `src/types/index.ts` — Type re-export barrel
- `src/types/constants.ts` — Added TAG_COLORS, TAG_LABELS, CURRENCY_SYMBOL, CURRENCY_CODE
- `src/app/layout.tsx` — Updated to wrap children in AppShell
- `src/app/page.tsx` — Removed Container wrapper (AppShell provides it)

**Cross-reference checklist results**:
- All layout components: Header, Footer, AppShell, ComparisonQueueFAB, SectionContainer ✅
- All search components: SearchSection, DestinationAutocomplete, OriginAirportInput, TravelerCountInput ✅
- All calendar components: CalendarSection, CalendarMonthGrid, CalendarDayCell ✅
- All date detail components: DateOptionBuilderSection, FlightPriceCard, HotelSelectionCard, WeatherSummaryCard ✅
- All comparison components: ComparisonSection, ComparisonTable, QueueItemCard ✅
- All shared components: InlineError, EmptyState ✅
- All API endpoints wired: 7/7 (health, destinations, flights, hotels, weather, calendar, compare) ✅
- All types defined: api.ts (frozen), frontend.ts, constants.ts, index.ts ✅
- Context provider: ComparisonQueueContext with queue, addItem, removeItem, clearQueue, compareTrips ✅
- Progressive reveal: 4 sections with derived visibility ✅
- Mock data: Available for all endpoints ✅
- Build: `next build` passes with zero TypeScript errors ✅

**Issues encountered**: MUI 7 renamed Grid2→Grid, React 19 requires explicit useRef initial value. Both fixed in iteration 1.
