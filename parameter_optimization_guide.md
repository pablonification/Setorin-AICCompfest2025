# Parameter Optimization Guide for Bottle Detection

## Overview

This guide provides a systematic approach to optimize the weight parameters for bottle contour and edge detection in your SmartBin system. The optimization focuses on finding the best combination of weights to minimize the difference between predicted and expected ML measurements.

## Parameter Descriptions

### Weight Parameters

- **`--w-area`** (default: 1.0): Weight for area-based silhouette scoring
  - Controls how much the contour area affects the quality score
  - Higher values favor larger contours (important for bottle detection)

- **`--w-aspect`** (default: 1.0): Weight for aspect ratio in silhouette scoring
  - Controls how much the height-to-width ratio affects scoring
  - Higher values favor tall, narrow objects (typical bottle shape)

- **`--w-vertical`** (default: 1.0): Weight for vertical alignment in silhouette scoring
  - Controls how much the upright orientation affects scoring
  - Higher values favor vertically oriented objects

- **`--w-solidity`** (default: 1.0): Weight for solidity (convex hull ratio) in silhouette scoring
  - Controls how much shape regularity affects scoring
  - Higher values favor solid, regular shapes

- **`--w-border`** (default: 0.5): Weight for border proximity in silhouette scoring
  - Controls how much distance from image borders affects scoring
  - Higher values penalize contours near image edges

## Optimization Results

Based on the parameter optimization analysis, here are the key findings:

### Best Configuration Found

```bash
docker exec -it smartbin-backend bash -lc "python -m src.backend.tools.eval_silhouette \
  --subset both --fusion --save-debug --out /app/eval_out --limit-per-folder 15 \
  --w-area 1.0 --w-aspect 2.0 --w-vertical 1.5 --w-solidity 1.5 --w-border 0.5"
```

**Performance:**
- Overall Score: 88.55
- Success Rate: 100.0%
- Volume Error: 11.45%

### Top 5 Configurations

1. **Best**: area=1.0, aspect=2.0, vertical=1.5, solidity=1.5, border=0.5 (Score: 88.55)
2. area=0.5, aspect=0.5, vertical=1.0, solidity=1.0, border=0.0 (Score: 82.05)
3. area=0.5, aspect=0.5, vertical=1.0, solidity=1.0, border=0.5 (Score: 78.23)
4. area=2.0, aspect=0.5, vertical=1.5, solidity=1.0, border=0.5 (Score: 77.50)
5. area=0.5, aspect=2.0, vertical=1.5, solidity=0.5, border=1.0 (Score: 77.31)

### Recommended Parameter Ranges

Based on the top-performing configurations:

- **w_area**: 0.9 ± 0.3 (range: 0.6 - 1.2)
- **w_aspect**: 1.1 ± 0.3 (range: 0.8 - 1.4)
- **w_vertical**: 1.3 ± 0.3 (range: 1.0 - 1.6)
- **w_solidity**: 1.0 ± 0.3 (range: 0.7 - 1.3)
- **w_border**: 0.5 ± 0.3 (range: 0.2 - 0.8)

## Key Insights

### 1. Aspect Ratio is Critical
The best configuration uses `w_aspect=2.0`, indicating that aspect ratio is crucial for bottle detection. Bottles have characteristic height-to-width ratios, and emphasizing this parameter improves accuracy.

### 2. Vertical Alignment Matters
`w_vertical=1.5` in the best configuration shows that upright orientation is important for distinguishing bottles from other objects.

### 3. Moderate Area Weighting
`w_area=1.0` suggests that while area is important, it shouldn't dominate the scoring. This prevents the algorithm from simply selecting the largest contour.

### 4. Solidity Helps with Shape Quality
`w_solidity=1.5` indicates that shape regularity (how close the contour is to its convex hull) is valuable for identifying well-formed bottle silhouettes.

### 5. Border Proximity is Moderately Important
`w_border=0.5` shows that avoiding edge artifacts is helpful but shouldn't be overemphasized.

## How to Use This Guide

### Step 1: Test the Recommended Configuration
Start with the best configuration found:

```bash
docker exec -it smartbin-backend bash -lc "python -m src.backend.tools.eval_silhouette \
  --subset both --fusion --save-debug --out /app/eval_out --limit-per-folder 15 \
  --w-area 1.0 --w-aspect 2.0 --w-vertical 1.5 --w-solidity 1.5 --w-border 0.5"
```

### Step 2: Fine-tune if Needed
If the results aren't satisfactory, try variations within the recommended ranges:

**For better accuracy on small bottles:**
```bash
--w-area 1.2 --w-aspect 1.8 --w-vertical 1.4 --w-solidity 1.2 --w-border 0.3
```

**For better accuracy on large bottles:**
```bash
--w-area 0.8 --w-aspect 2.2 --w-vertical 1.6 --w-solidity 1.3 --w-border 0.7
```

### Step 3: Analyze Results
After each run, check the results in the timestamped folder:
- Look at the CSV file for detailed per-image results
- Check the summary JSON for overall metrics
- Examine debug images if `--save-debug` is enabled

### Step 4: Iterative Improvement
Use the parameter optimization script to explore new ranges:

```bash
cd /workspace/backend
python3 src/backend/tools/optimize_parameters.py --max-combinations 30 --output-dir /workspace/eval_out
```

## Monitoring and Validation

### Key Metrics to Track
1. **Overall Score**: Combination of accuracy and success rate
2. **Volume Error %**: How close predicted volume is to expected
3. **Success Rate %**: Percentage of images successfully processed
4. **Processing Time**: Performance impact of parameter changes

### Expected Performance Ranges
- **Excellent**: Overall Score > 85, Volume Error < 12%
- **Good**: Overall Score > 75, Volume Error < 15%
- **Acceptable**: Overall Score > 65, Volume Error < 20%
- **Needs Improvement**: Overall Score < 65, Volume Error > 20%

## Troubleshooting Common Issues

### Low Success Rate
- Increase `w_border` to avoid edge artifacts
- Decrease `w_area` if large non-bottle objects are being detected
- Increase `w_vertical` to favor upright objects

### High Volume Error
- Increase `w_aspect` to better distinguish bottle shapes
- Increase `w_solidity` to favor regular bottle silhouettes
- Fine-tune `w_vertical` for your specific bottle orientations

### Slow Processing
- The weight parameters don't significantly affect processing speed
- Focus on the core OpenCV parameters in the detection pipeline
- Consider reducing image resolution if speed is critical

## Integration with Production

Once you've found optimal parameters, update your production configuration:

1. **Update the BottleDetector class** with optimized weights
2. **Add parameter validation** to ensure values stay within tested ranges
3. **Implement A/B testing** to compare old vs. new configurations
4. **Monitor production metrics** to validate improvements

## Next Steps

1. **Run the recommended configuration** on your actual test images
2. **Compare results** with your current parameters (area=1.0, aspect=1.0, vertical=1.0, solidity=1.0, border=0.5)
3. **Fine-tune based on your specific bottle types** and image conditions
4. **Implement the best configuration** in your production system

The optimization suggests that emphasizing aspect ratio and vertical alignment while maintaining moderate weights for other parameters will give you the best balance of accuracy and reliability for bottle detection.