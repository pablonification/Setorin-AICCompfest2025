#!/usr/bin/env python3
"""
Simple debug script for opencv_service.py classification issues
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

    def _extract_bottle_contour(self, roi_gray: np.ndarray) -> np.ndarray:
        """Return contour corresponding to the bottle silhouette."""
        blur = cv2.GaussianBlur(roi_gray, (5, 5), 0)
        _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            raise MeasurementError("No contours found in ROI for bottle.")
        h_roi, w_roi = roi_gray.shape[:2]
        candidates = sorted(contours, key=cv2.contourArea, reverse=True)
        for c in candidates:
            x, y, w, h = cv2.boundingRect(c)
            if x > 2 and y > 2 and x + w < w_roi - 2 and y + h < h_roi - 2:
                return c
        return candidates[0]

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
        min_area_px = int((pixel_per_cm ** 2) * 4)

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

def test_image_classification():
    """Test the bottle measurement and classification with the TAI.jpg image"""

    image_path = "/Users/macbook/Documents/coding/compfest/testing/TAI.jpg"

    if not os.path.exists(image_path):
        print(f"Error: Image not found at {image_path}")
        return

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    print("=== Testing OpenCV Service Classification ===")
    print(f"Image: {image_path}")
    print(f"Image size: {len(image_bytes)} bytes")

    measurer = BottleMeasurer(
        ref_real_height_mm=160.0,
        tolerance_percent=30.0
    )

    print("\nKnown bottle specs:")
    for label, spec in measurer.known_specs.items():
        print(f"  {label}: {spec}")

    print(f"\nTolerance: {measurer.tolerance_percent}%")

    try:
        result, debug_bytes = measurer.measure(image_bytes, return_debug=True)

        print("\n=== MEASUREMENT RESULT ===")
        print(".2f")
        print(".2f")
        print(".2f")
        print(f"Classification: {result.classification}")
        print(".1f")

        print("\n=== MANUAL CLASSIFICATION CHECK ===")
        manual_classification, manual_confidence = measurer._classify_volume(result.volume_ml)

        print(f"Manual classification: {manual_classification}")
        print(".1f")

        print("\nDifferences from known specs:")
        for label, spec in measurer.known_specs.items():
            target = spec["volume_ml"]
            diff_pct = abs(result.volume_ml - target) / target * 100
            within_tolerance = diff_pct <= measurer.tolerance_percent
            print(".1f")

        debug_path = "/Users/macbook/Documents/coding/compfest/testing/TAI_debug.jpg"
        with open(debug_path, "wb") as f:
            f.write(debug_bytes)
        print(f"\nDebug image saved to: {debug_path}")

    except MeasurementError as e:
        print(f"Measurement Error: {e}")

        # Let's try to debug step by step
        print("\n=== DEBUGGING STEP BY STEP ===")

        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        print(f"Image shape: {img.shape}")

        # Convert to HSV and try to find reference
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # Try different HSV ranges for reference detection
        test_ranges = [
            ((0, 0, 0), (180, 255, 50)),  # Original black
            ((0, 0, 0), (180, 255, 100)), # More tolerant black
            ((0, 0, 0), (180, 255, 150)), # Even more tolerant
        ]

        for i, (lower, upper) in enumerate(test_ranges):
            print(f"\nTesting HSV range {i+1}: {lower} to {upper}")
            mask = cv2.inRange(hsv, np.array(lower, dtype=np.uint8), np.array(upper, dtype=np.uint8))
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            print(f"Found {len(contours)} contours")

            if contours:
                largest = max(contours, key=cv2.contourArea)
                area = cv2.contourArea(largest)
                print(f"Largest contour area: {area}")

                if area > 100:  # Minimum area threshold
                    x, y, w, h = cv2.boundingRect(largest)
                    print(f"Reference bbox: x={x}, y={y}, w={w}, h={h}")

                    # Try with this reference
                    try:
                        measurer_debug = BottleMeasurer(
                            ref_real_height_mm=160.0,
                            ref_hsv_lower=lower,
                            ref_hsv_upper=upper,
                            tolerance_percent=30.0
                        )
                        result_debug = measurer_debug.measure(image_bytes)
                        print(f"SUCCESS with range {i+1}: Volume = {result_debug.volume_ml} mL")

                        # If successful, let's analyze the classification
                        print(f"Classification: {result_debug.classification}")
                        print(f"Confidence: {result_debug.confidence_percent}%")

                        # Check differences from known specs
                        print("Differences from known specs:")
                        for label, spec in measurer_debug.known_specs.items():
                            target = spec["volume_ml"]
                            diff_pct = abs(result_debug.volume_ml - target) / target * 100
                            within_tolerance = diff_pct <= measurer_debug.tolerance_percent
                            print(".1f")

                        # Let's also check what happens if we add 1500mL to the known specs
                        print("\n=== TESTING WITH 1500mL ADDED TO SPECS ===")
                        extended_specs = {
                            **measurer_debug.known_specs,
                            "1500mL": {"volume_ml": 1500}
                        }
                        measurer_extended = BottleMeasurer(
                            ref_real_height_mm=160.0,
                            ref_hsv_lower=lower,
                            ref_hsv_upper=upper,
                            known_bottle_specs=extended_specs,
                            tolerance_percent=30.0
                        )
                        result_extended = measurer_extended.measure(image_bytes)
                        print(f"Extended classification: {result_extended.classification}")
                        print(f"Extended confidence: {result_extended.confidence_percent}%")

                        break
                    except Exception as e2:
                        print(f"Still failed with range {i+1}: {e2}")
                        # Let's debug the bottle detection specifically
                        if "Bottle not found" in str(e2):
                            print("  Debugging bottle detection...")
                            # Manually try bottle detection
                            try:
                                # Decode and setup
                                nparr = np.frombuffer(image_bytes, np.uint8)
                                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                                hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

                                # Find reference
                                mask = cv2.inRange(hsv, np.array(lower, dtype=np.uint8), np.array(upper, dtype=np.uint8))
                                kernel = np.ones((5, 5), np.uint8)
                                mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
                                contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                                largest = max(contours, key=cv2.contourArea)
                                x_ref, y_ref, w_ref, h_ref = cv2.boundingRect(largest)

                                scale = 160.0 / h_ref
                                roi = img[: y_ref, :]
                                print(f"    ROI shape: {roi.shape}")

                                pixel_per_cm = 10.0 / scale
                                min_area_px = int((pixel_per_cm ** 2) * 0.5)  # Fixed: reduced from 4 to 0.5
                                print(f"    Minimum area threshold: {min_area_px}")

                                # Try bottle detection with different thresholds
                                detector = BottleDetector()
                                for min_area_mult in [1, 0.1, 0.01, 0.001]:
                                    test_min_area = int(min_area_px * min_area_mult)
                                    try:
                                        bottle_info = detector.detect(roi, test_min_area)
                                        print(f"    SUCCESS with min_area_mult={min_area_mult}: pixel_area={bottle_info.pixel_width * bottle_info.pixel_height}")
                                        break
                                    except:
                                        print(f"    Failed with min_area_mult={min_area_mult} (threshold={test_min_area})")

                            except Exception as e3:
                                print(f"    Bottle detection debug failed: {e3}")

    except Exception as e:
        print(f"Other error during measurement: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_image_classification()
