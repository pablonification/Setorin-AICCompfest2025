#!/usr/bin/env python3
"""
Test script for user-specified images test2.1.jpg and test2.8.jpg
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

import cv2
import numpy as np
import math
from typing import Tuple, Union, Optional
from dataclasses import dataclass

@dataclass
class MeasurementResult:
    """Bottle measurement in millimeters and volume in milliliters."""
    diameter_mm: float
    height_mm: float
    volume_ml: float
    classification: Optional[str] = None
    confidence_percent: Optional[float] = None

class MeasurementError(RuntimeError):
    pass

@dataclass
class PixelBottleInfo:
    """Bottle data measured in *pixels* within the ROI."""
    pixel_width: float
    pixel_height: float
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
            upright = False
            if h_raw >= w_raw:
                upright = abs(angle) < self.max_tilt_deg
            else:
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
        ref_real_height_mm: float = 160.0,
        *,
        ref_real_width_mm: Optional[float] = None,
        ref_hsv_lower: Tuple[int, int, int] = (0, 0, 0),
        ref_hsv_upper: Tuple[int, int, int] = (180, 255, 50),
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
                "600mL": {"volume_ml": 600},
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

def test_user_images():
    """Test the user-specified images test2.1.jpg and test2.8.jpg"""

    # Test image specifications from user
    test_images = [
        {
            "path": "/Users/macbook/Documents/coding/compfest/testing/test2.1.jpg",
            "expected_volume": 1500,
            "description": "test2.1.jpg - should be 1500mL"
        },
        {
            "path": "/Users/macbook/Documents/coding/compfest/testing/test2.8.jpg",
            "expected_volume": 600,
            "description": "test2.8.jpg - should be 600mL"
        }
    ]

    print("=== TESTING USER-SPECIFIED IMAGES ===")
    print("User expectations:")
    print("- test2.1.jpg should measure 1500 mL")
    print("- test2.8.jpg should measure 600 mL")
    print()

    # Test with different HSV ranges to find the best working configuration
    hsv_ranges = [
        ((0, 0, 0), (180, 255, 50)),   # Original
        ((0, 0, 0), (180, 255, 100)),  # More tolerant
        ((0, 0, 0), (180, 255, 150)),  # Even more tolerant
        ((0, 0, 0), (180, 255, 200)),  # Very tolerant
        ((0, 0, 0), (180, 255, 255)),  # Maximum tolerance
    ]

    for test_img in test_images:
        image_path = test_img["path"]
        expected_volume = test_img["expected_volume"]
        description = test_img["description"]

        print(f"\n{'='*60}")
        print(f"TESTING: {description}")
        print(f"Expected volume: {expected_volume} mL")
        print(f"{'='*60}")

        if not os.path.exists(image_path):
            print(f"❌ ERROR: Image not found at {image_path}")
            continue

        with open(image_path, "rb") as f:
            image_bytes = f.read()

        print(f"Image size: {len(image_bytes)} bytes")

        # Try different HSV ranges
        success_found = False
        for i, (lower, upper) in enumerate(hsv_ranges):
            print(f"\n--- Testing HSV range {i+1}: {lower} to {upper} ---")

            try:
                measurer = BottleMeasurer(
                    ref_real_height_mm=160.0,
                    ref_hsv_lower=lower,
                    ref_hsv_upper=upper,
                    tolerance_percent=30.0
                )

                result, debug_bytes = measurer.measure(image_bytes, return_debug=True)

                print("✅ SUCCESS!")
                print(".2f")
                print(".2f")
                print(".2f")
                print(f"Classification: {result.classification}")
                print(".1f")

                # Check if the result matches user expectations
                volume_diff = abs(result.volume_ml - expected_volume)
                volume_diff_percent = (volume_diff / expected_volume) * 100

                print(f"\n📊 COMPARISON TO EXPECTED:")
                print(f"Expected: {expected_volume} mL")
                print(f"Measured: {result.volume_ml} mL")
                print(".1f")

                if volume_diff_percent <= 30.0:  # Within tolerance
                    print("✅ Within 30% tolerance - GOOD MATCH!")
                elif volume_diff_percent <= 50.0:  # Within 50%
                    print("⚠️  Within 50% tolerance - REASONABLE MATCH")
                else:
                    print("❌ Large difference - POOR MATCH")

                # Save debug image
                debug_filename = f"test2.{1 if '2.1' in description else 8}_debug_hsv_{i+1}.jpg"
                debug_path = f"/Users/macbook/Documents/coding/compfest/testing/{debug_filename}"
                with open(debug_path, "wb") as f:
                    f.write(debug_bytes)
                print(f"Debug image saved: {debug_filename}")

                success_found = True
                break  # Stop at first successful measurement

            except MeasurementError as e:
                print(f"❌ Failed with HSV range {i+1}: {e}")
                continue
            except Exception as e:
                print(f"❌ Unexpected error with HSV range {i+1}: {e}")
                continue

        if not success_found:
            print("❌ All HSV ranges failed - could not measure this image")

    print(f"\n{'='*60}")
    print("TESTING COMPLETE")
    print(f"{'='*60}")

if __name__ == "__main__":
    test_user_images()
