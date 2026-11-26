from app.clients.openweather import get_forecast_data
from app.db.redis import client as redis_client
from app.models.forecast import ForecastPoint, ForecastResponse

CACHE_SECONDS = 600


def build_forecast(data: dict) -> ForecastResponse:
    return ForecastResponse(
        city=data["city"]["name"],
        points=[
            ForecastPoint(
                timestamp=item["dt"],
                temperature=round(item["main"]["temp"]),
                description=item["weather"][0]["description"],
            )
            for item in data["list"]
        ],
    )


async def get_forecast(city: str) -> ForecastResponse:
    cache_key = f"forecast:{city.lower()}"

    cached_forecast = await redis_client.get(cache_key)

    if cached_forecast:
        return ForecastResponse.model_validate_json(cached_forecast)

    forecast = build_forecast(await get_forecast_data(city))

    await redis_client.set(
        cache_key,
        forecast.model_dump_json(),
        ex=CACHE_SECONDS,
    )

    return forecast
