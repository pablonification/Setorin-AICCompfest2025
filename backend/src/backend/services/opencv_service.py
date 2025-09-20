from __future__ import annotations

import math
import logging
from dataclasses import dataclass
from typing import Tuple, Union, Optional, List, Any

import cv2
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class MeasurementResult:
    """Bottle measurement in millimeters and volume in milliliters."""

    diameter_mm: float
    height_mm: float
    volume_ml: float
    # Additional optional fields produced by the advanced pipeline
    classification: str | None = None
    confidence_percent: float | None = None


class MeasurementError(RuntimeError):
    pass

# ---------------------------------------------------------------------------
# Advanced detection helpers
# ---------------------------------------------------------------------------

@dataclass
class PixelBottleInfo:
    """Bottle data measured in *pixels* within the ROI."""

    pixel_width: float  # visual width (shorter side)
    pixel_height: float  # visual height (longer side)
    contour: np.ndarray
    box_points: np.ndarray


class BottleDetector:
    """Detect an upright bottle inside a Region-Of-Interest using edge analysis."""

    def __init__(
        self,
        *,
        min_aspect_ratio: float = 1.2,
        max_tilt_deg: float = 20.0,
    ) -> None:
        self.min_aspect_ratio = min_aspect_ratio
        self.max_tilt_deg = max_tilt_deg

    # --- internal helpers ----------------------------------------------------
    @staticmethod
    def _preprocess_roi(roi: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blur, 40, 120)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=1)
        return closed

    def detect(self, roi: np.ndarray, min_area_px: int) -> PixelBottleInfo:
        processed = self._preprocess_roi(roi)
        contours, _ = cv2.findContours(
            processed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        best: PixelBottleInfo | None = None
        max_area = 0.0
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area_px:
                continue
            rect = cv2.minAreaRect(cnt)
            (_, _), (w_raw, h_raw), angle = rect
            visual_h = max(w_raw, h_raw)
            visual_w = min(w_raw, h_raw)
            if visual_w == 0:
                continue
            aspect = visual_h / visual_w
            if aspect < self.min_aspect_ratio:
                continue
            # Upright check ----------------------------------------------------
            upright = False
            if h_raw >= w_raw:  # height is visual height
                upright = abs(angle) < self.max_tilt_deg
            else:  # width is visual height -> expect vertical orientation
                deviation = abs(90.0 - abs(angle))
                upright = deviation < self.max_tilt_deg
            if not upright:
                continue
            if area > max_area:
                max_area = area
                box = np.intp(cv2.boxPoints(rect))
                best = PixelBottleInfo(
                    pixel_width=visual_w,
                    pixel_height=visual_h,
                    contour=cnt,
                    box_points=box,
                )
        if best is None:
            raise MeasurementError("Bottle not found in ROI.")
        return best


class BottleMeasurer:
    """Measure bottle dimensions using a coloured reference object for scale calibration.

    The algorithm expects a solid-colour reference rectangle (or any blob) at the
    bottom of the frame. Region of interest (ROI) above that reference will be
    analysed to detect the bottle silhouette.
    """

    def __init__(
        self,
        # Real-world height of the coloured reference marker in millimetres.
        # The reference marker is expected to be placed upright so that its
        # *height* on the image corresponds to this value. 16 cm (160 mm) is
        # used as default based on the current setup described by the user.
        #
        # NOTE: We keep *ref_real_width_mm* as a legacy alias for backwards
        # compatibility so existing calls that still provide the old argument
        # name continue to work. If *ref_real_width_mm* is supplied it will
        # override *ref_real_height_mm*.
        ref_real_height_mm: float = 160.0,
        *,
        ref_real_width_mm: float | None = None,  # legacy alias, optional
        ref_hsv_lower: Tuple[int, int, int] = (0, 0, 0),    # black lower HSV
        ref_hsv_upper: Tuple[int, int, int] = (180, 255, 50),  # black upper HSV
        # NEW parameters ------------------------------------------------------
        classify: bool = True,
        known_bottle_specs: dict[str, dict[str, float]] | None = None,
        tolerance_percent: float = 30.0,
    ) -> None:
        if ref_real_width_mm is not None:
            # Provided via legacy param name – treat it as height value to
            # maintain the original behaviour for callers that pass only a
            # positional value.
            ref_real_height_mm = ref_real_width_mm

        self.ref_real_height_mm = ref_real_height_mm
        self.ref_hsv_lower = np.array(ref_hsv_lower, dtype=np.uint8)
        self.ref_hsv_upper = np.array(ref_hsv_upper, dtype=np.uint8)
        # Advanced pipeline configuration ------------------------------------
        self.classify = classify
        self.known_specs = (
            known_bottle_specs
            if known_bottle_specs is not None
            else {
                "200mL": {"volume_ml": 200},
                "500mL": {"volume_ml": 500},
                "600mL": {"volume_ml": 600},  # Added to match payout service expectations
                "1000mL": {"volume_ml": 1000},
            }
        )
        self.tolerance_percent = tolerance_percent
        self.detector = BottleDetector()

    def _find_reference(self, hsv: np.ndarray) -> Tuple[int, int, int, int]:
        """Return bounding box (x, y, w, h) of reference object in HSV image."""
        mask = cv2.inRange(hsv, self.ref_hsv_lower, self.ref_hsv_upper)
        # Morphological cleanup
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            raise MeasurementError("Reference object not found in image.")
        # Choose the largest contour as reference
        contour = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(contour)
        if w < 10 or h < 10:  # sanity check
            raise MeasurementError("Reference object size too small.")
        logger.debug("Reference bbox: x=%d y=%d w=%d h=%d", x, y, w, h)
        return x, y, w, h

    def _extract_bottle_contour(self, roi_gray: np.ndarray) -> np.ndarray:
        """Return contour corresponding to the bottle silhouette."""
        # Edge detection & thresholding
        blur = cv2.GaussianBlur(roi_gray, (5, 5), 0)
        _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        # Invert (bottle is darker/lighter?) – choose largest contour regardless
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            raise MeasurementError("No contours found in ROI for bottle.")
        # Prefer contours that are fully inside ROI (not touching borders)
        h_roi, w_roi = roi_gray.shape[:2]
        candidates = sorted(contours, key=cv2.contourArea, reverse=True)
        for c in candidates:
            x, y, w, h = cv2.boundingRect(c)
            if x > 2 and y > 2 and x + w < w_roi - 2 and y + h < h_roi - 2:
                return c  # good candidate

        # Fallback to largest contour if none fit the criteria
        return candidates[0]

    def measure(
        self,
        image_bytes: bytes,
        *,
        predictions: Optional[List[Any]] = None,
        return_debug: bool = False,
    ) -> Union[MeasurementResult, Tuple[MeasurementResult, bytes]]:
        # Decode image bytes to BGR
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise MeasurementError("Invalid image data provided.")

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        x_ref, y_ref, w_ref, h_ref = self._find_reference(hsv)

        # Calibrate the pixel-to-millimetre scale using the HEIGHT of the
        # reference marker instead of its width. This significantly improves
        # accuracy when the marker is a tall and narrow object.
        scale = self.ref_real_height_mm / h_ref  # mm per pixel
        logger.debug("Scale: %.4f mm/pixel", scale)

        # Define ROI above the reference object (reference ROI)
        # Ensure we have a valid ROI (at least some pixels above the reference)
        if y_ref <= 0:
            # If reference is at the top, use the entire image as ROI
            ref_roi = img
            ref_rect = (0, 0, img.shape[1], img.shape[0])
            logger.warning("Reference at top of image, using entire image as ROI")
        else:
            ref_roi = img[: y_ref, :]
            ref_rect = (0, 0, img.shape[1], y_ref)
            logger.debug("Reference ROI dimensions: %dx%d", ref_roi.shape[1], ref_roi.shape[0])

        # Optional detection ROI from predictions (Roboflow)
        det_rect = self._build_detection_rect_from_predictions(
            img_width=img.shape[1],
            img_height=img.shape[0],
            predictions=predictions,
            margin_ratio=0.15,
        ) if predictions else None

        # Choose final ROI: prefer intersection(ref, det) when viable
        roi_source = "reference"
        if det_rect is not None:
            inter = self._intersect_rect(ref_rect, det_rect)
            if inter is not None and self._rect_area(inter) >= 0.2 * self._rect_area(det_rect):
                x, y, w, h = inter
                roi = img[y : y + h, x : x + w]
                roi_source = "intersection"
            else:
                # Fall back to detection ROI if valid, otherwise reference ROI
                x, y, w, h = det_rect
                if w > 1 and h > 1:
                    roi = img[y : y + h, x : x + w]
                    roi_source = "detection"
                else:
                    roi = ref_roi
                    roi_source = "reference"
        else:
            roi = ref_roi
            roi_source = "reference"

        # Validate ROI is not empty
        if roi.size == 0:
            raise MeasurementError("ROI is empty - cannot detect bottle")

        # Dynamic min area threshold (~0.5 cm²) expressed in pixels
        # Reduced from 4 cm² to 0.5 cm² to be more tolerant of smaller bottles in images
        pixel_per_cm = 10.0 / scale  # mm→px conversion (scale = mm/px)
        min_area_px = int((pixel_per_cm ** 2) * 0.5)

        # Detect bottle using the advanced detector
        bottle_info = self.detector.detect(roi, min_area_px)

        height_mm = bottle_info.pixel_height * scale
        diameter_mm = bottle_info.pixel_width * scale

        # Volume estimation (cylinder approximation)
        radius_cm = (diameter_mm / 10) / 2  # convert to cm
        height_cm = height_mm / 10
        volume_cm3 = math.pi * radius_cm**2 * height_cm
        volume_ml = volume_cm3  # 1 cm3 = 1 ml

        # Optional volume-based classification --------------------------------
        classification: str | None = None
        confidence: float | None = None
        if self.classify:
            classification, confidence = self._classify_volume(volume_ml)

        logger.debug(
            "Measured bottle – diameter_mm=%.2f height_mm=%.2f volume_ml=%.2f",
            diameter_mm,
            height_mm,
            volume_ml,
        )

        debug_img_bytes: bytes | None = None
        if return_debug:
            debug = img.copy()
            # Reference bbox in green
            cv2.rectangle(debug, (x_ref, y_ref), (x_ref + w_ref, y_ref + h_ref), (0, 255, 0), 2)
            # Draw chosen ROI rectangle in yellow with source label
            if roi_source == "reference":
                rx, ry, rw, rh = ref_rect
            elif roi_source == "detection" and det_rect is not None:
                rx, ry, rw, rh = det_rect
            elif roi_source == "intersection" and det_rect is not None:
                inter = self._intersect_rect(ref_rect, det_rect)
                if inter is not None:
                    rx, ry, rw, rh = inter
                else:
                    rx, ry, rw, rh = ref_rect
            else:
                rx, ry, rw, rh = ref_rect
            cv2.rectangle(debug, (rx, ry), (rx + rw, ry + rh), (0, 255, 255), 2)
            cv2.putText(
                debug,
                f"ROI: {roi_source}",
                (rx + 5, max(0, ry - 8)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 255),
                2,
            )
            # Bottle contour & rotated box in red/blue (draw on debug in absolute coords not available)
            # As we don't track absolute offsets for ROI, we only draw the rotated box shape relative to ROI
            # Skipping absolute overlay for contour to avoid misalignment; ROI box provides context.
            # Put size label (height x diameter in mm)
            size_label = f"{height_mm:.0f}x{diameter_mm:.0f} mm"
            cv2.putText(
                debug,
                size_label,
                (bottle_info.box_points[0][0], bottle_info.box_points[0][1] - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 255),
                2,
            )
            if classification:
                cv2.putText(
                    debug,
                    classification,
                    (bottle_info.box_points[0][0], max(bottle_info.box_points[:, 1]) + 20),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (255, 0, 255),
                    2,
                )
            # Encode to JPEG
            _, buf = cv2.imencode('.jpg', debug)
            debug_img_bytes = buf.tobytes()

        result = MeasurementResult(
            diameter_mm=round(diameter_mm, 2),
            height_mm=round(height_mm, 2),
            volume_ml=round(volume_ml, 2),
            classification=classification,
            confidence_percent=confidence,
        )

        if return_debug:
            return result, debug_img_bytes  # type: ignore[return-value]

        return result

    # ---------------------------------------------------------------------
    # Internal helpers
    # ---------------------------------------------------------------------
    @staticmethod
    def _rect_area(rect: Tuple[int, int, int, int]) -> int:
        x, y, w, h = rect
        return max(0, w) * max(0, h)

    @staticmethod
    def _intersect_rect(
        a: Tuple[int, int, int, int], b: Tuple[int, int, int, int]
    ) -> Optional[Tuple[int, int, int, int]]:
        ax, ay, aw, ah = a
        bx, by, bw, bh = b
        x1 = max(ax, bx)
        y1 = max(ay, by)
        x2 = min(ax + aw, bx + bw)
        y2 = min(ay + ah, by + bh)
        w = x2 - x1
        h = y2 - y1
        if w <= 0 or h <= 0:
            return None
        return (int(x1), int(y1), int(w), int(h))

    @staticmethod
    def _expand_and_clamp_rect(
        x: float,
        y: float,
        w: float,
        h: float,
        *,
        img_w: int,
        img_h: int,
        margin_ratio: float = 0.15,
    ) -> Tuple[int, int, int, int]:
        mx = w * margin_ratio
        my = h * margin_ratio
        x0 = int(max(0, round(x - mx)))
        y0 = int(max(0, round(y - my)))
        x1 = int(min(img_w, round(x + w + mx)))
        y1 = int(min(img_h, round(y + h + my)))
        return (x0, y0, max(0, x1 - x0), max(0, y1 - y0))

    def _build_detection_rect_from_predictions(
        self,
        *,
        img_width: int,
        img_height: int,
        predictions: Optional[List[Any]],
        margin_ratio: float,
    ) -> Optional[Tuple[int, int, int, int]]:
        """Return an expanded, clamped detection ROI from predictions, if available.

        Assumes Roboflow-style center-based boxes when present: (x_center, y_center, width, height) in pixels.
        If values appear to already be top-left, the clamping step still keeps it valid.
        """
        if not predictions:
            return None
        # Pick the highest-confidence prediction that has a box
        best = None
        best_conf = -1.0
        for p in predictions:
            try:
                px = getattr(p, "x", None)
                py = getattr(p, "y", None)
                pw = getattr(p, "width", None)
                ph = getattr(p, "height", None)
                conf = float(getattr(p, "confidence", 0.0))
            except Exception:
                continue
            if px is None or py is None or pw is None or ph is None:
                continue
            if pw <= 1 or ph <= 1:
                continue
            if conf > best_conf:
                best_conf = conf
                best = (float(px), float(py), float(pw), float(ph))
        if best is None:
            return None

        cx, cy, bw, bh = best
        # Convert center-based to top-left
        x0 = cx - bw / 2.0
        y0 = cy - bh / 2.0
        det_rect = self._expand_and_clamp_rect(
            x0, y0, bw, bh, img_w=img_width, img_h=img_height, margin_ratio=margin_ratio
        )
        if det_rect[2] <= 1 or det_rect[3] <= 1:
            return None
        return det_rect
    def _classify_volume(self, volume_ml: float) -> Tuple[str, float]:
        """Classify bottle size by comparing estimated volume to known specs."""
        best_label = "Other"
        min_diff = float("inf")
        for label, spec in self.known_specs.items():
            target = spec["volume_ml"]
            diff_pct = abs(volume_ml - target) / target * 100
            if diff_pct < min_diff:
                min_diff = diff_pct
                best_label = label
        if min_diff <= self.tolerance_percent:
            return best_label, 100.0 - min_diff
        return f"Other ({volume_ml:.0f}mL)", max(0.0, 100.0 - min_diff)
