from __future__ import annotations

import sys
from pathlib import Path

from fastapi import status
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Ensure backend package importable when running as script
# ---------------------------------------------------------------------------
CURRENT_FILE = Path(__file__).resolve()
PROJECT_ROOT = CURRENT_FILE.parents[4]
BACKEND_SRC = PROJECT_ROOT / "backend" / "src"
sys.path.insert(0, str(BACKEND_SRC))

from src.backend.main import app  # noqa: E402
from src.backend.routers import auth as auth_router  # noqa: E402


def test_auth_router_imported():
    """Test that auth router can be imported."""
    assert auth_router is not None


def test_auth_endpoints_exist():
    """Test that auth endpoints are registered in the app."""
    client = TestClient(app)
    
    # Check if auth endpoints exist
    resp = client.get("/docs")
    assert resp.status_code == 200
    
    # Check if auth router is included
    assert "auth" in resp.text


def test_auth_endpoints_registered():
    """Test that auth endpoints are properly registered."""
    client = TestClient(app)
    
    # Check if auth endpoints exist in OpenAPI spec
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    
    openapi_data = resp.json()
    paths = openapi_data.get("paths", {})
    
    # Check if auth endpoints are present
    assert "/auth/google/login" in paths
    assert "/auth/google/callback" in paths
    assert "/auth/login" in paths
    assert "/auth/me" in paths
    assert "/auth/refresh" in paths


class _FakeInsertResult:
    def __init__(self, inserted_id: str):
        self.inserted_id = inserted_id


class _FakeUsersCollection:
    def __init__(self):
        self.user = None

    async def find_one(self, query):
        if self.user and self.user.get("email") == query.get("email"):
            return self.user
        return None

    async def insert_one(self, document):
        self.user = {**document, "_id": "507f1f77bcf86cd799439011"}
        return _FakeInsertResult(self.user["_id"])

    async def update_one(self, query, update):
        if self.user and self.user.get("_id") == query.get("_id"):
            self.user.update(update.get("$set", {}))


class _FakeDB:
    def __init__(self):
        self.users = _FakeUsersCollection()


def test_simple_login_returns_token(monkeypatch):
    fake_db = _FakeDB()

    async def _fake_ensure_connection():
        return fake_db

    monkeypatch.setattr(auth_router, "ensure_connection", _fake_ensure_connection)
    monkeypatch.setattr(auth_router.settings, "SIMPLE_AUTH_USERNAME", "admin")
    monkeypatch.setattr(auth_router.settings, "SIMPLE_AUTH_PASSWORD", "setorin123")
    monkeypatch.setattr(auth_router.settings, "SIMPLE_AUTH_EMAIL", "admin@local.setorin")
    monkeypatch.setattr(auth_router.settings, "SIMPLE_AUTH_NAME", "Local Admin")
    monkeypatch.setattr(auth_router.settings, "SIMPLE_AUTH_ROLE", "admin")
    monkeypatch.setattr(auth_router.settings, "JWT_SECRET_KEY", "test-secret")

    client = TestClient(app)
    response = client.post(
        "/auth/login",
        json={"username": "admin", "password": "setorin123"},
    )

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()

    assert payload["token_type"] == "bearer"
    assert payload["access_token"]
    assert payload["user"]["email"] == "admin@local.setorin"
    assert payload["user"]["role"] == "admin"


def test_simple_login_rejects_invalid_credentials():
    client = TestClient(app)
    response = client.post(
        "/auth/login",
        json={"username": "wrong", "password": "creds"},
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
