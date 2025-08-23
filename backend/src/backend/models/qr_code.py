"""QR Code models for SmartBin system."""

import secrets
import string
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
from .common import MongoBaseModel, PyObjectId


class QRCodeStatus(str, Enum):
    """QR Code status enumeration."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"
    USED = "used"


class QRCode(MongoBaseModel):
    """QR Code document model."""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    token: str = Field(..., description="Unique QR code token")
    generated_by: PyObjectId = Field(..., description="Admin user who generated the code")
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(..., description="When the QR code expires")
    status: QRCodeStatus = Field(default=QRCodeStatus.ACTIVE)
    usage_count: int = Field(default=0, description="How many times this QR has been used")
    max_uses: int = Field(default=1, description="Maximum number of uses allowed")
    last_used_at: Optional[datetime] = Field(None, description="Last time this QR was used")
    used_by: Optional[PyObjectId] = Field(None, description="User who last used this QR code")
    metadata: Optional[dict] = Field(None, description="Additional metadata")

    class Config:
        populate_by_name = True
        json_encoders = {PyObjectId: str}


class QRCodeCreate(BaseModel):
    """QR Code creation request model."""
    expires_in_hours: int = Field(default=24, ge=1, le=720, description="Hours until expiration")
    max_uses: int = Field(default=1, ge=1, le=100, description="Maximum uses allowed")
    metadata: Optional[dict] = Field(None, description="Additional metadata")


class QRCodeResponse(BaseModel):
    """QR Code response model."""
    id: str = Field(..., description="QR code ID")
    token: str = Field(..., description="QR code token")
    expires_at: datetime = Field(..., description="Expiration timestamp")
    status: QRCodeStatus = Field(..., description="Current status")
    usage_count: int = Field(..., description="Current usage count")
    max_uses: int = Field(..., description="Maximum uses allowed")
    generated_at: datetime = Field(..., description="Generation timestamp")

    @classmethod
    def from_qr_code(cls, qr_code: QRCode) -> 'QRCodeResponse':
        """Create response from QR code document."""
        return cls(
            id=str(qr_code.id),
            token=qr_code.token,
            expires_at=qr_code.expires_at,
            status=qr_code.status,
            usage_count=qr_code.usage_count,
            max_uses=qr_code.max_uses,
            generated_at=qr_code.generated_at
        )


def generate_secure_token(length: int = 32) -> str:
    """Generate a secure random token for QR codes."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def create_qr_code_document(
    generated_by: PyObjectId,
    expires_in_hours: int = 24,
    max_uses: int = 1,
    metadata: Optional[dict] = None
) -> QRCode:
    """Create a new QR code document with secure token."""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=expires_in_hours)

    return QRCode(
        token=generate_secure_token(),
        generated_by=generated_by,
        generated_at=now,
        expires_at=expires_at,
        status=QRCodeStatus.ACTIVE,
        usage_count=0,
        max_uses=max_uses,
        metadata=metadata or {}
    )
