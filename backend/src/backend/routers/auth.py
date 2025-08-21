from __future__ import annotations

import httpx
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

from ..core.config import get_settings
from ..models.user import User
from ..db.mongo import ensure_connection
from ..schemas.auth import GoogleAuthResponse, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

settings = get_settings()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(credentials.credentials, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_admin(payload: dict = Depends(verify_token)) -> dict:
    """Require admin role for access"""
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload


def require_user_role(payload: dict = Depends(verify_token)) -> dict:
    """Require user role (non-admin) for access"""
    if payload.get("role") == "admin":
        raise HTTPException(status_code=403, detail="User access only - admins cannot access this endpoint")
    return payload


@router.get("/google/login")
async def google_login():
    """Redirect user to Google OAuth2 consent screen"""
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={settings.GOOGLE_REDIRECT_URI}&"
        "response_type=code&"
        "scope=openid email profile&"
        "access_type=offline"
    )
    return RedirectResponse(url=google_auth_url)


@router.get("/google/callback")
async def google_callback(code: str):
    """Handle Google OAuth2 callback and exchange code for tokens"""
    try:
        # Exchange authorization code for access token
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        }
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(token_url, data=token_data)
            token_response.raise_for_status()
            token_info = token_response.json()
            
            # Get user info using access token
            user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            headers = {"Authorization": f"Bearer {token_info['access_token']}"}
            user_response = await client.get(user_info_url, headers=headers)
            user_response.raise_for_status()
            user_info = user_response.json()
        
        # Get database connection using ensure_connection
        db = await ensure_connection()
        users_collection = db.users
        
        # Check if user exists, create if not
        existing_user = await users_collection.find_one({"email": user_info["email"]})
        
        if existing_user:
            # Determine role from ADMIN_EMAILS on every login
            admin_emails = getattr(settings, "ADMIN_EMAILS", "")
            is_admin = bool(admin_emails and any(e.strip().lower() == user_info["email"].lower() for e in admin_emails.split(",") if e.strip()))
            desired_role = "admin" if is_admin else "user"

            # Ensure role is present and up-to-date in DB
            current_role = existing_user.get("role", "user")
            if current_role != desired_role:
                await users_collection.update_one(
                    {"_id": existing_user["_id"]},
                    {"$set": {"role": desired_role}}
                )
                existing_user["role"] = desired_role

            user = User(**existing_user)
            user_id = str(existing_user["_id"])
        else:
            # Check if user should be admin based on email configuration
            admin_emails = getattr(settings, "ADMIN_EMAILS", "")
            is_admin = bool(admin_emails and any(e.strip().lower() == user_info["email"].lower() for e in admin_emails.split(",") if e.strip()))
            
            # Create new user
            user = User(
                email=user_info["email"],
                name=user_info.get("name", ""),
                points=0,
                scan_ids=[],
                role="admin" if is_admin else "user"
            )
            # Insert user and get the inserted ID
            result = await users_collection.insert_one(user.dict())
            user_id = str(result.inserted_id)
            # Update the user object with the actual ID from database
            user.id = result.inserted_id
        
        # Create JWT token with the correct user ID and role
        access_token = create_access_token(
            data={"sub": user_id, "email": user.email, "role": user.role}
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(
                id=user_id,
                email=user.email,
                name=user.name,
                points=user.points,
                role=user.role,
                tier=getattr(user, "tier", None)
            )
        )
        
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail=f"Google API error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


@router.get("/me", response_model=UserResponse)
async def get_current_user(payload: dict = Depends(verify_token)):
    """Get current authenticated user info"""
    from bson import ObjectId
    
    db = await ensure_connection()
    users_collection = db.users
    
    # Convert string ObjectId to ObjectId object
    user_id = ObjectId(payload["sub"])
    user = await users_collection.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user.get("name", ""),
        points=user.get("points", 0),
        role=user.get("role", "user"),
        tier=user.get("tier")
    )


@router.post("/refresh")
async def refresh_token(payload: dict = Depends(verify_token)):
    """Refresh JWT token"""
    # Create new token with same user data
    access_token = create_access_token(
        data={"sub": payload["sub"], "email": payload["email"], "role": payload.get("role", "user")}
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer"
    )
