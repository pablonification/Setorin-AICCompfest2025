from __future__ import annotations

from pydantic import BaseModel
from typing import Optional, Literal
from datetime import date


class GoogleAuthResponse(BaseModel):
    auth_url: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: Optional["UserResponse"] = None


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    photo_url: Optional[str] = None
    points: int
    role: str = "user"
    tier: Optional[str] = None
    phone: Optional[str] = None
    birthdate: Optional[date] = None
    city: Optional[str] = None
    gender: Optional[Literal["Pria", "Wanita", "Rahasia"]] = None


class LoginRequest(BaseModel):
    """Login request (if needed for future non-OAuth login)"""
    email: str
    password: str


class ProfileUpdateRequest(BaseModel):
    """Profile update request"""
    name: str
    email: str
    phone: Optional[str] = None
    birthdate: Optional[date] = None
    city: Optional[str] = None
    gender: Optional[Literal["Pria", "Wanita", "Rahasia"]] = None


# Update forward references
TokenResponse.model_rebuild()
UserResponse.model_rebuild()
