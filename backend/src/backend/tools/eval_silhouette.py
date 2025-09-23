from __future__ import annotations

import csv
import json
import argparse
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional, List

import asyncio
import cv2  # noqa: F401

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
    predictions: List[object] = []
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
    parser = argparse.ArgumentParser(description="Evaluate weighted silhouette scoring on testing/second dataset")
    # /app/src/backend/tools -> parents[3] == /app
    parser.add_argument("--root", default=str(Path(__file__).parents[3] / "testing/second"))
    parser.add_argument("--subset", choices=["simple", "complex", "both"], default="both")
    parser.add_argument("--limit", type=int, default=0, help="Global cap across all images (optional)")
    parser.add_argument("--limit-per-folder", type=int, default=0, help="Take first N images per folder under subset roots")
    parser.add_argument("--fusion", action="store_true", help="Use detection+reference ROI fusion (Roboflow)")
    parser.add_argument("--save-debug", action="store_true")
    parser.add_argument("--out", default=str(Path(__file__).parents[3] / "eval_out"))

    # detector scoring weights
    parser.add_argument("--w-area", type=float, default=1.0)
    parser.add_argument("--w-aspect", type=float, default=1.0)
    parser.add_argument("--w-vertical", type=float, default=1.0)
    parser.add_argument("--w-solidity", type=float, default=1.0)
    parser.add_argument("--w-border", type=float, default=0.5)

    args = parser.parse_args()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = Path(args.out) / "silhouette_experiments" / timestamp
    debug_dir = run_dir / "debug"
    run_dir.mkdir(parents=True, exist_ok=True)

    # Save run config
    run_config = {
        "fusion": bool(args.fusion),
        "weights": {
            "area": args.w_area,
            "aspect": args.w_aspect,
            "vertical": args.w_vertical,
            "solidity": args.w_solidity,
            "border": args.w_border,
        },
        "subset": args.subset,
        "limit": args.limit,
    }
    (run_dir / "run_config.json").write_text(json.dumps(run_config, indent=2))

    measurer = BottleMeasurer(
        detector_weight_area=args.w_area,
        detector_weight_aspect=args.w_aspect,
        detector_weight_vertical=args.w_vertical,
        detector_weight_solidity=args.w_solidity,
        detector_weight_border=args.w_border,
    )
    roboflow = RoboflowClient()

    roots: List[Path] = []
    root = Path(args.root)
    if args.subset in ("simple", "both"):
        roots.append(root / "simple")
    if args.subset in ("complex", "both"):
        roots.append(root / "complex")

    images: List[Path] = []
    if args.limit_per_folder and args.limit_per_folder > 0:
        # Collect first N images per immediate child folder of each root
        exts = (".jpg", ".jpeg", ".png", ".heic")
        for r in roots:
            if not r.exists():
                continue
            for sub in sorted([p for p in r.iterdir() if p.is_dir()]):
                files = sorted([p for p in sub.iterdir() if p.suffix.lower() in exts])
                images.extend(files[: args.limit_per_folder])
    else:
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
                images.append(p)

    if args.limit and args.limit > 0:
        images = images[: args.limit]

    results: List[EvalResult] = []
    for img_path in images:
        res = await _process_one(
            img_path, measurer, roboflow,
            use_fusion=bool(args.fusion),
            save_debug=bool(args.save_debug),
            out_debug_dir=debug_dir,
        )
        results.append(res)

    # Write CSV
    csv_path = run_dir / "measurements.csv"
    with csv_path.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["image", "expected_ml", "measured_ml", "diameter_mm", "height_mm", "brand", "confidence", "error_ml", "ok", "debug_path"])
        for r in results:
            w.writerow([r.image_path, r.expected_ml, r.measured_ml, r.diameter_mm, r.height_mm, r.brand, r.confidence, r.error_ml, r.ok, r.debug_path])

    # Summary
    errors = [r.error_ml for r in results if r.error_ml is not None]
    success = sum(1 for r in results if r.ok)
    total = len(results)
    summary = {
        "total": total,
        "success": success,
        "success_rate": (success / total * 100.0) if total else 0.0,
        "mae_ml": (sum(errors) / len(errors)) if errors else None,
        "median_error_ml": (sorted(errors)[len(errors)//2] if errors else None),
    }
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps({**run_config, **summary}, indent=2))


if __name__ == "__main__":
    asyncio.run(main())


