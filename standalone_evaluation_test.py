#!/usr/bin/env python3
"""
Standalone Evaluation Test for Image Contour and Edge Detection

This script provides a simplified evaluation test that can run independently
of the complex backend structure to demonstrate the evaluation pipeline functionality.

Usage:
    python3 standalone_evaluation_test.py
"""

import cv2
import numpy as np
import pandas as pd
import json
import time
import math
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass


@dataclass
class TestImageInfo:
    """Information about a test image."""
    path: str
    filename: str
    expected_volume_ml: Optional[float] = None
    category: str = "unknown"


@dataclass
class EvaluationResult:
    """Result of a single image evaluation."""
    image_path: str
    filename: str
    category: str
    expected_volume_ml: Optional[float]

    # Measurement results
    measured_volume_ml: Optional[float] = None
    measured_diameter_mm: Optional[float] = None
    measured_height_mm: Optional[float] = None
    classification: Optional[str] = None
    confidence_percent: Optional[float] = None

    # Error metrics
    absolute_error_ml: Optional[float] = None
    relative_error_percent: Optional[float] = None

    # Processing info
    success: bool = False
    error_message: Optional[str] = None
    processing_time_ms: Optional[float] = None
    pipeline_used: str = "unknown"


class SimplifiedBottleDetector:
    """Simplified bottle detector for standalone testing."""

    def __init__(self, min_aspect_ratio: float = 1.2, max_tilt_deg: float = 20.0):
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

    def detect(self, roi: np.ndarray, min_area_px: int) -> Dict:
        """Detect bottle using edge analysis."""
        processed = self._preprocess_roi(roi)
        contours, _ = cv2.findContours(
            processed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        best_info = None
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
            if h_raw >= w_raw:
                upright = abs(angle) < self.max_tilt_deg
            else:
                deviation = abs(90.0 - abs(angle))
                upright = deviation < self.max_tilt_deg

            if not upright:
                continue

            if area > max_area:
                max_area = area
                box = cv2.boxPoints(rect)
                best_info = {
                    'pixel_width': visual_w,
                    'pixel_height': visual_h,
                    'contour': cnt,
                    'box_points': box
                }

        if best_info is None:
            raise ValueError("No suitable bottle contour found.")

        return best_info


class SimplifiedBottleMeasurer:
    """Simplified bottle measurer for standalone testing."""

    def __init__(self, ref_real_height_mm: float = 160.0):
        self.ref_real_height_mm = ref_real_height_mm
        self.detector = SimplifiedBottleDetector()

    def _find_reference(self, hsv: np.ndarray) -> Tuple[int, int, int, int]:
        """Find reference object in HSV image."""
        # Look for dark regions (assuming black reference marker)
        lower_black = np.array([0, 0, 0])
        upper_black = np.array([180, 255, 50])
        mask = cv2.inRange(hsv, lower_black, upper_black)

        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            raise ValueError("Reference object not found in image.")

        contour = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(contour)

        if w < 10 or h < 10:
            raise ValueError("Reference object size too small.")

        return x, y, w, h

    def measure(self, image_path: str, return_debug: bool = False) -> Dict:
        """Measure bottle in image."""
        start_time = time.time()

        # Read image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        try:
            x_ref, y_ref, w_ref, h_ref = self._find_reference(hsv)
        except ValueError as e:
            # If no reference found, assume reference takes up bottom 20% of image
            h_ref = int(img.shape[0] * 0.2)
            y_ref = img.shape[0] - h_ref
            x_ref, w_ref = 0, img.shape[1]

        # Calibrate scale
        scale = self.ref_real_height_mm / h_ref

        # Define ROI above reference
        if y_ref <= 0:
            roi = img
        else:
            roi = img[:y_ref, :]

        # Dynamic min area threshold
        pixel_per_cm = 10.0 / scale
        min_area_px = int((pixel_per_cm ** 2) * 0.5)

        # Detect bottle
        bottle_info = self.detector.detect(roi, min_area_px)

        height_mm = bottle_info['pixel_height'] * scale
        diameter_mm = bottle_info['pixel_width'] * scale

        # Volume estimation (cylinder approximation)
        radius_cm = (diameter_mm / 10) / 2
        height_cm = height_mm / 10
        volume_cm3 = math.pi * radius_cm**2 * height_cm
        volume_ml = volume_cm3

        # Simple classification based on volume
        if volume_ml < 300:
            classification = "200mL"
        elif volume_ml < 550:
            classification = "500mL"
        elif volume_ml < 650:
            classification = "600mL"
        else:
            classification = "1000mL"

        confidence = min(100.0, volume_ml / 10)  # Simple confidence metric

        processing_time_ms = (time.time() - start_time) * 1000

        result = {
            'volume_ml': round(volume_ml, 2),
            'diameter_mm': round(diameter_mm, 2),
            'height_mm': round(height_mm, 2),
            'classification': classification,
            'confidence_percent': round(confidence, 1),
            'processing_time_ms': round(processing_time_ms, 1),
            'scale': round(scale, 4)
        }

        if return_debug:
            debug_img = img.copy()
            cv2.rectangle(debug_img, (x_ref, y_ref), (x_ref + w_ref, y_ref + h_ref), (0, 255, 0), 2)
            cv2.drawContours(debug_img, [bottle_info['contour']], -1, (0, 0, 255), 2)
            cv2.polylines(debug_img, [bottle_info['box_points']], True, (255, 0, 0), 2)

            size_label = f"{height_mm:.0f}x{diameter_mm:.0f} mm"
            cv2.putText(debug_img, size_label, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            cv2.putText(debug_img, classification, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 255), 2)

            result['debug_image'] = debug_img

        return result


class StandaloneEvaluator:
    """Standalone evaluator for testing image processing."""

    def __init__(self):
        self.measurer = SimplifiedBottleMeasurer()
        self.results: List[EvaluationResult] = []

    def find_test_images(self) -> List[TestImageInfo]:
        """Find test images in the testing directory."""
        test_dir = Path("/workspace/testing")
        if not test_dir.exists():
            print(f"❌ Test directory not found: {test_dir}")
            return []

        images = []
        extensions = {'.jpg', '.jpeg', '.png', '.heic'}

        for ext in extensions:
            for img_path in test_dir.glob(f"**/*{ext}"):
                if img_path.is_file():
                    # Try to determine expected volume from filename
                    expected_volume = self._extract_expected_volume(str(img_path))
                    category = self._determine_category(str(img_path))

                    images.append(TestImageInfo(
                        path=str(img_path),
                        filename=img_path.name,
                        expected_volume_ml=expected_volume,
                        category=category
                    ))

        # Sort by category
        images.sort(key=lambda x: (x.category, x.filename))
        return images

    def _extract_expected_volume(self, image_path: str) -> Optional[float]:
        """Extract expected volume from image path."""
        path = Path(image_path).stem.lower()

        volume_patterns = {
            '200': 200.0, '250': 250.0, '300': 300.0, '350': 350.0,
            '500': 500.0, '600': 600.0, '1000': 1000.0, '1500': 1500.0
        }

        for pattern, volume in volume_patterns.items():
            if pattern in path:
                return volume
        return None

    def _determine_category(self, image_path: str) -> str:
        """Determine image category from path."""
        path = Path(image_path).stem.lower()

        if '200' in path or '200ml' in path:
            return '200ml'
        elif '500' in path or '500ml' in path:
            return '500ml'
        elif '600' in path or '600ml' in path:
            return '600ml'
        elif '1000' in path or '1l' in path:
            return '1000ml'
        elif 'pls' in path:
            return 'pls'
        elif 'tai' in path:
            return 'tai'
        elif 'test' in path and any(char.isdigit() for char in path):
            return 'test'

        return 'unknown'

    async def evaluate_image(self, image_info: TestImageInfo) -> EvaluationResult:
        """Evaluate a single image."""
        start_time = time.time()

        result = EvaluationResult(
            image_path=image_info.path,
            filename=image_info.filename,
            category=image_info.category,
            expected_volume_ml=image_info.expected_volume_ml
        )

        try:
            # Measure bottle
            measurement = self.measurer.measure(image_info.path)

            result.measured_volume_ml = measurement['volume_ml']
            result.measured_diameter_mm = measurement['diameter_mm']
            result.measured_height_mm = measurement['height_mm']
            result.classification = measurement['classification']
            result.confidence_percent = measurement['confidence_percent']
            result.success = True
            result.processing_time_ms = measurement['processing_time_ms']

            # Calculate errors if we have expected volume
            if image_info.expected_volume_ml is not None:
                result.absolute_error_ml = abs(
                    measurement['volume_ml'] - image_info.expected_volume_ml
                )
                result.relative_error_percent = (
                    result.absolute_error_ml / image_info.expected_volume_ml * 100
                )

            print(f"✅ {image_info.filename}: {measurement['volume_ml']:.1f}ml "
                  f"(expected: {image_info.expected_volume_ml or 'N/A'})")

        except Exception as e:
            result.success = False
            result.error_message = str(e)
            result.processing_time_ms = (time.time() - start_time) * 1000

            print(f"❌ {image_info.filename}: {e}")

        return result

    async def run_evaluation(self, limit: int = 10):
        """Run evaluation on test images."""
        print("🧪 Starting Standalone Image Processing Evaluation")
        print("=" * 60)

        # Find test images
        test_images = self.find_test_images()
        print(f"📁 Found {len(test_images)} test images")

        if not test_images:
            print("❌ No test images found!")
            return

        # Limit images if specified
        if limit > 0:
            test_images = test_images[:limit]
            print(f"🔢 Limited to {len(test_images)} images for this test")

        # Process images
        print(f"\n🔬 Processing {len(test_images)} images...")
        print("-" * 40)

        for i, image_info in enumerate(test_images, 1):
            print(f"\n[{i}/{len(test_images)}] Testing: {image_info.filename}")
            result = await self.evaluate_image(image_info)
            self.results.append(result)

        # Save results
        await self._save_results()

        print(f"\n{'=' * 60}")
        print("📊 EVALUATION COMPLETE")
        print("=" * 60)

    async def _save_results(self):
        """Save evaluation results."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir = Path(f"/workspace/evaluation_results_{timestamp}")
        output_dir.mkdir(exist_ok=True)

        # Save CSV results
        csv_path = output_dir / "measurements.csv"
        await self._save_csv_results(csv_path)

        # Save summary
        summary_path = output_dir / "summary.json"
        await self._save_json_summary(summary_path)

        print(f"💾 Results saved to: {output_dir}")
        print(f"   📄 CSV: {csv_path}")
        print(f"   📋 Summary: {summary_path}")

    async def _save_csv_results(self, csv_path: Path):
        """Save results to CSV file."""
        with open(csv_path, 'w', newline='') as f:
            f.write("filename,category,expected_volume_ml,measured_volume_ml,measured_diameter_mm,measured_height_mm,classification,confidence_percent,absolute_error_ml,relative_error_percent,success,processing_time_ms\n")

            for result in self.results:
                f.write(f"{result.filename},{result.category},{result.expected_volume_ml or ''},{result.measured_volume_ml or ''},{result.measured_diameter_mm or ''},{result.measured_height_mm or ''},{result.classification or ''},{result.confidence_percent or ''},{result.absolute_error_ml or ''},{result.relative_error_percent or ''},{result.success},{result.processing_time_ms or ''}\n")

    async def _save_json_summary(self, json_path: Path):
        """Save summary statistics."""
        successful_results = [r for r in self.results if r.success]

        # Calculate metrics
        abs_errors = [r.absolute_error_ml for r in successful_results if r.absolute_error_ml is not None]
        rel_errors = [r.relative_error_percent for r in successful_results if r.relative_error_percent is not None]

        summary = {
            'total_images': len(self.results),
            'successful_measurements': len(successful_results),
            'failed_measurements': len(self.results) - len(successful_results),
            'success_rate_percent': len(successful_results) / len(self.results) * 100 if self.results else 0,

            'error_metrics': {
                'mean_absolute_error_ml': sum(abs_errors) / len(abs_errors) if abs_errors else None,
                'mean_relative_error_percent': sum(rel_errors) / len(rel_errors) if rel_errors else None,
                'root_mean_square_error_ml': math.sqrt(sum(e**2 for e in abs_errors) / len(abs_errors)) if abs_errors else None,
            },

            'category_breakdown': self._calculate_category_breakdown(),

            'processing_stats': {
                'mean_processing_time_ms': sum(r.processing_time_ms or 0 for r in self.results) / len(self.results) if self.results else 0,
                'total_processing_time_ms': sum(r.processing_time_ms or 0 for r in self.results),
            },

            'timestamp': datetime.now().isoformat(),
            'evaluation_version': 'standalone_v1.0'
        }

        with open(json_path, 'w') as f:
            json.dump(summary, f, indent=2)

    def _calculate_category_breakdown(self) -> Dict:
        """Calculate results breakdown by category."""
        categories = {}
        for result in self.results:
            if result.category not in categories:
                categories[result.category] = {
                    'total': 0,
                    'successful': 0,
                    'mean_error_ml': None,
                    'errors': []
                }

            categories[result.category]['total'] += 1
            if result.success:
                categories[result.category]['successful'] += 1
                if result.absolute_error_ml is not None:
                    categories[result.category]['errors'].append(result.absolute_error_ml)

        # Calculate mean errors
        for category_data in categories.values():
            errors = category_data['errors']
            if errors:
                category_data['mean_error_ml'] = sum(errors) / len(errors)

        return categories


async def main():
    """Main entry point."""
    print("🧪 SmartBin Image Processing Evaluation Test")
    print("=============================================")
    print("This is a standalone test to demonstrate the evaluation pipeline.")
    print("Testing image contour and edge detection algorithms...")
    print()

    evaluator = StandaloneEvaluator()
    await evaluator.run_evaluation(limit=10)

    print("\n🎉 Testing complete! Check the evaluation_results_* directory for detailed results.")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())