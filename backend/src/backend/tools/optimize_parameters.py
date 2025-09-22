#!/usr/bin/env python3
"""
Parameter optimization script for silhouette evaluation.

This script runs a grid search over different weight parameter combinations
to find the optimal configuration for bottle detection accuracy.
"""

import json
import os
import subprocess
import sys
import time
from itertools import product
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd


class ParameterOptimizer:
    """Optimizes silhouette evaluation parameters through grid search."""
    
    def __init__(self, output_dir: str = "/app/eval_out"):
        self.output_dir = output_dir
        self.results = []
        
    def define_parameter_grid(self) -> Dict[str, List[float]]:
        """Define the parameter grid for optimization."""
        return {
            'w_area': [0.5, 1.0, 1.5, 2.0],
            'w_aspect': [0.5, 1.0, 1.5, 2.0],
            'w_vertical': [0.5, 1.0, 1.5],
            'w_solidity': [0.5, 1.0, 1.5],
            'w_border': [0.0, 0.5, 1.0]
        }
    
    def run_evaluation(self, params: Dict[str, float], run_id: int) -> Dict:
        """Run a single evaluation with given parameters."""
        print(f"\n=== Run {run_id} ===")
        print(f"Parameters: {params}")
        
        # Construct command
        cmd = [
            "python", "-m", "src.backend.tools.eval_silhouette",
            "--subset", "both",
            "--fusion",
            "--save-debug",
            "--out", self.output_dir,
            "--limit-per-folder", "15",
            "--w-area", str(params['w_area']),
            "--w-aspect", str(params['w_aspect']),
            "--w-vertical", str(params['w_vertical']),
            "--w-solidity", str(params['w_solidity']),
            "--w-border", str(params['w_border'])
        ]
        
        try:
            # Run evaluation
            start_time = time.time()
            result = subprocess.run(cmd, capture_output=True, text=True, cwd="/app")
            execution_time = time.time() - start_time
            
            if result.returncode != 0:
                print(f"Error running evaluation: {result.stderr}")
                return {
                    'run_id': run_id,
                    'parameters': params,
                    'success': False,
                    'error': result.stderr,
                    'execution_time': execution_time
                }
            
            # Find the most recent summary file
            summary_files = []
            for file in os.listdir(self.output_dir):
                if file.startswith('summary_') and file.endswith('.json'):
                    summary_files.append(file)
            
            if not summary_files:
                print("No summary file found")
                return {
                    'run_id': run_id,
                    'parameters': params,
                    'success': False,
                    'error': 'No summary file generated',
                    'execution_time': execution_time
                }
            
            # Load the most recent summary
            latest_summary = max(summary_files, key=lambda x: os.path.getmtime(os.path.join(self.output_dir, x)))
            summary_path = os.path.join(self.output_dir, latest_summary)
            
            with open(summary_path, 'r') as f:
                summary = json.load(f)
            
            # Extract key metrics
            results = summary['results']
            
            result_data = {
                'run_id': run_id,
                'parameters': params,
                'success': True,
                'execution_time': execution_time,
                'success_rate': results['success_rate_percent'],
                'avg_volume_error': results['avg_volume_error_percent'],
                'avg_diameter_error': results['avg_diameter_error_percent'],
                'avg_height_error': results['avg_height_error_percent'],
                'overall_score': results['overall_score'],
                'avg_processing_time': results['avg_processing_time_ms'],
                'avg_silhouette_score': results.get('avg_silhouette_score', 0.0),
                'total_images': results['total_images'],
                'successful_measurements': results['successful_measurements']
            }
            
            print(f"Success rate: {result_data['success_rate']:.1f}%")
            print(f"Volume error: {result_data['avg_volume_error']:.2f}%")
            print(f"Overall score: {result_data['overall_score']:.2f}")
            
            return result_data
            
        except Exception as e:
            print(f"Exception during evaluation: {str(e)}")
            return {
                'run_id': run_id,
                'parameters': params,
                'success': False,
                'error': str(e),
                'execution_time': time.time() - start_time if 'start_time' in locals() else 0
            }
    
    def optimize(self, max_combinations: int = 50) -> Tuple[Dict, List[Dict]]:
        """Run parameter optimization."""
        print("=== Parameter Optimization for Silhouette Evaluation ===")
        
        # Create output directory
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Define parameter grid
        param_grid = self.define_parameter_grid()
        
        # Generate all parameter combinations
        param_names = list(param_grid.keys())
        param_values = list(param_grid.values())
        combinations = list(product(*param_values))
        
        print(f"Total possible combinations: {len(combinations)}")
        
        # Limit combinations if specified
        if max_combinations and len(combinations) > max_combinations:
            # Sample combinations to get a good spread
            import random
            random.seed(42)  # For reproducibility
            combinations = random.sample(combinations, max_combinations)
            print(f"Limited to {max_combinations} combinations")
        
        # Run evaluations
        all_results = []
        best_score = -1
        best_params = None
        
        for i, combination in enumerate(combinations, 1):
            params = dict(zip(param_names, combination))
            
            print(f"\nProgress: {i}/{len(combinations)}")
            result = self.run_evaluation(params, i)
            all_results.append(result)
            
            # Track best result
            if result['success'] and result['overall_score'] > best_score:
                best_score = result['overall_score']
                best_params = result
                print(f"*** NEW BEST SCORE: {best_score:.2f} ***")
        
        # Save all results
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        results_file = os.path.join(self.output_dir, f"parameter_optimization_{timestamp}.json")
        
        optimization_summary = {
            'timestamp': timestamp,
            'total_combinations_tested': len(combinations),
            'best_result': best_params,
            'all_results': all_results
        }
        
        with open(results_file, 'w') as f:
            json.dump(optimization_summary, f, indent=2)
        
        # Create CSV for easy analysis
        csv_file = os.path.join(self.output_dir, f"parameter_optimization_{timestamp}.csv")
        
        # Flatten results for CSV
        csv_data = []
        for result in all_results:
            if result['success']:
                row = {
                    'run_id': result['run_id'],
                    'w_area': result['parameters']['w_area'],
                    'w_aspect': result['parameters']['w_aspect'],
                    'w_vertical': result['parameters']['w_vertical'],
                    'w_solidity': result['parameters']['w_solidity'],
                    'w_border': result['parameters']['w_border'],
                    'success_rate': result['success_rate'],
                    'avg_volume_error': result['avg_volume_error'],
                    'avg_diameter_error': result['avg_diameter_error'],
                    'avg_height_error': result['avg_height_error'],
                    'overall_score': result['overall_score'],
                    'avg_processing_time': result['avg_processing_time'],
                    'avg_silhouette_score': result['avg_silhouette_score'],
                    'execution_time': result['execution_time']
                }
                csv_data.append(row)
        
        if csv_data:
            df = pd.DataFrame(csv_data)
            df.to_csv(csv_file, index=False)
            print(f"\nResults saved to:")
            print(f"  JSON: {results_file}")
            print(f"  CSV: {csv_file}")
        
        return best_params, all_results
    
    def analyze_results(self, results: List[Dict]) -> Dict:
        """Analyze optimization results to find patterns."""
        successful_results = [r for r in results if r['success']]
        
        if not successful_results:
            return {'error': 'No successful results to analyze'}
        
        # Find top 5 configurations
        top_5 = sorted(successful_results, key=lambda x: x['overall_score'], reverse=True)[:5]
        
        # Calculate parameter correlations with performance
        import numpy as np
        
        params = ['w_area', 'w_aspect', 'w_vertical', 'w_solidity', 'w_border']
        correlations = {}
        
        scores = [r['overall_score'] for r in successful_results]
        
        for param in params:
            param_values = [r['parameters'][param] for r in successful_results]
            correlation = np.corrcoef(param_values, scores)[0, 1]
            correlations[param] = correlation
        
        analysis = {
            'total_successful_runs': len(successful_results),
            'best_overall_score': max(r['overall_score'] for r in successful_results),
            'worst_overall_score': min(r['overall_score'] for r in successful_results),
            'avg_overall_score': sum(r['overall_score'] for r in successful_results) / len(successful_results),
            'top_5_configurations': top_5,
            'parameter_correlations': correlations,
            'parameter_recommendations': self._generate_recommendations(correlations, top_5)
        }
        
        return analysis
    
    def _generate_recommendations(self, correlations: Dict[str, float], top_configs: List[Dict]) -> Dict:
        """Generate parameter recommendations based on analysis."""
        recommendations = {}
        
        # Analyze top configurations
        params = ['w_area', 'w_aspect', 'w_vertical', 'w_solidity', 'w_border']
        
        for param in params:
            values = [config['parameters'][param] for config in top_configs]
            avg_value = sum(values) / len(values)
            correlation = correlations[param]
            
            if correlation > 0.3:
                recommendation = f"Higher values tend to improve performance (correlation: {correlation:.3f}). Recommended range: {avg_value:.1f} ± 0.5"
            elif correlation < -0.3:
                recommendation = f"Lower values tend to improve performance (correlation: {correlation:.3f}). Recommended range: {avg_value:.1f} ± 0.5"
            else:
                recommendation = f"Moderate impact on performance (correlation: {correlation:.3f}). Average in top configs: {avg_value:.1f}"
            
            recommendations[param] = recommendation
        
        return recommendations


def main():
    """Main function to run parameter optimization."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Optimize silhouette evaluation parameters")
    parser.add_argument("--output-dir", default="/app/eval_out", help="Output directory for results")
    parser.add_argument("--max-combinations", type=int, default=50, help="Maximum number of parameter combinations to test")
    parser.add_argument("--analyze-only", help="Path to existing optimization results JSON file to analyze")
    
    args = parser.parse_args()
    
    optimizer = ParameterOptimizer(args.output_dir)
    
    if args.analyze_only:
        # Analyze existing results
        with open(args.analyze_only, 'r') as f:
            data = json.load(f)
        
        analysis = optimizer.analyze_results(data['all_results'])
        
        print("\n=== PARAMETER ANALYSIS ===")
        print(f"Total successful runs: {analysis['total_successful_runs']}")
        print(f"Best overall score: {analysis['best_overall_score']:.2f}")
        print(f"Average overall score: {analysis['avg_overall_score']:.2f}")
        
        print("\n=== TOP 5 CONFIGURATIONS ===")
        for i, config in enumerate(analysis['top_5_configurations'], 1):
            params = config['parameters']
            print(f"{i}. Score: {config['overall_score']:.2f}")
            print(f"   Parameters: area={params['w_area']}, aspect={params['w_aspect']}, vertical={params['w_vertical']}, solidity={params['w_solidity']}, border={params['w_border']}")
            print(f"   Volume error: {config['avg_volume_error']:.2f}%, Success rate: {config['success_rate']:.1f}%")
        
        print("\n=== PARAMETER RECOMMENDATIONS ===")
        for param, rec in analysis['parameter_recommendations'].items():
            print(f"{param}: {rec}")
        
        return 0
    
    # Run optimization
    best_params, all_results = optimizer.optimize(args.max_combinations)
    
    if best_params and best_params['success']:
        print(f"\n=== OPTIMIZATION COMPLETE ===")
        print(f"Best configuration found:")
        print(f"  Overall score: {best_params['overall_score']:.2f}")
        print(f"  Success rate: {best_params['success_rate']:.1f}%")
        print(f"  Volume error: {best_params['avg_volume_error']:.2f}%")
        print(f"  Parameters:")
        for param, value in best_params['parameters'].items():
            print(f"    {param}: {value}")
        
        print(f"\nRecommended command:")
        params = best_params['parameters']
        cmd = (f"docker exec -it smartbin-backend bash -lc \"python -m src.backend.tools.eval_silhouette "
               f"--subset both --fusion --save-debug --out /app/eval_out --limit-per-folder 15 "
               f"--w-area {params['w_area']} --w-aspect {params['w_aspect']} "
               f"--w-vertical {params['w_vertical']} --w-solidity {params['w_solidity']} "
               f"--w-border {params['w_border']}\"")
        print(cmd)
        
        # Analyze results
        analysis = optimizer.analyze_results(all_results)
        
        print(f"\n=== ANALYSIS SUMMARY ===")
        print(f"Parameter correlations with performance:")
        for param, corr in analysis['parameter_correlations'].items():
            direction = "positive" if corr > 0 else "negative" if corr < 0 else "neutral"
            strength = "strong" if abs(corr) > 0.5 else "moderate" if abs(corr) > 0.3 else "weak"
            print(f"  {param}: {corr:.3f} ({strength} {direction})")
    
    else:
        print("\nOptimization failed - no successful configurations found")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())