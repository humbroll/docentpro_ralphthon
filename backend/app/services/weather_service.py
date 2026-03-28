"""Open-Meteo weather service — historical weather data."""

import logging
from datetime import date, timedelta

import httpx

from app.api.v1.schemas import (
    CalendarDay,
    CalendarResponse,
    WeatherDay,
    WeatherSummary,
)

logger = logging.getLogger(__name__)

BASE_URL = "https://archive-api.open-meteo.com/v1/archive"


def _calculate_day_score(
    temp_high: float, temp_low: float, rain_mm: float
) -> float:
    avg_temp = (temp_high + temp_low) / 2
    temp_score = max(0, 100 - abs(avg_temp - 22) * 5)
    rain_score = max(0, 100 - rain_mm * 10)
    return 0.6 * temp_score + 0.4 * rain_score


def _weather_label(score: float) -> str:
    if score >= 80:
        return "Great"
    if score >= 60:
        return "Good"
    if score >= 40:
        return "Fair"
    return "Poor"


def _rain_signal(avg_daily_rain: float) -> str:
    if avg_daily_rain < 2:
        return "low"
    if avg_daily_rain <= 5:
        return "medium"
    return "high"


def _description(rain_mm: float) -> str:
    if rain_mm > 5:
        return "Rainy"
    if rain_mm > 0:
        return "Partly cloudy"
    return "Clear sky"


def _previous_year_dates(
    start: date, end: date
) -> tuple[date, date]:
    return (
        start.replace(year=start.year - 1),
        end.replace(year=end.year - 1),
    )


async def _fetch_daily(
    lat: float,
    lon: float,
    start: date,
    end: date,
) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            BASE_URL,
            params={
                "latitude": lat,
                "longitude": lon,
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "daily": (
                    "temperature_2m_max,"
                    "temperature_2m_min,"
                    "rain_sum"
                ),
                "timezone": "auto",
            },
        )
        resp.raise_for_status()
        return resp.json()["daily"]


async def get_weather(
    lat: float,
    lon: float,
    start: date,
    end: date,
) -> WeatherSummary:
    """Get historical weather summary for the previous year."""
    prev_start, prev_end = _previous_year_dates(start, end)
    daily = await _fetch_daily(lat, lon, prev_start, prev_end)

    days: list[WeatherDay] = []
    day_scores: list[float] = []
    total_rain = 0.0

    for i, d in enumerate(daily["time"]):
        t_max = daily["temperature_2m_max"][i] or 0.0
        t_min = daily["temperature_2m_min"][i] or 0.0
        rain = daily["rain_sum"][i] or 0.0
        total_rain += rain

        score = _calculate_day_score(t_max, t_min, rain)
        day_scores.append(score)

        days.append(
            WeatherDay(
                date=d,
                temp_high=t_max,
                temp_low=t_min,
                rain_mm=rain,
                description=_description(rain),
            )
        )

    n = len(days) or 1
    weather_score = sum(day_scores) / n
    avg_temp = (
        sum(
            (d.temp_high + d.temp_low) / 2 for d in days
        )
        / n
    )
    avg_rain = total_rain / n

    return WeatherSummary(
        average_temp=round(avg_temp, 1),
        rain_signal=_rain_signal(avg_rain),
        weather_score=round(weather_score, 1),
        label=_weather_label(weather_score),
        daily=days,
    )


async def get_calendar_weather(
    destination: str,
    lat: float,
    lon: float,
    start: date,
    end: date,
) -> CalendarResponse:
    """Get per-day weather for calendar overlay."""
    prev_start, prev_end = _previous_year_dates(start, end)
    daily = await _fetch_daily(lat, lon, prev_start, prev_end)

    cal_days: list[CalendarDay] = []
    for i, d in enumerate(daily["time"]):
        t_max = daily["temperature_2m_max"][i]
        t_min = daily["temperature_2m_min"][i]
        rain = daily["rain_sum"][i] or 0.0

        if t_max is not None and t_min is not None:
            score = _calculate_day_score(t_max, t_min, rain)
            label = _weather_label(score)
        else:
            label = None

        # Return dates in the requested year, not previous
        delta = timedelta(days=365)
        original_date = date.fromisoformat(d) + delta

        cal_days.append(
            CalendarDay(
                date=original_date,
                temp_high=t_max,
                temp_low=t_min,
                rain_mm=rain,
                weather_label=label,
            )
        )

    return CalendarResponse(
        destination=destination, days=cal_days
    )
