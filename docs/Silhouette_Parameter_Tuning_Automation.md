# Silhouette Parameter Tuning Automation Guide

## Overview
This guide provides instructions for systematically tuning the weighted silhouette scoring parameters to minimize volume measurement errors. The process focuses on comparing predicted vs actual volumes in CSV files rather than success rates.

## Automation Strategy

### 1. Base Evaluation Command
Use this template for all runs with 30 images per folder:

```bash
docker exec -it smartbin-backend bash -lc "python -m src.backend.tools.eval_silhouette --subset both --fusion --save-debug --out /app/eval_out --limit-per-folder 30 --w-area [AREA] --w-aspect [ASPECT] --w-vertical [VERTICAL] --w-solidity [SOLIDITY] --w-border [BORDER]"
```

### 2. Parameter Ranges for Testing

#### Conservative Range (Start Here)
- `--w-area`: 0.8 - 1.5
- `--w-aspect`: 0.8 - 2.0  
- `--w-vertical`: 0.8 - 2.0
- `--w-solidity`: 0.8 - 1.5
- `--w-border`: 0.3 - 1.0

#### Aggressive Range (If Conservative Fails)
- `--w-area`: 0.5 - 2.0
- `--w-aspect`: 0.5 - 3.0
- `--w-vertical`: 0.5 - 3.0
- `--w-solidity`: 0.5 - 2.0
- `--w-border`: 0.1 - 1.5

### 3. Systematic Testing Protocol

#### Phase 1: Baseline + Single Parameter Sweeps
```bash
# Baseline (equal weights)
--w-area 1.0 --w-aspect 1.0 --w-vertical 1.0 --w-solidity 1.0 --w-border 0.5

# Area emphasis sweep
--w-area 1.5 --w-aspect 1.0 --w-vertical 1.0 --w-solidity 1.0 --w-border 0.5
--w-area 0.8 --w-aspect 1.0 --w-vertical 1.0 --w-solidity 1.0 --w-border 0.5

# Aspect emphasis sweep  
--w-area 1.0 --w-aspect 1.5 --w-vertical 1.0 --w-solidity 1.0 --w-border 0.5
--w-area 1.0 --w-aspect 2.0 --w-vertical 1.0 --w-solidity 1.0 --w-border 0.5

# Vertical emphasis sweep
--w-area 1.0 --w-aspect 1.0 --w-vertical 1.5 --w-solidity 1.0 --w-border 0.5
--w-area 1.0 --w-aspect 1.0 --w-vertical 2.0 --w-solidity 1.0 --w-border 0.5

# Solidity emphasis sweep
--w-area 1.0 --w-aspect 1.0 --w-vertical 1.0 --w-solidity 1.5 --w-border 0.5
--w-area 1.0 --w-aspect 1.0 --w-vertical 1.0 --w-solidity 0.8 --w-border 0.5

# Border emphasis sweep
--w-area 1.0 --w-aspect 1.0 --w-vertical 1.0 --w-solidity 1.0 --w-border 1.0
--w-area 1.0 --w-aspect 1.0 --w-vertical 1.0 --w-solidity 1.0 --w-border 0.3
```

#### Phase 2: Combination Testing
Based on Phase 1 results, test combinations of the 2-3 best performing individual adjustments.

### 4. Results Analysis

#### For Each Run:
1. Navigate to: `eval_out_from_docker/silhouette_experiments/[TIMESTAMP]/`
2. Open `measurements.csv`
3. Calculate metrics:
   - **Mean Absolute Error (MAE)**: `Σ|measured_ml - expected_ml| / n`
   - **Mean Relative Error (MRE)**: `Σ|(measured_ml - expected_ml)/expected_ml| / n * 100%`
   - **Root Mean Square Error (RMSE)**: `√(Σ(measured_ml - expected_ml)² / n)`

#### Quick Analysis Commands:
```python
import pandas as pd
import numpy as np

# Load results
df = pd.read_csv('measurements.csv')
df = df.dropna(subset=['measured_ml', 'expected_ml'])

# Calculate errors
df['abs_error'] = np.abs(df['measured_ml'] - df['expected_ml'])
df['rel_error'] = np.abs(df['measured_ml'] - df['expected_ml']) / df['expected_ml'] * 100

# Key metrics
mae = df['abs_error'].mean()
mre = df['rel_error'].mean()
rmse = np.sqrt((df['abs_error'] ** 2).mean())

print(f"MAE: {mae:.1f}ml, MRE: {mre:.1f}%, RMSE: {rmse:.1f}ml")
```

### 5. Parameter Adjustment Strategy

#### If volumes are consistently OVERESTIMATED:
- **Increase `--w-aspect`** (favor slender shapes → smaller diameter)
- **Increase `--w-vertical`** (reject tilted/distorted shapes)
- **Increase `--w-border`** (avoid edge artifacts that inflate size)
- **Decrease `--w-area`** (don't prioritize large contours)

#### If volumes are consistently UNDERESTIMATED:
- **Decrease `--w-aspect`** (allow wider shapes → larger diameter)
- **Decrease `--w-solidity`** (allow more complex/larger contours)
- **Increase `--w-area`** (favor larger contours)
- **Decrease `--w-border`** (don't penalize edge contours)

#### If measurements are INCONSISTENT/NOISY:
- **Increase `--w-vertical`** (stricter uprightness)
- **Increase `--w-solidity`** (prefer solid, consistent shapes)
- **Increase `--w-border`** (avoid partial/cut-off detections)

### 6. Expected Performance Targets

#### Current Baseline (from fusion_all.csv):
- MAE: ~804ml
- Success rate: ~88%

#### Target Improvements:
- **Phase 1 Goal**: MAE < 600ml
- **Phase 2 Goal**: MAE < 400ml  
- **Stretch Goal**: MAE < 300ml

### 7. Automation Script Template

```bash
#!/bin/bash
# Systematic parameter tuning script

RUNS=(
    "1.0 1.0 1.0 1.0 0.5"    # baseline
    "1.0 1.5 1.0 1.0 0.5"    # aspect+
    "1.0 2.0 1.0 1.0 0.5"    # aspect++
    "1.0 1.0 1.5 1.0 0.5"    # vertical+
    "1.0 1.0 2.0 1.0 0.5"    # vertical++
    "1.0 1.0 1.0 1.5 0.5"    # solidity+
    "1.0 1.0 1.0 0.8 0.5"    # solidity-
    "1.0 1.0 1.0 1.0 1.0"    # border+
    "1.0 1.0 1.0 1.0 0.3"    # border-
)

for weights in "${RUNS[@]}"; do
    echo "Testing weights: $weights"
    docker exec -it smartbin-backend bash -lc "python -m src.backend.tools.eval_silhouette --subset both --fusion --save-debug --out /app/eval_out --limit-per-folder 30 --w-area $(echo $weights | cut -d' ' -f1) --w-aspect $(echo $weights | cut -d' ' -f2) --w-vertical $(echo $weights | cut -d' ' -f3) --w-solidity $(echo $weights | cut -d' ' -f4) --w-border $(echo $weights | cut -d' ' -f5)"
    sleep 2
done

echo "All runs complete. Check eval_out_from_docker/silhouette_experiments/ for results."
```

### 8. Debug Image Analysis

Each run saves debug images in `debug/` folder showing:
- **Yellow ROI box**: Selected region of interest
- **Red contour**: Winning contour from multi-pipeline competition
- **Blue bounding box**: Rotated rectangle used for measurements
- **Yellow text**: Measured dimensions (height x diameter in mm)
- **Purple text**: Classification result

Look for patterns:
- Are contours consistently too large/small?
- Are they capturing the right part of the bottle?
- Are they tilted or distorted?

### 9. Record Keeping

Create a spreadsheet tracking:
| Timestamp | w_area | w_aspect | w_vertical | w_solidity | w_border | MAE | MRE | RMSE | Notes |
|-----------|--------|----------|------------|------------|----------|-----|-----|------|-------|
| 20250922_073215 | 1.0 | 1.0 | 1.0 | 1.0 | 0.5 | 804 | 45% | 912 | Baseline |

### 10. Convergence Criteria

Stop tuning when:
1. **MAE improvement < 20ml** between consecutive best runs
2. **3+ runs** show no meaningful improvement
3. **Target MAE achieved** (< 300ml stretch goal)

The goal is to find the weight combination that minimizes volume measurement error across the diverse bottle dataset.
