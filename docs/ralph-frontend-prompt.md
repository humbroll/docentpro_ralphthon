# Ralph Prompt — WhenToGo Frontend Implementation

You are implementing the entire frontend for **WhenToGo**, a travel date optimization engine. Your job is to go from the current empty Next.js scaffold to a fully working single-page application — all sections rendering, all API calls wired, all states handled. No human intervention needed. Read every section of this prompt carefully before writing any code.

---

## 0. Branch & Continuation Protocol

### Branch Setup (FIRST THING)
```bash
git checkout -b feat/frontend 2>/dev/null || git checkout feat/frontend
```
Work on `feat/frontend` branch ONLY. Never push to `main` directly — a backend engineer is working on `feat/backend` in parallel.

### Continuation Protocol
**If `frontend/PROGRESS.md` exists, this is a continuation session.**

1. Read `frontend/PROGRESS.md` first
2. Read `git log --oneline -10` to see recent changes
3. Do NOT redo completed work
4. Continue from where the previous session left off
5. Skip to the next incomplete step

**If `frontend/PROGRESS.md` does not exist, this is a fresh start.** Proceed from Step 1.

### Progress Tracking
After completing each step, append to `frontend/PROGRESS.md`:
```markdown
## Step N — [Step Name] — [COMPLETED/IN PROGRESS/BLOCKED]
**Files created/modified**: list of files
**Decisions made**: any non-obvious choices
**Issues encountered**: problems and how you solved them
**Next**: Step N+1
```

---

## 1. Project Context

### What This Product Does
WhenToGo helps users find optimal travel dates by comparing flight prices, hotel prices, and historical weather across date ranges. Users select a destination, pick multiple date windows, and compare them side-by-side. A scoring engine ranks options automatically.

### Who Else Is Working
A **backend engineer** is building the FastAPI backend in parallel, using the frozen API contract. The backend may not be fully ready — use mock data when endpoints return errors, but wire real API calls so they work when the backend is up.

### Current State
The frontend scaffold exists but has **zero implementation** beyond the default Next.js page:
- `frontend/src/app/layout.tsx` — Root layout with Geist fonts
- `frontend/src/app/page.tsx` — Default Next.js placeholder (replace entirely)
- `frontend/src/types/api.ts` — TypeScript types mirroring the API contract (FROZEN)
- `frontend/package.json` — All dependencies already installed

---

## 2. Tech Stack (Already Installed)

| Package | Version | Role |
|---------|---------|------|
| `next` | 16.2.1 | App Router framework |
| `react` | 19.2.4 | UI library |
| `@mui/material` | ^7.3.9 | Component library |
| `@mui/icons-material` | ^7.3.9 | Icons |
| `@emotion/react` | ^11.14.0 | CSS-in-JS for MUI |
| `@emotion/styled` | ^11.14.1 | Styled components |
| `axios` | ^1.14.0 | HTTP client |
| `dayjs` | ^1.11.20 | Date handling |

**Do NOT add new dependencies.** Everything you need is installed.

> **IMPORTANT**: This is Next.js 16, not the version you know. Read `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices. APIs, conventions, and file structure may differ from your training data.

For full environment setup details: → **`docs/frontend/frontend-spec-tech-stack.md`**

---

## 3. Source of Truth

### API Contract (DO NOT DEVIATE)
- **OpenAPI Spec**: `docs/api-spec.yaml` — all endpoints, schemas, error responses, scoring formulas
- **TypeScript Types**: `frontend/src/types/api.ts` — request/response models. FROZEN. Use as-is.

### Frontend Specification (Your Implementation Guide)
The spec is split into focused documents. **Read them in this order:**

| Order | File | What It Covers |
|-------|------|----------------|
| 1 | `docs/frontend/frontend-spec-tech-stack.md` | Environment, config, directory structure, bootstrap |
| 2 | `docs/frontend/frontend-spec.md` | Shared types (§1) + layout component signatures (§2) |
| 3 | `docs/frontend/frontend-spec-progressive-reveal.md` | Section visibility rules, state machine, cascading resets |
| 4 | `docs/frontend/frontend-spec-component-hierarchy.md` | Full component tree, props, lock/unlock states |
| 5 | `docs/frontend/frontend-spec-api-service-layer.md` | Centralized API layer — **copy-ready implementation** |
| 6 | `docs/frontend/frontend-spec-context-provider.md` | ComparisonQueueContext — shape, state, callbacks |
| 7 | `docs/frontend/frontend-spec-hooks-and-context.md` | Custom hooks: useComparisonQueue, useDestinationSearch, etc. |
| 8 | `docs/frontend/frontend-spec-search-section.md` | Search section layout and grid |
| 9 | `docs/frontend/frontend-spec-destination-autocomplete.md` | Autocomplete: debounce, MUI config, all UI states |
| 10 | `docs/frontend/frontend-spec-calendar-section.md` | 2-month weather calendar, sub-components, date selection |
| 11 | `docs/frontend/frontend-spec-weather-calendar-indicators.md` | Calendar day cell: temp/rain indicators, color coding |
| 12 | `docs/frontend/frontend-spec-hotel-section.md` | Hotel selection card, layout, sorting |
| 13 | `docs/frontend/frontend-spec-form-components.md` | All form components with full JSX skeletons |
| 14 | `docs/frontend/frontend-spec-display-components.md` | Display components: ScoreCard, FlightPriceCard, etc. |
| 15 | `docs/frontend/frontend-spec-comparison-queue.md` | Queue data model, operations, add/remove flows |
| 16 | `docs/frontend/frontend-spec-comparison-view.md` | Comparison table, columns, data flow |
| 17 | `docs/frontend/frontend-spec-compare-section.md` | Full compare section: table, charts, winner banner |
| 18 | `docs/frontend/frontend-spec-ui-states.md` | Loading/error/empty/success states per view |
| 19 | `docs/frontend/frontend-spec-empty-states.md` | Empty state components for all views |
| 20 | `docs/frontend/frontend-spec-section-reveal-ux.md` | Animations, scroll behavior, skeletons |
| 21 | `docs/frontend/frontend-spec-queue-edge-cases.md` | Edge cases: full queue, duplicates, min items |
| 22 | `docs/frontend/frontend-spec-error-edge-cases.md` | Error edge cases: timeouts, failures, retries |
| 23 | `docs/frontend/frontend-spec-component-signatures.md` | All component props interfaces (quick reference) |
| 24 | `docs/frontend/frontend-spec-cross-reference-checklist.md` | Completeness checklist — verify before declaring done |
| 25 | `docs/frontend/frontend-spec-glossary.md` | Term definitions |

### Mock Fallback Strategy
The backend may not be running. When API calls fail (connection refused, 500, timeout):
1. **Wire real API calls first** — always attempt the real endpoint
2. **Show error state with retry button** on failure — do NOT silently fall back to mock data
3. **For development/visual testing**: create `frontend/src/lib/mock.ts` with hardcoded example data from `docs/api-spec.yaml` response examples. Use it ONLY in components for initial visual verification, then switch to real API calls.

### If You Need to Change the Spec
**STOP and report to the user.** The backend team depends on the API contract.

---

## 4. Architecture Overview

### Single-Page Progressive Reveal
One route (`/`). Sections unlock as the user completes each step:

```
SearchSection → CalendarSection → DateOptionBuilderSection → ComparisonSection
  (always)        (after dest       (after date range         (after ≥2 items
                   selected)         selected)                 in queue)
```

→ Full state machine and visibility rules: **`docs/frontend/frontend-spec-progressive-reveal.md`**

### State Management
- **Comparison queue**: React Context (in-memory, resets on refresh). Max 5 items.
- **API state**: Per-component via custom hooks returning `{ data, loading, error }`
- **Section reveal**: Derived from user progress (no explicit state needed beyond data presence)

→ Context shape and hooks: **`docs/frontend/frontend-spec-context-provider.md`** + **`docs/frontend/frontend-spec-hooks-and-context.md`**

### API Integration
Centralized service layer at `frontend/src/lib/api.ts`. Axios instance with:
- Base URL: `http://localhost:8000`
- 10s timeout
- Shared error extraction
- Typed methods for all 7 endpoints

→ Copy-ready implementation: **`docs/frontend/frontend-spec-api-service-layer.md`**

---

## 5. Implementation Order

Build in this sequence. Each step should result in something visible.

### Step 1: Foundation
1. Set up MUI theme provider in layout → `docs/frontend/frontend-spec-tech-stack.md` §0.4
2. Create directory structure → `docs/frontend/frontend-spec-tech-stack.md` §0.5
3. Add new types to `frontend/src/types/` → `docs/frontend/frontend-spec.md` §1.2–1.5
4. Implement API service layer → `docs/frontend/frontend-spec-api-service-layer.md` §6 (copy-ready)
5. Implement ComparisonQueueContext → `docs/frontend/frontend-spec-context-provider.md`

### Step 2: Search Section
1. Build SearchSection container → `docs/frontend/frontend-spec-search-section.md`
2. Build DestinationAutocomplete → `docs/frontend/frontend-spec-destination-autocomplete.md`
3. Build OriginAirportInput, TravelerCountInput → `docs/frontend/frontend-spec-form-components.md` §4–5
4. Wire to API: destination search with debounce

### Step 3: Calendar Section
1. Build CalendarSection → `docs/frontend/frontend-spec-calendar-section.md`
2. Build CalendarDayCell with weather indicators → `docs/frontend/frontend-spec-weather-calendar-indicators.md`
3. Implement date range selection → `docs/frontend/frontend-spec-calendar-section.md` §5
4. Wire to API: calendar weather data

### Step 4: Date Option Builder
1. Build DateOptionBuilderSection → `docs/frontend/frontend-spec-form-components.md` §7
2. Build HotelSelectionCard → `docs/frontend/frontend-spec-hotel-section.md`
3. Build FlightPriceCard, WeatherSummaryCard → `docs/frontend/frontend-spec-display-components.md`
4. Wire to API: flight price, hotel search, weather
5. Implement "Add to Queue" flow → `docs/frontend/frontend-spec-comparison-queue.md` §6

### Step 5: Comparison Section
1. Build ComparisonSection → `docs/frontend/frontend-spec-compare-section.md`
2. Build ComparisonTable → `docs/frontend/frontend-spec-comparison-view.md` §6
3. Build score cards and winner banner → `docs/frontend/frontend-spec-compare-section.md` §4–7
4. Wire to API: POST /api/v1/compare
5. Implement auto-tags display (cheapest, best_weather, best_overall)

### Step 6: Progressive Reveal + Polish
1. Implement SectionContainer with fade-in → `docs/frontend/frontend-spec-section-reveal-ux.md`
2. Wire visibility rules → `docs/frontend/frontend-spec-progressive-reveal.md` §4
3. Add all empty states → `docs/frontend/frontend-spec-empty-states.md`
4. Add all error states with retry buttons → `docs/frontend/frontend-spec-ui-states.md`
5. Handle edge cases → `docs/frontend/frontend-spec-queue-edge-cases.md`

### Step 7: Verify
Run the cross-reference checklist → `docs/frontend/frontend-spec-cross-reference-checklist.md`

---

## 6. Key Patterns

### Error Handling
All API errors display inline with a retry button. No toasts, no auto-retry.
```typescript
// Pattern used everywhere:
{error && <InlineError message={error} onRetry={refetch} />}
```
→ Details: **`docs/frontend/frontend-spec-ui-states.md`** + **`docs/frontend/frontend-spec-error-edge-cases.md`**

### Comparison Queue
```typescript
// Add to queue (max 5, check duplicates first):
const { addOption, removeOption, options, isFull } = useComparisonQueue();
```
→ Full API: **`docs/frontend/frontend-spec-context-provider.md`** §4

### Progressive Reveal
```typescript
// Section visibility is derived, not stored:
const showCalendar = selectedDestination !== null;
const showBuilder = startDate !== null && endDate !== null;
const showComparison = options.length >= 2;
```
→ Full rules: **`docs/frontend/frontend-spec-progressive-reveal.md`** §4

---

## 7. Files Reference

| File | Role |
|------|------|
| `docs/api-spec.yaml` | API contract (OpenAPI 3.1) — DO NOT MODIFY |
| `frontend/src/types/api.ts` | TypeScript API types — DO NOT MODIFY |
| `frontend/src/app/page.tsx` | REPLACE with HomePage component |
| `frontend/src/app/layout.tsx` | UPDATE with MUI ThemeProvider |
| `frontend/src/lib/api.ts` | CREATE — centralized API service |
| `frontend/src/contexts/` | CREATE — ComparisonQueueContext |
| `frontend/src/hooks/` | CREATE — custom hooks |
| `frontend/src/components/` | CREATE — all UI components |
| `frontend/src/types/frontend.ts` | CREATE — frontend-only types |
| `frontend/src/types/constants.ts` | CREATE — shared constants |
| `frontend/src/lib/mock.ts` | CREATE — mock data from spec examples |
| `frontend/PROGRESS.md` | CREATE & UPDATE — progress tracking |
| `docker-compose.yml` | Docker config | **DO NOT MODIFY** |
| `CLAUDE.md` | Project guide | **DO NOT MODIFY** |
| `backend/` | Backend code | **DO NOT TOUCH** |

---

## 8. Reminders

1. **Run the dev server**: `cd frontend && npm run dev` — runs at `http://localhost:3000`
2. **Do not modify frozen files** (`api.ts`, `api-spec.yaml`) without reporting
2. **Read Next.js 16 docs** in `node_modules/next/dist/docs/` — APIs have changed
3. **Desktop-first** — no mobile/tablet-specific layouts needed
4. **Default MUI theme** — no custom colors or typography
5. **English-only** — no i18n
6. **No auth, no payments, no booking** — out of scope
7. **Scoring is backend-only** — frontend sends options to POST /api/v1/compare
8. **All `'use client'`** — every component with state, effects, or event handlers needs the directive
9. **Import API types** from `@/types/api` — never redefine them
10. **Read the spec file** for each component before implementing — the specs contain copy-ready JSX skeletons
11. When done, run the **cross-reference checklist** (`docs/frontend/frontend-spec-cross-reference-checklist.md`)
12. **When ALL checklist items are true**, output `COMPLETE` as your final message. This signals the Ralph loop to stop.
