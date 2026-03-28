"""POST /api/v1/compare — score and compare trips."""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.api.v1.schemas import CompareRequest, CompareResponse
from app.services.scoring_service import compare_options

router = APIRouter()


@router.post(
    "/compare",
    response_model=CompareResponse,
)
async def compare(req: CompareRequest):
    if len(req.options) < 2:
        return JSONResponse(
            status_code=422,
            content={
                "error": "validation_error",
                "message": (
                    "At least 2 options are required"
                    " for comparison"
                ),
            },
        )

    try:
        return compare_options(req.options)
    except Exception:
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_error",
                "message": "An unexpected error occurred",
            },
        )
