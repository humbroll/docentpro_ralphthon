# Ralph Prompt — WhenToGo Backend Implementation

You are implementing the entire backend for **WhenToGo**, a travel date optimization engine. Your job is to go from the current empty scaffold to a fully working API — all endpoints responding with real data from real external APIs. No human intervention needed. Read every section of this prompt carefully before writing any code.

---

## 0. Continuation Protocol

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

Run ALL curl commands from Section 8. Fix any failures. Update `backend/PROGRESS.md` with results.

---

## 4. Endpoint Implementation Details

All endpoints are defined in `docs/api-spec.yaml`. Here is a summary with implementation guidance.

### 4.1 GET /api/v1/search/destinations?q={query}

**Purpose**: City search autocomplete.

**Implementation**:
- Use the `amadeus` Python package (already installed) for city search
- Initialize the Amadeus client with `settings.AMADEUS_API_KEY` and `settings.AMADEUS_API_SECRET`
- Use Amadeus Reference Data API: `amadeus.reference_data.locations.get(keyword=q, subType=["CITY"])`
- Map Amadeus response to `DestinationResult` schema
- For IATA code: use the `iataCode` field from Amadeus response
- For lat/lng: use `geoCode.latitude` and `geoCode.longitude` from Amadeus
- Return max **10** results
- Validate: `q` must be at least 3 characters, otherwise return 400

**Error Cases**:
- `q` missing or < 3 chars → 400 `{"error": "bad_request", "message": "Query parameter 'q' must be at least 3 characters"}`
- Amadeus API error → 500
- Amadeus timeout (>10s) → 504

### 4.2 POST /api/v1/flights/price

**Purpose**: Get lowest round-trip economy flight price.

**Implementation**:
- Use the `amadeus` Python package
- Use Flight Offers Search: `amadeus.shopping.flight_offers_search.get(originLocationCode=..., destinationLocationCode=..., departureDate=..., returnDate=..., adults=traveler_count, travelClass="ECONOMY", max=1)`
- Extract the lowest price from the response
- Return price **per person** (Amadeus returns total; divide by traveler_count if needed)
- `currency` is always `"USD"`
- Validate: `departure_date` must be in the future, `return_date` must be after `departure_date`

**Error Cases**:
- Past dates → 400
- return_date <= departure_date → 400
- No flights found → 404 `{"error": "not_found", "message": "No flights found for {origin} → {destination} on {departure_date}"}`
- Amadeus error → 500
- Timeout → 504

### 4.3 POST /api/v1/hotels/search

**Purpose**: Search hotels near destination, return top 5 by price.

**Implementation**:
- Use `httpx` to call LiteAPI (REST API)
- LiteAPI docs: `https://docs.liteapi.travel/`
- **Two API keys** (check `settings`):
  - `settings.LITEAPI_API_KEY_SEARCH` — for hotel search
  - `settings.LITEAPI_API_KEY_RATES` — for hotel pricing/rates
- Room calculation: `rooms_needed = ceil(traveler_count / 2)` (import `math.ceil`)
- Search parameters: destination coordinates, checkin/checkout dates, rooms count
- Sort results by `total_price` ascending
- Return top 5 results mapped to `HotelOption` schema
- `total_price` = price per room per night * rooms_needed * number of nights
- `distance` and `rating` can be `None` if LiteAPI doesn't provide them
- **Validate API response before mapping**: if expected fields are missing, use None/default values rather than crashing

**Error Cases**:
- checkin_date >= checkout_date → 400
- No hotels found → 404
- LiteAPI error → 500
- Timeout → 504

### 4.4 POST /api/v1/weather

**Purpose**: Get historical weather data and calculated weather score.

**Implementation**:
- Use `httpx` to call Open-Meteo Historical Weather API (FREE, no API key needed)
- Base URL: `https://archive-api.open-meteo.com/v1/archive`
- **Critical**: Fetch data for the **same date range in the PREVIOUS YEAR**
  - Example: request dates 2026-05-01 to 2026-05-05 → fetch 2025-05-01 to 2025-05-05
- Query params: `latitude`, `longitude`, `start_date`, `end_date`, `daily=temperature_2m_max,temperature_2m_min,rain_sum`, `timezone=auto`
- Map response to `WeatherDay` objects:
  - `temp_high` = `temperature_2m_max`
  - `temp_low` = `temperature_2m_min`
  - `rain_mm` = `rain_sum` (use `0.0` if null/missing)
  - `description` = derive from conditions (e.g., rain > 5mm → "Rainy", rain > 0 → "Partly cloudy", else "Clear sky")
- Calculate `WeatherSummary`:
  - `average_temp` = mean of `(temp_high + temp_low) / 2` across all days

**Weather Score Formula** (implement exactly):
```python
# Per-day calculation:
avg_temp_day = (temp_high + temp_low) / 2
temp_score = max(0, 100 - abs(avg_temp_day - 22) * 5)
rain_score = max(0, 100 - rain_mm * 10)
day_score = 0.6 * temp_score + 0.4 * rain_score

# Final weather_score = average of all day_scores
weather_score = sum(day_scores) / len(day_scores)
```

**Rain Signal** (based on avg daily rain across the range):
- avg daily rain < 2mm → `"low"`
- avg daily rain 2–5mm → `"medium"`
- avg daily rain > 5mm → `"high"`

**Weather Label** (based on weather_score):
- score >= 80 → `"Great"`
- score >= 60 → `"Good"`
- score >= 40 → `"Fair"`
- score < 40 → `"Poor"`

### 4.5 POST /api/v1/calendar

**Purpose**: Weather data for calendar UI overlay.

**Implementation**:
- Same Open-Meteo Historical API as weather endpoint
- Fetch last year's data for the requested date range (typically 2 months)
- For each day, calculate individual `weather_label` using the same scoring formula
- Map to `CalendarDay` objects (temp_high, temp_low, rain_mm, weather_label)
- Return wrapped in `CalendarResponse` with destination name

### 4.6 POST /api/v1/compare

**Purpose**: Score and rank trip options.

**Implementation**:
- Receive `CompareRequest` body with 2–5 `CompareOptionInput` items
- Validate: at least 2 options required, otherwise 422

**Scoring Pipeline** (implement in this exact order):
```python
# Step 1: Calculate costs
for option in options:
    total_trip_cost = option.flight_price * option.traveler_count + option.hotel_price
    cost_per_person = total_trip_cost / option.traveler_count

# Step 2: Cost score (linear interpolation)
costs = [o.total_trip_cost for o in options]
min_cost, max_cost = min(costs), max(costs)
for option in options:
    if max_cost == min_cost:
        cost_score = 100
    else:
        cost_score = 100 * (max_cost - option.total_trip_cost) / (max_cost - min_cost)

# Step 3: Overall score
overall_score = 0.7 * cost_score + 0.3 * option.weather.weather_score

# Step 4: Assign tags
# cheapest → lowest total_trip_cost
# best_weather → highest weather_score
# best_overall → highest overall_score
# An option can have multiple tags

# Step 5: Sort by overall_score descending
# Step 6: best_option_index = 0 (always first after sort)
```

- Return `CompareResponse` with sorted options and `best_option_index: 0`

---

## 5. External API Integration Details

### 5.1 Amadeus

```python
from amadeus import Client, ResponseError

amadeus = Client(
    client_id=settings.AMADEUS_API_KEY,
    client_secret=settings.AMADEUS_API_SECRET,
)
```

- **City Search**: `amadeus.reference_data.locations.get(keyword=query, subType=["CITY"])`
- **Flight Search**: `amadeus.shopping.flight_offers_search.get(...)`
- The `amadeus` package handles OAuth token refresh automatically
- Amadeus test environment: use test credentials from `.env`

### 5.2 LiteAPI

```python
import httpx

# Two separate API keys for different operations:
search_headers = {
    "X-API-Key": settings.LITEAPI_API_KEY_SEARCH,
}
rates_headers = {
    "X-API-Key": settings.LITEAPI_API_KEY_RATES,
}

async with httpx.AsyncClient(timeout=10.0) as client:
    # Use search key for hotel search
    response = await client.get(
        "https://api.liteapi.travel/v3.0/data/hotels",
        headers=search_headers,
        params={...},
    )
    # Use rates key for pricing
    response = await client.get(
        "https://api.liteapi.travel/v3.0/hotels/rates",
        headers=rates_headers,
        params={...},
    )
```

- Check LiteAPI docs for exact endpoint paths and parameter names
- **Always validate the response** before mapping: check for expected keys, handle missing fields gracefully

### 5.3 Open-Meteo (Free, No Auth)

```python
import httpx

async with httpx.AsyncClient(timeout=10.0) as client:
    response = await client.get(
        "https://archive-api.open-meteo.com/v1/archive",
        params={
            "latitude": lat,
            "longitude": lon,
            "start_date": "2025-05-01",
            "end_date": "2025-05-05",
            "daily": "temperature_2m_max,temperature_2m_min,rain_sum",
            "timezone": "auto",
        },
    )
```

### 5.4 Assumption Verification Protocol

**Before implementing each service**, call the real API once with test data:

```python
# Example: test Amadeus city search
response = amadeus.reference_data.locations.get(
    keyword="Tokyo", subType=["CITY"]
)
print(response.data)  # Examine actual structure
```

If the actual response structure differs from what you expected:
1. Log the actual structure in `backend/PROGRESS.md`
2. Adapt your mapping code to handle the real structure
3. If the difference means the Pydantic schema can't work → **STOP and report**

---

## 6. Error Handling

All errors must use this format:
```json
{"error": "<machine_readable_code>", "message": "<human_readable_description>"}
```

Error codes per status:
- `400` → `"bad_request"` — invalid input (missing params, past dates, etc.)
- `404` → `"not_found"` — no results from external API
- `422` → `"validation_error"` — semantic validation failure (e.g., < 2 compare options)
- `500` → `"internal_error"` — unexpected error
- `504` → `"gateway_timeout"` — external API call exceeded 10s

Use FastAPI's `HTTPException` or a custom error response. The frontend expects this exact JSON structure.

### External API Response Validation
Always validate external API responses before mapping to Pydantic models:
- If a field is missing, use the default/nullable value from the schema (`None`, `0.0`, etc.)
- Never assume external APIs return exactly what their docs say
- Wrap external API calls in try/except and return appropriate error codes

---

## 7. Recovery Protocol

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

## 8. Code Style Rules

Follow `CLAUDE.md` conventions:
- **Linter**: ruff (line-length 80)
- **Formatter**: black (line-length 80)
- **Import order**: stdlib → third-party → project internal, separated by blank lines
- Keep it simple — this is a hackathon. Working code > elegant code.

---

## 9. Progress Tracking

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

## 10. Self-Verification

After implementation is complete, verify every endpoint works by running these commands. **All must return valid JSON matching the schema.**

```bash
# 0. Health check
curl -s http://localhost:8000/health

# 1. Destination search
curl -s "http://localhost:8000/api/v1/search/destinations?q=Tokyo"

# 2. Flight price
curl -s -X POST http://localhost:8000/api/v1/flights/price \
  -H "Content-Type: application/json" \
  -d '{"origin":"ICN","destination":"NRT","departure_date":"2026-05-01","return_date":"2026-05-05","traveler_count":2}'

# 3. Hotel search
curl -s -X POST http://localhost:8000/api/v1/hotels/search \
  -H "Content-Type: application/json" \
  -d '{"destination":"Tokyo","latitude":35.6762,"longitude":139.6503,"checkin_date":"2026-05-01","checkout_date":"2026-05-05","traveler_count":2}'

# 4. Weather
curl -s -X POST http://localhost:8000/api/v1/weather \
  -H "Content-Type: application/json" \
  -d '{"latitude":35.6762,"longitude":139.6503,"start_date":"2026-05-01","end_date":"2026-05-05"}'

# 5. Calendar
curl -s -X POST http://localhost:8000/api/v1/calendar \
  -H "Content-Type: application/json" \
  -d '{"destination":"Tokyo","latitude":35.6762,"longitude":139.6503,"start_date":"2026-05-01","end_date":"2026-06-30"}'

# 6. Compare
curl -s -X POST http://localhost:8000/api/v1/compare \
  -H "Content-Type: application/json" \
  -d '{
    "options": [
      {
        "destination": "Tokyo",
        "start_date": "2026-05-01",
        "end_date": "2026-05-05",
        "flight_price": 342.50,
        "hotel_name": "Tokyo Inn",
        "hotel_price": 320.00,
        "weather": {"average_temp": 21.3, "rain_signal": "low", "weather_score": 82.4, "label": "Great"},
        "traveler_count": 2
      },
      {
        "destination": "Tokyo",
        "start_date": "2026-05-15",
        "end_date": "2026-05-19",
        "flight_price": 289.00,
        "hotel_name": "Tokyo Inn",
        "hotel_price": 295.00,
        "weather": {"average_temp": 23.8, "rain_signal": "medium", "weather_score": 68.2, "label": "Good"},
        "traveler_count": 2
      }
    ]
  }'

# 7. Error cases — all must return {"error": "...", "message": "..."}

# Bad request (missing q)
curl -s "http://localhost:8000/api/v1/search/destinations"

# Not found (unlikely route)
curl -s -X POST http://localhost:8000/api/v1/flights/price \
  -H "Content-Type: application/json" \
  -d '{"origin":"XXX","destination":"YYY","departure_date":"2026-05-01","return_date":"2026-05-05"}'

# Validation error (only 1 compare option)
curl -s -X POST http://localhost:8000/api/v1/compare \
  -H "Content-Type: application/json" \
  -d '{"options": [{"destination":"Tokyo","start_date":"2026-05-01","end_date":"2026-05-05","flight_price":342.50,"hotel_name":"Inn","hotel_price":320.00,"weather":{"average_temp":21.3,"rain_signal":"low","weather_score":82.4,"label":"Great"},"traveler_count":2}]}'
```

---

## 11. Completion Checklist

**You are NOT done until ALL of these are true:**

- [ ] Phase 1 complete: All 4 service modules implemented and importable
- [ ] Phase 2 complete: All 6 endpoint files implemented
- [ ] Phase 3 complete: All routers registered in main.py
- [ ] Phase 4 complete: All verification curl commands return valid responses
- [ ] `docker compose up` runs without errors
- [ ] All 6 endpoints return 200 with valid data (matching schema)
- [ ] All 3 error cases (400, 404, 422) return correct status codes and `{"error", "message"}` format
- [ ] No TODO, placeholder, or hardcoded mock data remains in the code
- [ ] `backend/PROGRESS.md` is updated with final status for all phases
- [ ] `http://localhost:8000/docs` shows all endpoints in Swagger UI

**Only after ALL checkboxes are true can you declare the implementation complete.**

---

## 12. Key Files Reference

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

---

## 13. Reminders

1. **Do not modify frozen files** (`schemas.py`, `api-spec.yaml`, `config.py`) without reporting
2. **Use real API keys** from `.env` — they are already configured
3. **LiteAPI has TWO keys**: `LITEAPI_API_KEY_SEARCH` (search) and `LITEAPI_API_KEY_RATES` (pricing)
4. **Open-Meteo needs NO API key** — it's free
5. **Timeout**: 10 seconds for all external API calls
6. **Date format**: ISO 8601 (`YYYY-MM-DD`) everywhere
7. **Currency**: USD, always
8. **No tests needed** — verify with curl commands in Section 10
9. **No auth** — all endpoints are public
10. **CORS** is already configured for `localhost:3000`
11. If `docker compose up` fails after your changes, fix it before moving to the next phase
12. The backend runs with `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
13. **Always validate external API responses** — never trust that they match docs exactly
14. **Log failed approaches** in PROGRESS.md so they are not repeated
15. If something is fundamentally broken → **STOP and report**, do not silently skip
