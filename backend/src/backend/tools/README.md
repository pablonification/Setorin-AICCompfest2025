# Image Contour and Edge Detection Evaluation Pipeline

This comprehensive evaluation pipeline provides automated testing and analysis tools for image contour and edge detection algorithms used in bottle measurement systems.

## Overview

The evaluation pipeline consists of several specialized tools:

- **Silhouette Evaluation** (`eval_silhouette.py`) - Tests weighted silhouette scoring parameters
- **Comprehensive Pipeline** (`evaluation_pipeline.py`) - Unified interface for all evaluation tasks
- **Parameter Tuning Automation** (`parameter_tuning_automation.py`) - Systematic parameter optimization
- **CSV Analysis Tools** (`csv_analysis_tools.py`) - Detailed results analysis and reporting
- **Batch Testing** (`batch_testing.py`) - Automated testing of all images in testing folder

## Quick Start

### 1. Setup Environment

Ensure Docker containers are running:
```bash
docker-compose up -d
```

### 2. Run Quick Evaluation Test

```bash
# Run a quick test with limited images
docker exec -it smartbin-backend bash -lc "python -m src.backend.tools.batch_testing --quick-test --limit 5"
```

### 3. Run Full Silhouette Parameter Tuning

```bash
# Phase 1: Baseline + Single Parameter Sweeps
docker exec -it smartbin-backend bash -lc "python -m src.backend.tools.parameter_tuning_automation --phase 1 --limit-per-folder 30"

# Phase 2: Conservative Range Testing
docker exec -it smartbin-backend bash -lc "python -m src.backend.tools.parameter_tuning_automation --phase 2 --limit-per-folder 30"
```

### 4. Analyze Results

```bash
# Analyze CSV results
docker exec -it smartbin-backend bash -lc "python -m src.backend.tools.csv_analysis_tools --input eval_out/silhouette_experiments/*/measurements.csv --analysis full --report results_report.txt"
```

## Evaluation Tools

### Silhouette Parameter Evaluation

Test weighted silhouette scoring with custom parameters:

```bash
docker exec -it smartbin-backend bash -lc "python -m src.backend.tools.eval_silhouette --w-area 1.0 --w-aspect 1.5 --w-vertical 1.0 --w-solidity 1.0 --w-border 0.5 --save-debug --out /app/eval_out --limit-per-folder 30"
```

**Parameters:**
- `--w-area`: Weight for contour area (0.5-2.0)
- `--w-aspect`: Weight for aspect ratio (0.5-3.0)
- `--w-vertical`: Weight for vertical orientation (0.5-3.0)
- `--w-solidity`: Weight for contour solidity (0.5-2.0)
- `--w-border`: Weight for border distance penalty (0.1-1.5)

### Edge Detection Comparison

Compare different edge detection algorithms:

```bash
docker exec -it smartbin-backend bash -lc "python -m src.backend.tools.evaluation_pipeline --task edge_detection --save-debug --batch-size 20"
```

**Algorithms Tested:**
- Canny (basic and adaptive thresholds)
- Sobel
- Laplacian
- Prewitt

### Contour Analysis

Analyze contour detection performance:

```bash
docker exec -it smartbin-backend bash -lc "python -m src.backend.tools.evaluation_pipeline --task contour_analysis --save-debug --batch-size 10"
```

**Features:**
- Multiple preprocessing techniques
- Contour shape analysis
- Area distribution statistics
- Circularity and aspect ratio metrics

### Batch Testing

Process all images in testing folder:

```bash
docker exec -it smartbin-backend bash -lc "python -m src.backend.tools.batch_testing --config batch_config.json --output /app/batch_results"
```

## Parameter Tuning Protocol

Follow the systematic approach outlined in `Silhouette_Parameter_Tuning_Automation.md`:

### Phase 1: Baseline + Single Parameter Sweeps
Test baseline parameters and individual parameter adjustments:
- **Baseline**: Equal weights (1.0, 1.0, 1.0, 1.0, 0.5)
- **Area sweep**: 0.8, 1.5
- **Aspect sweep**: 1.5, 2.0
- **Vertical sweep**: 1.5, 2.0
- **Solidity sweep**: 0.8, 1.5
- **Border sweep**: 0.3, 1.0

### Phase 2: Conservative Range Testing
Test conservative ranges based on Phase 1 results:
- **Area**: 0.8 - 1.5
- **Aspect**: 0.8 - 2.0
- **Vertical**: 0.8 - 2.0
- **Solidity**: 0.8 - 1.5
- **Border**: 0.3 - 1.0

### Phase 3: Aggressive Range Testing (if needed)
- **Area**: 0.5 - 2.0
- **Aspect**: 0.5 - 3.0
- **Vertical**: 0.5 - 3.0
- **Solidity**: 0.5 - 2.0
- **Border**: 0.1 - 1.5

### Phase 4: Combination Testing
Test combinations of best-performing individual adjustments.

## Analysis and Reporting

### CSV Analysis

Analyze evaluation results:

```bash
# Full analysis with report
docker exec -it smartbin-backend bash -lc "python -m src.backend.tools.csv_analysis_tools --input measurements.csv --analysis full --report analysis_report.txt"

# Category-specific analysis
docker exec -it smartbin-backend bash -lc "python -m src.backend.tools.csv_analysis_tools --input measurements.csv --analysis category"

# Performance analysis
docker exec -it smartbin-backend bash -lc "python -m src.backend.tools.csv_analysis_tools --input measurements.csv --analysis performance"
```

### Comparison Analysis

Compare multiple evaluation runs:

```bash
docker exec -it smartbin-backend bash -lc "python -m src.backend.tools.csv_analysis_tools --compare run1.csv run2.csv run3.csv --comparison-output comparison_results.json"
```

## Output Structure

```
/app/eval_out/
├── silhouette_experiments/
│   ├── 20241222_143022/          # Timestamped run directory
│   │   ├── measurements.csv     # Detailed measurements
│   │   ├── summary.json         # Summary statistics
│   │   ├── config.json          # Run configuration
│   │   └── debug/               # Debug images (if enabled)
│   └── 20241222_150334/
├── edge_detection/
│   ├── edge_detection_results.csv
│   └── edge_detection_summary.json
├── contour_analysis/
│   ├── category1/
│   │   └── contour_analysis_results.csv
│   └── category2/
└── batch_results/
    ├── batch_test_summary.json
    └── batch_test_report.txt
```

## Performance Targets

### Current Baseline (from fusion_all.csv):
- MAE: ~804ml
- Success rate: ~88%

### Target Improvements:
- **Phase 1 Goal**: MAE < 600ml
- **Phase 2 Goal**: MAE < 400ml
- **Stretch Goal**: MAE < 300ml

## Debug Image Analysis

Each evaluation run can save debug images showing:
- **Yellow ROI box**: Selected region of interest
- **Red contour**: Winning contour from multi-pipeline competition
- **Blue bounding box**: Rotated rectangle used for measurements
- **Yellow text**: Measured dimensions (height x diameter in mm)
- **Purple text**: Classification result

### Analysis Guidelines:

**If volumes are consistently OVERESTIMATED:**
- Increase `--w-aspect` (favor slender shapes → smaller diameter)
- Increase `--w-vertical` (reject tilted/distorted shapes)
- Increase `--w-border` (avoid edge artifacts that inflate size)
- Decrease `--w-area` (don't prioritize large contours)

**If volumes are consistently UNDERESTIMATED:**
- Decrease `--w-aspect` (allow wider shapes → larger diameter)
- Decrease `--w-solidity` (allow more complex/larger contours)
- Increase `--w-area` (favor larger contours)
- Decrease `--w-border` (don't penalize edge contours)

**If measurements are INCONSISTENT/NOISY:**
- Increase `--w-vertical` (stricter uprightness)
- Increase `--w-solidity` (prefer solid, consistent shapes)
- Increase `--w-border` (avoid partial/cut-off detections)

## Convergence Criteria

Stop tuning when:
1. **MAE improvement < 20ml** between consecutive best runs
2. **3+ runs** show no meaningful improvement
3. **Target MAE achieved** (< 300ml stretch goal)

## Troubleshooting

### Common Issues:

1. **No test images found**: Ensure `/workspace/testing` directory exists and contains image files
2. **Evaluation timeouts**: Increase timeout in automation scripts or reduce batch size
3. **Poor results**: Check debug images for contour selection issues, adjust parameters accordingly
4. **Memory issues**: Reduce `--limit-per-folder` or `--batch-size` parameters

### Getting Help:

1. Check the logs in `eval_out/*/evaluation.log`
2. Review debug images in `eval_out/*/debug/`
3. Run with `--save-debug` for visual analysis
4. Use `--dry-run` in parameter tuning to test without execution

## Configuration Files

### batch_config.json (example)
```json
{
  "output_dir": "/app/batch_results",
  "limit_per_category": 10,
  "test_categories": ["all"],
  "run_silhouette_tests": true,
  "run_edge_detection_tests": true,
  "run_contour_analysis_tests": true,
  "run_comparison_tests": true,
  "save_debug_images": true,
  "baseline_params": {
    "w_area": 1.0,
    "w_aspect": 1.0,
    "w_vertical": 1.0,
    "w_solidity": 1.0,
    "w_border": 0.5
  }
}
```

### evaluation_config.json (example)
```json
{
  "silhouette": {
    "w_area": 1.0,
    "w_aspect": 1.5,
    "w_vertical": 1.0,
    "w_solidity": 1.0,
    "w_border": 0.5
  },
  "edge_detection": {
    "save_debug": true
  },
  "contour": {
    "save_debug": true
  }
}
```

## Integration with Development Workflow

1. **Development**: Use quick tests during algorithm development
2. **Testing**: Run batch tests on new image sets
3. **Production**: Use parameter tuning for optimization
4. **Monitoring**: Regular evaluation runs to track performance

## Contributing

When adding new evaluation features:
1. Follow the existing modular structure
2. Include comprehensive logging
3. Add appropriate error handling
4. Update this documentation
5. Add unit tests if applicable

## License

This evaluation pipeline is part of the SmartBin project and follows the same licensing terms.