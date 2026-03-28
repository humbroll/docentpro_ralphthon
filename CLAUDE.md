# Trip Timing AI

Hackathon project — web app that helps users find optimal travel dates by comparing flight prices, hotel prices, and weather.

## Tech Stack
- **Backend:** FastAPI (Python 3.11), Pydantic v2, httpx, Poetry
- **Frontend:** Next.js 15, React 18, TypeScript, MUI 5
- **Database:** PostgreSQL 15 (optional for MVP)
- **Infrastructure:** Docker Compose (local dev)

## Common Commands

```bash
# Start all services
docker compose up -d

# Rebuild after dependency changes
docker compose up -d --build

# Backend logs
docker compose logs -f backend

# Frontend logs
docker compose logs -f frontend

# Backend lint/format
cd backend && poetry run ruff check app/ && poetry run black app/

# Frontend lint
cd frontend && npm run lint
```

## Architecture

### Backend (`backend/app/`)
- `main.py` — FastAPI app entry point, CORS, router setup
- `core/config.py` — Settings (API keys, DB URL)
- `api/v1/schemas.py` — **API contract** (Pydantic models, source of truth)
- `api/v1/endpoints/` — Route handlers (search, flights, hotels, weather, compare)
- `services/` — External API clients (Amadeus, LiteAPI, weather) + scoring logic

### Frontend (`frontend/src/`)
- `app/` — Next.js App Router pages
- `components/` — React components (SearchBar, Calendar, HotelList, ComparisonQueue, ComparisonTable)
- `services/api.ts` — Backend API client
- `services/mock.ts` — Mock data for parallel development
- `types/api.ts` — TypeScript interfaces (mirror of backend schemas.py)
- `theme/` — MUI theme config

## API Endpoints
- `GET /api/v1/search/destinations?q=...` — City search
- `POST /api/v1/flights/price` — Flight price lookup (Amadeus)
- `POST /api/v1/hotels/search` — Hotel search (LiteAPI)
- `POST /api/v1/weather` — Historical weather data
- `POST /api/v1/compare` — Score and compare trip options

## Conventions
- API contract lives in `backend/app/api/v1/schemas.py` — freeze before parallel dev
- Frontend TypeScript types in `frontend/src/types/api.ts` must stay in sync
- Backend: ruff for linting, black for formatting (line-length 80)
- No auth, no payments, no booking (out of scope)
- Comparison state is frontend-local (no DB needed for MVP)
- Scoring is backend-only (`POST /api/v1/compare`)

## Environment Variables
See `.env.example` for required keys:
- `AMADEUS_API_KEY` / `AMADEUS_API_SECRET`
- `LITEAPI_API_KEY`
- `WEATHER_API_KEY`

## URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health
