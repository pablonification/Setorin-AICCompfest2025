import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


CURRENT_FILE = Path(__file__).resolve()
BACKEND_ROOT = CURRENT_FILE.parents[3]
REPO_ROOT = CURRENT_FILE.parents[4]

# Load local environment files when running outside Docker.
load_dotenv(REPO_ROOT / ".env", override=False)
load_dotenv(BACKEND_ROOT / ".env", override=False)


class Settings:
    """Application settings loaded from environment variables."""

    MONGODB_URI: str = os.getenv("MONGODB_URI", "")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "smartbin")
    IOT_WS_URL: str = os.getenv("IOT_WS_URL", "ws://iot_simulator:8080")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "https://api.setorin.app")

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

    # Simple local auth for legacy/dev access
    SIMPLE_AUTH_USERNAME: str = os.getenv("SIMPLE_AUTH_USERNAME", "admin")
    SIMPLE_AUTH_PASSWORD: str = os.getenv("SIMPLE_AUTH_PASSWORD", "setorin123")
    SIMPLE_AUTH_EMAIL: str = os.getenv("SIMPLE_AUTH_EMAIL", "user@local.setorin")
    SIMPLE_AUTH_NAME: str = os.getenv("SIMPLE_AUTH_NAME", "Local User")
    SIMPLE_AUTH_ROLE: str = os.getenv("SIMPLE_AUTH_ROLE", "user")

    # Admin and payouts
    ADMIN_EMAILS: str = os.getenv("ADMIN_EMAILS", "")  # comma-separated
    MIN_WITHDRAWAL_POINTS: int = int(os.getenv("MIN_WITHDRAWAL_POINTS", "20000"))

    # Feature flags
    USE_DETECTION_ROI_FUSION: bool = os.getenv("USE_DETECTION_ROI_FUSION", "true").lower() in ("1", "true", "yes")


@lru_cache
def get_settings() -> Settings:  # pragma: no cover
    return Settings()
