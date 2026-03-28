"""GET /api/v1/search/destinations — city search."""

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from amadeus import ResponseError

from app.api.v1.schemas import DestinationResult
from app.services.amadeus_service import search_cities

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
