"""QR Code service for SmartBin system."""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..db.mongo import ensure_connection
from ..models.qr_code import (
    QRCode,
    QRCodeCreate,
    QRCodeResponse,
    QRCodeStatus,
    create_qr_code_document
)
from bson import ObjectId


class QRCodeService(ABC):
    """Abstract QR Code service interface."""

    @abstractmethod
    async def generate_qr_code(self, admin_user_id: str, qr_data: QRCodeCreate) -> QRCodeResponse:
        """Generate a new QR code."""
        pass

    @abstractmethod
    async def validate_qr_code(self, token: str, user_id: str) -> dict:
        """Validate a QR code token."""
        pass

    @abstractmethod
    async def get_qr_codes(self, admin_user_id: str, skip: int = 0, limit: int = 50) -> List[QRCodeResponse]:
        """Get QR codes for admin."""
        pass

    @abstractmethod
    async def deactivate_qr_code(self, qr_id: str, admin_user_id: str) -> bool:
        """Deactivate a QR code."""
        pass

    @abstractmethod
    async def cleanup_expired_qr_codes(self) -> int:
        """Clean up expired QR codes."""
        pass


class QRCodeServiceImpl(QRCodeService):
    """QR Code service implementation."""

    def __init__(self):
        self._db: Optional[AsyncIOMotorDatabase] = None

    async def _get_db(self) -> AsyncIOMotorDatabase:
        """Get database connection."""
        if self._db is None:
            self._db = await ensure_connection()
        return self._db

    async def generate_qr_code(self, admin_user_id: str, qr_data: QRCodeCreate) -> QRCodeResponse:
        """Generate a new QR code."""
        db = await self._get_db()

        # Create QR code document
        qr_code = create_qr_code_document(
            generated_by=ObjectId(admin_user_id),
            expires_in_hours=qr_data.expires_in_hours,
            max_uses=qr_data.max_uses,
            metadata=qr_data.metadata
        )

        # Save to database - Manually construct document to avoid serialization conflicts
        qr_data = {
            "_id": qr_code.id,
            "token": qr_code.token,
            "generated_by": qr_code.generated_by,
            "generated_at": qr_code.generated_at,
            "expires_at": qr_code.expires_at,
            "status": qr_code.status.value if hasattr(qr_code.status, 'value') else qr_code.status,
            "usage_count": qr_code.usage_count,
            "max_uses": qr_code.max_uses,
            "last_used_at": qr_code.last_used_at,
            "used_by": qr_code.used_by,
            "metadata": qr_code.metadata or {}
        }
        result = await db["qr_codes"].insert_one(qr_data)
        qr_code.id = result.inserted_id

        return QRCodeResponse.from_qr_code(qr_code)

    async def validate_qr_code(self, token: str, user_id: str) -> dict:
        """Validate a QR code token."""
        db = await self._get_db()

        # Find QR code by token
        qr_doc = await db["qr_codes"].find_one({"token": token})

        if not qr_doc:
            return {
                "valid": False,
                "reason": "QR code not found"
            }

        qr_code = QRCode(**qr_doc)
        now = datetime.now(timezone.utc)

        # Check if expired - handle timezone-naive datetimes from MongoDB
        expires_at = qr_code.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        if expires_at < now:
            # Update status to expired
            await db["qr_codes"].update_one(
                {"_id": qr_code.id},
                {"$set": {"status": QRCodeStatus.EXPIRED}}
            )
            return {
                "valid": False,
                "reason": "QR code has expired"
            }

        # Check if inactive
        if qr_code.status == QRCodeStatus.INACTIVE:
            return {
                "valid": False,
                "reason": "QR code is inactive"
            }

        # Check usage limit
        if qr_code.usage_count >= qr_code.max_uses:
            # Update status to used
            await db["qr_codes"].update_one(
                {"_id": qr_code.id},
                {"$set": {"status": QRCodeStatus.USED}}
            )
            return {
                "valid": False,
                "reason": "QR code usage limit exceeded"
            }

        # Valid QR code - increment usage
        await db["qr_codes"].update_one(
            {"_id": qr_code.id},
            {
                "$inc": {"usage_count": 1},
                "$set": {
                    "last_used_at": now,
                    "used_by": ObjectId(user_id)
                }
            }
        )

        return {
            "valid": True,
            "qr_id": str(qr_code.id),
            "remaining_uses": qr_code.max_uses - qr_code.usage_count - 1
        }

    async def get_qr_codes(self, admin_user_id: str, skip: int = 0, limit: int = 50) -> List[QRCodeResponse]:
        """Get QR codes for admin."""
        db = await self._get_db()

        # Find QR codes generated by this admin
        cursor = db["qr_codes"].find(
            {"generated_by": ObjectId(admin_user_id)}
        ).sort("generated_at", -1).skip(skip).limit(limit)

        qr_codes = []
        async for qr_doc in cursor:
            qr_code = QRCode(**qr_doc)
            qr_codes.append(QRCodeResponse.from_qr_code(qr_code))

        return qr_codes

    async def deactivate_qr_code(self, qr_id: str, admin_user_id: str) -> bool:
        """Deactivate a QR code."""
        db = await self._get_db()

        # Check if admin owns this QR code
        qr_doc = await db["qr_codes"].find_one({
            "_id": ObjectId(qr_id),
            "generated_by": ObjectId(admin_user_id)
        })

        if not qr_doc:
            return False

        # Deactivate QR code
        await db["qr_codes"].update_one(
            {"_id": ObjectId(qr_id)},
            {"$set": {"status": QRCodeStatus.INACTIVE}}
        )

        return True

    async def cleanup_expired_qr_codes(self) -> int:
        """Clean up expired QR codes."""
        db = await self._get_db()

        # Update expired QR codes
        result = await db["qr_codes"].update_many(
            {
                "expires_at": {"$lt": datetime.now(timezone.utc)},
                "status": {"$ne": QRCodeStatus.EXPIRED}
            },
            {"$set": {"status": QRCodeStatus.EXPIRED}}
        )

        return result.modified_count


# Singleton instance
_qr_code_service: Optional[QRCodeServiceImpl] = None


def get_qr_code_service() -> QRCodeServiceImpl:
    """Get QR code service instance."""
    global _qr_code_service
    if _qr_code_service is None:
        _qr_code_service = QRCodeServiceImpl()
    return _qr_code_service
