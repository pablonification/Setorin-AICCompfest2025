#!/usr/bin/env python3
"""
Test script for the opencv_service.py fix
"""

import os
import sys
from pathlib import Path

# Add the backend source to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

# Import required modules directly
import cv2
import numpy as np
import math
from typing import Tuple, Union, Optional
from dataclasses import dataclass

# Copy the classes directly to avoid import issues
@dataclass
class MeasurementResult:
    """Bottle measurement in millimeters and volume in milliliters."""
    diameter_mm: float
    height_mm: float
    volume_ml: float
    # Additional optional fields produced by the advanced pipeline
    classification: Optional[str] = None
    confidence_percent: Optional[float] = None

class MeasurementError(RuntimeError):
    pass

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
        best: Optional[PixelBottleInfo] = None
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
            # Upright check
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
    """Measure bottle dimensions using a coloured reference object for scale calibration."""
    def __init__(
        self,
        # Real-world height of the coloured reference marker in millimetres.
        ref_real_height_mm: float = 160.0,
        *,
        ref_real_width_mm: Optional[float] = None,  # legacy alias, optional
        ref_hsv_lower: Tuple[int, int, int] = (0, 0, 0),    # black lower HSV
        ref_hsv_upper: Tuple[int, int, int] = (180, 255, 50),  # black upper HSV
        classify: bool = True,
        known_bottle_specs: Optional[dict] = None,
        tolerance_percent: float = 30.0,
    ) -> None:
        if ref_real_width_mm is not None:
            ref_real_height_mm = ref_real_width_mm

        self.ref_real_height_mm = ref_real_height_mm
        self.ref_hsv_lower = np.array(ref_hsv_lower, dtype=np.uint8)
        self.ref_hsv_upper = np.array(ref_hsv_upper, dtype=np.uint8)
        self.classify = classify
        self.known_specs = (
            known_bottle_specs
            if known_bottle_specs is not None
            else {
                "200mL": {"volume_ml": 200},
                "500mL": {"volume_ml": 500},
                "1000mL": {"volume_ml": 1000},
            }
        )
        self.tolerance_percent = tolerance_percent
        self.detector = BottleDetector()

    def _find_reference(self, hsv: np.ndarray) -> Tuple[int, int, int, int]:
        """Return bounding box (x, y, w, h) of reference object in HSV image."""
        mask = cv2.inRange(hsv, self.ref_hsv_lower, self.ref_hsv_upper)
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            raise MeasurementError("Reference object not found in image.")
        contour = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(contour)
        if w < 10 or h < 10:
            raise MeasurementError("Reference object size too small.")
        return x, y, w, h

    def measure(
        self, image_bytes: bytes, *, return_debug: bool = False
    ) -> Union[MeasurementResult, Tuple[MeasurementResult, bytes]]:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise MeasurementError("Invalid image data provided.")

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        x_ref, y_ref, w_ref, h_ref = self._find_reference(hsv)
        scale = self.ref_real_height_mm / h_ref

        if y_ref <= 0:
            roi = img
        else:
            roi = img[: y_ref, :]

        if roi.size == 0:
            raise MeasurementError("ROI is empty - cannot detect bottle")

        # Dynamic min area threshold (~0.5 cm²) expressed in pixels - FIXED
        pixel_per_cm = 10.0 / scale
        min_area_px = int((pixel_per_cm ** 2) * 0.5)

        bottle_info = self.detector.detect(roi, min_area_px)

        height_mm = bottle_info.pixel_height * scale
        diameter_mm = bottle_info.pixel_width * scale

        radius_cm = (diameter_mm / 10) / 2
        height_cm = height_mm / 10
        volume_cm3 = math.pi * radius_cm**2 * height_cm
        volume_ml = volume_cm3

        classification: Optional[str] = None
        confidence: Optional[float] = None
        if self.classify:
            classification, confidence = self._classify_volume(volume_ml)

        debug_img_bytes: Optional[bytes] = None
        if return_debug:
            debug = img.copy()
            cv2.rectangle(debug, (x_ref, y_ref), (x_ref + w_ref, y_ref + h_ref), (0, 255, 0), 2)
            cv2.drawContours(debug, [bottle_info.contour], -1, (0, 0, 255), 2)
            cv2.polylines(debug, [bottle_info.box_points], True, (255, 0, 0), 2)
            size_label = ".0f"
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
            return result, debug_img_bytes
        return result

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
        return ".0f", max(0.0, 100.0 - min_diff)

def test_with_working_parameters():
    """Test with the working HSV range and fixed minimum area threshold"""

    image_path = "/Users/macbook/Documents/coding/compfest/testing/TAI.jpg"

    if not os.path.exists(image_path):
        print(f"Error: Image not found at {image_path}")
        return

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    print("=== TESTING WITH FIXED ALGORITHM ===")
    print("Using HSV range: (0, 0, 0) to (180, 255, 100) - more tolerant black detection")
    print("Using reduced minimum area threshold: 0.5 cm²")

    # Use the more tolerant HSV range that worked in our debugging
    measurer = BottleMeasurer(
        ref_real_height_mm=160.0,
        ref_hsv_lower=(0, 0, 0),      # black lower HSV
        ref_hsv_upper=(180, 255, 100), # more tolerant black upper HSV
        tolerance_percent=30.0
    )

    try:
        result, debug_bytes = measurer.measure(image_bytes, return_debug=True)

        print("\n=== MEASUREMENT RESULT ===")
        print(".2f")
        print(".2f")
        print(".2f")
        print(f"Classification: {result.classification}")
        print(".1f")

        print("\n=== CLASSIFICATION ANALYSIS ===")
        print(f"Expected original size: 1500 mL")
        print(f"Measured volume: {result.volume_ml} mL")
        print(".1f")

        # Check differences from each known spec
        print("\nDifferences from known specs:")
        for label, spec in measurer.known_specs.items():
            target = spec["volume_ml"]
            diff_pct = abs(result.volume_ml - target) / target * 100
            within_tolerance = diff_pct <= measurer.tolerance_percent
            print(".1f")

        print(f"\nThe algorithm classified the 1500mL bottle as '{result.classification}'")
        print("This is because 1500mL is closest to 1000mL (33% difference)")
        print("but since 33% > 30% tolerance, it should show as 'Other (1500mL)'")

        # Save debug image
        debug_path = "/Users/macbook/Documents/coding/compfest/testing/TAI_fixed_debug.jpg"
        with open(debug_path, "wb") as f:
            f.write(debug_bytes)
        print(f"\nDebug image saved to: {debug_path}")

        # Test with extended specs
        print("\n=== TESTING WITH 1500ML ADDED TO SPECS ===")
        extended_specs = {
            **measurer.known_specs,
            "1500mL": {"volume_ml": 1500}
        }
        measurer_extended = BottleMeasurer(
            ref_real_height_mm=160.0,
            ref_hsv_lower=(0, 0, 0),
            ref_hsv_upper=(180, 255, 100),
            known_bottle_specs=extended_specs,
            tolerance_percent=30.0
        )
        result_extended = measurer_extended.measure(image_bytes)
        print(f"With 1500mL in specs - Classification: {result_extended.classification}")
        print(".1f")

    except Exception as e:
        print(f"Error during measurement: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_with_working_parameters()
