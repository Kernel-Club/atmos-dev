import os

os.environ["REDIS_URL"] = "redis://localhost:6379"

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@patch(
    "app.services.weather.save_weather_history",
    new_callable=AsyncMock,
)
@patch(
    "app.services.weather.redis_client",
)
@patch(
    "app.services.weather.get_current_weather",
    new_callable=AsyncMock,
)
def test_weather_success(
    mock_get_weather,
    mock_redis,
    mock_save_history,
):
    mock_redis.get = AsyncMock(return_value=None)
    mock_redis.set = AsyncMock()

    mock_get_weather.return_value = {
        "name": "Seoul",
        "main": {
            "temp": 18.76,
            "humidity": 77,
        },
        "weather": [
            {
                "description": "clear sky",
            }
        ],
    }

    response = client.get("/api/weather/Seoul")

    assert response.status_code == 200
    assert response.json() == {
        "city": "Seoul",
        "temperature": 19,
        "description": "clear sky",
        "humidity": 77,
    }


@patch(
    "app.services.weather.save_weather_history",
    new_callable=AsyncMock,
)
@patch(
    "app.services.weather.redis_client",
)
@patch(
    "app.services.weather.get_current_weather",
    new_callable=AsyncMock,
)
def test_weather_city_not_found(
    mock_get_weather,
    mock_redis,
    mock_save_history,
):
    mock_redis.get = AsyncMock(return_value=None)
    mock_get_weather.side_effect = ValueError("City not found")

    response = client.get("/api/weather/notfound")

    assert response.status_code == 404
    assert response.json() == {"detail": "City not found"}