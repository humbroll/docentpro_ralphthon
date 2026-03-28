# WhenToGo Frontend Spec — Cross-Reference Completeness Checklist

> **Audience**: Ralph Loop (autonomous implementation agent)
> **Purpose**: Ensures every component referenced in user flows is fully defined, every data type used in components is specified, and every API endpoint consumed by the frontend has a complete contract. Use this checklist to verify spec completeness before and during implementation.
> **Cross-references**: All `docs/frontend/frontend-spec-*.md` sub-specifications, `frontend/src/types/api.ts`, `docs/api-spec.yaml`

---

## Table of Contents

1. [How to Use This Checklist](#1-how-to-use-this-checklist)
2. [Checklist A: Component-to-Spec Traceability](#2-checklist-a-component-to-spec-traceability)
3. [Checklist B: User Flow → Component Mapping](#3-checklist-b-user-flow--component-mapping)
4. [Checklist C: Data Type → Component Traceability](#4-checklist-c-data-type--component-traceability)
5. [Checklist D: API Endpoint Contract Completeness](#5-checklist-d-api-endpoint-contract-completeness)
6. [Checklist E: Context & Hooks → Component Wiring](#6-checklist-e-context--hooks--component-wiring)
7. [Checklist F: Edge Case Coverage Matrix](#7-checklist-f-edge-case-coverage-matrix)
8. [Checklist G: File Path Consistency Audit](#8-checklist-g-file-path-consistency-audit)

---

## 1. How to Use This Checklist

Ralph Loop should verify each item below has a ✅ status before considering a component "spec-complete." If any item cannot be verified from the referenced spec document, the spec has a gap that must be resolved.

- **✅** = Fully specified in the referenced document
- **Spec Doc** = The sub-spec document where the full definition lives
- **Section** = The section within that document

---

## 2. Checklist A: Component-to-Spec Traceability

Every component that appears in any user flow or component tree MUST have a complete definition (props interface, internal state, render structure, behavior) in at least one spec document.

### 2.1 Layout Components

| # | Component | File Path | Props Defined? | Render Structure? | Behavior? | Spec Doc |
|---|-----------|-----------|:-:|:-:|:-:|----------|
| L1 | `RootLayout` | `src/app/layout.tsx` | ✅ | ✅ | ✅ | `frontend-spec.md` §2.3 |
| L2 | `ThemeRegistry` | `src/theme/ThemeRegistry.tsx` | ✅ | ✅ | ✅ | `frontend-spec.md` §2.4 |
| L3 | `AppShell` | `src/components/layout/AppShell.tsx` | ✅ | ✅ | ✅ | `frontend-spec.md` §2.5 |
| L4 | `Header` | `src/components/layout/Header.tsx` | ✅ | ✅ | ✅ | `frontend-spec.md` §2.6 |
| L5 | `Footer` | `src/components/layout/Footer.tsx` | ✅ | ✅ | ✅ | `frontend-spec.md` §2.7 |
| L6 | `PageContainer` | `src/components/layout/PageContainer.tsx` | ✅ | ✅ | ✅ | `frontend-spec.md` §2.8 |
| L7 | `SectionContainer` | `src/components/layout/SectionContainer.tsx` | ✅ | ✅ | ✅ | `frontend-spec.md` §2.9 |
| L8 | `ComparisonQueueFAB` | `src/components/layout/ComparisonQueueFAB.tsx` | ✅ | ✅ | ✅ | `frontend-spec.md` §2.10 |

### 2.2 Page Component

| # | Component | File Path | Props Defined? | Internal State? | Render Structure? | Spec Doc |
|---|-----------|-----------|:-:|:-:|:-:|----------|
| P1 | `HomePage` | `src/app/page.tsx` | ✅ | ✅ | ✅ | `frontend-spec.md` §2.11, `frontend-spec-progressive-reveal.md` §11 |

### 2.3 Search Section Components

| # | Component | File Path | Props Defined? | Internal State? | Render Structure? | Validation? | Spec Doc |
|---|-----------|-----------|:-:|:-:|:-:|:-:|----------|
| S1 | `SearchSection` | `src/components/SearchSection.tsx` | ✅ | ✅ | ✅ | ✅ | `frontend-spec-component-signatures.md` §2, `frontend-spec-search-section.md`, `frontend-spec-form-components.md` §2 |
| S2 | `DestinationAutocomplete` | `src/components/DestinationAutocomplete.tsx` | ✅ | ✅ | ✅ | ✅ | `frontend-spec-component-signatures.md` §3, `frontend-spec-destination-autocomplete.md`, `frontend-spec-form-components.md` §3 |
| S3 | `OriginAirportInput` | `src/components/OriginAirportInput.tsx` | ✅ | ✅ | ✅ | ✅ | `frontend-spec-component-signatures.md` §4, `frontend-spec-form-components.md` §4 |
| S4 | `TravelerCountInput` | `src/components/TravelerCountInput.tsx` | ✅ | ✅ | ✅ | ✅ | `frontend-spec-component-signatures.md` §5, `frontend-spec-form-components.md` §5 |

### 2.4 Calendar Section Components

| # | Component | File Path | Props Defined? | Internal State? | Render Structure? | Spec Doc |
|---|-----------|-----------|:-:|:-:|:-:|----------|
| C1 | `CalendarDateRangePicker` / `CalendarSection` | `src/components/CalendarDateRangePicker.tsx` | ✅ | ✅ | ✅ | `frontend-spec-component-signatures.md` §6, `frontend-spec-calendar-section.md`, `frontend-spec-form-components.md` §6 |
| C2 | `CalendarDayCell` | `src/components/CalendarDayCell.tsx` | ✅ | ✅ | ✅ | `frontend-spec-weather-calendar-indicators.md` §7.1 |
| C3 | `WeatherLegend` | `src/components/WeatherLegend.tsx` | ✅ | ✅ | ✅ | `frontend-spec-weather-calendar-indicators.md` §5 |

### 2.5 Date Details Section Components

| # | Component | File Path | Props Defined? | Internal State? | Render Structure? | Spec Doc |
|---|-----------|-----------|:-:|:-:|:-:|----------|
| D1 | `DateOptionBuilderSection` | `src/components/DateOptionBuilderSection.tsx` | ✅ | ✅ | ✅ | `frontend-spec-component-signatures.md` §10, `frontend-spec-form-components.md` §7 |
| D2 | `FlightPriceCard` | `src/components/FlightPriceCard.tsx` | ✅ | ✅ | ✅ | `frontend-spec-component-signatures.md` §8, `frontend-spec-form-components.md` §8, `frontend-spec-display-components.md` |
| D3 | `HotelSelectionCard` / `HotelSelectionList` | `src/components/HotelSelectionCard.tsx` | ✅ | ✅ | ✅ | `frontend-spec-component-signatures.md` §7, `frontend-spec-hotel-section.md`, `frontend-spec-form-components.md` §9 |
| D4 | `WeatherSummaryCard` | `src/components/WeatherSummaryCard.tsx` | ✅ | ✅ | ✅ | `frontend-spec-component-signatures.md` §9, `frontend-spec-form-components.md` §10, `frontend-spec-display-components.md` |
| D5 | `AddToQueueButton` | `src/components/AddToQueueButton.tsx` | ✅ | ✅ | ✅ | `frontend-spec-component-signatures.md` §11, `frontend-spec-form-components.md` §11 |

### 2.6 Comparison Section Components

| # | Component | File Path | Props Defined? | Internal State? | Render Structure? | Spec Doc |
|---|-----------|-----------|:-:|:-:|:-:|----------|
| X1 | `ComparisonSection` | `src/components/ComparisonSection.tsx` | ✅ | ✅ | ✅ | `frontend-spec-compare-section.md`, `frontend-spec-comparison-view.md`, `frontend-spec-form-components.md` §12 |
| X2 | `ComparisonQueuePanel` / `ComparisonQueueList` | `src/components/ComparisonQueuePanel.tsx` | ✅ | ✅ | ✅ | `frontend-spec-component-signatures.md` §12, `frontend-spec-compare-section.md` §2, `frontend-spec-comparison-queue.md` |
| X3 | `QueueItemCard` | `src/components/compare/QueueItemCard.tsx` | ✅ | ✅ | ✅ | `frontend-spec-compare-section.md` §2 |
| X4 | `CompareButton` | `src/components/CompareButton.tsx` | ✅ | ✅ | ✅ | `frontend-spec-component-signatures.md` §13 |
| X5 | `ComparisonResultsTable` / `ComparisonTable` | `src/components/ComparisonResultsTable.tsx` | ✅ | ✅ | ✅ | `frontend-spec-component-signatures.md` §14, `frontend-spec-compare-section.md` §3, `frontend-spec-comparison-view.md` |
| X6 | `ComparisonColumn` | `src/components/comparison/ComparisonColumn.tsx` | ✅ | ✅ | ✅ | `frontend-spec-comparison-view.md` §3 |
| X7 | `TagChip` | `src/components/comparison/TagChip.tsx` | ✅ | ✅ | ✅ | `frontend-spec-comparison-view.md` §4 |
| X8 | `ScoreBar` | `src/components/comparison/ScoreBar.tsx` | ✅ | ✅ | ✅ | `frontend-spec-comparison-view.md` §5 |
| X9 | `BestOptionBanner` / `WinnerBanner` | `src/components/comparison/BestOptionBanner.tsx` | ✅ | ✅ | ✅ | `frontend-spec-comparison-view.md` §6, `frontend-spec-compare-section.md` §7 |
| X10 | `ScoreSummaryCards` | `src/components/compare/ScoreSummaryCards.tsx` | ✅ | ✅ | ✅ | `frontend-spec-compare-section.md` §4 |
| X11 | `CostBreakdownChart` | `src/components/compare/CostBreakdownChart.tsx` | ✅ | ✅ | ✅ | `frontend-spec-compare-section.md` §5 |
| X12 | `ScoreComparisonChart` | `src/components/compare/ScoreComparisonChart.tsx` | ✅ | ✅ | ✅ | `frontend-spec-compare-section.md` §6 |
| X13 | `ComparisonTableSkeleton` | `src/components/compare/ComparisonTableSkeleton.tsx` | ✅ | ✅ | ✅ | `frontend-spec-compare-section.md` §10 |

### 2.7 Shared / Utility Components

| # | Component | File Path | Props Defined? | Render Structure? | Spec Doc |
|---|-----------|-----------|:-:|:-:|----------|
| U1 | `LoadingIndicator` | `src/components/shared/LoadingIndicator.tsx` | ✅ | ✅ | `frontend-spec-component-signatures.md` §15, `frontend-spec-ui-states.md`, `frontend-spec-form-components.md` §14 |
| U2 | `InlineError` | `src/components/shared/InlineError.tsx` | ✅ | ✅ | `frontend-spec-component-signatures.md` §15, `frontend-spec-ui-states.md`, `frontend-spec-form-components.md` §14 |
| U3 | `EmptyState` | `src/components/shared/EmptyState.tsx` | ✅ | ✅ | `frontend-spec-component-signatures.md` §15, `frontend-spec-ui-states.md`, `frontend-spec-empty-states.md` |

---

## 3. Checklist B: User Flow → Component Mapping

Every step in the user flow MUST map to at least one component that is fully defined in the spec.

### 3.1 Flow: Destination Search & Selection

| Step | User Action | Component(s) Involved | Data Type(s) Used | API Called | Spec Doc |
|------|-------------|----------------------|-------------------|-----------|----------|
| 1 | User types city name (≥3 chars) | `DestinationAutocomplete` | `string` (inputValue) | `GET /api/v1/search/destinations?q=...` | `frontend-spec-destination-autocomplete.md` |
| 2 | Autocomplete shows results | `DestinationAutocomplete` | `DestinationResult[]` | — | `frontend-spec-destination-autocomplete.md` |
| 3 | User selects a destination | `DestinationAutocomplete` → `SearchSection` | `DestinationResult` → `SelectedDestination` | — | `frontend-spec-component-signatures.md` §2–3 |
| 4 | User enters origin airport | `OriginAirportInput` | `string` (3-char IATA) | — | `frontend-spec-component-signatures.md` §4 |
| 5 | User sets traveler count | `TravelerCountInput` | `number` (1–100) | — | `frontend-spec-component-signatures.md` §5 |

### 3.2 Flow: Calendar & Date Selection

| Step | User Action | Component(s) Involved | Data Type(s) Used | API Called | Spec Doc |
|------|-------------|----------------------|-------------------|-----------|----------|
| 6 | Calendar section appears | `SectionContainer`, `CalendarDateRangePicker` | `CalendarWeatherState` | `POST /api/v1/calendar` | `frontend-spec-calendar-section.md`, `frontend-spec-progressive-reveal.md` |
| 7 | Weather indicators render on days | `CalendarDayCell`, `WeatherLegend` | `CalendarDay`, `CalendarResponse` | — | `frontend-spec-weather-calendar-indicators.md` |
| 8 | User selects date range | `CalendarDateRangePicker` | `DateRange` | — | `frontend-spec-calendar-section.md` |

### 3.3 Flow: Date Details (Flight / Hotel / Weather)

| Step | User Action | Component(s) Involved | Data Type(s) Used | API Called | Spec Doc |
|------|-------------|----------------------|-------------------|-----------|----------|
| 9 | Date details section appears | `SectionContainer`, `DateOptionBuilderSection` | `DateDetailResults` | 3 parallel calls (below) | `frontend-spec-progressive-reveal.md` |
| 10 | Flight price loads | `FlightPriceCard`, `LoadingIndicator`, `InlineError` | `FlightPrice`, `FlightPriceRequest` | `POST /api/v1/flights/price` | `frontend-spec-form-components.md` §8 |
| 11 | Hotel list loads | `HotelSelectionCard`, `LoadingIndicator`, `InlineError` | `HotelOption[]`, `HotelSearchRequest` | `POST /api/v1/hotels/search` | `frontend-spec-hotel-section.md`, `frontend-spec-form-components.md` §9 |
| 12 | Weather summary loads | `WeatherSummaryCard`, `LoadingIndicator`, `InlineError` | `WeatherSummary`, `WeatherRequest` | `POST /api/v1/weather` | `frontend-spec-form-components.md` §10 |
| 13 | User selects a hotel | `HotelSelectionCard` | `HotelOption` (selected) | — | `frontend-spec-hotel-section.md` |
| 14 | User clicks "Add to Queue" | `AddToQueueButton` | `ComparisonQueueItem` | — | `frontend-spec-component-signatures.md` §11 |

### 3.4 Flow: Comparison

| Step | User Action | Component(s) Involved | Data Type(s) Used | API Called | Spec Doc |
|------|-------------|----------------------|-------------------|-----------|----------|
| 15 | Queue section appears (≥1 item) | `SectionContainer`, `ComparisonSection` | `ComparisonQueueItem[]` | — | `frontend-spec-compare-section.md` |
| 16 | Queue items displayed | `ComparisonQueuePanel`, `QueueItemCard` | `ComparisonQueueItem` | — | `frontend-spec-compare-section.md` §2 |
| 17 | User removes a queue item | `QueueItemCard` | `ComparisonQueueItem.id` | — | `frontend-spec-compare-section.md` §2 |
| 18 | User clears all items | `ComparisonQueuePanel` | `ComparisonQueueItem[]` | — | `frontend-spec-compare-section.md` §2 |
| 19 | User clicks "Compare" (≥2 items) | `CompareButton` | `CompareRequest`, `CompareOptionInput[]` | `POST /api/v1/compare` | `frontend-spec-component-signatures.md` §13 |
| 20 | Results table renders | `ComparisonResultsTable`, `ComparisonColumn` | `CompareResponse`, `TripOption[]` | — | `frontend-spec-comparison-view.md` |
| 21 | Winner banner shows | `BestOptionBanner` / `WinnerBanner` | `TripOption`, `best_option_index` | — | `frontend-spec-comparison-view.md` §6 |
| 22 | Score summary cards show | `ScoreSummaryCards` | `TripOption[]` | — | `frontend-spec-compare-section.md` §4 |
| 23 | Tags displayed on options | `TagChip` | `TripTag` (`"cheapest"`, `"best_weather"`, `"best_overall"`) | — | `frontend-spec-comparison-view.md` §4 |
| 24 | Score bars rendered | `ScoreBar` | `overall_score: number` (0–100) | — | `frontend-spec-comparison-view.md` §5 |

---

## 4. Checklist C: Data Type → Component Traceability

Every TypeScript type/interface used by any component MUST be defined in either `frontend/src/types/api.ts` or `frontend/src/types/frontend.ts` (or `constants.ts`).

### 4.1 API Types (from `frontend/src/types/api.ts`)

| # | Type | Defined In | Components That Use It | Spec Reference |
|---|------|-----------|------------------------|----------------|
| T1 | `SearchRequest` | `api.ts` (existing) | `HomePage` (internal state tracking) | `frontend-spec.md` §1.1 |
| T2 | `WeatherRequest` | `api.ts` (existing) | `api.ts` service layer (`getWeather`) | `frontend-spec.md` §1.1 |
| T3 | `HotelSearchRequest` | `api.ts` (existing) | `api.ts` service layer (`searchHotels`) | `frontend-spec.md` §1.1 |
| T4 | `FlightPriceRequest` | `api.ts` (to add) | `api.ts` service layer (`getFlightPrice`) | `frontend-spec.md` §1.2 |
| T5 | `CalendarRequest` | `api.ts` (to add) | `api.ts` service layer (`getCalendarWeather`) | `frontend-spec.md` §1.2 |
| T6 | `CompareOptionInput` | `api.ts` (to add) | `ComparisonQueueContext` (queue → API conversion) | `frontend-spec.md` §1.2 |
| T7 | `WeatherSummaryInput` | `api.ts` (to add) | `CompareOptionInput.weather` field | `frontend-spec.md` §1.2 |
| T8 | `CompareRequest` | `api.ts` (to add) | `api.ts` service layer (`compareTrips`) | `frontend-spec.md` §1.2 |
| T9 | `ErrorResponse` | `api.ts` (to add) | `api.ts` service layer (`extractApiError`) | `frontend-spec.md` §1.2 |
| T10 | `DestinationResult` | `api.ts` (existing) | `DestinationAutocomplete`, `SearchSection` | `frontend-spec.md` §1.1 |
| T11 | `FlightPrice` | `api.ts` (existing) | `FlightPriceCard`, `DateOptionBuilderSection`, `DateDetailResults` | `frontend-spec.md` §1.1 |
| T12 | `HotelOption` | `api.ts` (existing) | `HotelSelectionCard`, `DateOptionBuilderSection`, `DateDetailResults` | `frontend-spec.md` §1.1 |
| T13 | `WeatherDay` | `api.ts` (existing) | `WeatherSummaryCard` (daily breakdown accordion) | `frontend-spec.md` §1.1 |
| T14 | `WeatherSummary` | `api.ts` (existing) | `WeatherSummaryCard`, `ComparisonQueueItem`, `TripOption` | `frontend-spec.md` §1.1 |
| T15 | `TripOption` | `api.ts` (existing) | `ComparisonResultsTable`, `ComparisonColumn`, `BestOptionBanner`, `ScoreSummaryCards` | `frontend-spec.md` §1.1 |
| T16 | `CompareResponse` | `api.ts` (existing) | `ComparisonSection`, `ComparisonResultsTable` | `frontend-spec.md` §1.1 |
| T17 | `CalendarDay` | `api.ts` (existing) | `CalendarDayCell`, `CalendarDateRangePicker` | `frontend-spec.md` §1.1 |
| T18 | `CalendarResponse` | `api.ts` (existing) | `CalendarDateRangePicker` (via `CalendarWeatherState`) | `frontend-spec.md` §1.1 |

### 4.2 Frontend-Only Types (from `frontend/src/types/frontend.ts`)

| # | Type | Components That Use It | Spec Reference |
|---|------|------------------------|----------------|
| F1 | `SectionId` | `SectionContainer`, `HomePage` | `frontend-spec.md` §1.3 |
| F2 | `LoadingState` | All `AsyncState<T>` consumers, `DateDetailResults`, `CalendarWeatherState`, `ComparisonResultState` | `frontend-spec.md` §1.3 |
| F3 | `WeatherLabel` | `CalendarDayCell`, `WeatherLegend`, `WeatherSummaryCard` | `frontend-spec.md` §1.3 |
| F4 | `TripTag` | `TagChip`, `ComparisonColumn` | `frontend-spec.md` §1.3 |
| F5 | `SelectedDestination` | `SearchSection`, `HomePage`, `CalendarDateRangePicker` | `frontend-spec.md` §1.3 |
| F6 | `SearchParams` | `SearchSection`, `HomePage`, `DateOptionBuilderSection` | `frontend-spec.md` §1.3 |
| F7 | `DateRange` | `HomePage`, `CalendarDateRangePicker`, `DateOptionBuilderSection` | `frontend-spec.md` §1.3 |
| F8 | `DateDetailResults` | `HomePage`, `DateOptionBuilderSection` | `frontend-spec.md` §1.3 |
| F9 | `CalendarWeatherState` | `HomePage`, `CalendarDateRangePicker` | `frontend-spec.md` §1.3 |
| F10 | `ComparisonQueueItem` | `ComparisonQueueContext`, `QueueItemCard`, `ComparisonQueuePanel`, `AddToQueueButton` | `frontend-spec.md` §1.3 |
| F11 | `ComparisonResultState` | `ComparisonQueueContext`, `ComparisonSection` | `frontend-spec.md` §1.3 |
| F12 | `ComparisonQueueContextValue` | `ComparisonQueueContext`, `useComparisonQueue` hook | `frontend-spec.md` §1.3 |
| F13 | `AsyncState<T>` | Hook return types, component state patterns | `frontend-spec.md` §1.3 |
| F14 | `SectionVisibility` | `SectionContainer` | `frontend-spec.md` §1.3 |

### 4.3 Constants (from `frontend/src/types/constants.ts`)

| # | Constant | Value | Used By | Spec Reference |
|---|----------|-------|---------|----------------|
| K1 | `MAX_QUEUE_SIZE` | `5` | `ComparisonQueueContext.addItem`, `AddToQueueButton`, `ComparisonQueuePanel` | `frontend-spec.md` §1.4 |
| K2 | `MIN_COMPARE_SIZE` | `2` | `CompareButton` (disabled state), `ComparisonQueueContext.compareTrips` | `frontend-spec.md` §1.4 |
| K3 | `MIN_SEARCH_QUERY_LENGTH` | `3` | `DestinationAutocomplete` (API call gate) | `frontend-spec.md` §1.4 |
| K4 | `SEARCH_DEBOUNCE_MS` | `300` | `DestinationAutocomplete` (debounce timer) | `frontend-spec.md` §1.4 |
| K5 | `CALENDAR_MONTH_RANGE` | `2` | `CalendarDateRangePicker` (month range for API call) | `frontend-spec.md` §1.4 |
| K6 | `MAX_HOTEL_RESULTS` | `5` | `HotelSelectionCard` (display constraint) | `frontend-spec.md` §1.4 |
| K7 | `API_BASE_URL` | `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"` | `api.ts` (Axios baseURL) | `frontend-spec.md` §1.4 |
| K8 | `WEATHER_LABEL_COLORS` | `Record<string, string>` | `CalendarDayCell`, `WeatherLegend`, `WeatherSummaryCard` | `frontend-spec.md` §1.4 |
| K9 | `RAIN_SIGNAL_COLORS` | `Record<string, string>` | `WeatherSummaryCard` | `frontend-spec.md` §1.4 |
| K10 | `TAG_COLORS` | `Record<string, "success" \| "info" \| "warning">` | `TagChip` | `frontend-spec.md` §1.4 |
| K11 | `TAG_LABELS` | `Record<string, string>` | `TagChip` | `frontend-spec.md` §1.4 |
| K12 | `CURRENCY_SYMBOL` | `"$"` | `FlightPriceCard`, `HotelSelectionCard`, `ComparisonColumn` | `frontend-spec.md` §1.4 |
| K13 | `CURRENCY_CODE` | `"USD"` | `FlightPriceCard` | `frontend-spec.md` §1.4 |

---

## 5. Checklist D: API Endpoint Contract Completeness

Every API endpoint consumed by the frontend MUST have all of the following specified:

1. HTTP method and URL
2. Request shape (params or body) with TypeScript type
3. Response shape with TypeScript type
4. Error response codes and shapes
5. Loading state handling (which component shows spinner)
6. Error display handling (which component shows error + retry)
7. Service layer function name in `src/lib/api.ts`

### 5.1 `GET /health`

| Aspect | Status | Detail | Spec Doc |
|--------|:------:|--------|----------|
| HTTP method & URL | ✅ | `GET /health` | `api-spec.yaml` |
| Request shape | ✅ | No parameters | `api-spec.yaml` |
| Response shape | ✅ | `{ status: "ok" }` | `api-spec.yaml` |
| Error codes | ✅ | N/A (health check) | `api-spec.yaml` |
| Loading state | ✅ | Not used by frontend UI | `frontend-spec-api-service-layer.md` |
| Error display | ✅ | Not used by frontend UI | `frontend-spec-api-service-layer.md` |
| Service function | ✅ | `checkHealth()` | `frontend-spec-api-service-layer.md` |

### 5.2 `GET /api/v1/search/destinations`

| Aspect | Status | Detail | Spec Doc |
|--------|:------:|--------|----------|
| HTTP method & URL | ✅ | `GET /api/v1/search/destinations?q={query}` | `api-spec.yaml`, `frontend-spec-api-service-layer.md` |
| Request shape | ✅ | Query param `q: string` (min 3 chars) | `api-spec.yaml` |
| Response shape | ✅ | `DestinationResult[]` | `api.ts`, `api-spec.yaml` |
| Error codes | ✅ | 400 (bad request), 500 (internal), 504 (timeout) | `api-spec.yaml` |
| Loading state | ✅ | `DestinationAutocomplete` shows `loading={true}` on MUI Autocomplete | `frontend-spec-destination-autocomplete.md` |
| Error display | ✅ | `DestinationAutocomplete` shows `fetchError` as red helperText | `frontend-spec-destination-autocomplete.md` |
| Service function | ✅ | `searchDestinations(query: string)` | `frontend-spec-api-service-layer.md` |

### 5.3 `POST /api/v1/flights/price`

| Aspect | Status | Detail | Spec Doc |
|--------|:------:|--------|----------|
| HTTP method & URL | ✅ | `POST /api/v1/flights/price` | `api-spec.yaml`, `frontend-spec-api-service-layer.md` |
| Request shape | ✅ | `FlightPriceRequest` (`origin`, `destination`, `departure_date`, `return_date`, `traveler_count?`) | `api.ts` (to add), `api-spec.yaml` |
| Response shape | ✅ | `FlightPrice` | `api.ts`, `api-spec.yaml` |
| Error codes | ✅ | 400, 404 (no flights), 500, 504 | `api-spec.yaml` |
| Loading state | ✅ | `FlightPriceCard` renders `LoadingIndicator` when `state === "loading"` | `frontend-spec-form-components.md` §8, `frontend-spec-ui-states.md` |
| Error display | ✅ | `FlightPriceCard` renders `InlineError` with retry callback `onRetryFlight` | `frontend-spec-form-components.md` §8, `frontend-spec-ui-states.md` |
| Service function | ✅ | `getFlightPrice(request: FlightPriceRequest)` | `frontend-spec-api-service-layer.md` |

### 5.4 `POST /api/v1/hotels/search`

| Aspect | Status | Detail | Spec Doc |
|--------|:------:|--------|----------|
| HTTP method & URL | ✅ | `POST /api/v1/hotels/search` | `api-spec.yaml`, `frontend-spec-api-service-layer.md` |
| Request shape | ✅ | `HotelSearchRequest` (`destination`, `latitude`, `longitude`, `checkin_date`, `checkout_date`, `traveler_count`) | `api.ts`, `api-spec.yaml` |
| Response shape | ✅ | `HotelOption[]` (max 5) | `api.ts`, `api-spec.yaml` |
| Error codes | ✅ | 400, 404 (no hotels), 500, 504 | `api-spec.yaml` |
| Loading state | ✅ | `HotelSelectionCard` renders `LoadingIndicator` when `state === "loading"` | `frontend-spec-hotel-section.md`, `frontend-spec-ui-states.md` |
| Error display | ✅ | `HotelSelectionCard` renders `InlineError` with retry callback `onRetryHotels` | `frontend-spec-hotel-section.md`, `frontend-spec-ui-states.md` |
| Service function | ✅ | `searchHotels(request: HotelSearchRequest)` | `frontend-spec-api-service-layer.md` |

### 5.5 `POST /api/v1/weather`

| Aspect | Status | Detail | Spec Doc |
|--------|:------:|--------|----------|
| HTTP method & URL | ✅ | `POST /api/v1/weather` | `api-spec.yaml`, `frontend-spec-api-service-layer.md` |
| Request shape | ✅ | `WeatherRequest` (`latitude`, `longitude`, `start_date`, `end_date`) | `api.ts`, `api-spec.yaml` |
| Response shape | ✅ | `WeatherSummary` (includes `daily: WeatherDay[]`) | `api.ts`, `api-spec.yaml` |
| Error codes | ✅ | 400, 500, 504 | `api-spec.yaml` |
| Loading state | ✅ | `WeatherSummaryCard` renders `LoadingIndicator` when `state === "loading"` | `frontend-spec-form-components.md` §10, `frontend-spec-ui-states.md` |
| Error display | ✅ | `WeatherSummaryCard` renders `InlineError` with retry callback `onRetryWeather` | `frontend-spec-form-components.md` §10, `frontend-spec-ui-states.md` |
| Service function | ✅ | `getWeather(request: WeatherRequest)` | `frontend-spec-api-service-layer.md` |

### 5.6 `POST /api/v1/calendar`

| Aspect | Status | Detail | Spec Doc |
|--------|:------:|--------|----------|
| HTTP method & URL | ✅ | `POST /api/v1/calendar` | `api-spec.yaml`, `frontend-spec-api-service-layer.md` |
| Request shape | ✅ | `CalendarRequest` (`destination`, `latitude`, `longitude`, `start_date`, `end_date`) | `api.ts` (to add), `api-spec.yaml` |
| Response shape | ✅ | `CalendarResponse` (`destination: string`, `days: CalendarDay[]`) | `api.ts`, `api-spec.yaml` |
| Error codes | ✅ | 400, 500, 504 | `api-spec.yaml` |
| Loading state | ✅ | `CalendarDateRangePicker` renders `LoadingIndicator` when `calendarWeather.state === "loading"` | `frontend-spec-calendar-section.md`, `frontend-spec-ui-states.md` |
| Error display | ✅ | `CalendarDateRangePicker` renders `InlineError` with retry callback | `frontend-spec-calendar-section.md`, `frontend-spec-ui-states.md` |
| Service function | ✅ | `getCalendarWeather(request: CalendarRequest)` | `frontend-spec-api-service-layer.md` |

### 5.7 `POST /api/v1/compare`

| Aspect | Status | Detail | Spec Doc |
|--------|:------:|--------|----------|
| HTTP method & URL | ✅ | `POST /api/v1/compare` | `api-spec.yaml`, `frontend-spec-api-service-layer.md` |
| Request shape | ✅ | `CompareRequest` (`options: CompareOptionInput[]`, 2–5 items) | `api.ts` (to add), `api-spec.yaml` |
| Response shape | ✅ | `CompareResponse` (`options: TripOption[]` sorted by `overall_score` desc, `best_option_index: number`) | `api.ts`, `api-spec.yaml` |
| Error codes | ✅ | 400, 422 (< 2 options), 500 | `api-spec.yaml` |
| Loading state | ✅ | `ComparisonSection` renders `ComparisonTableSkeleton` when `comparisonResult.state === "loading"` | `frontend-spec-compare-section.md`, `frontend-spec-ui-states.md` |
| Error display | ✅ | `ComparisonSection` renders `InlineError` with retry wired to `compareTrips()` | `frontend-spec-compare-section.md` §10.10 |
| Service function | ✅ | `compareTrips(request: CompareRequest)` | `frontend-spec-api-service-layer.md` |

---

## 6. Checklist E: Context & Hooks → Component Wiring

Every context provider and custom hook MUST be traceable to the components that consume it.

### 6.1 Context Provider

| Context | File | Consumers | Spec Doc |
|---------|------|-----------|----------|
| `ComparisonQueueProvider` | `src/context/ComparisonQueueContext.tsx` | `Header`, `ComparisonQueueFAB`, `DateOptionBuilderSection` (via `AddToQueueButton`), `ComparisonSection`, `CompareButton`, `ComparisonQueuePanel`, `HomePage` | `frontend-spec-context-provider.md`, `frontend-spec-hooks-and-context.md` §3 |

### 6.2 Custom Hooks

| Hook | File | Return Type | Used By Component(s) | Spec Doc |
|------|------|-------------|----------------------|----------|
| `useComparisonQueue` | `src/context/ComparisonQueueContext.tsx` | `ComparisonQueueContextValue` | `Header`, `ComparisonQueueFAB`, `AddToQueueButton`, `ComparisonSection`, `CompareButton`, `ComparisonQueuePanel`, `HomePage` | `frontend-spec-hooks-and-context.md` §4 |
| `useDestinationSearch` | `src/hooks/useDestinationSearch.ts` | `{ options, isLoading, fetchError, search }` | `DestinationAutocomplete` | `frontend-spec-hooks-and-context.md` §5 |
| `useCalendarWeather` | `src/hooks/useCalendarWeather.ts` | `CalendarWeatherState` + fetch trigger | `HomePage` (passes to `CalendarDateRangePicker`) | `frontend-spec-hooks-and-context.md` §6 |
| `useDateDetails` | `src/hooks/useDateDetails.ts` | `DateDetailResults` + fetch/retry triggers | `HomePage` (passes to `DateOptionBuilderSection`) | `frontend-spec-hooks-and-context.md` §7 |
| `useSearchParams` | `src/hooks/useSearchParams.ts` | `SearchParams` + setters | `HomePage` | `frontend-spec-hooks-and-context.md` §8 |
| `useDateRange` | `src/hooks/useDateRange.ts` | `DateRange \| null` + setter | `HomePage` | `frontend-spec-hooks-and-context.md` §9 |
| `useHotelSelection` | `src/hooks/useHotelSelection.ts` | `HotelOption \| null` + setter | `DateOptionBuilderSection` | `frontend-spec-hooks-and-context.md` §10 |
| `useAddToQueue` | `src/hooks/useAddToQueue.ts` | `{ addToQueue, canAdd, message }` | `AddToQueueButton` | `frontend-spec-hooks-and-context.md` §11 |
| `useDebounce` | `src/hooks/useDebounce.ts` | `T` (debounced value) | `DestinationAutocomplete` / `useDestinationSearch` | `frontend-spec-hooks-and-context.md` §12 |

---

## 7. Checklist F: Edge Case Coverage Matrix

Every identified edge case MUST have a defined handling behavior in the spec.

### 7.1 Comparison Queue Edge Cases

| # | Edge Case | Handling | Spec Doc |
|---|-----------|----------|----------|
| E1 | Queue full (5 items) — user clicks "Add to Queue" | `addItem` returns `false`; `AddToQueueButton` shows "Queue is full (5/5)" message, button disabled | `frontend-spec-queue-edge-cases.md`, `frontend-spec-component-signatures.md` §11 |
| E2 | Duplicate item (same destination + date range) | `addItem` returns `false`; snackbar/inline message "This date range is already in your queue" | `frontend-spec-queue-edge-cases.md`, `frontend-spec.md` §1.7 |
| E3 | Compare with < 2 items | `CompareButton` disabled; tooltip "Add at least 2 options to compare" | `frontend-spec-component-signatures.md` §13, `frontend-spec-queue-edge-cases.md` |
| E4 | Queue modified after comparison | `resetComparison()` called; clears results, user must re-compare | `frontend-spec-queue-edge-cases.md`, `frontend-spec-context-provider.md` |
| E5 | Queue cleared entirely | Comparison section hides (count drops to 0); results reset | `frontend-spec-queue-edge-cases.md` |

### 7.2 API Error Edge Cases

| # | Edge Case | Handling | Spec Doc |
|---|-----------|----------|----------|
| E6 | Destination search returns empty array | `DestinationAutocomplete` shows "No destinations found" in dropdown | `frontend-spec-destination-autocomplete.md`, `frontend-spec-empty-states.md` |
| E7 | Destination search API failure (500/504) | `DestinationAutocomplete` shows `fetchError` as red helperText | `frontend-spec-destination-autocomplete.md` |
| E8 | Flight API returns 404 (no flights) | `FlightPriceCard` renders `InlineError` with "No flights found" + retry button | `frontend-spec-ui-states.md`, `frontend-spec-form-components.md` |
| E9 | Hotel API returns 404 (no hotels) | `HotelSelectionCard` renders `InlineError` with "No hotels found" + retry button | `frontend-spec-hotel-section.md`, `frontend-spec-ui-states.md` |
| E10 | Weather API failure | `WeatherSummaryCard` renders `InlineError` with retry button | `frontend-spec-ui-states.md` |
| E11 | Calendar API failure | `CalendarDateRangePicker` renders `InlineError` with retry button | `frontend-spec-calendar-section.md`, `frontend-spec-ui-states.md` |
| E12 | Compare API returns 422 (< 2 options) | `ComparisonSection` renders `InlineError` with "At least 2 options required" | `frontend-spec-compare-section.md` §10 |
| E13 | Network timeout (any endpoint) | `extractApiError` returns `"Request timed out. Please try again."` → shown in `InlineError` | `frontend-spec-api-service-layer.md` §4 |
| E14 | Network offline (any endpoint) | `extractApiError` returns `"Network error. Check your connection."` → shown in `InlineError` | `frontend-spec-api-service-layer.md` §4 |

### 7.3 UI State Edge Cases

| # | Edge Case | Handling | Spec Doc |
|---|-----------|----------|----------|
| E15 | User changes destination after selecting dates | Cascade reset: calendar data, date range, date details all reset; downstream sections hide | `frontend-spec-progressive-reveal.md` §7 |
| E16 | User selects new date range while previous results loading | Previous API calls should be superseded; new calls replace in-progress ones | `frontend-spec-progressive-reveal.md` §10 |
| E17 | `HotelOption.distance` is null | Display "—" or omit distance | `frontend-spec-hotel-section.md` |
| E18 | `HotelOption.rating` is null | Display "—" or omit rating | `frontend-spec-hotel-section.md` |
| E19 | `DestinationResult.iata_code` is null | Destination cannot be used as flight destination; handled by origin airport or fallback | `frontend-spec.md` §1.1 |
| E20 | Page refresh | All state resets (no persistence); user starts from destination search | Constraint: "in-memory only, resets on refresh" |

---

## 8. Checklist G: File Path Consistency Audit

Verify that file paths referenced in the spec are consistent across all sub-specifications. Some spec documents use slightly different component names or paths — Ralph Loop should use the **canonical path** listed below.

### 8.1 Canonical File Paths

| Component | Canonical Path | Alternate Names in Specs | Resolve To |
|-----------|---------------|-------------------------|------------|
| `SearchSection` | `src/components/SearchSection.tsx` | `src/components/sections/SearchSection.tsx` | Use the path from `frontend-spec-component-signatures.md` §1 |
| `CalendarSection` / `CalendarDateRangePicker` | `src/components/CalendarDateRangePicker.tsx` | `src/components/sections/CalendarSection.tsx`, `CalendarSection` | Both names appear; implement as `CalendarSection.tsx` containing `CalendarDateRangePicker` logic |
| `DateOptionBuilderSection` | `src/components/DateOptionBuilderSection.tsx` | `src/components/sections/DateOptionBuilderSection.tsx` | Use the path from `frontend-spec-component-signatures.md` §1 |
| `ComparisonSection` | `src/components/ComparisonSection.tsx` | `src/components/sections/ComparisonSection.tsx`, `src/components/compare/ComparisonSection.tsx`, `src/components/comparison/ComparisonSection.tsx` | Multiple paths referenced; consolidate to one |
| `HotelSelectionCard` | `src/components/HotelSelectionCard.tsx` | `HotelSelectionList` | Same component, different names across docs |
| `ComparisonQueuePanel` | `src/components/ComparisonQueuePanel.tsx` | `ComparisonQueueList` | Same component, different names across docs |
| `ComparisonResultsTable` | `src/components/ComparisonResultsTable.tsx` | `ComparisonTable` | Same component, different names across docs |
| `BestOptionBanner` | `src/components/comparison/BestOptionBanner.tsx` | `WinnerBanner` | Same component, different names across docs |

### 8.2 Resolution Rule for Ralph Loop

When file paths or component names conflict across sub-specs:

1. **Prefer `frontend-spec-component-signatures.md`** for the definitive component name and path
2. **Prefer `frontend-spec-compare-section.md`** for comparison-specific components
3. **Prefer `frontend-spec-comparison-view.md`** for comparison result display components
4. If none of the above apply, use the path from the **most detailed** sub-spec for that component
5. Whichever name is chosen, ensure the same name is used consistently in all imports

### 8.3 Type Files

| File | Status | Purpose |
|------|:------:|---------|
| `frontend/src/types/api.ts` | Existing (extend) | API request/response types — add `FlightPriceRequest`, `CalendarRequest`, `CompareOptionInput`, `WeatherSummaryInput`, `CompareRequest`, `ErrorResponse` |
| `frontend/src/types/frontend.ts` | New file | Frontend-only types: `SectionId`, `LoadingState`, `SearchParams`, `DateRange`, etc. |
| `frontend/src/types/constants.ts` | New file | Constants: `MAX_QUEUE_SIZE`, `WEATHER_LABEL_COLORS`, etc. |
| `frontend/src/types/index.ts` | New file | Barrel re-export of all types and constants |

### 8.4 Non-Component Files

| File | Purpose | Spec Doc |
|------|---------|----------|
| `src/lib/api.ts` | Centralized API service layer (Axios) | `frontend-spec-api-service-layer.md` |
| `src/context/ComparisonQueueContext.tsx` | React Context + Provider + `useComparisonQueue` hook | `frontend-spec-context-provider.md`, `frontend-spec-hooks-and-context.md` §3–4 |
| `src/hooks/useDestinationSearch.ts` | Debounced destination search hook | `frontend-spec-hooks-and-context.md` §5 |
| `src/hooks/useCalendarWeather.ts` | Calendar weather fetch hook | `frontend-spec-hooks-and-context.md` §6 |
| `src/hooks/useDateDetails.ts` | Parallel flight/hotel/weather fetch hook | `frontend-spec-hooks-and-context.md` §7 |
| `src/hooks/useSearchParams.ts` | Search params state hook | `frontend-spec-hooks-and-context.md` §8 |
| `src/hooks/useDateRange.ts` | Date range state hook | `frontend-spec-hooks-and-context.md` §9 |
| `src/hooks/useHotelSelection.ts` | Hotel selection state hook | `frontend-spec-hooks-and-context.md` §10 |
| `src/hooks/useAddToQueue.ts` | Queue addition logic hook | `frontend-spec-hooks-and-context.md` §11 |
| `src/hooks/useDebounce.ts` | Generic debounce utility hook | `frontend-spec-hooks-and-context.md` §12 |
| `src/theme/ThemeRegistry.tsx` | MUI 7 ThemeProvider + Emotion cache | `frontend-spec.md` §2.4 |

---

*End of Cross-Reference Completeness Checklist*
