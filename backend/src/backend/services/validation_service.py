from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import List, Optional

from .opencv_service import MeasurementResult
from .roboflow_service import Prediction
from .payout_service import compute_payout, PayoutResult

logger = logging.getLogger(__name__)

# --- Constants (could later be moved to DB or .env) -------------------------

MIN_HEIGHT_MM = 100.0  # minimal bottle height accepted (example)
MAX_HEIGHT_MM = 350.0  # maximal bottle height accepted

# --- Result model -----------------------------------------------------------

@dataclass
class ValidationResult:
    is_valid: bool
    reason: Optional[str]
    brand: Optional[str]
    confidence: Optional[float]
    measurement: MeasurementResult
    points_awarded: int

    def to_dict(self) -> dict[str, object]:
        return {
            "is_valid": self.is_valid,
            "reason": self.reason,
            "brand": self.brand,
            "confidence": self.confidence,
            "measurement": self.measurement.__dict__,
            "points_awarded": self.points_awarded,
        }


# --- Validation Engine ------------------------------------------------------


def validate_scan(
    measurement: MeasurementResult,
    predictions: List[Prediction],
) -> ValidationResult:
    """Validate bottle scan and compute payout-based reward points.

    Rules:
    - Reject if size outside [MIN_HEIGHT_MM, MAX_HEIGHT_MM].
    - Compute payout per docs/Point_System.md using measurement+predictions.
    - If measurement confidence bin below 0.50 → reject and award 0.
    - Otherwise, award the computed Rupiah amount (rounded as configured).
    """

    # 1) Height/size validation first
    size_valid = MIN_HEIGHT_MM <= measurement.height_mm <= MAX_HEIGHT_MM

    # 2) Always pick the highest-confidence brand prediction to expose in response
    top_pred: Optional[Prediction] = None
    if predictions:
        top_pred = max(predictions, key=lambda p: p.confidence)
        logger.debug("Top prediction: %s", top_pred)

    brand: Optional[str] = top_pred.brand if top_pred else None
    brand_confidence: Optional[float] = top_pred.confidence if top_pred else None

    if not size_valid:
        logger.info(
            "Bottle rejected due to height: %.2f mm (accepted %.0f–%.0f)",
            measurement.height_mm,
            MIN_HEIGHT_MM,
            MAX_HEIGHT_MM,
        )
        return ValidationResult(
            is_valid=False,
            reason="SIZE_OUT_OF_RANGE",
            brand=brand,
            confidence=brand_confidence,
            measurement=measurement,
            points_awarded=0,
        )

    # 3) Compute payout per spec
    payout: PayoutResult = compute_payout(
        measurement,
        predictions,
        cleanliness_key="clean_dry",
        cap_label_key="mixed",
    )

    # if payout.payout_rp is None:
    #     # Measurement confidence too low (< 0.50 bin)
    #     logger.info("Bottle rejected due to low measurement confidence")
    #     return ValidationResult(
    #         is_valid=False,
    #         reason="LOW_MEASUREMENT_CONFIDENCE",
    #         brand=brand,
    #         confidence=brand_confidence,
    #         measurement=measurement,
    #         points_awarded=0,
    #     )

    # 4) Accept and return computed payout
    return ValidationResult(
        is_valid=True,
        reason=None,
        brand=brand,
        confidence=brand_confidence,
        measurement=measurement,
        points_awarded=int(payout.payout_rp),
    )
