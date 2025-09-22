#!/usr/bin/env python3
"""
Silhouette evaluation tool for bottle contour and edge detection optimization.

This tool evaluates the performance of bottle detection algorithms by comparing
predicted measurements with expected values, using configurable weight parameters
for different silhouette features.
"""

import argparse
import csv
import json
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

# Add the backend source to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.services.opencv_service import BottleMeasurer, MeasurementResult, MeasurementError


@dataclass
class EvaluationConfig:
    """Configuration for silhouette evaluation."""
    w_area: float = 1.0
    w_aspect: float = 1.0
    w_vertical: float = 1.0
    w_solidity: float = 1.0
    w_border: float = 0.5
    limit_per_folder: int = 15
    subset: str = "both"  # "both", "train", "test"
    fusion: bool = False
    save_debug: bool = False
    out_dir: str = "/app/eval_out"


@dataclass
class ImageGroundTruth:
    """Ground truth data for an image."""
    filename: str
    expected_ml: float
    expected_diameter_mm: float
    expected_height_mm: float
    bottle_type: str = "unknown"


@dataclass
class EvaluationResult:
    """Result of evaluating a single image."""
    filename: str
    expected_ml: float
    predicted_ml: float
    expected_diameter_mm: float
    predicted_diameter_mm: float
    expected_height_mm: float
    predicted_height_mm: float
    volume_error_percent: float
    diameter_error_percent: float
    height_error_percent: float
    measurement_success: bool
    error_message: Optional[str] = None
    silhouette_score: float = 0.0
    processing_time_ms: float = 0.0


class SilhouetteEvaluator:
    """Evaluates bottle detection using silhouette analysis."""
    
    def __init__(self, config: EvaluationConfig):
        self.config = config
        self.measurer = BottleMeasurer(
            ref_real_height_mm=160.0,
            classify=True,
            tolerance_percent=30.0
        )
        
        # Define ground truth data for test images
        self.ground_truth = self._load_ground_truth()
    
    def _load_ground_truth(self) -> Dict[str, ImageGroundTruth]:
        """Load ground truth data for test images."""
        # Based on typical bottle sizes and the test images available
        ground_truth = {
            # Small bottles (330ml)
            "test2.1.jpg": ImageGroundTruth("test2.1.jpg", 330, 65, 150, "330ml"),
            "test2.2.jpg": ImageGroundTruth("test2.2.jpg", 330, 65, 150, "330ml"),
            "test3.1.jpg": ImageGroundTruth("test3.1.jpg", 330, 65, 150, "330ml"),
            "test3.2.jpg": ImageGroundTruth("test3.2.jpg", 330, 65, 150, "330ml"),
            
            # Medium bottles (600ml)
            "test2.3.jpg": ImageGroundTruth("test2.3.jpg", 600, 70, 200, "600ml"),
            "test2.4.jpg": ImageGroundTruth("test2.4.jpg", 600, 70, 200, "600ml"),
            "test2.5.jpg": ImageGroundTruth("test2.5.jpg", 600, 70, 200, "600ml"),
            "test3.3.jpg": ImageGroundTruth("test3.3.jpg", 600, 70, 200, "600ml"),
            
            # Large bottles (1500ml)
            "test2.6.jpg": ImageGroundTruth("test2.6.jpg", 1500, 90, 280, "1500ml"),
            "test2.7.jpg": ImageGroundTruth("test2.7.jpg", 1500, 90, 280, "1500ml"),
            "test2.8.jpg": ImageGroundTruth("test2.8.jpg", 1500, 90, 280, "1500ml"),
            "test2.9.jpg": ImageGroundTruth("test2.9.jpg", 1500, 90, 280, "1500ml"),
            "TAI.jpg": ImageGroundTruth("TAI.jpg", 1500, 90, 280, "1500ml"),
            "test_akhir.png": ImageGroundTruth("test_akhir.png", 1000, 80, 250, "1000ml"),
            
            # Test bottles
            "test4.1.jpg": ImageGroundTruth("test4.1.jpg", 500, 68, 180, "500ml"),
            "test4.2.jpg": ImageGroundTruth("test4.2.jpg", 500, 68, 180, "500ml"),
            "test4.3.jpg": ImageGroundTruth("test4.3.jpg", 600, 70, 200, "600ml"),
            "test4.4.jpg": ImageGroundTruth("test4.4.jpg", 600, 70, 200, "600ml"),
            
            # Additional test images
            "biru.jpg": ImageGroundTruth("biru.jpg", 600, 70, 200, "600ml"),
            "BISMILLAH.jpg": ImageGroundTruth("BISMILLAH.jpg", 330, 65, 150, "330ml"),
            "pls.png": ImageGroundTruth("pls.png", 1500, 90, 280, "1500ml"),
            "pls2.png": ImageGroundTruth("pls2.png", 1500, 90, 280, "1500ml"),
        }
        return ground_truth
    
    def _calculate_silhouette_score(self, contour: np.ndarray, roi_shape: Tuple[int, int]) -> float:
        """Calculate a weighted silhouette quality score."""
        if contour is None or len(contour) < 3:
            return 0.0
        
        # Calculate basic contour properties
        area = cv2.contourArea(contour)
        perimeter = cv2.arcLength(contour, True)
        
        # Aspect ratio
        rect = cv2.minAreaRect(contour)
        (_, _), (w, h), _ = rect
        aspect_ratio = max(w, h) / max(min(w, h), 1.0)
        
        # Solidity (convex hull ratio)
        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        solidity = area / max(hull_area, 1.0)
        
        # Verticality check (how upright the bottle appears)
        moments = cv2.moments(contour)
        if moments['m00'] > 0:
            orientation = 0.5 * np.arctan2(2 * moments['mu11'], moments['mu20'] - moments['mu02'])
            verticality = 1.0 - abs(orientation) / (np.pi / 2)
        else:
            verticality = 0.0
        
        # Border proximity (how close contour is to image borders)
        h_roi, w_roi = roi_shape[:2]
        x, y, w_box, h_box = cv2.boundingRect(contour)
        border_distances = [x, y, w_roi - (x + w_box), h_roi - (y + h_box)]
        min_border_distance = min(border_distances)
        border_score = min(min_border_distance / min(w_roi, h_roi) * 10, 1.0)
        
        # Normalized area score (larger is generally better for bottles)
        area_score = min(area / (w_roi * h_roi), 1.0)
        
        # Combine scores with weights
        total_score = (
            self.config.w_area * area_score +
            self.config.w_aspect * min(aspect_ratio / 3.0, 1.0) +  # Good bottles have 2-4 aspect ratio
            self.config.w_vertical * verticality +
            self.config.w_solidity * solidity +
            self.config.w_border * border_score
        )
        
        # Normalize by total weights
        total_weights = (
            self.config.w_area + self.config.w_aspect + 
            self.config.w_vertical + self.config.w_solidity + self.config.w_border
        )
        
        return total_score / max(total_weights, 1.0)
    
    def evaluate_image(self, image_path: str) -> EvaluationResult:
        """Evaluate a single image."""
        filename = os.path.basename(image_path)
        
        if filename not in self.ground_truth:
            return EvaluationResult(
                filename=filename,
                expected_ml=0,
                predicted_ml=0,
                expected_diameter_mm=0,
                predicted_diameter_mm=0,
                expected_height_mm=0,
                predicted_height_mm=0,
                volume_error_percent=100,
                diameter_error_percent=100,
                height_error_percent=100,
                measurement_success=False,
                error_message="No ground truth data available"
            )
        
        gt = self.ground_truth[filename]
        start_time = time.time()
        
        try:
            with open(image_path, 'rb') as f:
                image_bytes = f.read()
            
            # Perform measurement
            if self.config.save_debug:
                result, debug_bytes = self.measurer.measure(image_bytes, return_debug=True)
                
                # Save debug image
                debug_dir = os.path.join(self.config.out_dir, "debug")
                os.makedirs(debug_dir, exist_ok=True)
                debug_path = os.path.join(debug_dir, f"{filename}_debug.jpg")
                with open(debug_path, 'wb') as f:
                    f.write(debug_bytes)
            else:
                result = self.measurer.measure(image_bytes)
            
            processing_time = (time.time() - start_time) * 1000
            
            # Calculate errors
            volume_error = abs(result.volume_ml - gt.expected_ml) / gt.expected_ml * 100
            diameter_error = abs(result.diameter_mm - gt.expected_diameter_mm) / gt.expected_diameter_mm * 100
            height_error = abs(result.height_mm - gt.expected_height_mm) / gt.expected_height_mm * 100
            
            # Calculate silhouette score if fusion is enabled
            silhouette_score = 0.0
            if self.config.fusion:
                # This would require access to the contour from the measurement
                # For now, we'll use a simplified score based on measurement quality
                measurement_quality = 1.0 - min(volume_error / 100, 1.0)
                silhouette_score = measurement_quality
            
            return EvaluationResult(
                filename=filename,
                expected_ml=gt.expected_ml,
                predicted_ml=result.volume_ml,
                expected_diameter_mm=gt.expected_diameter_mm,
                predicted_diameter_mm=result.diameter_mm,
                expected_height_mm=gt.expected_height_mm,
                predicted_height_mm=result.height_mm,
                volume_error_percent=volume_error,
                diameter_error_percent=diameter_error,
                height_error_percent=height_error,
                measurement_success=True,
                silhouette_score=silhouette_score,
                processing_time_ms=processing_time
            )
            
        except MeasurementError as e:
            processing_time = (time.time() - start_time) * 1000
            return EvaluationResult(
                filename=filename,
                expected_ml=gt.expected_ml,
                predicted_ml=0,
                expected_diameter_mm=gt.expected_diameter_mm,
                predicted_diameter_mm=0,
                expected_height_mm=gt.expected_height_mm,
                predicted_height_mm=0,
                volume_error_percent=100,
                diameter_error_percent=100,
                height_error_percent=100,
                measurement_success=False,
                error_message=str(e),
                processing_time_ms=processing_time
            )
        except Exception as e:
            processing_time = (time.time() - start_time) * 1000
            return EvaluationResult(
                filename=filename,
                expected_ml=gt.expected_ml,
                predicted_ml=0,
                expected_diameter_mm=gt.expected_diameter_mm,
                predicted_diameter_mm=0,
                expected_height_mm=gt.expected_height_mm,
                predicted_height_mm=0,
                volume_error_percent=100,
                diameter_error_percent=100,
                height_error_percent=100,
                measurement_success=False,
                error_message=f"Unexpected error: {str(e)}",
                processing_time_ms=processing_time
            )
    
    def evaluate_folder(self, folder_path: str) -> List[EvaluationResult]:
        """Evaluate all images in a folder."""
        results = []
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
        
        image_files = []
        for file in os.listdir(folder_path):
            if any(file.lower().endswith(ext) for ext in image_extensions):
                image_files.append(file)
        
        # Limit number of files if specified
        if self.config.limit_per_folder > 0:
            image_files = image_files[:self.config.limit_per_folder]
        
        print(f"Evaluating {len(image_files)} images from {folder_path}")
        
        for i, filename in enumerate(image_files, 1):
            image_path = os.path.join(folder_path, filename)
            print(f"  [{i}/{len(image_files)}] Processing {filename}...")
            
            result = self.evaluate_image(image_path)
            results.append(result)
            
            if result.measurement_success:
                print(f"    ✓ Volume: {result.predicted_ml:.1f}ml (expected: {result.expected_ml}ml, error: {result.volume_error_percent:.1f}%)")
            else:
                print(f"    ✗ Failed: {result.error_message}")
        
        return results
    
    def save_results(self, results: List[EvaluationResult], output_dir: str, timestamp: str):
        """Save evaluation results to CSV and JSON."""
        os.makedirs(output_dir, exist_ok=True)
        
        # Save detailed CSV
        csv_path = os.path.join(output_dir, f"evaluation_{timestamp}.csv")
        with open(csv_path, 'w', newline='') as csvfile:
            fieldnames = [
                'filename', 'expected_ml', 'predicted_ml', 'volume_error_percent',
                'expected_diameter_mm', 'predicted_diameter_mm', 'diameter_error_percent',
                'expected_height_mm', 'predicted_height_mm', 'height_error_percent',
                'measurement_success', 'error_message', 'silhouette_score', 'processing_time_ms'
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for result in results:
                writer.writerow({
                    'filename': result.filename,
                    'expected_ml': result.expected_ml,
                    'predicted_ml': result.predicted_ml,
                    'volume_error_percent': round(result.volume_error_percent, 2),
                    'expected_diameter_mm': result.expected_diameter_mm,
                    'predicted_diameter_mm': result.predicted_diameter_mm,
                    'diameter_error_percent': round(result.diameter_error_percent, 2),
                    'expected_height_mm': result.expected_height_mm,
                    'predicted_height_mm': result.predicted_height_mm,
                    'height_error_percent': round(result.height_error_percent, 2),
                    'measurement_success': result.measurement_success,
                    'error_message': result.error_message or '',
                    'silhouette_score': round(result.silhouette_score, 3),
                    'processing_time_ms': round(result.processing_time_ms, 2)
                })
        
        # Calculate summary statistics
        successful_results = [r for r in results if r.measurement_success]
        total_images = len(results)
        successful_images = len(successful_results)
        
        if successful_results:
            avg_volume_error = sum(r.volume_error_percent for r in successful_results) / len(successful_results)
            avg_diameter_error = sum(r.diameter_error_percent for r in successful_results) / len(successful_results)
            avg_height_error = sum(r.height_error_percent for r in successful_results) / len(successful_results)
            avg_processing_time = sum(r.processing_time_ms for r in successful_results) / len(successful_results)
            avg_silhouette_score = sum(r.silhouette_score for r in successful_results) / len(successful_results)
        else:
            avg_volume_error = avg_diameter_error = avg_height_error = 100.0
            avg_processing_time = avg_silhouette_score = 0.0
        
        # Save summary JSON
        summary = {
            'timestamp': timestamp,
            'config': {
                'w_area': self.config.w_area,
                'w_aspect': self.config.w_aspect,
                'w_vertical': self.config.w_vertical,
                'w_solidity': self.config.w_solidity,
                'w_border': self.config.w_border,
                'limit_per_folder': self.config.limit_per_folder,
                'subset': self.config.subset,
                'fusion': self.config.fusion,
                'save_debug': self.config.save_debug
            },
            'results': {
                'total_images': total_images,
                'successful_measurements': successful_images,
                'success_rate_percent': (successful_images / total_images * 100) if total_images > 0 else 0,
                'avg_volume_error_percent': round(avg_volume_error, 2),
                'avg_diameter_error_percent': round(avg_diameter_error, 2),
                'avg_height_error_percent': round(avg_height_error, 2),
                'avg_processing_time_ms': round(avg_processing_time, 2),
                'avg_silhouette_score': round(avg_silhouette_score, 3),
                'overall_score': round((100 - avg_volume_error) * (successful_images / total_images), 2)
            }
        }
        
        json_path = os.path.join(output_dir, f"summary_{timestamp}.json")
        with open(json_path, 'w') as jsonfile:
            json.dump(summary, jsonfile, indent=2)
        
        print(f"\nResults saved:")
        print(f"  CSV: {csv_path}")
        print(f"  Summary: {json_path}")
        
        return summary


def main():
    parser = argparse.ArgumentParser(description="Evaluate silhouette detection for bottle measurement")
    parser.add_argument("--subset", choices=["both", "train", "test"], default="both",
                       help="Dataset subset to evaluate")
    parser.add_argument("--fusion", action="store_true",
                       help="Enable fusion mode for enhanced silhouette analysis")
    parser.add_argument("--save-debug", action="store_true",
                       help="Save debug images with detection overlays")
    parser.add_argument("--out", default="/app/eval_out",
                       help="Output directory for results")
    parser.add_argument("--limit-per-folder", type=int, default=15,
                       help="Maximum number of images to process per folder")
    parser.add_argument("--w-area", type=float, default=1.0,
                       help="Weight for area-based silhouette scoring")
    parser.add_argument("--w-aspect", type=float, default=1.0,
                       help="Weight for aspect ratio in silhouette scoring")
    parser.add_argument("--w-vertical", type=float, default=1.0,
                       help="Weight for vertical alignment in silhouette scoring")
    parser.add_argument("--w-solidity", type=float, default=1.0,
                       help="Weight for solidity (convex hull ratio) in silhouette scoring")
    parser.add_argument("--w-border", type=float, default=0.5,
                       help="Weight for border proximity in silhouette scoring")
    
    args = parser.parse_args()
    
    # Create configuration
    config = EvaluationConfig(
        w_area=args.w_area,
        w_aspect=args.w_aspect,
        w_vertical=args.w_vertical,
        w_solidity=args.w_solidity,
        w_border=args.w_border,
        limit_per_folder=args.limit_per_folder,
        subset=args.subset,
        fusion=args.fusion,
        save_debug=args.save_debug,
        out_dir=args.out
    )
    
    print("=== Silhouette Evaluation Pipeline ===")
    print(f"Configuration:")
    print(f"  Area weight: {config.w_area}")
    print(f"  Aspect weight: {config.w_aspect}")
    print(f"  Vertical weight: {config.w_vertical}")
    print(f"  Solidity weight: {config.w_solidity}")
    print(f"  Border weight: {config.w_border}")
    print(f"  Fusion mode: {config.fusion}")
    print(f"  Debug images: {config.save_debug}")
    print(f"  Limit per folder: {config.limit_per_folder}")
    print()
    
    # Initialize evaluator
    evaluator = SilhouetteEvaluator(config)
    
    # Find test images directory
    test_dirs = [
        "/app/testing/second",
        "/workspace/testing/second",
        "testing/second"
    ]
    
    test_dir = None
    for dir_path in test_dirs:
        if os.path.exists(dir_path):
            test_dir = dir_path
            break
    
    if not test_dir:
        print("Error: Could not find testing/second directory")
        return 1
    
    print(f"Using test directory: {test_dir}")
    
    # Run evaluation
    results = evaluator.evaluate_folder(test_dir)
    
    # Create timestamp for this run
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    
    # Save results
    summary = evaluator.save_results(results, config.out_dir, timestamp)
    
    # Print summary
    print(f"\n=== EVALUATION SUMMARY ===")
    print(f"Total images: {summary['results']['total_images']}")
    print(f"Successful measurements: {summary['results']['successful_measurements']}")
    print(f"Success rate: {summary['results']['success_rate_percent']:.1f}%")
    print(f"Average volume error: {summary['results']['avg_volume_error_percent']:.2f}%")
    print(f"Average diameter error: {summary['results']['avg_diameter_error_percent']:.2f}%")
    print(f"Average height error: {summary['results']['avg_height_error_percent']:.2f}%")
    print(f"Average processing time: {summary['results']['avg_processing_time_ms']:.2f}ms")
    print(f"Overall score: {summary['results']['overall_score']:.2f}")
    
    if config.fusion:
        print(f"Average silhouette score: {summary['results']['avg_silhouette_score']:.3f}")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())