"""Scoring service — compare trip options."""

from app.api.v1.schemas import (
    CompareOptionInput,
    CompareResponse,
    TripOption,
    WeatherSummary,
)


def compare_options(
    options: list[CompareOptionInput],
) -> CompareResponse:
    """Score and rank trip options."""
    # Step 1: Calculate costs
    trip_options: list[dict] = []
    for opt in options:
        total = (
            opt.flight_price * opt.traveler_count
            + opt.hotel_price
        )
        cpp = total / opt.traveler_count
        trip_options.append(
            {
                "option": opt,
                "total_trip_cost": round(total, 2),
                "cost_per_person": round(cpp, 2),
            }
        )

    # Step 2: Cost score (linear interpolation)
    costs = [t["total_trip_cost"] for t in trip_options]
    min_cost = min(costs)
    max_cost = max(costs)

    for t in trip_options:
        if max_cost == min_cost:
            t["cost_score"] = 100.0
        else:
            t["cost_score"] = (
                100
                * (max_cost - t["total_trip_cost"])
                / (max_cost - min_cost)
            )

    # Step 3: Overall score
    for t in trip_options:
        ws = t["option"].weather.weather_score
        t["overall_score"] = round(
            0.7 * t["cost_score"] + 0.3 * ws, 2
        )

    # Step 4: Tags
    cheapest_cost = min(
        t["total_trip_cost"] for t in trip_options
    )
    best_weather_score = max(
        t["option"].weather.weather_score
        for t in trip_options
    )
    best_overall = max(
        t["overall_score"] for t in trip_options
    )

    for t in trip_options:
        tags: list[str] = []
        if t["total_trip_cost"] == cheapest_cost:
            tags.append("cheapest")
        if (
            t["option"].weather.weather_score
            == best_weather_score
        ):
            tags.append("best_weather")
        if t["overall_score"] == best_overall:
            tags.append("best_overall")
        t["tags"] = tags

    # Step 5: Sort by overall_score descending
    trip_options.sort(
        key=lambda t: t["overall_score"], reverse=True
    )

    # Build response
    result_options: list[TripOption] = []
    for t in trip_options:
        opt = t["option"]
        result_options.append(
            TripOption(
                destination=opt.destination,
                start_date=opt.start_date,
                end_date=opt.end_date,
                flight_price=opt.flight_price,
                hotel_name=opt.hotel_name,
                hotel_price=opt.hotel_price,
                weather=WeatherSummary(
                    average_temp=opt.weather.average_temp,
                    rain_signal=opt.weather.rain_signal,
                    weather_score=opt.weather.weather_score,
                    label=opt.weather.label,
                ),
                traveler_count=opt.traveler_count,
                total_trip_cost=t["total_trip_cost"],
                cost_per_person=t["cost_per_person"],
                overall_score=t["overall_score"],
                tags=t["tags"],
            )
        )

    return CompareResponse(
        options=result_options,
        best_option_index=0,
    )
