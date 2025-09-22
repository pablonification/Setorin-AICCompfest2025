#!/usr/bin/env python3
"""
Comprehensive Evaluation Pipeline for Image Contour and Edge Detection

This script provides a unified interface for running different types of evaluations:
- Silhouette parameter tuning evaluation
- Edge detection algorithm comparison
- Contour detection performance testing
- Batch processing of test images

Usage:
    python -m src.backend.tools.evaluation_pipeline --task silhouette --config config.json
    python -m src.backend.tools.evaluation_pipeline --task edge_detection --save-debug
    python -m src.backend.tools.evaluation_pipeline --task contour_analysis --batch-size 10
"""

import argparse
import asyncio
import json
import logging
import time
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Union

from eval_silhouette import SilhouetteEvaluator, EvaluationConfig

logger = logging.getLogger(__name__)


class EvaluationTask(Enum):
    """Types of evaluation tasks."""
    SILHOUETTE = "silhouette"
    EDGE_DETECTION = "edge_detection"
    CONTOUR_ANALYSIS = "contour_analysis"
    BATCH_TESTING = "batch_testing"
    COMPARISON = "comparison"


@dataclass
class PipelineConfig:
    """Configuration for the evaluation pipeline."""
    task: EvaluationTask
    output_dir: str = "/app/eval_out"
    save_debug: bool = False
    batch_size: int = 10
    max_concurrent: int = 3

    # Task-specific configurations
    silhouette_config: Optional[Dict] = None
    edge_detection_config: Optional[Dict] = None
    contour_config: Optional[Dict] = None


class EdgeDetectionEvaluator:
    """Evaluator for different edge detection algorithms."""

    def __init__(self, config: Dict, output_dir: str):
        self.config = config
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def evaluate_algorithms(self, test_images: List[str]):
        """Compare different edge detection algorithms."""
        logger.info("Starting edge detection algorithm comparison...")

        algorithms = [
            {'name': 'canny_basic', 'method': self._canny_basic},
            {'name': 'canny_adaptive', 'method': self._canny_adaptive},
            {'name': 'sobel', 'method': self._sobel},
            {'name': 'laplacian', 'method': self._laplacian},
            {'name': 'prewitt', 'method': self._prewitt},
        ]

        results = []

        for i, image_path in enumerate(test_images):
            logger.info(f"Processing image {i+1}/{len(test_images)}: {Path(image_path).name}")

            for alg in algorithms:
                try:
                    result = await alg['method'](image_path, alg['name'])
                    results.append(result)
                    logger.info(f"  {alg['name']}: success")
                except Exception as e:
                    logger.error(f"  {alg['name']}: failed - {e}")

        # Save results
        await self._save_edge_results(results)
        logger.info(f"Edge detection evaluation complete. Results saved to {self.output_dir}")

    async def _canny_basic(self, image_path: str, alg_name: str) -> Dict:
        """Basic Canny edge detection."""
        return await self._apply_edge_detection(image_path, alg_name, 'canny', {'threshold1': 50, 'threshold2': 150})

    async def _canny_adaptive(self, image_path: str, alg_name: str) -> Dict:
        """Adaptive Canny edge detection."""
        return await self._apply_edge_detection(image_path, alg_name, 'canny', {'threshold1': 30, 'threshold2': 100})

    async def _sobel(self, image_path: str, alg_name: str) -> Dict:
        """Sobel edge detection."""
        return await self._apply_edge_detection(image_path, alg_name, 'sobel', {})

    async def _laplacian(self, image_path: str, alg_name: str) -> Dict:
        """Laplacian edge detection."""
        return await self._apply_edge_detection(image_path, alg_name, 'laplacian', {})

    async def _prewitt(self, image_path: str, alg_name: str) -> Dict:
        """Prewitt edge detection."""
        return await self._apply_edge_detection(image_path, alg_name, 'prewitt', {})

    async def _apply_edge_detection(self, image_path: str, alg_name: str, method: str, params: Dict) -> Dict:
        """Apply edge detection algorithm to an image."""
        import cv2
        import numpy as np
        from datetime import datetime

        start_time = time.time()

        # Read image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)

        # Apply edge detection
        edges = None
        if method == 'canny':
            edges = cv2.Canny(gray, **params)
        elif method == 'sobel':
            sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=5)
            sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=5)
            edges = cv2.magnitude(sobelx, sobely).astype(np.uint8)
        elif method == 'laplacian':
            edges = cv2.Laplacian(gray, cv2.CV_64F).astype(np.uint8)
        elif method == 'prewitt':
            # Prewitt kernel approximation using Sobel
            edges = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
            edges = np.abs(edges).astype(np.uint8)

        processing_time = time.time() - start_time

        # Calculate metrics
        edge_count = np.sum(edges > 0)
        edge_density = edge_count / (edges.shape[0] * edges.shape[1])

        # Save debug image if requested
        debug_path = None
        if self.config.get('save_debug', False):
            debug_filename = f"{Path(image_path).stem}_{alg_name}_edges.jpg"
            debug_path = str(self.output_dir / "edge_debug" / debug_filename)

            # Create overlay
            overlay = img.copy()
            edges_colored = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
            overlay = cv2.addWeighted(img, 0.7, edges_colored, 0.3, 0)

            cv2.imwrite(debug_path, overlay)

        return {
            'image_path': image_path,
            'algorithm': alg_name,
            'method': method,
            'params': params,
            'edge_count': int(edge_count),
            'edge_density': float(edge_density),
            'processing_time_ms': processing_time * 1000,
            'image_shape': list(edges.shape),
            'debug_path': debug_path,
            'timestamp': datetime.now().isoformat()
        }

    async def _save_edge_results(self, results: List[Dict]):
        """Save edge detection results to files."""
        import csv

        # Save CSV
        csv_path = self.output_dir / "edge_detection_results.csv"
        with open(csv_path, 'w', newline='') as f:
            if results:
                writer = csv.DictWriter(f, fieldnames=results[0].keys())
                writer.writeheader()
                writer.writerows(results)

        # Save summary
        summary = self._calculate_edge_summary(results)
        summary_path = self.output_dir / "edge_detection_summary.json"
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2)

    def _calculate_edge_summary(self, results: List[Dict]) -> Dict:
        """Calculate summary statistics for edge detection results."""
        if not results:
            return {}

        algorithms = {}
        for result in results:
            alg = result['algorithm']
            if alg not in algorithms:
                algorithms[alg] = {
                    'count': 0,
                    'total_edges': 0,
                    'total_density': 0,
                    'total_time': 0,
                    'results': []
                }

            algorithms[alg]['count'] += 1
            algorithms[alg]['total_edges'] += result['edge_count']
            algorithms[alg]['total_density'] += result['edge_density']
            algorithms[alg]['total_time'] += result['processing_time_ms']
            algorithms[alg]['results'].append(result)

        # Calculate averages
        summary = {}
        for alg, data in algorithms.items():
            summary[alg] = {
                'avg_edge_count': data['total_edges'] / data['count'],
                'avg_edge_density': data['total_density'] / data['count'],
                'avg_processing_time_ms': data['total_time'] / data['count'],
                'total_images': data['count']
            }

        return {
            'algorithm_comparison': summary,
            'total_results': len(results),
            'unique_algorithms': list(algorithms.keys()),
            'timestamp': results[0]['timestamp'] if results else None
        }


class ContourAnalysisEvaluator:
    """Evaluator for contour detection and analysis."""

    def __init__(self, config: Dict, output_dir: str):
        self.config = config
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def analyze_contours(self, test_images: List[str]):
        """Analyze contour detection performance."""
        logger.info("Starting contour analysis evaluation...")

        results = []

        for i, image_path in enumerate(test_images):
            logger.info(f"Processing image {i+1}/{len(test_images)}: {Path(image_path).name}")

            try:
                result = await self._analyze_single_image(image_path)
                results.append(result)
                logger.info(f"  Found {result['contour_count']} contours")
            except Exception as e:
                logger.error(f"  Failed: {e}")

        # Save results
        await self._save_contour_results(results)
        logger.info(f"Contour analysis complete. Results saved to {self.output_dir}")

    async def _analyze_single_image(self, image_path: str) -> Dict:
        """Analyze contours in a single image."""
        import cv2
        import numpy as np
        from datetime import datetime

        start_time = time.time()

        # Read and preprocess image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")

        # Apply multiple preprocessing techniques
        preprocessing_results = await self._apply_preprocessing(img)

        # Find contours for each preprocessing method
        contour_analysis = {}
        for prep_name, preprocessed in preprocessing_results.items():
            contours, hierarchy = cv2.findContours(
                preprocessed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )

            contour_analysis[prep_name] = await self._analyze_contours(contours, img.shape)

        processing_time = time.time() - start_time

        # Save debug image if requested
        debug_path = None
        if self.config.get('save_debug', False):
            debug_path = await self._save_contour_debug(image_path, contour_analysis)

        return {
            'image_path': image_path,
            'image_shape': list(img.shape),
            'processing_time_ms': processing_time * 1000,
            'contour_analysis': contour_analysis,
            'debug_path': debug_path,
            'timestamp': datetime.now().isoformat()
        }

    async def _apply_preprocessing(self, img: np.ndarray) -> Dict[str, np.ndarray]:
        """Apply different preprocessing techniques."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        results = {
            'grayscale': gray,
            'blur': cv2.GaussianBlur(gray, (5, 5), 0),
            'adaptive_thresh': cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2),
            'otsu_thresh': cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
            'canny_edges': cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 50, 150),
        }

        # Morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        results['morph_close'] = cv2.morphologyEx(results['canny_edges'], cv2.MORPH_CLOSE, kernel, iterations=1)

        return results

    async def _analyze_contours(self, contours: List, image_shape: Tuple) -> Dict:
        """Analyze contour properties."""
        if not contours:
            return {
                'contour_count': 0,
                'total_area': 0,
                'avg_area': 0,
                'largest_contour_area': 0,
                'contour_density': 0
            }

        areas = [cv2.contourArea(cnt) for cnt in contours]
        total_area = sum(areas)
        avg_area = total_area / len(areas)
        largest_area = max(areas) if areas else 0
        contour_density = total_area / (image_shape[0] * image_shape[1])

        # Analyze contour shapes
        circularity_scores = []
        aspect_ratios = []

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > 0:
                perimeter = cv2.arcLength(cnt, True)
                if perimeter > 0:
                    circularity = 4 * np.pi * area / (perimeter ** 2)
                    circularity_scores.append(circularity)

                # Bounding rectangle aspect ratio
                x, y, w, h = cv2.boundingRect(cnt)
                aspect_ratio = max(w, h) / min(w, h) if min(w, h) > 0 else 0
                aspect_ratios.append(aspect_ratio)

        return {
            'contour_count': len(contours),
            'total_area': total_area,
            'avg_area': avg_area,
            'largest_contour_area': largest_area,
            'contour_density': contour_density,
            'avg_circularity': sum(circularity_scores) / len(circularity_scores) if circularity_scores else 0,
            'avg_aspect_ratio': sum(aspect_ratios) / len(aspect_ratios) if aspect_ratios else 0,
            'area_distribution': {
                'min': min(areas) if areas else 0,
                'max': largest_area,
                'median': sorted(areas)[len(areas) // 2] if areas else 0
            }
        }

    async def _save_contour_debug(self, image_path: str, contour_analysis: Dict) -> str:
        """Save debug visualization of contours."""
        import cv2

        img = cv2.imread(image_path)
        debug_img = img.copy()

        # Get best preprocessing result (most contours)
        best_prep = max(contour_analysis.keys(),
                       key=lambda k: contour_analysis[k]['contour_count'])
        best_result = contour_analysis[best_prep]

        # Apply best preprocessing
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        if best_prep == 'grayscale':
            processed = gray
        elif best_prep == 'blur':
            processed = cv2.GaussianBlur(gray, (5, 5), 0)
        elif best_prep == 'adaptive_thresh':
            processed = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        elif best_prep == 'otsu_thresh':
            processed = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        elif best_prep == 'canny_edges':
            processed = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 50, 150)
        else:
            processed = gray

        # Draw contours
        contours, _ = cv2.findContours(processed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(debug_img, contours, -1, (0, 255, 0), 2)

        # Add text overlay
        cv2.putText(debug_img, f"Preprocessing: {best_prep}",
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(debug_img, f"Contours found: {best_result['contour_count']}",
                   (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(debug_img, f"Largest area: {best_result['largest_contour_area']:.0f}",
                   (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        # Save
        debug_filename = f"{Path(image_path).stem}_contours_debug.jpg"
        debug_path = str(self.output_dir / "contour_debug" / debug_filename)
        cv2.imwrite(debug_path, debug_img)

        return debug_path

    async def _save_contour_results(self, results: List[Dict]):
        """Save contour analysis results."""
        import csv

        # Flatten results for CSV
        csv_rows = []
        for result in results:
            for prep_method, analysis in result['contour_analysis'].items():
                csv_rows.append({
                    'image_path': result['image_path'],
                    'preprocessing_method': prep_method,
                    'contour_count': analysis['contour_count'],
                    'total_area': analysis['total_area'],
                    'avg_area': analysis['avg_area'],
                    'largest_contour_area': analysis['largest_contour_area'],
                    'contour_density': analysis['contour_density'],
                    'avg_circularity': analysis['avg_circularity'],
                    'avg_aspect_ratio': analysis['avg_aspect_ratio'],
                    'processing_time_ms': result['processing_time_ms']
                })

        # Save CSV
        csv_path = self.output_dir / "contour_analysis_results.csv"
        with open(csv_path, 'w', newline='') as f:
            if csv_rows:
                writer = csv.DictWriter(f, fieldnames=csv_rows[0].keys())
                writer.writeheader()
                writer.writerows(csv_rows)

        # Save summary
        summary = self._calculate_contour_summary(results)
        summary_path = self.output_dir / "contour_analysis_summary.json"
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2)

    def _calculate_contour_summary(self, results: List[Dict]) -> Dict:
        """Calculate summary statistics for contour analysis."""
        if not results:
            return {}

        preprocessing_methods = {}
        for result in results:
            for method, analysis in result['contour_analysis'].items():
                if method not in preprocessing_methods:
                    preprocessing_methods[method] = {
                        'total_images': 0,
                        'total_contours': 0,
                        'total_area': 0,
                        'processing_times': []
                    }

                preprocessing_methods[method]['total_images'] += 1
                preprocessing_methods[method]['total_contours'] += analysis['contour_count']
                preprocessing_methods[method]['total_area'] += analysis['total_area']
                preprocessing_methods[method]['processing_times'].append(result['processing_time_ms'])

        summary = {}
        for method, data in preprocessing_methods.items():
            summary[method] = {
                'avg_contours_per_image': data['total_contours'] / data['total_images'],
                'avg_area_per_image': data['total_area'] / data['total_images'],
                'avg_processing_time_ms': sum(data['processing_times']) / len(data['processing_times']),
                'total_images_processed': data['total_images']
            }

        return {
            'preprocessing_comparison': summary,
            'total_images': len(results),
            'timestamp': results[0]['timestamp'] if results else None
        }


class BatchTestingEvaluator:
    """Evaluator for batch testing of the measurement pipeline."""

    def __init__(self, config: Dict, output_dir: str):
        self.config = config
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def run_batch_tests(self, test_images: List[str]):
        """Run batch tests on multiple images."""
        logger.info("Starting batch testing evaluation...")

        # Import here to avoid circular imports
        from eval_silhouette import SilhouetteEvaluator, EvaluationConfig

        # Setup silhouette evaluator
        silhouette_config = EvaluationConfig(
            w_area=1.0,
            w_aspect=1.0,
            w_vertical=1.0,
            w_solidity=1.0,
            w_border=0.5,
            save_debug=self.config.get('save_debug', False),
            out_dir=str(self.output_dir),
            limit_per_folder=0  # Process all images
        )

        evaluator = SilhouetteEvaluator(silhouette_config)
        await evaluator.run_evaluation()

        logger.info("Batch testing complete.")


class EvaluationPipeline:
    """Main evaluation pipeline orchestrator."""

    def __init__(self, config: PipelineConfig):
        self.config = config
        self.output_dir = Path(config.output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.setup_logging()

    def setup_logging(self):
        """Setup logging configuration."""
        log_file = self.output_dir / "pipeline.log"
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )

    async def run(self):
        """Run the evaluation pipeline."""
        logger.info(f"Starting evaluation pipeline for task: {self.config.task.value}")

        # Find test images
        test_images = self._find_test_images()

        if not test_images:
            logger.warning("No test images found!")
            return

        logger.info(f"Found {len(test_images)} test images")

        # Run appropriate evaluator
        if self.config.task == EvaluationTask.SILHOUETTE:
            await self._run_silhouette_evaluation(test_images)
        elif self.config.task == EvaluationTask.EDGE_DETECTION:
            await self._run_edge_detection_evaluation(test_images)
        elif self.config.task == EvaluationTask.CONTOUR_ANALYSIS:
            await self._run_contour_analysis_evaluation(test_images)
        elif self.config.task == EvaluationTask.BATCH_TESTING:
            await self._run_batch_testing_evaluation(test_images)
        elif self.config.task == EvaluationTask.COMPARISON:
            await self._run_comparison_evaluation(test_images)

        logger.info(f"Evaluation pipeline completed. Results saved to {self.output_dir}")

    def _find_test_images(self) -> List[str]:
        """Find test images based on configuration."""
        test_dir = Path("/workspace/testing")

        if not test_dir.exists():
            logger.warning(f"Test directory not found: {test_dir}")
            return []

        # Find image files
        extensions = {'.jpg', '.jpeg', '.png', '.heic'}
        images = []

        for ext in extensions:
            for img_path in test_dir.glob(f"**/*{ext}"):
                if img_path.is_file():
                    images.append(str(img_path))

        # Sort for consistent processing
        images.sort()

        # Limit batch size if specified
        if self.config.batch_size > 0:
            images = images[:self.config.batch_size]

        return images

    async def _run_silhouette_evaluation(self, test_images: List[str]):
        """Run silhouette parameter evaluation."""
        from eval_silhouette import SilhouetteEvaluator, EvaluationConfig

        if not self.config.silhouette_config:
            logger.warning("No silhouette configuration provided")
            return

        config = EvaluationConfig(**self.config.silhouette_config)
        config.out_dir = self.config.output_dir
        config.save_debug = self.config.save_debug

        evaluator = SilhouetteEvaluator(config)
        await evaluator.run_evaluation()

    async def _run_edge_detection_evaluation(self, test_images: List[str]):
        """Run edge detection evaluation."""
        evaluator = EdgeDetectionEvaluator(self.config.edge_detection_config or {}, self.config.output_dir)
        await evaluator.evaluate_algorithms(test_images)

    async def _run_contour_analysis_evaluation(self, test_images: List[str]):
        """Run contour analysis evaluation."""
        evaluator = ContourAnalysisEvaluator(self.config.contour_config or {}, self.config.output_dir)
        await evaluator.analyze_contours(test_images)

    async def _run_batch_testing_evaluation(self, test_images: List[str]):
        """Run batch testing evaluation."""
        evaluator = BatchTestingEvaluator(self.config.contour_config or {}, self.config.output_dir)
        await evaluator.run_batch_tests(test_images)

    async def _run_comparison_evaluation(self, test_images: List[str]):
        """Run comparison evaluation of multiple approaches."""
        logger.info("Running comparison evaluation...")

        # Run multiple evaluation types
        tasks = []

        # Silhouette evaluation
        if self.config.silhouette_config:
            tasks.append(self._run_silhouette_evaluation(test_images))

        # Edge detection evaluation
        if self.config.edge_detection_config:
            tasks.append(self._run_edge_detection_evaluation(test_images))

        # Contour analysis
        if self.config.contour_config:
            tasks.append(self._run_contour_analysis_evaluation(test_images))

        # Run tasks concurrently
        await asyncio.gather(*tasks)


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Comprehensive Evaluation Pipeline')

    parser.add_argument('--task', type=str, choices=[t.value for t in EvaluationTask],
                       required=True, help='Evaluation task to run')
    parser.add_argument('--config', type=str,
                       help='JSON configuration file')
    parser.add_argument('--output-dir', type=str, default='/app/eval_out',
                       help='Output directory')
    parser.add_argument('--save-debug', action='store_true',
                       help='Save debug images')
    parser.add_argument('--batch-size', type=int, default=10,
                       help='Number of images to process (0 for all)')
    parser.add_argument('--max-concurrent', type=int, default=3,
                       help='Maximum concurrent operations')

    args = parser.parse_args()

    # Load configuration
    config_data = {}
    if args.config and Path(args.config).exists():
        with open(args.config, 'r') as f:
            config_data = json.load(f)

    # Create pipeline configuration
    pipeline_config = PipelineConfig(
        task=EvaluationTask(args.task),
        output_dir=args.output_dir,
        save_debug=args.save_debug or config_data.get('save_debug', False),
        batch_size=args.batch_size,
        max_concurrent=args.max_concurrent,

        # Task-specific configs
        silhouette_config=config_data.get('silhouette', {}),
        edge_detection_config=config_data.get('edge_detection', {}),
        contour_config=config_data.get('contour', {})
    )

    # Run pipeline
    pipeline = EvaluationPipeline(pipeline_config)
    await pipeline.run()


if __name__ == "__main__":
    asyncio.run(main())