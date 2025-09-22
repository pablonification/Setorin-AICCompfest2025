#!/usr/bin/env python3
"""
Batch Testing Script for Image Contour and Edge Detection

This script processes all images in the testing folder using different evaluation approaches
and generates comprehensive test reports.

Usage:
    python -m src.backend.tools.batch_testing --config batch_config.json --output /app/batch_results
    python -m src.backend.tools.batch_testing --quick-test --limit 10
"""

import argparse
import asyncio
import json
import logging
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from evaluation_pipeline import EvaluationPipeline, PipelineConfig, EvaluationTask

logger = logging.getLogger(__name__)


@dataclass
class BatchTestConfig:
    """Configuration for batch testing."""
    output_dir: str = "/app/batch_results"
    test_categories: List[str] = None  # If None, test all categories
    limit_per_category: int = 0  # 0 = no limit
    image_extensions: List[str] = None

    # Test configurations
    run_silhouette_tests: bool = True
    run_edge_detection_tests: bool = True
    run_contour_analysis_tests: bool = True
    run_comparison_tests: bool = True

    # Performance settings
    max_concurrent_tests: int = 3
    save_debug_images: bool = True

    # Baseline parameters for silhouette testing
    baseline_params: Dict[str, float] = None

    def __post_init__(self):
        if self.test_categories is None:
            self.test_categories = ["all"]
        if self.image_extensions is None:
            self.image_extensions = ['.jpg', '.jpeg', '.png', '.heic']
        if self.baseline_params is None:
            self.baseline_params = {
                "w_area": 1.0,
                "w_aspect": 1.0,
                "w_vertical": 1.0,
                "w_solidity": 1.0,
                "w_border": 0.5
            }


class BatchTester:
    """Batch testing orchestrator for image processing evaluation."""

    def __init__(self, config: BatchTestConfig):
        self.config = config
        self.output_dir = Path(config.output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.test_results: Dict[str, Dict] = {}
        self.setup_logging()

    def setup_logging(self):
        """Setup logging configuration."""
        log_file = self.output_dir / "batch_testing.log"
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )

    def find_test_images(self) -> Dict[str, List[str]]:
        """Find all test images organized by category."""
        test_dir = Path("/workspace/testing")

        if not test_dir.exists():
            logger.warning(f"Test directory not found: {test_dir}")
            return {}

        # Find all image files
        images_by_category = {}

        for ext in self.config.image_extensions:
            for img_path in test_dir.glob(f"**/*{ext}"):
                if img_path.is_file():
                    category = self._determine_image_category(str(img_path))
                    if category not in images_by_category:
                        images_by_category[category] = []
                    images_by_category[category].append(str(img_path))

        # Sort images within each category
        for category in images_by_category:
            images_by_category[category].sort()

        # Apply limits if specified
        if self.config.limit_per_category > 0:
            for category in images_by_category:
                if len(images_by_category[category]) > self.config.limit_per_category:
                    images_by_category[category] = images_by_category[category][:self.config.limit_per_category]

        logger.info(f"Found {sum(len(imgs) for imgs in images_by_category.values())} images across {len(images_by_category)} categories")
        return images_by_category

    def _determine_image_category(self, image_path: str) -> str:
        """Determine the category of an image based on its path."""
        path = Path(image_path).stem.lower()

        # Check for category indicators in filename
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
            # Extract number from test filenames like test2.1, test3.2
            for part in path.split('.'):
                if part.startswith('test') and len(part) > 4:
                    try:
                        num = float(part[4:])
                        if num < 3:
                            return 'test_small'
                        elif num < 5:
                            return 'test_medium'
                        else:
                            return 'test_large'
                    except ValueError:
                        pass

        return 'unknown'

    async def run_batch_tests(self):
        """Run all batch tests according to configuration."""
        logger.info("Starting batch testing...")

        # Find test images
        images_by_category = self.find_test_images()

        if not images_by_category:
            logger.warning("No test images found!")
            return

        # Save test configuration
        self._save_test_configuration(images_by_category)

        # Run different types of tests
        tasks = []

        if self.config.run_silhouette_tests:
            tasks.append(self._run_silhouette_tests(images_by_category))

        if self.config.run_edge_detection_tests:
            tasks.append(self._run_edge_detection_tests(images_by_category))

        if self.config.run_contour_analysis_tests:
            tasks.append(self._run_contour_analysis_tests(images_by_category))

        if self.config.run_comparison_tests:
            tasks.append(self._run_comparison_tests(images_by_category))

        # Run all tasks concurrently
        await asyncio.gather(*tasks)

        # Generate final report
        await self._generate_batch_report()

        logger.info(f"Batch testing completed. Results saved to {self.output_dir}")

    async def _run_silhouette_tests(self, images_by_category: Dict[str, List[str]]):
        """Run silhouette-based evaluation tests."""
        logger.info("Running silhouette evaluation tests...")

        for category, image_paths in images_by_category.items():
            if self.config.test_categories != ["all"] and category not in self.config.test_categories:
                continue

            logger.info(f"Testing silhouette evaluation on {category} category ({len(image_paths)} images)")

            # Create pipeline configuration
            pipeline_config = PipelineConfig(
                task=EvaluationTask.SILHOUETTE,
                output_dir=str(self.output_dir / "silhouette" / category),
                save_debug=self.config.save_debug_images,
                batch_size=0,  # Process all images
                silhouette_config=self.config.baseline_params
            )

            # Run evaluation
            pipeline = EvaluationPipeline(pipeline_config)
            await pipeline.run()

            # Store results
            self.test_results[f"silhouette_{category}"] = {
                "category": category,
                "image_count": len(image_paths),
                "output_dir": str(pipeline_config.output_dir),
                "timestamp": time.time()
            }

    async def _run_edge_detection_tests(self, images_by_category: Dict[str, List[str]]):
        """Run edge detection algorithm comparison tests."""
        logger.info("Running edge detection tests...")

        # Flatten all images for edge detection testing
        all_images = []
        for images in images_by_category.values():
            all_images.extend(images)

        if self.config.limit_per_category > 0:
            all_images = all_images[:self.config.limit_per_category * len(images_by_category)]

        logger.info(f"Testing edge detection on {len(all_images)} images")

        pipeline_config = PipelineConfig(
            task=EvaluationTask.EDGE_DETECTION,
            output_dir=str(self.output_dir / "edge_detection"),
            save_debug=self.config.save_debug_images,
            batch_size=min(50, len(all_images)),  # Limit batch size for edge detection
            edge_detection_config={
                "save_debug": self.config.save_debug_images
            }
        )

        pipeline = EvaluationPipeline(pipeline_config)
        await pipeline.run()

        self.test_results["edge_detection"] = {
            "image_count": len(all_images),
            "output_dir": str(pipeline_config.output_dir),
            "timestamp": time.time()
        }

    async def _run_contour_analysis_tests(self, images_by_category: Dict[str, List[str]]):
        """Run contour analysis tests."""
        logger.info("Running contour analysis tests...")

        # Process each category separately for detailed analysis
        for category, image_paths in images_by_category.items():
            if self.config.test_categories != ["all"] and category not in self.config.test_categories:
                continue

            logger.info(f"Testing contour analysis on {category} category ({len(image_paths)} images)")

            pipeline_config = PipelineConfig(
                task=EvaluationTask.CONTOUR_ANALYSIS,
                output_dir=str(self.output_dir / "contour_analysis" / category),
                save_debug=self.config.save_debug_images,
                batch_size=min(20, len(image_paths)),  # Smaller batch size for detailed analysis
                contour_config={
                    "save_debug": self.config.save_debug_images
                }
            )

            pipeline = EvaluationPipeline(pipeline_config)
            await pipeline.run()

            self.test_results[f"contour_{category}"] = {
                "category": category,
                "image_count": len(image_paths),
                "output_dir": str(pipeline_config.output_dir),
                "timestamp": time.time()
            }

    async def _run_comparison_tests(self, images_by_category: Dict[str, List[str]]):
        """Run comparison tests between different approaches."""
        logger.info("Running comparison tests...")

        # Use a subset of images for comparison testing
        comparison_images = []
        for category, images in images_by_category.items():
            # Take up to 5 images from each category
            comparison_images.extend(images[:5])

        logger.info(f"Running comparison on {len(comparison_images)} images")

        pipeline_config = PipelineConfig(
            task=EvaluationTask.COMPARISON,
            output_dir=str(self.output_dir / "comparison"),
            save_debug=self.config.save_debug_images,
            batch_size=min(30, len(comparison_images)),
            silhouette_config=self.config.baseline_params,
            edge_detection_config={"save_debug": self.config.save_debug_images},
            contour_config={"save_debug": self.config.save_debug_images}
        )

        pipeline = EvaluationPipeline(pipeline_config)
        await pipeline.run()

        self.test_results["comparison"] = {
            "image_count": len(comparison_images),
            "output_dir": str(pipeline_config.output_dir),
            "timestamp": time.time()
        }

    def _save_test_configuration(self, images_by_category: Dict[str, List[str]]):
        """Save the test configuration and image list."""
        config = {
            "batch_config": asdict(self.config),
            "images_by_category": {
                category: {
                    "count": len(images),
                    "image_paths": images
                }
                for category, images in images_by_category.items()
            },
            "total_images": sum(len(images) for images in images_by_category.values()),
            "timestamp": time.time()
        }

        config_path = self.output_dir / "batch_test_configuration.json"
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)

        logger.info(f"Test configuration saved to {config_path}")

    async def _generate_batch_report(self):
        """Generate a comprehensive batch test report."""
        logger.info("Generating batch test report...")

        # Collect results from all subdirectories
        results_summary = {
            "batch_test_summary": {
                "total_tests_run": len(self.test_results),
                "test_categories": list(self.test_results.keys()),
                "output_directory": str(self.output_dir),
                "timestamp": time.time()
            },
            "individual_test_results": self.test_results,
            "quick_stats": self._generate_quick_stats()
        }

        # Save summary
        summary_path = self.output_dir / "batch_test_summary.json"
        with open(summary_path, 'w') as f:
            json.dump(results_summary, f, indent=2)

        # Generate human-readable report
        await self._generate_human_readable_report(results_summary)

        logger.info(f"Batch report generated: {summary_path}")

    def _generate_quick_stats(self) -> Dict:
        """Generate quick statistics for the batch test."""
        stats = {
            "total_images_processed": 0,
            "categories_tested": set(),
            "tests_with_debug_images": 0
        }

        for test_name, result in self.test_results.items():
            stats["total_images_processed"] += result.get("image_count", 0)
            if "category" in result:
                stats["categories_tested"].add(result["category"])
            if self.config.save_debug_images:
                stats["tests_with_debug_images"] += 1

        stats["categories_tested"] = list(stats["categories_tested"])
        return stats

    async def _generate_human_readable_report(self, results_summary: Dict):
        """Generate a human-readable batch test report."""
        report_lines = []

        # Header
        report_lines.append("=" * 100)
        report_lines.append("BATCH TESTING REPORT")
        report_lines.append("=" * 100)
        report_lines.append(f"Generated: {time.ctime()}")
        report_lines.append("")

        # Summary
        summary = results_summary["batch_test_summary"]
        report_lines.append("EXECUTIVE SUMMARY")
        report_lines.append("-" * 50)
        report_lines.append(f"Total tests run: {summary['total_tests_run']}")
        report_lines.append(f"Total images processed: {results_summary['quick_stats']['total_images_processed']}")
        report_lines.append(f"Categories tested: {', '.join(results_summary['quick_stats']['categories_tested'])}")
        report_lines.append(f"Output directory: {summary['output_directory']}")
        report_lines.append("")

        # Test results
        report_lines.append("TEST RESULTS BREAKDOWN")
        report_lines.append("-" * 50)

        for test_name, result in self.test_results.items():
            report_lines.append(f"\n{test_name.upper()}:")
            report_lines.append(f"  Images processed: {result.get('image_count', 0)}")
            report_lines.append(f"  Output directory: {result.get('output_dir', 'N/A')}")
            if "category" in result:
                report_lines.append(f"  Category: {result['category']}")

        report_lines.append("")

        # Configuration used
        report_lines.append("TEST CONFIGURATION")
        report_lines.append("-" * 50)
        config = asdict(self.config)
        for key, value in config.items():
            if key == "baseline_params":
                report_lines.append(f"Baseline parameters: {value}")
            elif key == "test_categories":
                report_lines.append(f"Test categories: {value}")
            elif not key.startswith("_"):
                report_lines.append(f"{key}: {value}")

        # Recommendations
        report_lines.append("")
        report_lines.append("RECOMMENDATIONS")
        report_lines.append("-" * 50)
        report_lines.append("1. Review individual test results in their respective output directories")
        report_lines.append("2. Use CSV analysis tools to dive deeper into specific results")
        report_lines.append("3. Consider parameter tuning if silhouette test results need improvement")
        report_lines.append("4. Check debug images for qualitative analysis of edge/contour detection")

        # Write report
        report_path = self.output_dir / "batch_test_report.txt"
        with open(report_path, 'w') as f:
            f.write('\n'.join(report_lines))

        logger.info(f"Human-readable report generated: {report_path}")


def create_quick_test_config() -> BatchTestConfig:
    """Create a configuration for quick testing."""
    return BatchTestConfig(
        output_dir="/app/quick_test_results",
        limit_per_category=5,  # Only test first 5 images per category
        test_categories=["all"],
        run_silhouette_tests=True,
        run_edge_detection_tests=False,  # Skip for speed
        run_contour_analysis_tests=False,  # Skip for speed
        run_comparison_tests=False,  # Skip for speed
        max_concurrent_tests=1,
        save_debug_images=True
    )


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Batch Testing for Image Processing')

    parser.add_argument('--config', '-c', type=str,
                       help='JSON configuration file')
    parser.add_argument('--output', '-o', type=str, default='/app/batch_results',
                       help='Output directory')
    parser.add_argument('--quick-test', action='store_true',
                       help='Run quick test with limited images')
    parser.add_argument('--limit', '-l', type=int, default=0,
                       help='Limit images per category (0 = no limit)')
    parser.add_argument('--categories', nargs='+',
                       help='Specific categories to test')
    parser.add_argument('--skip-silhouette', action='store_true',
                       help='Skip silhouette tests')
    parser.add_argument('--skip-edge-detection', action='store_true',
                       help='Skip edge detection tests')
    parser.add_argument('--skip-contour-analysis', action='store_true',
                       help='Skip contour analysis tests')
    parser.add_argument('--skip-comparison', action='store_true',
                       help='Skip comparison tests')
    parser.add_argument('--no-debug', action='store_true',
                       help='Do not save debug images')

    args = parser.parse_args()

    # Load configuration
    if args.config and Path(args.config).exists():
        with open(args.config, 'r') as f:
            config_dict = json.load(f)
        config = BatchTestConfig(**config_dict)
    else:
        config = BatchTestConfig()

    # Apply command line overrides
    if args.quick_test:
        config = create_quick_test_config()
        logger.info("Running in quick test mode")

    config.output_dir = args.output
    config.limit_per_category = args.limit
    config.test_categories = args.categories or ["all"]

    if args.skip_silhouette:
        config.run_silhouette_tests = False
    if args.skip_edge_detection:
        config.run_edge_detection_tests = False
    if args.skip_contour_analysis:
        config.run_contour_analysis_tests = False
    if args.skip_comparison:
        config.run_comparison_tests = False
    if args.no_debug:
        config.save_debug_images = False

    # Run batch tests
    tester = BatchTester(config)
    await tester.run_batch_tests()


if __name__ == "__main__":
    asyncio.run(main())