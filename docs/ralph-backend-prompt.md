# Ralph Prompt — WhenToGo Backend Implementation

You are implementing the entire backend for **WhenToGo**, a travel date optimization engine. Your job is to go from the current empty scaffold to a fully working API — all endpoints responding with real data from real external APIs. No human intervention needed. Read every section of this prompt carefully before writing any code.

---

## 0. Branch & Continuation Protocol

### Branch Setup (FIRST THING)
```bash
git checkout -b feat/backend 2>/dev/null || git checkout feat/backend
```
Work on `feat/backend` branch ONLY. Never push to `main` directly — a frontend engineer is working on `feat/frontend` in parallel.

### Continuation Protocol
**If `backend/PROGRESS.md` exists, this is a continuation session.**

1. Read `PROGRESS.md` first
2. Read `git log --oneline -10` to see recent changes
3. Do NOT redo completed work
4. Continue from where the previous session left off
5. Skip to the next incomplete phase

**If `backend/PROGRESS.md` does not exist, this is a fresh start.** Proceed from Phase 1.

---

## 1. Project Context

### What This Product Does
WhenToGo helps users find the optimal travel dates by comparing flight prices, hotel prices, and historical weather across date ranges. Users select a destination, pick multiple date windows, and compare them side-by-side. A scoring engine ranks options automatically.

### Who Else Is Working
A **frontend engineer** is building the Next.js frontend in parallel, using the frozen API contract. Any changes to the API contract **must be reported to the user** — do not silently change schemas or endpoints.

### Tech Stack
- **Framework**: FastAPI (Python 3.11)
- **Models**: Pydantic v2
- **HTTP Client**: httpx (for external API calls)
- **External APIs**: Amadeus (flights + city search), LiteAPI (hotels), Open-Meteo (weather, free)
- **Packages already installed**: `amadeus`, `geopy`, `airportsdata`, `httpx`, `python-dotenv`
- **Infrastructure**: Docker Compose (backend runs at `http://localhost:8000`)

### Current State
The backend scaffold exists but has **zero implementation** beyond a health check:
- `backend/app/main.py` — FastAPI app with CORS, only `/health` endpoint
- `backend/app/core/config.py` — Settings with API keys loaded from `.env`
- `backend/app/api/v1/schemas.py` — All Pydantic request/response models (FROZEN)
- `backend/app/api/v1/endpoints/` — Empty
- `backend/app/services/` — Empty

---

## 2. Source of Truth

### API Contract (DO NOT DEVIATE)
- **OpenAPI Spec**: `docs/api-spec.yaml` — the complete API contract with all endpoints, schemas, error responses, and scoring formulas
- **Pydantic Models**: `backend/app/api/v1/schemas.py` — request/response models. These are FROZEN. Use them as-is.
- **Config**: `backend/app/core/config.py` — API keys are loaded here

### If You Need to Change the Spec
**STOP and report to the user.** Explain:
1. What you need to change
2. Why the current spec doesn't work
3. Your proposed change

Do NOT modify `schemas.py` or `api-spec.yaml` without explicit approval. The frontend team depends on these.

---

## 3. Phased Execution Plan

**IMPORTANT**: Do NOT implement everything at once. Follow this phase order. Complete each phase fully before moving to the next. After each phase, verify the server starts and update `backend/PROGRESS.md`.

### Phase 1: Service Layer (External API Clients)

Implement service modules that wrap external APIs. **Before implementing each service, call the real API once with test data to verify the response structure matches your expectations. If it differs, log the actual structure in PROGRESS.md and adapt your mapping code.**

Create these files:
- `backend/app/services/amadeus_service.py` — City search + Flight price
- `backend/app/services/liteapi_service.py` — Hotel search
- `backend/app/services/weather_service.py` — Open-Meteo historical weather
- `backend/app/services/scoring_service.py` — Weather score + Cost score + Overall score

After completing Phase 1:
- Verify: `docker compose up -d && docker compose logs backend` shows no import errors
- Update `backend/PROGRESS.md`

### Phase 2: Endpoint Layer (Route Handlers)

Create endpoint files that call services and return Pydantic models:
- `backend/app/api/v1/endpoints/search.py`
- `backend/app/api/v1/endpoints/flights.py`
- `backend/app/api/v1/endpoints/hotels.py`
- `backend/app/api/v1/endpoints/weather.py`
- `backend/app/api/v1/endpoints/calendar.py`
- `backend/app/api/v1/endpoints/compare.py`

Each file defines its own `router = APIRouter()`.

After completing Phase 2:
- Verify: no import errors in logs
- Update `backend/PROGRESS.md`

### Phase 3: Router Integration

Register all routers in `backend/app/main.py`:

```python
from app.api.v1.endpoints import (
    search, flights, hotels, weather, calendar, compare,
)

app.include_router(search.router, prefix="/api/v1")
app.include_router(flights.router, prefix="/api/v1")
app.include_router(hotels.router, prefix="/api/v1")
app.include_router(weather.router, prefix="/api/v1")
app.include_router(compare.router, prefix="/api/v1")
app.include_router(calendar.router, prefix="/api/v1")
```

After completing Phase 3:
- Verify: `http://localhost:8000/docs` shows all endpoints in Swagger UI
- Update `backend/PROGRESS.md`

### Phase 4: Self-Verification

Read `docs/api-spec.yaml`, derive curl test commands from the spec's example payloads, and test every endpoint. Fix any failures. Update `backend/PROGRESS.md` with results.

---

## 4. Implementation Guide

### Read the spec first
`docs/api-spec.yaml` contains **everything** you need: all endpoints, request/response schemas, error formats, scoring formulas, and example payloads. Read it thoroughly before writing any code.

### External API SDK Usage

**Amadeus** (flights + city search):
```python
from amadeus import Client, ResponseError

amadeus = Client(
    client_id=settings.AMADEUS_API_KEY,
    client_secret=settings.AMADEUS_API_SECRET,
    hostname='test',  # REQUIRED — using Amadeus test environment
)
# City Search:
amadeus.reference_data.locations.get(keyword=query, subType=["CITY"])
# Flight Search:
amadeus.shopping.flight_offers_search.get(
    originLocationCode=..., destinationLocationCode=...,
    departureDate=..., returnDate=...,
    adults=traveler_count, travelClass="ECONOMY", max=1,
)
# SDK handles OAuth token refresh automatically
```

**LiteAPI** (hotels) — uses `httpx`, TWO separate API keys:
```python
# settings.LITEAPI_API_KEY_SEARCH — for GET /data/hotels
# settings.LITEAPI_API_KEY_RATES  — for POST /hotels/min-rates
# Auth header: "X-API-Key"
# Base URL: https://api.liteapi.travel/v3.0
# Refer to https://docs.liteapi.travel/ for exact endpoints and params
```

**Open-Meteo** (weather) — free, no auth, uses `httpx`:
```python
# Base URL: https://archive-api.open-meteo.com/v1/archive
# Params: latitude, longitude, start_date, end_date,
#   daily=temperature_2m_max,temperature_2m_min,rain_sum, timezone=auto
# CRITICAL: fetch PREVIOUS YEAR's data for the requested dates
```

### Service Responsibility

- `amadeus_service.py` — Amadeus SDK calls (city search, flight offers). Maps raw responses to Pydantic models.
- `liteapi_service.py` — LiteAPI HTTP calls (hotel search + min-rates). Maps raw responses to Pydantic models.
- `weather_service.py` — Open-Meteo HTTP calls. Calculates `weather_score`, `rain_signal`, `label`, and `description` per day. All formulas are in `docs/api-spec.yaml` under `info.description`.
- `scoring_service.py` — Compare-only logic: `cost_score`, `overall_score`, tag assignment. Does NOT call external APIs.

### Assumption Verification Protocol

**Before implementing each service**, call the real API once with test data. If the actual response structure differs from what you expected:
1. Log the actual structure in `backend/PROGRESS.md`
2. Adapt your mapping code to handle the real structure
3. If the difference means the Pydantic schema can't work → **STOP and report**

### Error Handling

Error format and status codes are defined in `docs/api-spec.yaml` under `components/responses` and `components/schemas/ErrorResponse`. Implement them exactly as specified.

Always validate external API responses before mapping to Pydantic models:
- If a field is missing, use the default/nullable value from the schema
- Wrap external API calls in try/except and return appropriate error codes

---

## 5. Recovery Protocol

If an external API call fails during development:

1. **Read the actual error response** — don't guess what went wrong
2. **Check the API documentation** (Amadeus/LiteAPI/Open-Meteo official docs)
3. **Log the failed approach** in `backend/PROGRESS.md`:
   ```
   FAILED: LiteAPI hotel search returned 403 with sandbox key
   REASON: Sandbox key doesn't support /v3.0/hotels/rates endpoint
   NEXT: Try /v2.0/hotels endpoint instead
   ```
4. **Try an alternative approach** based on what you learned
5. If the API itself is broken or fundamentally incompatible with our schema → **STOP and report to the user**

**Never silently skip a broken endpoint.** Every endpoint must work or be explicitly reported as blocked.

---

## 6. Code Style Rules

Follow `CLAUDE.md` conventions:
- **Linter**: ruff (line-length 80)
- **Formatter**: black (line-length 80)
- **Import order**: stdlib → third-party → project internal, separated by blank lines
- Keep it simple — this is a hackathon. Working code > elegant code.

---

## 7. Progress Tracking

After completing each phase, append to `backend/PROGRESS.md`:

```markdown
## Phase N — [Phase Name] — [COMPLETED/IN PROGRESS/BLOCKED]
**Date**: YYYY-MM-DD
**Files created/modified**:
- services/amadeus_service.py (new)
- services/weather_service.py (new)

**Decisions made**:
- Amadeus returns price as string, converted to float
- Open-Meteo rain_sum can be null, defaulting to 0.0

**Issues encountered**:
- LiteAPI sandbox doesn't support rates endpoint
- Used alternative endpoint /v2.0/hotels

**Failed approaches** (do NOT retry these):
- Tried LiteAPI /v3.0/hotels/rates with search key → 403

**Next**: Phase 2 — Endpoints
```

This file serves as persistent memory across context rotations. Future sessions will read it to avoid repeating work.

---

## 8. Self-Verification

After implementation is complete, verify every endpoint works:

1. **Read `docs/api-spec.yaml`** — every endpoint has `example` payloads in the spec
2. **Generate curl commands** from the spec's examples for each endpoint
3. **Test all happy paths** — every endpoint must return 200 with valid JSON matching its schema
4. **Test all error cases** — the spec defines error responses (400, 404, 422, 504) with examples; verify each one
5. **Verify Swagger UI** — `http://localhost:8000/docs` must show all endpoints

The spec is the source of truth for test data. Do NOT hardcode test payloads — derive them from the spec's `example` fields.

---

## 9. Completion Checklist

**You are NOT done until ALL of these are true:**

- [ ] Phase 1 complete: All 4 service modules implemented and importable
- [ ] Phase 2 complete: All 6 endpoint files implemented
- [ ] Phase 3 complete: All routers registered in main.py
- [ ] Phase 4 complete: All verification curl commands return valid responses
- [ ] `docker compose up` runs without errors
- [ ] All 6 v1 endpoints return 200 with valid data (matching schema). `/health` is already implemented.
- [ ] Error cases return correct status codes per endpoint (see `docs/api-spec.yaml` for which endpoints define 400, 404, 422, 504)
- [ ] No TODO, placeholder, or hardcoded mock data remains in the code
- [ ] `backend/PROGRESS.md` is updated with final status for all phases
- [ ] `http://localhost:8000/docs` shows all endpoints in Swagger UI

**Only after ALL checkboxes are true can you declare the implementation complete.**

---

## 10. Key Files Reference

| File | Role | Permission |
|------|------|------------|
| `docs/api-spec.yaml` | API contract (OpenAPI 3.1) | **DO NOT MODIFY** |
| `backend/app/api/v1/schemas.py` | Pydantic models | **DO NOT MODIFY** |
| `backend/app/core/config.py` | Settings (API keys) | **DO NOT MODIFY** |
| `backend/app/main.py` | FastAPI entry | **ADD** router includes |
| `backend/app/api/v1/endpoints/` | Endpoint handlers | **CREATE** files here |
| `backend/app/services/` | Service modules | **CREATE** files here |
| `backend/pyproject.toml` | Dependencies | **ADD** if needed |
| `backend/PROGRESS.md` | Progress tracking | **CREATE & UPDATE** |
| `.env` | API keys | Already configured |
| `docker-compose.yml` | Docker config | **DO NOT MODIFY** |
| `CLAUDE.md` | Project guide | **DO NOT MODIFY** |

---

## 11. Reminders

1. **Do not modify frozen files** (`schemas.py`, `api-spec.yaml`, `config.py`) without reporting
2. **Use real API keys** from `.env` — they are already configured
3. **LiteAPI has TWO keys**: `LITEAPI_API_KEY_SEARCH` (search) and `LITEAPI_API_KEY_RATES` (pricing)
4. **Open-Meteo needs NO API key** — it's free
5. **Timeout**: 10 seconds for all external API calls
6. **Date format**: ISO 8601 (`YYYY-MM-DD`) everywhere
7. **Currency**: USD, always
8. **No tests needed** — verify with curl commands in Section 8
9. **No auth** — all endpoints are public
10. **CORS** is already configured for `localhost:3000`
11. If `docker compose up` fails after your changes, fix it before moving to the next phase
12. The backend runs with `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
13. **Always validate external API responses** — never trust that they match docs exactly
14. **Log failed approaches** in PROGRESS.md so they are not repeated
15. If something is fundamentally broken → **STOP and report**, do not silently skip
