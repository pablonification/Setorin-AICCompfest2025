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
    """Detect an upright bottle inside a Region-Of-Interest using edge analysis.

    Implements a multi-path silhouette extraction and weighted contour scoring
    inspired by docs/Scanning_and_Measurement_Improvements.md.
    """

    def __init__(
        self,
        *,
        min_aspect_ratio: float = 1.2,
        max_tilt_deg: float = 20.0,
        # scoring weights (all non-negative, they are normalized relatively)
        weight_area: float = 1.0,
        weight_aspect: float = 1.0,
        weight_vertical: float = 1.0,
        weight_solidity: float = 1.0,
        weight_border: float = 0.5,
    ) -> None:
        self.min_aspect_ratio = min_aspect_ratio
        self.max_tilt_deg = max_tilt_deg
        self.weights = {
            "area": max(0.0, float(weight_area)),
            "aspect": max(0.0, float(weight_aspect)),
            "vertical": max(0.0, float(weight_vertical)),
            "solidity": max(0.0, float(weight_solidity)),
            "border": max(0.0, float(weight_border)),
        }

    # --- internal helpers ----------------------------------------------------
    @staticmethod
    def _to_gray(roi: np.ndarray) -> np.ndarray:
        if roi.ndim == 3:
            return cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        return roi

    @staticmethod
    def _morph_close(bin_img: np.ndarray, k: int = 5, iters: int = 1) -> np.ndarray:
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k, k))
        return cv2.morphologyEx(bin_img, cv2.MORPH_CLOSE, kernel, iterations=iters)

    def _mask_background_colors(self, roi: np.ndarray) -> np.ndarray:
        """Mask out brown/wooden background colors that interfere with detection."""
        if roi.ndim != 3:
            return roi  # Skip if already grayscale
            
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        
        # Mask brown/wooden colors (cabinet background)
        brown_lower = np.array([10, 50, 20])
        brown_upper = np.array([20, 255, 200]) 
        brown_mask = cv2.inRange(hsv, brown_lower, brown_upper)
        
        # Mask very bright/white areas (ceiling, lights)
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        _, bright_mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
        
        # Mask very dark areas that are likely shadows
        _, dark_mask = cv2.threshold(gray, 15, 255, cv2.THRESH_BINARY_INV)
        
        # Combine all masks
        background_mask = cv2.bitwise_or(brown_mask, bright_mask)
        background_mask = cv2.bitwise_or(background_mask, dark_mask)
        
        # Clean up mask with morphology
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        background_mask = cv2.morphologyEx(background_mask, cv2.MORPH_CLOSE, kernel)
        
        # Apply mask to ROI
        roi_masked = roi.copy()
        roi_masked[background_mask > 0] = [128, 128, 128]  # Set background to neutral gray
        
        return roi_masked

    def _correct_perspective(self, roi: np.ndarray) -> np.ndarray:
        """Basic perspective correction assuming bottle should be vertical."""
        h, w = roi.shape[:2]
        
        # Skip correction for very small ROIs
        if h < 100 or w < 50:
            return roi
            
        # Detect if there's significant perspective distortion
        # Look for dominant vertical lines that are tilted
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY) if roi.ndim == 3 else roi
        
        # Use HoughLines to detect dominant angle
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=int(h*0.3))
        
        if lines is None:
            return roi  # No correction needed
            
        # Find dominant vertical-ish lines - FIXED unpacking
        angles = []
        for line in lines[:10]:  # Check first 10 lines
            rho, theta = line[0]  # FIXED: lines has shape (N, 1, 2)
            angle_deg = np.degrees(theta)
            # Look for nearly vertical lines (80-100 degrees or -10 to 10 degrees)
            if (80 <= angle_deg <= 100) or (-10 <= angle_deg <= 10):
                angles.append(angle_deg)
                
        if not angles:
            return roi  # No vertical lines found
            
        # Calculate average tilt
        avg_angle = np.mean(angles)
        
        # Convert to correction angle (how much to rotate to make vertical)
        if avg_angle > 90:
            correction_angle = avg_angle - 90
        else:
            correction_angle = avg_angle
            
        # Only apply correction if tilt is significant (> 2 degrees)
        if abs(correction_angle) < 2:
            return roi
            
        # Apply perspective correction via rotation
        center = (w // 2, h // 2)
        rotation_matrix = cv2.getRotationMatrix2D(center, -correction_angle, 1.0)
        
        # Calculate new bounding dimensions
        cos_angle = abs(rotation_matrix[0, 0])
        sin_angle = abs(rotation_matrix[0, 1])
        new_w = int((h * sin_angle) + (w * cos_angle))
        new_h = int((h * cos_angle) + (w * sin_angle))
        
        # Adjust translation
        rotation_matrix[0, 2] += (new_w / 2) - center[0]
        rotation_matrix[1, 2] += (new_h / 2) - center[1]
        
        # Apply rotation
        corrected = cv2.warpAffine(roi, rotation_matrix, (new_w, new_h),
                                  flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        
        # Crop back to original size from center
        start_x = max(0, (new_w - w) // 2)
        start_y = max(0, (new_h - h) // 2)
        end_x = min(new_w, start_x + w)
        end_y = min(new_h, start_y + h)
        
        corrected_cropped = corrected[start_y:end_y, start_x:end_x]
        
        # Resize to original dimensions if needed
        if corrected_cropped.shape[:2] != (h, w):
            corrected_cropped = cv2.resize(corrected_cropped, (w, h))
            
        return corrected_cropped

    def _pipeline_candidates(self, roi: np.ndarray) -> List[np.ndarray]:
        """Enhanced pipeline with background masking and perspective correction.

        Pipelines:
        1) Adaptive threshold (Gaussian), then close/open
        2) Canny (hysteresis thresholds via MAD of gradients), then close
        3) CLAHE + Otsu threshold, then close
        4) Plastic bottle specific pipeline
        """
        # STEP 1: Apply background masking
        roi_masked = self._mask_background_colors(roi)
        
        # STEP 2: Apply perspective correction
        roi_corrected = self._correct_perspective(roi_masked)
        
        # STEP 3: Convert to grayscale for processing
        gray = self._to_gray(roi_corrected)
        h, w = gray.shape[:2]
        candidates: List[np.ndarray] = []

        # 1) Adaptive threshold
        try:
            adp = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, 3
            )
            adp = self._morph_close(adp, 5, 1)
            contours, _ = cv2.findContours(adp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            candidates.extend(contours)
        except Exception:
            pass

        # 2) Canny with MAD-based thresholds
        try:
            gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
            gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
            mag = cv2.magnitude(gx, gy)
            med = float(np.median(mag))
            mad = float(np.median(np.abs(mag - med)) + 1e-6)
            low = max(5.0, 1.5 * mad)
            high = max(low + 10.0, 3.0 * mad)
            edges = cv2.Canny(gray, low, high)
            edges = self._morph_close(edges, 5, 1)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            candidates.extend(contours)
        except Exception:
            pass

        # 3) CLAHE + Otsu
        try:
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            eq = clahe.apply(gray)
            _, otsu = cv2.threshold(eq, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            otsu = self._morph_close(otsu, 5, 1)
            contours, _ = cv2.findContours(otsu, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            candidates.extend(contours)
        except Exception:
            pass

        # 4) Plastic bottle specific pipeline
        try:
            # Bilateral filter to reduce noise while preserving edges
            bilateral = cv2.bilateralFilter(gray, 9, 75, 75)
            
            # Gradient-based detection for transparent edges
            grad_x = cv2.Sobel(bilateral, cv2.CV_16S, 1, 0, ksize=3)
            grad_y = cv2.Sobel(bilateral, cv2.CV_16S, 0, 1, ksize=3)
            abs_grad_x = cv2.convertScaleAbs(grad_x)
            abs_grad_y = cv2.convertScaleAbs(grad_y)
            gradient = cv2.addWeighted(abs_grad_x, 0.5, abs_grad_y, 0.5, 0)
            
            # Threshold gradient
            _, grad_thresh = cv2.threshold(gradient, 30, 255, cv2.THRESH_BINARY)
            grad_thresh = self._morph_close(grad_thresh, 3, 2)
            
            contours, _ = cv2.findContours(grad_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            candidates.extend(contours)
        except Exception:
            pass

        return candidates

    def _score_contour(self, cnt: np.ndarray, roi_shape: Tuple[int, int], *, min_area_px: int) -> float:
        h, w = roi_shape
        roi_area = float(h * w)
        area = float(cv2.contourArea(cnt))
        if area < float(min_area_px):  # hard gate: too small
            return -1e9

        rect = cv2.minAreaRect(cnt)
        (_, _), (wr, hr), angle = rect
        if wr <= 0 or hr <= 0:
            return -1e9
        visual_h = max(wr, hr)
        visual_w = min(wr, hr)
        if visual_w <= 0:
            return -1e9
        aspect = float(visual_h / visual_w)

        # Feature: area score (prefer in [min_area_px, 0.9 * roi_area])
        max_allowed = 0.9 * roi_area
        area_score = 0.0
        if area <= min_area_px:
            area_score = 0.0
        elif area >= max_allowed:
            area_score = 1.0
        else:
            area_score = (area - min_area_px) / max(1.0, (max_allowed - min_area_px))

        # Feature: aspect ratio (>= min_aspect_ratio) - IMPROVED for tall bottles
        aspect_score = 0.0
        if aspect >= self.min_aspect_ratio:
            # Favor very tall bottles (2.5+ aspect ratio) more
            if aspect >= 2.5:
                aspect_score = min(1.0, aspect / 4.0)  # Reward up to 4:1 ratio
            else:
                aspect_score = min(1.0, (aspect / max(1e-6, self.min_aspect_ratio)) / 3.0)
        else:
            aspect_score = max(0.0, (aspect / max(1e-6, self.min_aspect_ratio)) - 0.2)

        # Feature: vertical alignment score based on tilt
        if hr >= wr:
            tilt = abs(float(angle))
        else:
            tilt = abs(90.0 - abs(float(angle)))
        vertical_score = 1.0 - min(1.0, (tilt / max(1e-6, self.max_tilt_deg)) ** 2)

        # Feature: solidity (area / convex hull area)
        try:
            hull = cv2.convexHull(cnt)
            hull_area = float(cv2.contourArea(hull))
            solidity = 0.0 if hull_area <= 0 else float(area / hull_area)
        except Exception:
            solidity = 0.0
        solidity_score = float(np.clip(solidity, 0.0, 1.0))

        # Feature: border penalty -> score 1.0 when far from borders, 0 near borders
        x, y, bw, bh = cv2.boundingRect(cnt)
        margin = max(5, int(0.02 * min(w, h)))
        dist_left = x
        dist_top = y
        dist_right = w - (x + bw)
        dist_bottom = h - (y + bh)
        min_dist = float(min(dist_left, dist_top, dist_right, dist_bottom))
        border_score = float(np.clip(min_dist / float(margin), 0.0, 1.0))

        # NEW: Position feature (prefer bottles in center of frame)
        M = cv2.moments(cnt)
        if M["m00"] != 0:
            cx = M["m10"] / M["m00"]
            cy = M["m01"] / M["m00"]
            
            # Distance from center
            center_x, center_y = w / 2, h / 2
            dist_from_center = np.sqrt((cx - center_x)**2 + (cy - center_y)**2)
            max_dist = np.sqrt(center_x**2 + center_y**2)
            position_score = 1.0 - (dist_from_center / max_dist)
        else:
            position_score = 0.0

        # Weighted sum - ENHANCED with position feature
        w_area = self.weights["area"]
        w_aspect = self.weights["aspect"]
        w_vert = self.weights["vertical"]
        w_sol = self.weights["solidity"]
        w_border = self.weights["border"]
        w_pos = 0.3  # NEW weight for position
        
        total_w = max(1e-6, (w_area + w_aspect + w_vert + w_sol + w_border + w_pos))
        score = (
            w_area * area_score
            + w_aspect * aspect_score
            + w_vert * vertical_score
            + w_sol * solidity_score
            + w_border * border_score
            + w_pos * position_score
        ) / total_w

        return float(score)

    def detect(self, roi: np.ndarray, min_area_px: int) -> PixelBottleInfo:
        contours = self._pipeline_candidates(roi)
        if not contours:
            raise MeasurementError("Bottle not found in ROI.")

        h, w = roi.shape[:2]
        best_cnt: Optional[np.ndarray] = None
        best_score = -1e9
        for cnt in contours:
            sc = self._score_contour(cnt, (h, w), min_area_px=min_area_px)
            if sc > best_score:
                best_score = sc
                best_cnt = cnt

        if best_cnt is None:
            raise MeasurementError("Bottle not found in ROI.")

        rect = cv2.minAreaRect(best_cnt)
        (_, _), (w_raw, h_raw), _ = rect
        visual_h = max(w_raw, h_raw)
        visual_w = min(w_raw, h_raw)
        box = np.intp(cv2.boxPoints(rect))
        return PixelBottleInfo(
            pixel_width=float(visual_w),
            pixel_height=float(visual_h),
            contour=best_cnt,
            box_points=box,
        )


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
        # Detector weighting parameters (silhouette scoring) - OPTIMIZED WEIGHTS
        detector_weight_area: float = 0.7,
        detector_weight_aspect: float = 1.8,
        detector_weight_vertical: float = 1.6,
        detector_weight_solidity: float = 0.9,
        detector_weight_border: float = 1.4,
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
        self.detector = BottleDetector(
            min_aspect_ratio=1.2,
            max_tilt_deg=20.0,
            weight_area=detector_weight_area,
            weight_aspect=detector_weight_aspect,
            weight_vertical=detector_weight_vertical,
            weight_solidity=detector_weight_solidity,
            weight_border=detector_weight_border,
        )

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

        # Optional detection ROI from predictions (Roboflow) - REDUCED MARGIN
        det_rect = self._build_detection_rect_from_predictions(
            img_width=img.shape[1],
            img_height=img.shape[0],
            predictions=predictions,
            margin_ratio=0.00,  # REDUCED from 0.15 to 0.05 for tighter bounds
        ) if predictions else None

        # Choose final ROI: prefer intersection(ref, det) when viable
        roi_source = "reference"
        roi_offset_x, roi_offset_y = 0, 0  # Track ROI offset for coordinate translation
        
        if det_rect is not None:
            inter = self._intersect_rect(ref_rect, det_rect)
            if inter is not None and self._rect_area(inter) >= 0.2 * self._rect_area(det_rect):
                x, y, w, h = inter
                roi = img[y : y + h, x : x + w]
                roi_offset_x, roi_offset_y = x, y
                roi_source = "intersection"
            else:
                # Fall back to detection ROI if valid, otherwise reference ROI
                x, y, w, h = det_rect
                if w > 1 and h > 1:
                    roi = img[y : y + h, x : x + w]
                    roi_offset_x, roi_offset_y = x, y
                    roi_source = "detection"
                else:
                    roi = ref_roi
                    roi_offset_x, roi_offset_y = 0, 0
                    roi_source = "reference"
        else:
            roi = ref_roi
            roi_offset_x, roi_offset_y = 0, 0
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
            # Draw bottle contour and box in absolute image coordinates
            # Translate ROI-relative coordinates to absolute image coordinates
            abs_contour = bottle_info.contour.copy()
            abs_contour[:, :, 0] += roi_offset_x
            abs_contour[:, :, 1] += roi_offset_y
            cv2.drawContours(debug, [abs_contour], -1, (0, 0, 255), 2)
            
            # Translate box points to absolute coordinates
            abs_box_points = bottle_info.box_points.copy()
            abs_box_points[:, 0] += roi_offset_x
            abs_box_points[:, 1] += roi_offset_y
            cv2.drawContours(debug, [abs_box_points], -1, (255, 0, 0), 2)
            
            # Put size label (height x diameter in mm) at translated coordinates
            size_label = f"{height_mm:.0f}x{diameter_mm:.0f} mm"
            label_x = abs_box_points[0][0]
            label_y = abs_box_points[0][1] - 10
            cv2.putText(
                debug,
                size_label,
                (label_x, label_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 255, 0),  # Changed to yellow for better visibility
                2,
            )
            if classification:
                class_y = max(abs_box_points[:, 1]) + 20
                cv2.putText(
                    debug,
                    classification,
                    (label_x, class_y),
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
