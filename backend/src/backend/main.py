from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from .routers import health, scan, ws, auth, notification, statistics, educational, transactions, esp32
from .routers.payout import router as payout_router
from .routers.rag import router as rag_router  # import rag separately after routers package initialized
from .routers.admin import router as admin_router
from pathlib import Path
from .db.mongo import connect_to_mongo, close_mongo_connection
from .services.ws_manager import start_websocket_manager, stop_websocket_manager
from .services.educational_service import EducationalService


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    await start_websocket_manager()
    # Seed initial infoin contents (idempotent)
    try:
        await EducationalService().seed_initial_education_contents()
    except Exception:
        # Seeding is best-effort; avoid blocking app startup
        pass
    yield
    # Shutdown
    await stop_websocket_manager()
    await close_mongo_connection()


app = FastAPI(lifespan=lifespan)

# Ensure debug image directory exists
Path("debug_images").mkdir(exist_ok=True)

# Add CORS middleware
# Build CORS allowed origins list from defaults plus environment overrides
default_allowed_origins = [
    # Local/dev
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    # Containers
    "http://smartbin-frontend:3000",
    "http://smartbin-frontend:8081",
    # Production (setorin.app)
    "https://setorin.app",
    "https://www.setorin.app",
]

def _expand_origin(origin: str) -> list[str]:
    """Expand bare host origins into http/https forms.

    Accepts inputs like:
    - "https://foo.bar" -> [same]
    - "http://foo.bar" -> [same]
    - "foo.bar" -> ["http://foo.bar", "https://foo.bar"]
    - "foo.bar/" -> strip trailing slash before expansion
    """
    if not origin:
        return []
    normalized = origin.strip().rstrip("/")
    if normalized.startswith("http://") or normalized.startswith("https://"):
        return [normalized]
    # Bare hostname provided
    return [f"http://{normalized}", f"https://{normalized}"]


extra_allowed: list[str] = []
env_single = os.getenv("ALLOWED_ORIGIN")
env_multi = os.getenv("ALLOWED_ORIGINS")
if env_single:
    extra_allowed.extend(_expand_origin(env_single))
if env_multi:
    for raw in env_multi.split(","):
        extra_allowed.extend(_expand_origin(raw))

# Final allowed origins (deduplicated, non-empty)
seen: set[str] = set()
allow_origins: list[str] = []
for origin in default_allowed_origins + extra_allowed:
    if origin and origin not in seen:
        seen.add(origin)
        allow_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=False,  # Set to False to avoid conflicts with allow_origins
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,  # Cache preflight for 24 hours
)

app.include_router(health.router)
app.include_router(scan.router)
app.include_router(ws.router)
app.include_router(auth.router)
app.include_router(notification.router)
app.include_router(statistics.router)
app.include_router(educational.router)
app.include_router(transactions.router)
app.include_router(esp32.router)
app.include_router(rag_router)
app.include_router(payout_router)
app.include_router(admin_router)

# Serve saved debug images under /debug
app.mount("/debug", StaticFiles(directory="debug_images"), name="debug")

# Serve static files (including RAG test frontend)
# app.mount("/static", StaticFiles(directory="static"), name="static")

# Serve RAG test frontend
rag_frontend_path = Path(__file__).parent.parent.parent.parent / "rag-test-frontend"
if rag_frontend_path.exists():
    app.mount("/rag-test", StaticFiles(directory=str(rag_frontend_path)), name="rag_frontend")


@app.get("/")
def read_root():
    return {"Hello": "FastAPI Backend"}