from __future__ import annotations

import os
import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, List

import asyncio

import cv2  # noqa: F401  (ensure OpenCV linked for decoding if needed)

from ..services.opencv_service import BottleMeasurer, MeasurementError
from ..services.roboflow_service import RoboflowClient


@dataclass
class EvalResult:
    image_path: str
    expected_ml: Optional[float]
    measured_ml: Optional[float]
    diameter_mm: Optional[float]
    height_mm: Optional[float]
    brand: Optional[str]
    confidence: Optional[float]
    error_ml: Optional[float]
    ok: bool
    debug_path: Optional[str]


def _parse_expected_from_dir(path: Path) -> Optional[float]:
    # Parent folder name is expected to be capacity (e.g., 600mL or 600)
    label = path.parent.name.lower()
    digits = "".join(ch for ch in label if ch.isdigit())
    if not digits:
        return None
    try:
        return float(digits)
    except Exception:
        return None


async def _process_one(
    image_path: Path,
    measurer: BottleMeasurer,
    roboflow: RoboflowClient,
    *,
    use_fusion: bool,
    save_debug: bool,
    out_debug_dir: Path,
) -> EvalResult:
    expected = _parse_expected_from_dir(image_path)
    content = image_path.read_bytes()
    predictions = []
    if use_fusion:
        try:
            predictions = await roboflow.predict(content)
        except Exception:
            predictions = []

    try:
        if use_fusion:
            result, preview = measurer.measure(content, predictions=predictions, return_debug=True)
        else:
            result, preview = measurer.measure(content, return_debug=True)
        debug_path: Optional[str] = None
        if save_debug:
            out_debug_dir.mkdir(parents=True, exist_ok=True)
            fname = image_path.stem + ("_fusion.jpg" if use_fusion else "_baseline.jpg")
            (out_debug_dir / fname).write_bytes(preview)
            debug_path = str(out_debug_dir / fname)

        error_ml = None
        ok = True
        if expected is not None:
            error_ml = abs(result.volume_ml - expected)
        return EvalResult(
            image_path=str(image_path),
            expected_ml=expected,
            measured_ml=result.volume_ml,
            diameter_mm=result.diameter_mm,
            height_mm=result.height_mm,
            brand=result.classification,
            confidence=result.confidence_percent,
            error_ml=error_ml,
            ok=True,
            debug_path=debug_path,
        )
    except MeasurementError:
        return EvalResult(
            image_path=str(image_path),
            expected_ml=expected,
            measured_ml=None,
            diameter_mm=None,
            height_mm=None,
            brand=None,
            confidence=None,
            error_ml=None,
            ok=False,
            debug_path=None,
        )


async def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Evaluate ROI fusion on testing/second dataset")
    parser.add_argument("--root", default=str(Path(__file__).parents[4] / "testing/second"))
    parser.add_argument("--subset", choices=["simple", "complex", "both"], default="both")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--baseline", action="store_true", help="Run baseline (no fusion)")
    parser.add_argument("--save-debug", action="store_true")
    parser.add_argument("--out", default="eval_out")
    args = parser.parse_args()

    use_fusion = not args.baseline
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_debug_dir = out_dir / "debug"

    measurer = BottleMeasurer()
    roboflow = RoboflowClient()

    roots: List[Path] = []
    root = Path(args.root)
    if args.subset in ("simple", "both"):
        roots.append(root / "simple")
    if args.subset in ("complex", "both"):
        roots.append(root / "complex")

    images: List[Path] = []
    for r in roots:
        if not r.exists():
            continue
        for p in r.rglob("*.jpg"):
            images.append(p)
        for p in r.rglob("*.png"):
            images.append(p)
        for p in r.rglob("*.jpeg"):
            images.append(p)
        for p in r.rglob("*.heic"):
            # If cv2 can't decode HEIC here, frontend may need conversion; still include path
            images.append(p)

    if args.limit and args.limit > 0:
        images = images[: args.limit]

    results: List[EvalResult] = []
    for img_path in images:
        res = await _process_one(
            img_path, measurer, roboflow,
            use_fusion=use_fusion,
            save_debug=args.save_debug,
            out_debug_dir=out_debug_dir,
        )
        results.append(res)

    # Write CSV
    csv_path = out_dir / ("fusion.csv" if use_fusion else "baseline.csv")
    with csv_path.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["image", "expected_ml", "measured_ml", "diameter_mm", "height_mm", "brand", "confidence", "error_ml", "ok", "debug_path"])
        for r in results:
            w.writerow([r.image_path, r.expected_ml, r.measured_ml, r.diameter_mm, r.height_mm, r.brand, r.confidence, r.error_ml, r.ok, r.debug_path])

    # Summary metrics
    errors = [r.error_ml for r in results if r.error_ml is not None]
    success = sum(1 for r in results if r.ok)
    total = len(results)
    summary = {
        "use_fusion": use_fusion,
        "total": total,
        "success": success,
        "success_rate": (success / total * 100.0) if total else 0.0,
        "mae_ml": (sum(errors) / len(errors)) if errors else None,
        "median_error_ml": (sorted(errors)[len(errors)//2] if errors else None),
    }
    (out_dir / ("summary_fusion.json" if use_fusion else "summary_baseline.json")).write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    asyncio.run(main())


