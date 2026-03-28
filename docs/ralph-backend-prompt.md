# Ralph Prompt — WhenToGo Backend Implementation

You are implementing the entire backend for **WhenToGo**, a travel date optimization engine. Your job is to go from the current empty scaffold to a fully working API — all endpoints responding with real data from real external APIs. No human intervention needed. Read every section of this prompt carefully before writing any code.

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
- **External APIs**: Amadeus (flights + city search), LiteAPI (hotels), Open-Meteo (weather)
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
- **Config**: `backend/app/core/config.py` — API keys are loaded here. Use `settings.AMADEUS_API_KEY`, etc.

### If You Need to Change the Spec
**STOP and report to the user.** Explain:
1. What you need to change
2. Why the current spec doesn't work
3. Your proposed change

Do NOT modify `schemas.py` or `api-spec.yaml` without explicit approval. The frontend team depends on these.

---

## 3. Endpoints to Implement

All endpoints are defined in `docs/api-spec.yaml`. Here is a summary with implementation guidance.

### 3.1 GET /api/v1/search/destinations?q={query}

**Purpose**: City search autocomplete.

**Implementation**:
- Use the `amadeus` Python package (already installed) for city search
- Initialize the Amadeus client with `settings.AMADEUS_API_KEY` and `settings.AMADEUS_API_SECRET`
- Use Amadeus Reference Data API: `amadeus.reference_data.locations.get(keyword=q, subType=["CITY"])`
- Map Amadeus response to `DestinationResult` schema
- For IATA code: use the `iataCode` field from Amadeus response
- For lat/lng: use `geoCode.latitude` and `geoCode.longitude` from Amadeus
- Return max **10** results
- Validate: `q` must be at least 2 characters, otherwise return 400

**Error Cases**:
- `q` missing or < 2 chars → 400 `{"error": "bad_request", "message": "Query parameter 'q' must be at least 2 characters"}`
- Amadeus API error → 500
- Amadeus timeout (>10s) → 504

### 3.2 POST /api/v1/flights/price

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

### 3.3 POST /api/v1/hotels/search

**Purpose**: Search hotels near destination, return top 5 by price.

**Implementation**:
- Use `httpx` to call LiteAPI (REST API)
- LiteAPI docs: `https://docs.liteapi.travel/`
- API key from `settings.LITEAPI_API_KEY`
- Room calculation: `rooms_needed = ceil(traveler_count / 2)` (import `math.ceil`)
- Search parameters: destination coordinates, checkin/checkout dates, rooms count
- Sort results by `total_price` ascending
- Return top 5 results mapped to `HotelOption` schema
- `total_price` = price per room per night * rooms_needed * number of nights
- `distance` and `rating` can be `None` if LiteAPI doesn't provide them

**Error Cases**:
- checkin_date >= checkout_date → 400
- No hotels found → 404
- LiteAPI error → 500
- Timeout → 504

### 3.4 POST /api/v1/weather

**Purpose**: Get historical weather data and calculated weather score.

**Implementation**:
- Use `httpx` to call Open-Meteo Historical Weather API (FREE, no API key)
- Base URL: `https://archive-api.open-meteo.com/v1/archive`
- **Critical**: Fetch data for the **same date range in the PREVIOUS YEAR**
  - Example: request dates 2026-05-01 to 2026-05-05 → fetch 2025-05-01 to 2025-05-05
- Query params: `latitude`, `longitude`, `start_date`, `end_date`, `daily=temperature_2m_max,temperature_2m_min,rain_sum`, `timezone=auto`
- Map response to `WeatherDay` objects:
  - `temp_high` = `temperature_2m_max`
  - `temp_low` = `temperature_2m_min`
  - `rain_mm` = `rain_sum`
  - `description` = derive from conditions (e.g., rain > 5mm → "Rainy", rain > 0 → "Partly cloudy", else "Clear sky")
- Calculate `WeatherSummary`:
  - `average_temp` = mean of `(temp_high + temp_low) / 2` across all days

**Weather Score Formula** (implement exactly):
```python
temp_score = max(0, 100 - abs(avg_temp - 22) * 5)
rain_score = max(0, 100 - daily_rain_mm * 10)
weather_score = 0.6 * temp_score + 0.4 * rain_score
```
- For multi-day ranges: calculate per-day scores, then average

**Rain Signal**:
- avg daily rain < 2mm → `"low"`
- avg daily rain 2–5mm → `"medium"`
- avg daily rain > 5mm → `"high"`

**Weather Label**:
- score >= 80 → `"Great"`
- score >= 60 → `"Good"`
- score >= 40 → `"Fair"`
- score < 40 → `"Poor"`

### 3.5 POST /api/v1/calendar

**Purpose**: Weather data for calendar UI overlay.

**Implementation**:
- Same Open-Meteo Historical API as weather endpoint
- Fetch last year's data for the requested date range (typically 2 months)
- For each day, calculate individual weather_label using the same scoring formula
- Map to `CalendarDay` objects (temp_high, temp_low, rain_mm, weather_label)
- Return wrapped in `CalendarResponse` with destination name

### 3.6 POST /api/v1/compare

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

## 4. External API Integration Details

### 4.1 Amadeus

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

### 4.2 LiteAPI

```python
import httpx

headers = {"X-API-Key": settings.LITEAPI_API_KEY}
async with httpx.AsyncClient(timeout=10.0) as client:
    response = await client.get(
        "https://api.liteapi.travel/v3.0/data/hotels",
        headers=headers,
        params={...}
    )
```

- Check LiteAPI docs for exact endpoint paths and parameter names
- The LiteAPI SDK may also be available — use whichever works

### 4.3 Open-Meteo (Free, No Auth)

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

---

## 5. Error Handling

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

---

## 6. Code Style Rules

Follow `CLAUDE.md` conventions:
- **Linter**: ruff (line-length 80)
- **Formatter**: black (line-length 80)
- **Import order**: stdlib → third-party → project internal, separated by blank lines
- Keep it simple — this is a hackathon. Working code > elegant code.

---

## 7. Router Integration

After implementing endpoints, register them in `backend/app/main.py`:

```python
from app.api.v1.endpoints import search, flights, hotels, weather, compare, calendar

app.include_router(search.router, prefix="/api/v1")
app.include_router(flights.router, prefix="/api/v1")
app.include_router(hotels.router, prefix="/api/v1")
app.include_router(weather.router, prefix="/api/v1")
app.include_router(compare.router, prefix="/api/v1")
app.include_router(calendar.router, prefix="/api/v1")
```

Each endpoint file should define its own `router = APIRouter()`.

---

## 8. Self-Verification

After implementation is complete, verify every endpoint works by running these commands inside the Docker container. **All must return valid JSON matching the schema.**

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

# 6. Compare (use real data from endpoints 2-4 above)
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

# 7. Error cases
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

**Verification criteria**:
- Each endpoint returns the correct HTTP status code
- Response JSON matches the schema in `docs/api-spec.yaml`
- Error responses use `{"error": "...", "message": "..."}` format
- Weather score calculations are correct (spot-check manually)
- Compare endpoint sorts by overall_score descending
- Compare endpoint assigns tags correctly

---

## 9. Key Files Reference

| File | Role |
|------|------|
| `docs/api-spec.yaml` | API contract (OpenAPI 3.1) — DO NOT MODIFY |
| `backend/app/api/v1/schemas.py` | Pydantic models — DO NOT MODIFY |
| `backend/app/core/config.py` | Settings (API keys) — DO NOT MODIFY |
| `backend/app/main.py` | FastAPI entry — ADD router includes here |
| `backend/app/api/v1/endpoints/` | CREATE endpoint files here |
| `backend/app/services/` | CREATE service files here |
| `backend/pyproject.toml` | Dependencies — ADD new packages if needed |
| `.env` | API keys — already configured |

---

## 10. Reminders

1. **Do not modify frozen files** (`schemas.py`, `api-spec.yaml`, `config.py`) without reporting
2. **Use real API keys** from `.env` — they are already configured
3. **Timeout**: 10 seconds for all external API calls
4. **Date format**: ISO 8601 (`YYYY-MM-DD`) everywhere
5. **Currency**: USD, always
6. **No tests needed** — verify manually with curl commands above
7. **No auth** — all endpoints are public
8. **CORS** is already configured for `localhost:3000`
9. If `docker compose up` fails after your changes, fix it before declaring done
10. The backend runs with `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
