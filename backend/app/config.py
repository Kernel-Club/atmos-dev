import os

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
MONGODB_URL = os.getenv("MONGODB_URL")
REDIS_URL = os.getenv("REDIS_URL")
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
