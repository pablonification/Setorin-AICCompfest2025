#!/usr/bin/env python3
"""
Test script to test the improved pink detection and bottle edge detection.
"""

import requests
import json
import base64
import os

def test_improved_detection():
    """Test the improved pink detection and bottle edge detection."""
    
    test_image_path = "../testing/test_f3.png"
    
    if not os.path.exists(test_image_path):
        print(f"❌ Test image not found: {test_image_path}")
        return False
    
    try:
        # Read the test image
        with open(test_image_path, 'rb') as f:
            image_bytes = f.read()
        
        print(f"✅ Loaded test image: {test_image_path}")
        print(f"   Image size: {len(image_bytes)} bytes")
        
        # Test the improved scan endpoint
        files = {
            'image': ('test_f3.png', image_bytes, 'image/png')
        }
        
        try:
            response = requests.post(
                "http://localhost:8000/api/scan/test", 
                files=files,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Improved detection successful!")
                print(f"   Response: {json.dumps(result, indent=2)}")
                
                # Check if we got measurement results
                if "measurement" in result:
                    measurement = result["measurement"]
                    print(f"\n📏 Improved Measurement Results:")
                    print(f"   Diameter: {measurement.get('diameter_mm', 'N/A')} mm")
                    print(f"   Height: {measurement.get('height_mm', 'N/A')} mm")
                    print(f"   Volume: {measurement.get('volume_ml', 'N/A')} ml")
                    print(f"   Classification: {measurement.get('classification', 'N/A')}")
                    print(f"   Confidence: {measurement.get('confidence_percent', 'N/A')}%")
                
                # Check if we got debug image
                if "debug_image" in result:
                    debug_b64 = result["debug_image"]
                    debug_bytes = base64.b64decode(debug_b64)
                    
                    # Save debug image
                    debug_path = "improved_detection_debug.jpg"
                    with open(debug_path, 'wb') as f:
                        f.write(debug_bytes)
                    print(f"\n🖼️  Debug image saved: {debug_path}")
                    
                    # Analyze the results
                    print(f"\n🔍 Analysis:")
                    print(f"   - Pink reference object should be detected with optimized HSV range")
                    print(f"   - ROI should be limited to max 800px width (not entire right side)")
                    print(f"   - Bottle edges should be cleaner with improved preprocessing")
                    print(f"   - Measurements should be more accurate")
                    
                return True
                
            else:
                print(f"❌ Request failed with status {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Request error: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Improved Pink Detection and Bottle Edge Detection")
    print("=" * 60)
    
    success = test_improved_detection()
    
    if success:
        print("\n✅ Test completed successfully!")
        print("   Check the debug image to see the improvements")
    else:
        print("\n❌ Test failed!")
        print("   Check the error messages above")
