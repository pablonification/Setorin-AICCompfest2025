import os
from functools import lru_cache


class Settings:
    """Application settings loaded from environment variables."""

    MONGODB_URI: str = os.getenv("MONGODB_URI", "")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "smartbin")
    IOT_WS_URL: str = os.getenv("IOT_WS_URL", "ws://iot_simulator:8080")

    # Roboflow inference
    ROBOFLOW_API_KEY: str = os.getenv("ROBOFLOW_API_KEY", "")
    # Format: <workspace>/<model_name>/<version>
    ROBOFLOW_MODEL_ID: str = os.getenv("ROBOFLOW_MODEL_ID", "klasifikasi-per-merk/3")

    # Google OAuth2
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI")
    
    # JWT
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Admin and payouts
    ADMIN_EMAILS: str = os.getenv("ADMIN_EMAILS", "")  # comma-separated
    MIN_WITHDRAWAL_POINTS: int = int(os.getenv("MIN_WITHDRAWAL_POINTS", "20000"))


@lru_cache
def get_settings() -> Settings:  # pragma: no cover
    return Settings()
