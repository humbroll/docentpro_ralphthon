"""POST /api/v1/hotels/search — hotel search."""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.api.v1.schemas import HotelOption, HotelSearchRequest
from app.services.liteapi_service import search_hotels

router = APIRouter()


@router.post(
    "/hotels/search",
    response_model=list[HotelOption],
)
async def hotel_search(req: HotelSearchRequest):
    if req.checkin_date >= req.checkout_date:
        return JSONResponse(
            status_code=400,
            content={
                "error": "bad_request",
                "message": (
                    "checkout_date must be after"
                    " checkin_date"
                ),
            },
        )

    try:
        results = await search_hotels(
            destination=req.destination,
            latitude=req.latitude,
            longitude=req.longitude,
            checkin_date=req.checkin_date,
            checkout_date=req.checkout_date,
            traveler_count=req.traveler_count,
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

    if not results:
        return JSONResponse(
            status_code=404,
            content={
                "error": "not_found",
                "message": (
                    f"No hotels found in"
                    f" {req.destination} for"
                    f" {req.checkin_date} to"
                    f" {req.checkout_date}"
                ),
            },
        )

    return results
