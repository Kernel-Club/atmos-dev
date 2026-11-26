import httpx

from app.config import OPENWEATHER_API_KEY

OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"


async def get_current_weather(city: str) -> dict:
    params = {
        "q": city,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric",
        "lang": "en",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(
            OPENWEATHER_URL,
            params=params,
        )

    if response.status_code == 404:
        raise ValueError("City not found")

    response.raise_for_status()

    return response.json()

OPENWEATHER_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"


async def get_forecast_data(city: str) -> dict:
    params = {
        "q": city,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric",
        "lang": "en",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(
            OPENWEATHER_FORECAST_URL,
            params=params,
        )

    if response.status_code == 404:
        raise ValueError("City not found")

    response.raise_for_status()

    return response.json()
