#!/usr/bin/env python3
"""
Silhouette Parameter Tuning Evaluation Tool

This script systematically evaluates different weighted silhouette scoring parameters
to minimize volume measurement errors. It processes batches of test images and
generates detailed metrics for comparison.

Usage:
    python -m src.backend.tools.eval_silhouette --subset both --fusion --save-debug --out /app/eval_out --limit-per-folder 30 --w-area 1.0 --w-aspect 1.0 --w-vertical 1.0 --w-solidity 1.0 --w-border 0.5
"""

import argparse
import asyncio
import csv
import json
import logging
import math
import os
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import cv2
import numpy as np
from datetime import datetime

# Add backend to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.services.opencv_service import (
    BottleDetector,
    BottleMeasurer,
    MeasurementError,
    MeasurementResult
)

logger = logging.getLogger(__name__)


@dataclass
class EvaluationConfig:
    """Configuration for silhouette parameter evaluation."""
    w_area: float = 1.0      # Weight for contour area
    w_aspect: float = 1.0    # Weight for aspect ratio (height/width)
    w_vertical: float = 1.0  # Weight for vertical orientation
    w_solidity: float = 1.0  # Weight for contour solidity (area/perimeter)
    w_border: float = 0.5    # Weight for border distance penalty

    # Pipeline configuration
    subset: str = "both"     # "baseline", "advanced", or "both"
    fusion: bool = False     # Use multi-pipeline fusion
    save_debug: bool = False # Save debug images
    out_dir: str = "/app/eval_out"  # Output directory
    limit_per_folder: int = 30  # Images per folder limit


@dataclass
class TestImageInfo:
    """Information about a test image."""
    path: str
    filename: str
    expected_volume_ml: Optional[float] = None  # Known ground truth
    category: str = "unknown"  # Image category (e.g., "200ml", "500ml")


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

    # Debug info
    debug_image_path: Optional[str] = None


class SilhouetteEvaluator:
    """Evaluator for silhouette-based bottle detection with weighted scoring."""

    def __init__(self, config: EvaluationConfig):
        self.config = config
        self.setup_logging()

        # Create output directory with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.run_dir = Path(config.out_dir) / "silhouette_experiments" / timestamp
        self.run_dir.mkdir(parents=True, exist_ok=True)

        # Initialize results storage
        self.results: List[EvaluationResult] = []

        # Setup bottle measurer with custom parameters
        self._setup_measurer()

        logger.info(f"Initialized evaluator with output directory: {self.run_dir}")

    def setup_logging(self):
        """Setup logging configuration."""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(self.run_dir / "evaluation.log"),
                logging.StreamHandler()
            ]
        )

    def _setup_measurer(self):
        """Setup the bottle measurer with evaluation parameters."""
        # Use a custom BottleDetector with weighted silhouette scoring
        self.detector = WeightedBottleDetector(
            min_aspect_ratio=1.2,
            max_tilt_deg=20.0,
            w_area=self.config.w_area,
            w_aspect=self.config.w_aspect,
            w_vertical=self.config.w_vertical,
            w_solidity=self.config.w_solidity,
            w_border=self.config.w_border
        )

        self.measurer = BottleMeasurer(
            ref_real_height_mm=160.0,
            classify=True,
            tolerance_percent=30.0
        )
        # Override the detector
        self.measurer.detector = self.detector

    def find_test_images(self) -> List[TestImageInfo]:
        """Find test images in the testing directory."""
        test_dir = Path("/workspace/testing")
        if not test_dir.exists():
            logger.warning(f"Test directory not found: {test_dir}")
            return []

        images = []
        # Find all image files
        extensions = {'.jpg', '.jpeg', '.png', '.heic'}
        for ext in extensions:
            for img_path in test_dir.glob(f"**/*{ext}"):
                if img_path.is_file():
                    # Try to determine expected volume from filename or directory
                    expected_volume = self._extract_expected_volume(str(img_path))
                    category = self._determine_category(str(img_path))

                    images.append(TestImageInfo(
                        path=str(img_path),
                        filename=img_path.name,
                        expected_volume_ml=expected_volume,
                        category=category
                    ))

        # Sort by category for better organization
        images.sort(key=lambda x: (x.category, x.filename))
        return images

    def _extract_expected_volume(self, image_path: str) -> Optional[float]:
        """Extract expected volume from image path or filename."""
        path = Path(image_path)

        # Look for volume indicators in path
        volume_patterns = {
            '200': 200.0,
            '250': 250.0,
            '300': 300.0,
            '350': 350.0,
            '500': 500.0,
            '600': 600.0,
            '1000': 1000.0,
            '1500': 1500.0,
            '2000': 2000.0
        }

        path_str = str(path).lower()
        for pattern, volume in volume_patterns.items():
            if pattern in path_str:
                return volume

        return None

    def _determine_category(self, image_path: str) -> str:
        """Determine image category from path."""
        path = Path(image_path)

        # Check directory names for category hints
        for part in path.parts:
            part_lower = part.lower()
            if '200' in part_lower:
                return '200ml'
            elif '500' in part_lower:
                return '500ml'
            elif '600' in part_lower:
                return '600ml'
            elif '1000' in part_lower or '1l' in part_lower:
                return '1000ml'
            elif 'pls' in part_lower:
                return 'pls'
            elif 'tai' in part_lower:
                return 'tai'

        return 'unknown'

    async def evaluate_image(self, image_info: TestImageInfo) -> EvaluationResult:
        """Evaluate a single image and return results."""
        start_time = time.time()

        result = EvaluationResult(
            image_path=image_info.path,
            filename=image_info.filename,
            category=image_info.category,
            expected_volume_ml=image_info.expected_volume_ml
        )

        try:
            # Read image
            with open(image_info.path, 'rb') as f:
                image_bytes = f.read()

            # Measure bottle
            measurement_result = self.measurer.measure(image_bytes)

            # Extract results
            result.measured_volume_ml = measurement_result.volume_ml
            result.measured_diameter_mm = measurement_result.diameter_mm
            result.measured_height_mm = measurement_result.height_mm
            result.classification = measurement_result.classification
            result.confidence_percent = measurement_result.confidence_percent
            result.success = True
            result.pipeline_used = "weighted_silhouette"

            # Calculate errors if we have expected volume
            if image_info.expected_volume_ml is not None:
                result.absolute_error_ml = abs(
                    measurement_result.volume_ml - image_info.expected_volume_ml
                )
                result.relative_error_percent = (
                    result.absolute_error_ml / image_info.expected_volume_ml * 100
                )

            result.processing_time_ms = (time.time() - start_time) * 1000

            logger.info(
                f"Processed {image_info.filename}: "
                f"measured={measurement_result.volume_ml:.1f}ml, "
                f"expected={image_info.expected_volume_ml or 'N/A'}ml, "
                f"error={result.absolute_error_ml or 'N/A'}ml"
            )

        except Exception as e:
            result.success = False
            result.error_message = str(e)
            result.processing_time_ms = (time.time() - start_time) * 1000

            logger.error(f"Failed to process {image_info.filename}: {e}")

        return result

    async def run_evaluation(self):
        """Run the complete evaluation pipeline."""
        logger.info("Starting silhouette evaluation...")

        # Find test images
        test_images = self.find_test_images()
        logger.info(f"Found {len(test_images)} test images")

        if not test_images:
            logger.warning("No test images found!")
            return

        # Limit images per folder if specified
        if self.config.limit_per_folder > 0:
            # Group by category and limit each
            category_images = {}
            for img in test_images:
                if img.category not in category_images:
                    category_images[img.category] = []
                category_images[img.category].append(img)

            limited_images = []
            for category, images in category_images.items():
                limited_images.extend(images[:self.config.limit_per_folder])

            test_images = limited_images
            logger.info(f"Limited to {len(test_images)} images total")

        # Process images
        logger.info("Processing images...")
        for i, image_info in enumerate(test_images, 1):
            logger.info(f"Processing {i}/{len(test_images)}: {image_info.filename}")
            result = await self.evaluate_image(image_info)
            self.results.append(result)

            # Save debug image if requested
            if self.config.save_debug and result.success:
                await self._save_debug_image(result, image_info)

        # Save results
        await self._save_results()

        logger.info(f"Evaluation complete. Results saved to {self.run_dir}")

    async def _save_debug_image(self, result: EvaluationResult, image_info: TestImageInfo):
        """Save debug image for successful measurements."""
        try:
            with open(image_info.path, 'rb') as f:
                image_bytes = f.read()

            # Get debug image
            measurement_result, debug_bytes = self.measurer.measure(image_bytes, return_debug=True)

            # Save debug image
            debug_filename = f"{Path(image_info.filename).stem}_debug.jpg"
            debug_path = self.run_dir / "debug" / debug_filename

            with open(debug_path, 'wb') as f:
                f.write(debug_bytes)

            result.debug_image_path = str(debug_path)

        except Exception as e:
            logger.warning(f"Failed to save debug image for {image_info.filename}: {e}")

    async def _save_results(self):
        """Save evaluation results to files."""
        # Create debug directory
        debug_dir = self.run_dir / "debug"
        debug_dir.mkdir(exist_ok=True)

        # Save measurements CSV
        csv_path = self.run_dir / "measurements.csv"
        await self._save_csv_results(csv_path)

        # Save summary JSON
        json_path = self.run_dir / "summary.json"
        await self._save_json_summary(json_path)

        # Save configuration
        config_path = self.run_dir / "config.json"
        with open(config_path, 'w') as f:
            json.dump(asdict(self.config), f, indent=2)

    async def _save_csv_results(self, csv_path: Path):
        """Save results to CSV file."""
        with open(csv_path, 'w', newline='') as f:
            writer = csv.writer(f)

            # Write header
            header = [
                'filename', 'category', 'expected_volume_ml', 'measured_volume_ml',
                'measured_diameter_mm', 'measured_height_mm', 'classification',
                'confidence_percent', 'absolute_error_ml', 'relative_error_percent',
                'success', 'error_message', 'processing_time_ms', 'pipeline_used',
                'debug_image_path'
            ]
            writer.writerow(header)

            # Write data
            for result in self.results:
                row = [
                    result.filename,
                    result.category,
                    result.expected_volume_ml or '',
                    result.measured_volume_ml or '',
                    result.measured_diameter_mm or '',
                    result.measured_height_mm or '',
                    result.classification or '',
                    result.confidence_percent or '',
                    result.absolute_error_ml or '',
                    result.relative_error_percent or '',
                    result.success,
                    result.error_message or '',
                    result.processing_time_ms or '',
                    result.pipeline_used,
                    result.debug_image_path or ''
                ]
                writer.writerow(row)

    async def _save_json_summary(self, json_path: Path):
        """Save summary statistics to JSON."""
        # Calculate summary statistics
        successful_results = [r for r in self.results if r.success]
        error_results = [r for r in self.results if not r.success]

        summary = {
            'total_images': len(self.results),
            'successful_measurements': len(successful_results),
            'failed_measurements': len(error_results),
            'success_rate_percent': len(successful_results) / len(self.results) * 100 if self.results else 0,

            'configuration': asdict(self.config),

            'error_metrics': self._calculate_error_metrics(successful_results),

            'category_breakdown': self._calculate_category_breakdown(),

            'timestamp': datetime.now().isoformat(),
            'run_directory': str(self.run_dir)
        }

        with open(json_path, 'w') as f:
            json.dump(summary, f, indent=2)

    def _calculate_error_metrics(self, results: List[EvaluationResult]) -> Dict:
        """Calculate error metrics from successful results."""
        if not results:
            return {
                'mean_absolute_error_ml': None,
                'mean_relative_error_percent': None,
                'root_mean_square_error_ml': None,
                'median_absolute_error_ml': None
            }

        abs_errors = [r.absolute_error_ml for r in results if r.absolute_error_ml is not None]
        rel_errors = [r.relative_error_percent for r in results if r.relative_error_percent is not None]

        if not abs_errors:
            return {
                'mean_absolute_error_ml': None,
                'mean_relative_error_percent': None,
                'root_mean_square_error_ml': None,
                'median_absolute_error_ml': None
            }

        return {
            'mean_absolute_error_ml': sum(abs_errors) / len(abs_errors),
            'mean_relative_error_percent': sum(rel_errors) / len(rel_errors) if rel_errors else None,
            'root_mean_square_error_ml': math.sqrt(sum(e**2 for e in abs_errors) / len(abs_errors)),
            'median_absolute_error_ml': sorted(abs_errors)[len(abs_errors) // 2]
        }

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


class WeightedBottleDetector(BottleDetector):
    """Bottle detector with weighted silhouette scoring."""

    def __init__(self, *args, **kwargs):
        # Extract weighting parameters
        self.w_area = kwargs.pop('w_area', 1.0)
        self.w_aspect = kwargs.pop('w_aspect', 1.0)
        self.w_vertical = kwargs.pop('w_vertical', 1.0)
        self.w_solidity = kwargs.pop('w_solidity', 1.0)
        self.w_border = kwargs.pop('w_border', 0.5)

        super().__init__(*args, **kwargs)

    def detect(self, roi: np.ndarray, min_area_px: int) -> 'PixelBottleInfo':
        """Detect bottle using weighted silhouette scoring."""
        processed = self._preprocess_roi(roi)
        contours, _ = cv2.findContours(
            processed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        best_score = -float('inf')
        best_info = None

        h_roi, w_roi = roi.shape[:2]

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

            # Calculate uprightness
            upright = False
            if h_raw >= w_raw:
                upright = abs(angle) < self.max_tilt_deg
            else:
                deviation = abs(90.0 - abs(angle))
                upright = deviation < self.max_tilt_deg

            if not upright:
                continue

            # Calculate weighted score
            score = self._calculate_weighted_score(
                area, aspect, upright, cnt, h_roi, w_roi
            )

            if score > best_score:
                best_score = score
                box = np.intp(cv2.boxPoints(rect))
                best_info = PixelBottleInfo(
                    pixel_width=visual_w,
                    pixel_height=visual_h,
                    contour=cnt,
                    box_points=box
                )

        if best_info is None:
            raise MeasurementError("No suitable bottle contour found.")

        return best_info

    def _calculate_weighted_score(self, area: float, aspect: float,
                                 upright: bool, contour: np.ndarray,
                                 roi_height: int, roi_width: int) -> float:
        """Calculate weighted score for contour selection."""

        # 1. Area score (normalized to 0-1000px range)
        area_score = min(area / 1000.0, 1.0) * self.w_area

        # 2. Aspect ratio score (optimal around 2.0-3.0)
        aspect_score = 1.0 / (1.0 + abs(aspect - 2.5)) * self.w_aspect

        # 3. Vertical orientation score
        vertical_score = 1.0 if upright else 0.1 * self.w_vertical

        # 4. Solidity score (how filled the contour is)
        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        solidity = area / hull_area if hull_area > 0 else 0
        solidity_score = solidity * self.w_solidity

        # 5. Border distance penalty
        x, y, w, h = cv2.boundingRect(contour)
        border_dist = min(x, y, roi_width - x - w, roi_height - y - h)
        border_score = (border_dist / min(roi_width, roi_height)) * self.w_border

        # Combine scores
        total_score = (
            area_score +
            aspect_score +
            vertical_score +
            solidity_score +
            border_score
        )

        return total_score


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Evaluate silhouette parameter tuning')

    parser.add_argument('--w-area', type=float, default=1.0,
                       help='Weight for contour area')
    parser.add_argument('--w-aspect', type=float, default=1.0,
                       help='Weight for aspect ratio')
    parser.add_argument('--w-vertical', type=float, default=1.0,
                       help='Weight for vertical orientation')
    parser.add_argument('--w-solidity', type=float, default=1.0,
                       help='Weight for contour solidity')
    parser.add_argument('--w-border', type=float, default=0.5,
                       help='Weight for border distance penalty')

    parser.add_argument('--subset', choices=['baseline', 'advanced', 'both'],
                       default='both', help='Pipeline subset to evaluate')
    parser.add_argument('--fusion', action='store_true',
                       help='Use multi-pipeline fusion')
    parser.add_argument('--save-debug', action='store_true',
                       help='Save debug images')
    parser.add_argument('--out', default='/app/eval_out',
                       help='Output directory')
    parser.add_argument('--limit-per-folder', type=int, default=30,
                       help='Limit images per folder')

    args = parser.parse_args()

    config = EvaluationConfig(
        w_area=args.w_area,
        w_aspect=args.w_aspect,
        w_vertical=args.w_vertical,
        w_solidity=args.w_solidity,
        w_border=args.w_border,
        subset=args.subset,
        fusion=args.fusion,
        save_debug=args.save_debug,
        out_dir=args.out,
        limit_per_folder=args.limit_per_folder
    )

    evaluator = SilhouetteEvaluator(config)
    await evaluator.run_evaluation()


if __name__ == "__main__":
    asyncio.run(main())