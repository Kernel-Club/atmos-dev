from pydantic import BaseModel


class ForecastPoint(BaseModel):
    # Unix time in UTC; the frontend shows it in the user's time zone.
    timestamp: int
    temperature: int
    description: str


class ForecastResponse(BaseModel):
    city: str
    points: list[ForecastPoint]
