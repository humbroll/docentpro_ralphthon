# WhenToGo Frontend Specification — Glossary & Terminology

> **Purpose**: Defines every domain term, abbreviation, and project-specific concept used throughout the frontend specification. Ralph Loop MUST refer to this section whenever a term is unclear. No term used in any spec document should be undefined here.

---

## A. Product & Domain Terms

| Term | Definition |
|------|-----------|
| **WhenToGo** | The product name. A travel date optimization engine that helps users find the best travel dates by cross-analyzing flight prices, hotel rates, and historical weather data. |
| **Travel Window** | A contiguous date range (start_date to end_date) representing a potential trip. The user selects multiple travel windows to compare. |
| **Date Option** | A single fully-assembled trip configuration: one travel window + one selected hotel + associated flight price + weather data for a specific destination. Synonymous with "trip option" in UI copy. |
| **Comparison Queue** | An in-memory (React Context) collection of 1–5 date options the user has assembled. These are sent to the backend for scoring. Resets on page refresh. |
| **Progressive Reveal** | The UI pattern where sections of the single-page flow appear sequentially as the user completes each step. Sections are: Search → Calendar → Date Results → Comparison. Later sections are hidden until their prerequisites are met. |
| **Scoring Engine** | Backend-only logic (invoked via `POST /api/v1/compare`) that calculates cost_score, weather_score, and overall_score for each date option, then assigns auto-tags. The frontend never computes scores. |
| **Auto-Tags** | Labels automatically assigned by the scoring engine to date options after comparison. Exactly three possible values: `cheapest`, `best_weather`, `best_overall`. A single option can have multiple tags. |
| **Overall Score** | A 0–100 numeric score combining cost (70% weight) and weather (30% weight). Formula: `overall_score = 0.7 * cost_score + 0.3 * weather_score`. Computed backend-only. |
| **Cost Score** | A 0–100 numeric score derived from linear interpolation of a date option's total_trip_cost relative to the cheapest and most expensive options in the comparison set. Computed backend-only. |
| **Weather Score** | A 0–100 numeric score based on temperature proximity to 22°C and daily rainfall. Formula: `0.6 * temp_score + 0.4 * rain_score`. Computed backend-only but returned in weather API responses. |
| **Rain Signal** | A categorical indicator of average daily rainfall for a travel window: `"low"` (<2mm/day), `"medium"` (2–5mm/day), `"high"` (>5mm/day). |
| **Weather Label** | A human-readable quality label derived from weather_score: `"Great"` (>=80), `"Good"` (>=60), `"Fair"` (>=40), `"Poor"` (<40). |
| **Traveler Count** | The number of people traveling. Used to calculate total flight cost (`flight_price * traveler_count`) and hotel room count (`ceil(traveler_count / 2)`). Entered by the user; minimum value is 1. |
| **Total Trip Cost** | The all-in cost for a date option: `flight_price * traveler_count + hotel_price`. Calculated by the backend scoring engine. |
| **Cost Per Person** | `total_trip_cost / traveler_count`. Calculated by the backend scoring engine. |
| **Calendar Weather Overlay** | A 2-month calendar view where each day cell displays historical weather data (temp high/low, rainfall, weather label) fetched via `POST /api/v1/calendar`. Helps the user visually identify good travel windows before selecting dates. |
| **Historical Weather** | Weather data from the previous year for the same date range. For example, requesting weather for 2026-05-01 to 2026-05-05 returns actual recorded data from 2025-05-01 to 2025-05-05. Used as a proxy for expected conditions. |
| **Group Cost Calculator** | The feature within the comparison view that shows total group costs and per-person costs based on traveler_count. Not a separate screen — it is embedded in the comparison table. |

## B. Technical & Architectural Terms

| Term | Definition |
|------|-----------|
| **Ralph Loop** | The autonomous implementation agent that will consume this specification and build the frontend without human clarification. All spec documents are written for Ralph Loop as the reader. |
| **App Router** | Next.js routing system (introduced in Next.js 13+) using the `app/` directory with file-based routing, layouts, and server/client component separation. WhenToGo uses a single route at `/`. |
| **Server Component** | A React component that renders on the server by default in Next.js App Router. Does not have access to browser APIs, hooks, or event handlers. Used for the root layout and static page shell. |
| **Client Component** | A React component marked with `"use client"` directive at the top of the file. Has access to React hooks, browser APIs, and event handlers. All interactive WhenToGo components are client components. |
| **Progressive Section Reveal** | Implementation pattern where later UI sections are conditionally rendered (not just hidden via CSS) based on the completion state of earlier sections. Uses conditional rendering (`{condition && <Component />}`), not CSS `display: none`. |
| **React Context** | React's built-in state management via `createContext` / `useContext`. Used in WhenToGo for the comparison queue state. Located at `src/context/ComparisonContext.tsx`. |
| **Centralized API Service Layer** | A single file at `src/lib/api.ts` containing all Axios HTTP call functions. Components never call Axios directly — they import functions from this module. |
| **MUI 7** | Material UI version 7, the component library used for all UI elements (buttons, text fields, cards, tables, autocomplete, date pickers, etc.). Used with default theme — no custom theme overrides. |
| **Emotion** | The CSS-in-JS library used by MUI 7 as its styling engine. Also available for custom `sx` prop styles and `styled()` components. |
| **dayjs** | Lightweight date manipulation library used for all date formatting, parsing, and arithmetic. Replaces Moment.js. ISO format `"YYYY-MM-DD"` is the canonical date string format. |
| **Axios** | HTTP client library used exclusively through the centralized API service layer (`src/lib/api.ts`). Configured with a base URL pointing to the backend. |
| **TypeScript Strict Mode** | TypeScript compiler option (`"strict": true` in tsconfig.json) that enables all strict type-checking flags: `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, etc. All code must pass strict checks. |
| **IATA Code** | A 3-letter airport/city code assigned by the International Air Transport Association. Examples: `"ICN"` (Seoul Incheon), `"NRT"` (Tokyo Narita), `"TYO"` (Tokyo metro area). Used for flight search origin/destination. |
| **ISO 8601 Date** | The date string format `"YYYY-MM-DD"` (e.g., `"2026-05-01"`). All dates in the API contract and frontend state use this format. dayjs parses and formats this natively. |

## C. API Endpoints (Quick Reference)

| Short Name | Method & Path | Purpose |
|-----------|--------------|---------|
| **Health** | `GET /health` | Backend health check; not used by frontend UI |
| **Destination Search** | `GET /api/v1/search/destinations?q={query}` | Autocomplete for destination city search. Returns `DestinationResult[]`. Minimum 3-character query. |
| **Flight Price** | `POST /api/v1/flights/price` | Returns lowest economy round-trip price per person for a route and date. Returns `FlightPrice`. |
| **Hotel Search** | `POST /api/v1/hotels/search` | Returns top 5 hotels sorted by total_price ascending. Returns `HotelOption[]`. |
| **Weather** | `POST /api/v1/weather` | Returns historical weather summary and daily breakdown for a date range. Returns `WeatherSummary`. |
| **Calendar Weather** | `POST /api/v1/calendar` | Returns daily weather data for a 2-month range for calendar overlay. Returns `CalendarResponse`. |
| **Compare** | `POST /api/v1/compare` | Scores and ranks 2–5 trip options. Returns `CompareResponse` with scored `TripOption[]` and `best_option_index`. |

## D. TypeScript Type Names (Quick Reference)

These types are defined in `frontend/src/types/api.ts` and must be imported — never redefined.

| Type Name | Category | Description |
|----------|---------|-------------|
| `SearchRequest` | Request | User search parameters: destination, origin_airport, start_date, end_date, traveler_count |
| `WeatherRequest` | Request | Lat/lon + date range for weather lookup |
| `HotelSearchRequest` | Request | Destination info + check-in/out dates + traveler_count for hotel search |
| `DestinationResult` | Response | A single city result: name, lat/lon, country, iata_code (nullable) |
| `FlightPrice` | Response | Round-trip flight price details: origin, destination, dates, price, currency |
| `HotelOption` | Response | A single hotel: hotel_id, hotel_name, distance (nullable), total_price, rating (nullable) |
| `WeatherDay` | Response | Single day weather: date, temp_high, temp_low, rain_mm, description |
| `WeatherSummary` | Response | Weather aggregate: average_temp, rain_signal, weather_score, label, daily[] |
| `TripOption` | Response | A fully scored date option returned from compare endpoint (includes total_trip_cost, cost_per_person, overall_score, tags) |
| `CompareResponse` | Response | Compare result: options[] (sorted by overall_score desc) + best_option_index |
| `CalendarDay` | Response | Single calendar day: date, temp_high/low (nullable), rain_mm (nullable), weather_label (nullable) |
| `CalendarResponse` | Response | Calendar data: destination + days[] |

Frontend-only types are defined in `frontend/src/types/frontend.ts` (see spec section 1.2).

## E. UI Section Names

The single-page flow consists of these sections, revealed progressively:

| Section Name | Trigger to Show | Description |
|-------------|----------------|-------------|
| **Search Section** | Always visible | Destination autocomplete, origin airport input, traveler count input |
| **Calendar Section** | Destination selected | 2-month weather-overlay calendar for date range selection |
| **Date Results Section** | Date range selected on calendar | Displays flight price, hotel options (select one), and weather summary for the selected dates. Contains "Add to Queue" button. |
| **Comparison Section** | Queue has >= 2 options and user clicks "Compare" | Side-by-side comparison table with scored results, auto-tags, and best-option highlighting |

## F. State & Data Flow Terms

| Term | Definition |
|------|-----------|
| **Queue Item** | A single entry in the comparison queue. Contains all data needed to send to the compare endpoint: destination, dates, flight_price, hotel_name, hotel_price, weather summary, and traveler_count. Represented by `QueueItem` type in `frontend/src/types/frontend.ts`. |
| **Queue Full** | The comparison queue has reached its maximum capacity of 5 items. The "Add to Queue" button is disabled when the queue is full. |
| **Queue Key** | A unique string identifier for each queue item, computed as `"${destination}-${start_date}-${end_date}-${hotel_name}"`. Used to prevent duplicate entries. |
| **Duplicate Detection** | Before adding a queue item, the frontend checks if an item with the same queue key already exists. If so, the add is rejected and an inline error message is shown. |
| **Section State** | The combination of loading, error, and data states for each progressive section. Each section independently tracks: `idle`, `loading`, `success`, `error`. |

## G. Error Handling Terms

| Term | Definition |
|------|-----------|
| **Inline Error** | An error message displayed directly within the section where the error occurred (e.g., below the search field, inside the calendar area). No toast notifications, no modal dialogs. |
| **Retry Button** | A button displayed alongside an inline error that re-invokes the failed API call with the same parameters. Every inline error includes a retry button. |
| **ErrorResponse** | The standard backend error shape: `{ error: string, message: string }`. The `message` field is displayed to the user in inline errors. |
| **Gateway Timeout (504)** | Returned when an external API (Amadeus, LiteAPI, Open-Meteo) takes longer than 10 seconds. Display message: the `message` field from the ErrorResponse body. |
| **Not Found (404)** | Returned when no flights or hotels match the search criteria. Display message: the `message` field from the ErrorResponse body. |
| **Validation Error (400/422)** | Returned when request parameters are invalid. Display message: the `message` field from the ErrorResponse body. |

## H. Abbreviations

| Abbreviation | Full Form |
|-------------|----------|
| **API** | Application Programming Interface |
| **IATA** | International Air Transport Association |
| **ISO** | International Organization for Standardization |
| **MUI** | Material UI (React component library) |
| **MVP** | Minimum Viable Product |
| **SPA** | Single-Page Application |
| **USD** | United States Dollar (the only currency used in WhenToGo) |
| **UI** | User Interface |
| **UX** | User Experience |
| **SSR** | Server-Side Rendering |
| **CSR** | Client-Side Rendering |

## I. File Path Conventions

| Path | Purpose |
|------|---------|
| `frontend/src/app/page.tsx` | Root page component — the single-page entry point |
| `frontend/src/app/layout.tsx` | Root layout with MUI theme provider setup |
| `frontend/src/types/api.ts` | Existing API type definitions (DO NOT MODIFY) |
| `frontend/src/types/frontend.ts` | Frontend-only types (QueueItem, component props, section states) |
| `frontend/src/types/constants.ts` | Shared constants and union types |
| `frontend/src/lib/api.ts` | Centralized Axios API service layer |
| `frontend/src/context/ComparisonContext.tsx` | React Context provider for comparison queue state |
| `frontend/src/components/` | All UI components, organized by section |

## J. Scoring Formula Reference

Included here for quick reference when rendering score-related UI:

```
Weather Score (0–100):
  temp_score = max(0, 100 - |avg_temp - 22| * 5)
  rain_score = max(0, 100 - daily_rain_mm * 10)
  weather_score = 0.6 * temp_score + 0.4 * rain_score

Cost Score (0–100):
  cost_score = 100 * (max_cost - this_cost) / (max_cost - min_cost)
  (If only 1 option: cost_score = 100)

Overall Score (0–100):
  overall_score = 0.7 * cost_score + 0.3 * weather_score

Hotel Room Calculation:
  rooms_needed = ceil(traveler_count / 2)

Total Trip Cost:
  total_trip_cost = flight_price * traveler_count + hotel_price

Cost Per Person:
  cost_per_person = total_trip_cost / traveler_count
```

> **Important**: The frontend NEVER computes these scores. They are computed backend-only via `POST /api/v1/compare`. The frontend only displays the returned values. The formulas are documented here solely for understanding what the displayed numbers mean.

## K. Tag Display Mapping

| Backend Tag Value | Display Label | Suggested Color (MUI Chip) |
|------------------|--------------|---------------------------|
| `"cheapest"` | "Cheapest" | `color="success"` (green) |
| `"best_weather"` | "Best Weather" | `color="info"` (blue) |
| `"best_overall"` | "Best Overall" | `color="warning"` (amber/gold) |
