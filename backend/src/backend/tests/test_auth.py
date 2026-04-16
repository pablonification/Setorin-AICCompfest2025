from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import json
import pytest
import httpx
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
    assert "/auth/me" in paths
    assert "/auth/refresh" in paths
