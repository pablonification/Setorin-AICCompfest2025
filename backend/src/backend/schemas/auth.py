from __future__ import annotations

from pydantic import BaseModel
from typing import Optional


class GoogleAuthResponse(BaseModel):
    auth_url: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    points: int
    role: str = "user"  # Default role for backward compatibility


class LoginRequest(BaseModel):
    """Login request (if needed for future non-OAuth login)"""
    email: str
    password: str


# Update forward references
TokenResponse.model_rebuild()
UserResponse.model_rebuild()
