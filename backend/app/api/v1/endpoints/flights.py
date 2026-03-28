"""POST /api/v1/flights/price — flight price lookup."""

from datetime import date

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from amadeus import ResponseError

from app.api.v1.schemas import FlightPrice, FlightPriceRequest
from app.services.amadeus_service import search_flights

router = APIRouter()


@router.post(
    "/flights/price",
    response_model=FlightPrice,
)
async def get_flight_price(req: FlightPriceRequest):
    if req.departure_date <= date.today():
        return JSONResponse(
            status_code=400,
            content={
                "error": "bad_request",
                "message": (
                    "departure_date must be in the future"
                ),
            },
        )
    if req.return_date <= req.departure_date:
        return JSONResponse(
            status_code=400,
            content={
                "error": "bad_request",
                "message": (
                    "return_date must be after"
                    " departure_date"
                ),
            },
        )

    try:
        result = search_flights(
            origin=req.origin,
            destination=req.destination,
            departure_date=req.departure_date,
            return_date=req.return_date,
            traveler_count=req.traveler_count,
        )
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

    if result is None:
        return JSONResponse(
            status_code=404,
            content={
                "error": "not_found",
                "message": (
                    f"No flights found for"
                    f" {req.origin} → {req.destination}"
                    f" on {req.departure_date}"
                ),
            },
        )

    return result
