from __future__ import annotations

import types

from ..services.opencv_service import BottleMeasurer


def test_intersection_non_empty():
    bm = BottleMeasurer()
    a = (0, 0, 100, 100)
    b = (50, 50, 100, 100)
    inter = bm._intersect_rect(a, b)
    assert inter == (50, 50, 50, 50)


def test_intersection_empty():
    bm = BottleMeasurer()
    a = (0, 0, 10, 10)
    b = (20, 20, 5, 5)
    inter = bm._intersect_rect(a, b)
    assert inter is None


def test_expand_and_clamp_rect():
    bm = BottleMeasurer()
    rect = bm._expand_and_clamp_rect(50, 50, 100, 100, img_w=200, img_h=200, margin_ratio=0.1)
    x, y, w, h = rect
    assert x <= 50 and y <= 50
    assert x >= 0 and y >= 0
    assert w > 100 and h > 100
    assert x + w <= 200 and y + h <= 200


def test_build_detection_rect_from_predictions_picks_best():
    bm = BottleMeasurer()

    p1 = types.SimpleNamespace(x=100.0, y=100.0, width=40.0, height=40.0, confidence=0.5)
    p2 = types.SimpleNamespace(x=120.0, y=120.0, width=50.0, height=50.0, confidence=0.9)

    rect = bm._build_detection_rect_from_predictions(
        img_width=300,
        img_height=300,
        predictions=[p1, p2],
        margin_ratio=0.1,
    )
    assert rect is not None
    x, y, w, h = rect
    assert w >= 50 and h >= 50

