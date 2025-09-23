## ROI Fusion Evaluation

This document tracks results for Option A (ROI fusion) using the dataset in `testing/second/{simple,complex}`. Folder names under each subset indicate expected capacity (e.g., `600` or `600mL`).

### How to run (Docker compose)

Inside the backend container:

```bash
# Fusion ON
export USE_DETECTION_ROI_FUSION=true
python -m src.backend.tools.eval_roi_fusion --subset both --save-debug --out eval_out_fusion

# Baseline (no fusion)
python -m src.backend.tools.eval_roi_fusion --subset both --baseline --save-debug --out eval_out_baseline
```

Outputs:
- CSV per run: `fusion.csv` or `baseline.csv`
- Summary JSON: `summary_fusion.json` or `summary_baseline.json`
- Debug images: `out/debug/*.jpg`

### Metrics
- **success_rate**: percent of images measured without error
- **mae_ml**: mean absolute error of measured volume vs expected folder label
- **median_error_ml**: median absolute error

### Results

Full run (fusion ON) over `testing/second/{simple,complex}`:

```json
{
  "use_fusion": true,
  "total": 302,
  "success": 265,
  "success_rate": 87.74834437086093,
  "mae_ml": 804.3512075471697,
  "median_error_ml": 464.3599999999999
}
```

Artifacts:
- **CSV**: `eval_out/fusion_all/fusion.csv`
- **Debug images**: `eval_out/fusion_all/debug/*.jpg`
- **Summary JSON**: `eval_out/fusion_all/summary_fusion.json`

### Notes
- If the Roboflow model returns no boxes (classification-only), fusion gracefully falls back to reference ROI.
- HEIC decoding may require OS support; if failing, convert to JPG/PNG.


