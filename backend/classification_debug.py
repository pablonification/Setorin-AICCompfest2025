#!/usr/bin/env python3
"""
Debug script to understand the classification issue in detail
"""

from typing import Dict, Tuple
import sys
from pathlib import Path

# Add the backend source to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

# Import the original classification method
def _classify_volume_original(volume_ml: float, known_specs: Dict[str, Dict[str, float]], tolerance_percent: float = 30.0) -> Tuple[str, float]:
    """Original classification logic from opencv_service.py"""
    best_label = "Other"
    min_diff = float("inf")
    for label, spec in known_specs.items():
        target = spec["volume_ml"]
        diff_pct = abs(volume_ml - target) / target * 100
        print(f"  Comparing {volume_ml:.2f}mL to {label} ({target}mL): difference = {diff_pct:.1f}%")
        if diff_pct < min_diff:
            min_diff = diff_pct
            best_label = label
            print(f"    -> New best match: {best_label} (diff: {min_diff:.1f}%)")

    print(f"  Final best match: {best_label} with difference: {min_diff:.1f}%")
    print(f"  Tolerance threshold: {tolerance_percent}%")

    if min_diff <= tolerance_percent:
        confidence = 100.0 - min_diff
        print(f"  -> WITHIN tolerance: returning '{best_label}' with confidence {confidence:.1f}%")
        return best_label, confidence
    else:
        confidence = max(0.0, 100.0 - min_diff)
        result = f"Other ({volume_ml:.0f}mL)"
        print(f"  -> OUTSIDE tolerance: returning '{result}' with confidence {confidence:.1f}%")
        return result, confidence

def test_classification_scenarios():
    """Test various volume measurements to see classification behavior"""

    # Original known specs from opencv_service.py
    known_specs_original = {
        "200mL": {"volume_ml": 200},
        "500mL": {"volume_ml": 500},
        "1000mL": {"volume_ml": 1000},
    }

    # Extended specs that include 600mL (what user might expect)
    known_specs_extended = {
        "200mL": {"volume_ml": 200},
        "500mL": {"volume_ml": 500},
        "600mL": {"volume_ml": 600},
        "1000mL": {"volume_ml": 1000},
    }

    tolerance = 30.0

    print("=== CLASSIFICATION DEBUGGING ===")
    print(f"Tolerance: {tolerance}%")
    print()

    # Test cases that might produce the behavior the user described
    test_cases = [
        0.63,    # What we measured in our test
        150.0,   # Close to 200mL
        300.0,   # Between 200mL and 500mL
        450.0,   # Close to 500mL
        600.0,   # The mysterious 600mL classification
        800.0,   # Between 500mL and 1000mL
        1200.0,  # Above 1000mL
        1500.0,  # The user's original bottle size
    ]

    for volume in test_cases:
        print(f"Testing volume: {volume} mL")
        print("With ORIGINAL specs:")
        result1 = _classify_volume_original(volume, known_specs_original, tolerance)
        print("With EXTENDED specs (including 600mL):")
        result2 = _classify_volume_original(volume, known_specs_extended, tolerance)
        print()

    print("=== ANALYSIS ===")
    print("The user reported seeing '600mL' classification, but 600mL is not in the original known specs.")
    print("This could mean:")
    print("1. The user is using a different version of the code with extended specs")
    print("2. There's a bug in the classification logic")
    print("3. The user is confusing measured volume with classification")
    print("4. There's another version of the opencv_service.py with different known specs")
    print()
    print("From our tests:")
    print("- 0.63mL gets classified as 'Other (1mL)' (correct)")
    print("- 600.0mL gets classified as 'Other (600mL)' with original specs (correct)")
    print("- 600.0mL gets classified as '600mL' with extended specs (also correct)")
    print()
    print("The issue might be that the user expects 600mL to be a valid classification,")
    print("but the original opencv_service.py doesn't know about 600mL bottles.")

if __name__ == "__main__":
    test_classification_scenarios()
