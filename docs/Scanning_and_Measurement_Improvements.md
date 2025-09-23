## Scanning and Measurement Improvements

This document proposes concrete, incremental upgrades to improve brand detection reliability (YOLO/Roboflow) and bottle measurement accuracy (OpenCV) in the current pipeline.

### Objectives
- Increase robustness of ROI selection and bottle silhouette extraction.
- Reduce variance in scale calibration and volume estimation.
- Improve resilience to lighting, background clutter, and tilt.
- Provide observability to debug failures quickly.

### Summary of Recommendations
- Use detection boxes (when available) to constrain ROI before OpenCV processing; fall back to reference-based ROI otherwise.
- Add geometric priors and temporal smoothing to bottle detection.
- Replace single-threshold edges with adaptive methods and contour validation.
- Strengthen scale calibration via reference validation, fallback heuristics, and optional perspective correction.
- Add optional ArUco/AprilTag marker support for metric scale and perspective.
- Enhance brand classification reliability with model-agnostic post-processing, confidence calibration, and N-best strategies.
- Improve observability with debug overlays and structured logs.

---

### 1) ROI Strategy: Fuse Roboflow detection with reference-based ROI

When the Roboflow model returns bounding boxes (detection models), use the highest-confidence bottle/brand box to define a tight ROI for OpenCV. If only classification is available (no boxes), keep the existing reference-above ROI. Implement precedence:

1. If `Prediction` has `(x, y, width, height)` → define ROI = box expanded by 10–20% margin, clamped to image bounds.
2. Else use the current ROI: area above the color reference.
3. If both exist, intersect them to minimize background.

Benefits: reduces background clutter, edges from unrelated objects, and improves contour selection.

Implementation notes:
- Extend `Prediction` to clearly expose optional box. Already present in `roboflow_service.Prediction` as `x, y, width, height`.
- Add ROI selection helper in `opencv_service.BottleMeasurer.measure` to use detection box when available (pass predictions in or provide a variant `measure_with_predictions`).

### 2) Robust silhouette extraction and contour validation

Replace single Canny + close with a multi-path approach and pick best candidate via a scoring function.

Pipeline candidates (try in order; keep best by score):
- Adaptive threshold (Gaussian/mean) + morphological close/open.
- Canny edges with hysteresis tuned by median absolute deviation (MAD) of gradients.
- Otsu threshold (current), but add contrast-limited adaptive histogram equalization (CLAHE) beforehand.

Contour scoring features:
- Area within [min_area_px, 0.9 × ROI area].
- Aspect ratio ≥ min_aspect_ratio.
- Vertical alignment score: distance of principal axis to image vertical; penalize high tilt.
- Solidity/convexity ratio to reject thin/fragmented contours.
- Border penalty if near ROI borders.

Select the highest total score; if tie, prefer contour closer to image center.

### 3) Tilt handling and perspective hints

Improve upright checks:
- Estimate orientation by PCA on contour points; allow a larger `max_tilt_deg` if the bounding box still yields stable width/height after rotation normalization.
- Optionally rotate ROI by the negative of estimated tilt (small angles) and re-extract contour to improve width/height stability.

### 4) Scale calibration hardening

Current: use reference height in pixels → `scale = ref_real_height_mm / h_ref`.

Improvements:
- Validate reference blob by eccentricity/solidity and color histogram match; reject noisy blobs.
- If the reference is truncated (touches bottom or sides), attempt to fit minimum-area rectangle and use its long side as height.
- Reject h_ref below a small threshold and return a specific error code.
- Optionally support ArUco/AprilTag: if tag detected, compute metric scale and perspective warp of ROI to fronto-parallel before measurement.
- Keep a rolling average of `scale` across frames in video mode (exponential moving average) to denoise flicker.

### 5) Diameter and height estimation stability

- Use rotated minimum-area rectangle around the final contour; define:
  - `visual_height` = long side, `visual_width` = short side.
- For diameter, instead of a single width at box-level, compute robust width:
  - Sample widths at multiple contour scanlines (e.g., at 20–80% height, every 5%).
  - Use median width to reduce local dents/labels effects.
- For height, compensate for concavity by using convex hull height.

### 6) Volume estimation model selection

Currently cylinder model: `V = π r^2 h`.

Add size-specific priors:
- If brand is known and maps to bottle family, select parametric model (cylinder vs bottle-with-shoulders), with shape factor `k ∈ [0.85, 1.00]` learned from empirical data.
- Default to cylinder; when predicted brand confidence ≥ threshold (e.g., 0.60), apply brand-specific `k`.

### 7) Brand prediction reliability

- Keep N-best classes (top-3) with confidences; expose in API for UI fallback.
- Temperature-scale or Platt-scale confidences if the model is overconfident.
- If detection and classification disagree strongly between frames, apply temporal smoothing (EMA) before finalizing brand.
- Allow per-brand minimum confidence thresholds.

### 8) API and code changes (minimal surface)

- Add optional predictions to measurement:
  - Option A: new method `measure_with_predictions(image_bytes, predictions)` to fuse ROI.
  - Option B: keep `measure` unchanged; do fusion in router before calling `BottleDetector`.
- Add `return_debug=True` overlays already present; extend to draw chosen ROI source (reference/detection/intersection) and contour score.

### 9) Observability & debug

- Save per-scan JSON alongside debug JPEG: ROI source, scale, chosen contour score, tilt, volumes from each candidate method.
- Add structured logger fields for failures (REF_NOT_FOUND, ROI_EMPTY, NO_CONTOUR, LOW_SCORE, etc.).

### 10) Validation layer enhancements

- Incorporate measurement stability: reject if inter-frame stddev of height or diameter exceeds threshold when multiple frames are available.
- Enforce plausible physical constraints (e.g., diameter in [40, 100] mm) per known bottle families.

### 11) Testing plan

- Add unit tests for:
  - ROI fusion logic with synthetic boxes and references (edge cases: truncated reference, partial box).
  - Contour scoring and best selection on controlled images.
  - Scale calibration with noisy/truncated references.
- Add integration tests over `testing/` images and store golden metrics.

### 12) Optional: lightweight model upgrades

- If using Roboflow only for classification: consider a small YOLOv8n/YOLOv5s detection model fine-tuned to output bottle bounding boxes to unlock ROI fusion.
- Consider exporting a segmentation head to get a binary mask → replace contour extraction entirely when mask is available.

---

### Minimal code diff sketch (where to edit)

- `backend/src/backend/services/opencv_service.py`
  - Add ROI fusion helper (accept optional detection box) and contour scoring.
  - Add rotated rectangle normalization and median-width estimation.
  - Extend debug overlay with ROI source and scores.

- `backend/src/backend/routers/scan.py`
  - After Roboflow predictions, pass best box to measurement or run `measure_with_predictions` if implemented.

- `backend/src/backend/services/roboflow_service.py`
  - Ensure `Prediction` includes optional `x, y, width, height` with consistent units.

These changes are backward-compatible and can be introduced incrementally.


