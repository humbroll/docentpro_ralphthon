"""POST /api/v1/calendar — calendar weather overlay."""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.api.v1.schemas import CalendarRequest, CalendarResponse
from app.services.weather_service import get_calendar_weather

router = APIRouter()


@router.post(
    "/calendar",
    response_model=CalendarResponse,
)
async def calendar(req: CalendarRequest):
    try:
        return await get_calendar_weather(
            destination=req.destination,
            lat=req.latitude,
            lon=req.longitude,
            start=req.start_date,
            end=req.end_date,
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
