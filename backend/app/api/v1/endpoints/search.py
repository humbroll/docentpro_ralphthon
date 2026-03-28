"""GET /api/v1/search/destinations — city search."""

import logging

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from amadeus import ResponseError

from app.api.v1.schemas import DestinationResult
from app.services.amadeus_service import (
    search_cities,
    geocode_city,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/search/destinations",
    response_model=list[DestinationResult],
)
async def search_destinations(
    q: str = Query(
        ..., min_length=3, description="City name query"
    ),
):
    try:
        return search_cities(q)
    except ResponseError:
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_error",
                "message": "Amadeus API error",
            },
        )
    except Exception as e:
        if "timeout" in str(e).lower():
            return JSONResponse(
                status_code=504,
                content={
                    "error": "gateway_timeout",
                    "message": (
                        "External API request timed out"
                        " after 10 seconds"
                    ),
                },
            )
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_error",
                "message": "An unexpected error occurred",
            },
        )


@router.get(
    "/search/geocode",
    response_model=DestinationResult,
)
async def geocode_destination(
    city: str = Query(..., description="City name"),
    country: str = Query("", description="Country code"),
    iata_code: str = Query("", description="IATA code"),
):
    """Geocode a city to get accurate center coords.

    Called once after user selects a destination from
    the autocomplete. Returns the same DestinationResult
    with accurate city-center coordinates.
    """
    result = geocode_city(city, country, iata_code)
    if result is None:
        return JSONResponse(
            status_code=404,
            content={
                "error": "not_found",
                "message": f"Could not geocode {city}",
            },
        )
    return result
