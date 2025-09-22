#!/usr/bin/env python3
"""
Parameter Tuning Automation Script

This script systematically tests different parameter combinations for silhouette evaluation
following the protocol outlined in the Silhouette_Parameter_Tuning_Automation.md guide.

Usage:
    python -m src.backend.tools.parameter_tuning_automation --phase 1 --limit-per-folder 30
    python -m src.backend.tools.parameter_tuning_automation --phase 2 --config best_params.json
"""

import argparse
import asyncio
import json
import logging
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from eval_silhouette import EvaluationConfig

logger = logging.getLogger(__name__)


@dataclass
class TuningPhase:
    """Configuration for a tuning phase."""
    name: str
    description: str
    parameter_sets: List[Dict[str, float]]
    priority: int = 1


class ParameterTuningAutomation:
    """Automated parameter tuning for silhouette evaluation."""

    def __init__(self, output_dir: str = "/app/eval_out"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.tuning_log_path = self.output_dir / "parameter_tuning_log.json"
        self.tuning_history: List[Dict] = []

        self.setup_logging()

        # Load existing tuning history
        self.load_tuning_history()

    def setup_logging(self):
        """Setup logging configuration."""
        log_file = self.output_dir / "parameter_tuning.log"
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )

    def load_tuning_history(self):
        """Load existing tuning history from file."""
        if self.tuning_log_path.exists():
            try:
                with open(self.tuning_log_path, 'r') as f:
                    self.tuning_history = json.load(f)
                logger.info(f"Loaded {len(self.tuning_history)} previous tuning runs")
            except Exception as e:
                logger.warning(f"Failed to load tuning history: {e}")
                self.tuning_history = []

    def save_tuning_history(self):
        """Save tuning history to file."""
        try:
            with open(self.tuning_log_path, 'w') as f:
                json.dump(self.tuning_history, f, indent=2)
            logger.info(f"Saved tuning history with {len(self.tuning_history)} runs")
        except Exception as e:
            logger.error(f"Failed to save tuning history: {e}")

    def get_phase_configurations(self) -> Dict[int, TuningPhase]:
        """Get parameter configurations for different tuning phases."""
        return {
            1: TuningPhase(
                name="Phase 1: Baseline + Single Parameter Sweeps",
                description="Test baseline and individual parameter adjustments",
                parameter_sets=[
                    # Baseline (equal weights)
                    {"w_area": 1.0, "w_aspect": 1.0, "w_vertical": 1.0, "w_solidity": 1.0, "w_border": 0.5},

                    # Area emphasis sweep
                    {"w_area": 1.5, "w_aspect": 1.0, "w_vertical": 1.0, "w_solidity": 1.0, "w_border": 0.5},
                    {"w_area": 0.8, "w_aspect": 1.0, "w_vertical": 1.0, "w_solidity": 1.0, "w_border": 0.5},

                    # Aspect emphasis sweep
                    {"w_area": 1.0, "w_aspect": 1.5, "w_vertical": 1.0, "w_solidity": 1.0, "w_border": 0.5},
                    {"w_area": 1.0, "w_aspect": 2.0, "w_vertical": 1.0, "w_solidity": 1.0, "w_border": 0.5},

                    # Vertical emphasis sweep
                    {"w_area": 1.0, "w_aspect": 1.0, "w_vertical": 1.5, "w_solidity": 1.0, "w_border": 0.5},
                    {"w_area": 1.0, "w_aspect": 1.0, "w_vertical": 2.0, "w_solidity": 1.0, "w_border": 0.5},

                    # Solidity emphasis sweep
                    {"w_area": 1.0, "w_aspect": 1.0, "w_vertical": 1.0, "w_solidity": 1.5, "w_border": 0.5},
                    {"w_area": 1.0, "w_aspect": 1.0, "w_vertical": 1.0, "w_solidity": 0.8, "w_border": 0.5},

                    # Border emphasis sweep
                    {"w_area": 1.0, "w_aspect": 1.0, "w_vertical": 1.0, "w_solidity": 1.0, "w_border": 1.0},
                    {"w_area": 1.0, "w_aspect": 1.0, "w_vertical": 1.0, "w_solidity": 1.0, "w_border": 0.3},
                ],
                priority=1
            ),

            2: TuningPhase(
                name="Phase 2: Conservative Range Testing",
                description="Test conservative parameter ranges for fine-tuning",
                parameter_sets=[
                    # Conservative area range
                    {"w_area": w, "w_aspect": 1.0, "w_vertical": 1.0, "w_solidity": 1.0, "w_border": 0.5}
                    for w in [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5]
                ] + [
                    # Conservative aspect range
                    {"w_area": 1.0, "w_aspect": w, "w_vertical": 1.0, "w_solidity": 1.0, "w_border": 0.5}
                    for w in [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0]
                ] + [
                    # Conservative vertical range
                    {"w_area": 1.0, "w_aspect": 1.0, "w_vertical": w, "w_solidity": 1.0, "w_border": 0.5}
                    for w in [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0]
                ] + [
                    # Conservative solidity range
                    {"w_area": 1.0, "w_aspect": 1.0, "w_vertical": 1.0, "w_solidity": w, "w_border": 0.5}
                    for w in [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5]
                ] + [
                    # Conservative border range
                    {"w_area": 1.0, "w_aspect": 1.0, "w_vertical": 1.0, "w_solidity": 1.0, "w_border": w}
                    for w in [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
                ],
                priority=2
            ),

            3: TuningPhase(
                name="Phase 3: Aggressive Range Testing",
                description="Test aggressive parameter ranges if conservative fails",
                parameter_sets=[
                    # Aggressive ranges for all parameters
                    {"w_area": w1, "w_aspect": w2, "w_vertical": w3, "w_solidity": w4, "w_border": w5}
                    for w1 in [0.5, 0.7, 1.0, 1.3, 1.5, 1.7, 2.0]
                    for w2 in [0.5, 0.7, 1.0, 1.5, 2.0, 2.5, 3.0]
                    for w3 in [0.5, 0.7, 1.0, 1.5, 2.0, 2.5, 3.0]
                    for w4 in [0.5, 0.7, 1.0, 1.3, 1.5, 1.7, 2.0]
                    for w5 in [0.1, 0.2, 0.3, 0.5, 0.7, 1.0, 1.2, 1.5]
                ],
                priority=3
            ),

            4: TuningPhase(
                name="Phase 4: Combination Testing",
                description="Test combinations of best performing individual adjustments",
                parameter_sets=[
                    # Best combinations based on Phase 1 results
                    {"w_area": 1.0, "w_aspect": 1.5, "w_vertical": 1.2, "w_solidity": 1.0, "w_border": 0.5},
                    {"w_area": 1.0, "w_aspect": 1.8, "w_vertical": 1.5, "w_solidity": 1.0, "w_border": 0.3},
                    {"w_area": 0.9, "w_aspect": 1.2, "w_vertical": 1.0, "w_solidity": 1.2, "w_border": 0.4},
                    {"w_area": 1.1, "w_aspect": 1.0, "w_vertical": 1.3, "w_solidity": 0.9, "w_border": 0.6},
                ],
                priority=4
            )
        }

    async def run_tuning_phase(self, phase: int, limit_per_folder: int = 30,
                               dry_run: bool = False) -> List[Dict]:
        """Run a specific tuning phase."""
        logger.info(f"Starting tuning phase {phase}")

        phase_configs = self.get_phase_configurations()
        if phase not in phase_configs:
            raise ValueError(f"Invalid phase: {phase}")

        phase_config = phase_configs[phase]
        logger.info(f"Phase {phase}: {phase_config.description}")
        logger.info(f"Testing {len(phase_config.parameter_sets)} parameter combinations")

        results = []

        for i, params in enumerate(phase_config.parameter_sets):
            logger.info(f"Testing combination {i+1}/{len(phase_config.parameter_sets)}: {params}")

            if dry_run:
                logger.info("  DRY RUN - skipping actual evaluation")
                continue

            # Run evaluation
            run_result = await self._run_single_evaluation(params, limit_per_folder)

            # Store result
            results.append({
                'phase': phase,
                'combination_index': i,
                'parameters': params,
                'result': run_result,
                'timestamp': time.time()
            })

            # Save progress
            self.tuning_history.extend(results)
            self.save_tuning_history()

            # Small delay between runs
            if i < len(phase_config.parameter_sets) - 1:
                logger.info("Waiting 2 seconds before next run...")
                await asyncio.sleep(2)

        logger.info(f"Phase {phase} completed with {len(results)} results")
        return results

    async def _run_single_evaluation(self, params: Dict[str, float],
                                    limit_per_folder: int) -> Optional[Dict]:
        """Run a single evaluation with given parameters."""
        try:
            # Build command
            cmd = [
                "python", "-m", "src.backend.tools.eval_silhouette",
                "--w-area", str(params["w_area"]),
                "--w-aspect", str(params["w_aspect"]),
                "--w-vertical", str(params["w_vertical"]),
                "--w-solidity", str(params["w_solidity"]),
                "--w-border", str(params["w_border"]),
                "--subset", "both",
                "--fusion",
                "--save-debug",
                "--out", str(self.output_dir),
                "--limit-per-folder", str(limit_per_folder)
            ]

            logger.info(f"Running command: {' '.join(cmd)}")

            # Execute command
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )

            if result.returncode == 0:
                logger.info("Evaluation completed successfully")

                # Try to read the latest results
                return await self._extract_latest_results()
            else:
                logger.error(f"Evaluation failed with return code {result.returncode}")
                logger.error(f"STDERR: {result.stderr}")
                return None

        except subprocess.TimeoutExpired:
            logger.error("Evaluation timed out after 5 minutes")
            return None
        except Exception as e:
            logger.error(f"Error running evaluation: {e}")
            return None

    async def _extract_latest_results(self) -> Optional[Dict]:
        """Extract results from the most recent evaluation run."""
        try:
            # Find the latest silhouette experiment directory
            eval_dir = Path(self.output_dir) / "silhouette_experiments"
            if not eval_dir.exists():
                return None

            # Get latest directory
            latest_dir = max(eval_dir.iterdir(), key=lambda p: p.stat().st_mtime)

            # Read summary
            summary_file = latest_dir / "summary.json"
            if summary_file.exists():
                with open(summary_file, 'r') as f:
                    summary = json.load(f)
                return summary

        except Exception as e:
            logger.error(f"Error extracting results: {e}")

        return None

    def analyze_tuning_results(self, phase: int = None) -> Dict:
        """Analyze results from tuning runs."""
        if not self.tuning_history:
            logger.warning("No tuning history available")
            return {}

        # Filter by phase if specified
        relevant_runs = self.tuning_history
        if phase is not None:
            relevant_runs = [r for r in self.tuning_history if r['phase'] == phase]

        if not relevant_runs:
            logger.warning(f"No results found for phase {phase}")
            return {}

        # Sort by error metrics
        def get_error_metric(run):
            result = run.get('result', {})
            error_metrics = result.get('error_metrics', {})
            return error_metrics.get('mean_absolute_error_ml', float('inf'))

        sorted_runs = sorted(relevant_runs, key=get_error_metric)

        # Find best and worst performers
        best_run = sorted_runs[0]
        worst_run = sorted_runs[-1]

        # Calculate statistics
        all_errors = [get_error_metric(run) for run in relevant_runs]
        valid_errors = [e for e in all_errors if e != float('inf')]

        analysis = {
            'total_runs': len(relevant_runs),
            'successful_runs': len(valid_errors),
            'best_result': {
                'parameters': best_run['parameters'],
                'error_metrics': best_run['result'].get('error_metrics', {}),
                'success_rate': best_run['result'].get('success_rate_percent', 0)
            },
            'worst_result': {
                'parameters': worst_run['parameters'],
                'error_metrics': worst_run['result'].get('error_metrics', {}),
                'success_rate': worst_run['result'].get('success_rate_percent', 0)
            },
            'statistics': {
                'mean_error': sum(valid_errors) / len(valid_errors) if valid_errors else None,
                'median_error': sorted(valid_errors)[len(valid_errors) // 2] if valid_errors else None,
                'min_error': min(valid_errors) if valid_errors else None,
                'max_error': max(valid_errors) if valid_errors else None,
            },
            'improvement_suggestions': self._generate_improvement_suggestions(sorted_runs)
        }

        return analysis

    def _generate_improvement_suggestions(self, sorted_runs: List[Dict]) -> List[str]:
        """Generate suggestions for improving parameter tuning."""
        suggestions = []

        if len(sorted_runs) < 3:
            suggestions.append("Run more parameter combinations to establish clear trends")
            return suggestions

        best_params = sorted_runs[0]['parameters']
        worst_params = sorted_runs[-1]['parameters']

        # Analyze parameter effects
        suggestions.append("Based on best performing parameters:")
        suggestions.append(f"  - Area weight: {best_params['w_area']} (good for {'overestimation' if best_params['w_area'] < 1.0 else 'underestimation'})")
        suggestions.append(f"  - Aspect weight: {best_params['w_aspect']} (good for {'wide' if best_params['w_aspect'] < 1.0 else 'slender'} shapes)")
        suggestions.append(f"  - Vertical weight: {best_params['w_vertical']} (good for {'consistent' if best_params['w_vertical'] > 1.0 else 'varied'} orientations)")
        suggestions.append(f"  - Solidity weight: {best_params['w_solidity']} (good for {'complex' if best_params['w_solidity'] < 1.0 else 'simple'} contours)")
        suggestions.append(f"  - Border weight: {best_params['w_border']} (good for {'edge' if best_params['w_border'] > 0.5 else 'center'} contours)")

        # Check if we're still improving
        top_3_avg = sum(self._get_error_metric(r) for r in sorted_runs[:3]) / 3
        bottom_3_avg = sum(self._get_error_metric(r) for r in sorted_runs[-3:]) / 3
        improvement = bottom_3_avg - top_3_avg

        if improvement < 20:
            suggestions.append("Consider stopping tuning - improvements are minimal (< 20ml)")
        elif improvement > 100:
            suggestions.append("Good progress! Continue with more aggressive parameter ranges")
        else:
            suggestions.append("Moderate improvement - consider testing parameter combinations")

        return suggestions

    def _get_error_metric(self, run: Dict) -> float:
        """Get error metric from a run result."""
        result = run.get('result', {})
        error_metrics = result.get('error_metrics', {})
        return error_metrics.get('mean_absolute_error_ml', float('inf'))

    def generate_parameter_recommendations(self) -> Dict[str, float]:
        """Generate recommended parameters based on tuning results."""
        analysis = self.analyze_tuning_results()

        if not analysis or 'best_result' not in analysis:
            logger.warning("Cannot generate recommendations - insufficient data")
            return {
                "w_area": 1.0,
                "w_aspect": 1.0,
                "w_vertical": 1.0,
                "w_solidity": 1.0,
                "w_border": 0.5
            }

        best_params = analysis['best_result']['parameters']
        logger.info(f"Generated recommendations based on best parameters: {best_params}")

        return best_params

    def save_recommendations(self, filename: str = "recommended_parameters.json"):
        """Save parameter recommendations to file."""
        recommendations = self.generate_parameter_recommendations()

        output_path = self.output_dir / filename
        with open(output_path, 'w') as f:
            json.dump({
                'recommended_parameters': recommendations,
                'based_on_analysis': self.analyze_tuning_results(),
                'generated_at': time.time()
            }, f, indent=2)

        logger.info(f"Recommendations saved to {output_path}")
        return output_path


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Parameter Tuning Automation')

    parser.add_argument('--phase', type=int, choices=[1, 2, 3, 4],
                       help='Tuning phase to run')
    parser.add_argument('--limit-per-folder', type=int, default=30,
                       help='Limit images per folder')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be run without executing')
    parser.add_argument('--output-dir', type=str, default='/app/eval_out',
                       help='Output directory')
    parser.add_argument('--analyze-only', action='store_true',
                       help='Only analyze existing results')
    parser.add_argument('--generate-recommendations', action='store_true',
                       help='Generate parameter recommendations')

    args = parser.parse_args()

    # Initialize automation
    automation = ParameterTuningAutomation(args.output_dir)

    if args.analyze_only:
        # Just analyze existing results
        logger.info("Analyzing existing tuning results...")
        analysis = automation.analyze_tuning_results(args.phase)
        print(json.dumps(analysis, indent=2))

    elif args.generate_recommendations:
        # Generate recommendations
        logger.info("Generating parameter recommendations...")
        recommendations_path = automation.save_recommendations()
        print(f"Recommendations saved to: {recommendations_path}")

    elif args.phase:
        # Run specific phase
        logger.info(f"Running tuning phase {args.phase}")
        results = await automation.run_tuning_phase(
            args.phase,
            args.limit_per_folder,
            args.dry_run
        )

        if not args.dry_run:
            # Analyze results
            analysis = automation.analyze_tuning_results(args.phase)
            print(f"\nPhase {args.phase} Analysis:")
            print(json.dumps(analysis, indent=2))

            # Generate recommendations if this is the final phase
            if args.phase >= 4:
                recommendations_path = automation.save_recommendations()
                print(f"\nParameter recommendations saved to: {recommendations_path}")

    else:
        # Show available phases
        phases = automation.get_phase_configurations()
        print("Available tuning phases:")
        for phase_num, phase_config in phases.items():
            print(f"  Phase {phase_num}: {phase_config.name}")
            print(f"    {phase_config.description}")
            print(f"    Parameter sets: {len(phase_config.parameter_sets)}")
            print()


if __name__ == "__main__":
    asyncio.run(main())