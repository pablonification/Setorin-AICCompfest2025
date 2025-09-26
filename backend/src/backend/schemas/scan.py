from __future__ import annotations

from pydantic import BaseModel
from typing import Optional


class ScanResponse(BaseModel):
    scan_id: Optional[str] = None
    transaction_id: Optional[str] = None
    is_valid: bool
    reason: Optional[str] = None
    brand: Optional[str] = None
    confidence: Optional[float] = None

    diameter_mm: float
    height_mm: float
    volume_ml: float

    points_awarded: int
    total_points: Optional[int] = None
    
    # New fields for async 2-phase scan
    status: Optional[str] = None  # PENDING_DEPOSIT, DEPOSIT_CONFIRMED, DEPOSIT_TIMEOUT
    action_id: Optional[str] = None
    deposit_timeout_seconds: Optional[int] = None
    
    # Transparency fields (optional)
    size_key: Optional[str] = None
    weight_g_used: Optional[float] = None
    price_per_kg: Optional[int] = None
    k_brand: Optional[float] = None
    k_conf: Optional[float] = None
    k_clean: Optional[float] = None
    k_cap: Optional[float] = None
    base_rp: Optional[float] = None
    debug_image: str | None = None  # base64 JPEG with reference/bboxes
    debug_url: str | None = None


class DepositConfirmationRequest(BaseModel):
    manual_confirmation: Optional[bool] = False


class DepositConfirmationResponse(BaseModel):
    status: str
    points_awarded: int
    total_points: Optional[int] = None
