"""POST /api/v1/hotels/search — hotel search."""

import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.api.v1.schemas import HotelOption, HotelSearchRequest
from app.services.amadeus_service import lookup_country_code
from app.services.liteapi_service import search_hotels

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/hotels/search",
    response_model=list[HotelOption],
)
async def hotel_search(req: HotelSearchRequest):
    logger.info(
        "Hotel search: dest=%s lat=%.4f lon=%.4f "
        "checkin=%s checkout=%s pax=%d",
        req.destination,
        req.latitude,
        req.longitude,
        req.checkin_date,
        req.checkout_date,
        req.traveler_count,
    )

    if req.checkin_date >= req.checkout_date:
        logger.warning(
            "Hotel search rejected: "
            "checkin=%s >= checkout=%s",
            req.checkin_date,
            req.checkout_date,
        )
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

    country = lookup_country_code(req.destination)
    logger.info("Resolved country code: %s → %s", req.destination, country or "(none)")

    try:
        results = await search_hotels(
            destination=req.destination,
            latitude=req.latitude,
            longitude=req.longitude,
            checkin_date=req.checkin_date,
            checkout_date=req.checkout_date,
            traveler_count=req.traveler_count,
            country_code=country,
        )
    except Exception as e:
        logger.error(
            "Hotel search exception: %s: %s",
            type(e).__name__,
            e,
            exc_info=True,
        )
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
                "message": (
                    f"An unexpected error occurred:"
                    f" {e}"
                ),
            },
        )

    if not results:
        logger.warning(
            "Hotel search empty: dest=%s "
            "checkin=%s checkout=%s — "
            "LiteAPI returned 0 results",
            req.destination,
            req.checkin_date,
            req.checkout_date,
        )
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

    logger.info(
        "Hotel search success: %d results for %s",
        len(results),
        req.destination,
    )
    return results
