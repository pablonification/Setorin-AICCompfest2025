#!/usr/bin/env python3
"""
Debug script for opencv_service.py classification issues
"""

import os
import sys
from pathlib import Path

# Add the backend source to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from backend.services.opencv_service import BottleMeasurer

def test_image_classification():
    """Test the bottle measurement and classification with the TAI.jpg image"""

    # Path to the converted image
    image_path = "/Users/macbook/Documents/coding/compfest/testing/TAI.jpg"

    if not os.path.exists(image_path):
        print(f"Error: Image not found at {image_path}")
        return

    # Read image bytes
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    print("=== Testing OpenCV Service Classification ===")
    print(f"Image: {image_path}")
    print(f"Image size: {len(image_bytes)} bytes")

    # Initialize the measurer with default settings
    measurer = BottleMeasurer(
        ref_real_height_mm=160.0,  # 16cm reference height
        tolerance_percent=30.0
    )

    print("\nKnown bottle specs:")
    for label, spec in measurer.known_specs.items():
        print(f"  {label}: {spec}")

    print(f"\nTolerance: {measurer.tolerance_percent}%")

    try:
        # Test with debug output
        result, debug_bytes = measurer.measure(image_bytes, return_debug=True)

        print("\n=== MEASUREMENT RESULT ===")
        print(f"Diameter: {result.diameter_mm:.2f} mm")
        print(f"Height: {result.height_mm:.2f} mm")
        print(f"Volume: {result.volume_ml:.2f} mL")
        print(f"Classification: {result.classification}")
        print(f"Confidence: {result.confidence_percent}%")

        # Manual classification check
        print("\n=== MANUAL CLASSIFICATION CHECK ===")
        manual_classification, manual_confidence = measurer._classify_volume(result.volume_ml)

        print(f"Manual classification: {manual_classification}")
        print(f"Manual confidence: {manual_confidence}%")

        # Show differences from each known spec
        print("\nDifferences from known specs:")
        for label, spec in measurer.known_specs.items():
            target = spec["volume_ml"]
            diff_pct = abs(result.volume_ml - target) / target * 100
            within_tolerance = diff_pct <= measurer.tolerance_percent
            print(".1f")

        # Save debug image
        debug_path = "/Users/macbook/Documents/coding/compfest/testing/TAI_debug.jpg"
        with open(debug_path, "wb") as f:
            f.write(debug_bytes)
        print(f"\nDebug image saved to: {debug_path}")

    except Exception as e:
        print(f"Error during measurement: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_image_classification()
