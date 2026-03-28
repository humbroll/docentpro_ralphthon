import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s: %(message)s",
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints import (
    calendar,
    compare,
    flights,
    hotels,
    search,
    weather,
)
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api/v1")
app.include_router(flights.router, prefix="/api/v1")
app.include_router(hotels.router, prefix="/api/v1")
app.include_router(weather.router, prefix="/api/v1")
app.include_router(compare.router, prefix="/api/v1")
app.include_router(calendar.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
