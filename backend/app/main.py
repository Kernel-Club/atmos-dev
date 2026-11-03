from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS, OPENWEATHER_API_KEY
from app.services.history import clear_weather_history, get_weather_history
from app.services.weather import get_weather

app = FastAPI(
    title="Project Atmos API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@api.get("/config-check")
async def config_check() -> dict[str, bool]:
    return {"openweather_configured": bool(OPENWEATHER_API_KEY)}

@api.get("/weather/{city}")
async def weather(city: str):
    try:
        return await get_weather(city)
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )

@api.get("/history")
async def history():
    return await get_weather_history()

@api.delete("/history")
async def clear_history():
    await clear_weather_history()
    return {"status": "ok"}


app.include_router(api)
