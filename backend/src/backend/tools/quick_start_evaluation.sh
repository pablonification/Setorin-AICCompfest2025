#!/bin/bash

# Quick Start Evaluation Script
# This script demonstrates the evaluation pipeline with a simple example

echo "🧪 SmartBin Image Processing Evaluation Pipeline"
echo "================================================="
echo ""

# Check if we're in Docker
if ! grep -q docker /proc/1/cgroup 2>/dev/null; then
    echo "❌ This script should be run inside the Docker container"
    echo "   Run: docker exec -it smartbin-backend bash"
    echo "   Then: ./src/backend/tools/quick_start_evaluation.sh"
    exit 1
fi

# Create output directory
mkdir -p /app/quick_evaluation
cd /app/quick_evaluation

echo "📁 Created output directory: /app/quick_evaluation"
echo ""

# Phase 1: Quick silhouette test
echo "🔬 Phase 1: Quick Silhouette Evaluation"
echo "Running baseline silhouette evaluation with limited images..."
echo ""

python -m src.backend.tools.eval_silhouette \
    --w-area 1.0 --w-aspect 1.0 --w-vertical 1.0 --w-solidity 1.0 --w-border 0.5 \
    --save-debug --out /app/quick_evaluation --limit-per-folder 5

echo ""
echo "✅ Phase 1 complete!"
echo ""

# Phase 2: Analyze results
echo "📊 Phase 2: Results Analysis"
echo "Analyzing the evaluation results..."
echo ""

# Find the latest results
LATEST_DIR=$(find /app/quick_evaluation/silhouette_experiments -type d -name "20*" | sort -r | head -1)

if [ -n "$LATEST_DIR" ] && [ -d "$LATEST_DIR" ]; then
    echo "📈 Latest results found in: $LATEST_DIR"
    echo ""

    # Show summary
    if [ -f "$LATEST_DIR/summary.json" ]; then
        echo "📋 Summary Statistics:"
        python -c "
import json
with open('$LATEST_DIR/summary.json', 'r') as f:
    summary = json.load(f)
    print(f'  Total images: {summary[\"total_images\"]}')
    print(f'  Success rate: {summary[\"success_rate_percent\"]:.1f}%')
    if summary['error_metrics']['mean_absolute_error_ml']:
        print(f'  Mean error: {summary[\"error_metrics\"][\"mean_absolute_error_ml\"]:.1f} ml')
    print(f'  Processing time: {summary[\"total_processing_time_ms\"] / 1000:.1f} seconds')
"
        echo ""
    fi

    # Show CSV analysis
    if [ -f "$LATEST_DIR/measurements.csv" ]; then
        echo "📄 CSV Analysis:"
        python -m src.backend.tools.csv_analysis_tools \
            --input "$LATEST_DIR/measurements.csv" \
            --analysis basic
        echo ""
    fi
else
    echo "⚠️  No evaluation results found"
fi

# Phase 3: Show recommendations
echo "💡 Phase 3: Recommendations"
echo "Based on the evaluation results, here are next steps:"
echo ""
echo "1. 📊 Review detailed results:"
echo "   - Check CSV files in $LATEST_DIR/measurements.csv"
echo "   - View debug images in $LATEST_DIR/debug/ (if saved)"
echo ""
echo "2. 🔧 Parameter tuning suggestions:"
echo "   - If errors are high, try adjusting weights"
echo "   - Use: python -m src.backend.tools.parameter_tuning_automation --phase 1"
echo ""
echo "3. 🔍 Further analysis:"
echo "   - Edge detection: python -m src.backend.tools.evaluation_pipeline --task edge_detection"
echo "   - Contour analysis: python -m src.backend.tools.evaluation_pipeline --task contour_analysis"
echo ""
echo "4. 📋 Full batch testing:"
echo "   - Test all images: python -m src.backend.tools.batch_testing"
echo ""

echo "🎯 Quick evaluation complete!"
echo "   Check results in: /app/quick_evaluation"
echo "   For full documentation: see /app/src/backend/tools/README.md"