#!/usr/bin/env python3
"""
Test script to test the improved pink detection and bottle edge detection with test_akhir.png.
"""

import requests
import json
import base64
import os

def test_akhir_detection():
    """Test the improved pink detection and bottle edge detection with test_akhir.png."""
    
    test_image_path = "../testing/test_akhir.png"
    
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
            'image': ('test_akhir.png', image_bytes, 'image/png')
        }
        
        try:
            response = requests.post(
                "http://localhost:8000/api/scan/test", 
                files=files,
                timeout=30
            )
            
            print(f"\n📡 Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Scan endpoint successful!")
                print(f"   Response: {json.dumps(result, indent=2)}")
                
                # Check if we got measurement results
                if "measurement" in result:
                    measurement = result["measurement"]
                    print(f"\n📏 Measurement Results:")
                    print(f"   Diameter: {measurement.get('diameter_mm', 'N/A')} mm")
                    print(f"   Height: {measurement.get('height_mm', 'N/A')} mm")
                    print(f"   Volume: {measurement.get('volume_ml', 'N/A')} ml")
                    print(f"   Classification: {measurement.get('classification', 'N/A')}")
                    print(f"   Confidence: {measurement.get('confidence_percent', 'N/A')}%")
                
                # Check if we got debug image
                if "debug_image" in result:
                    print(f"\n🖼️  Debug image received: {len(result['debug_image'])} characters")
                    
                    # Save debug image
                    debug_image_path = "test_akhir_debug.jpg"
                    import base64
                    debug_bytes = base64.b64decode(result['debug_image'])
                    with open(debug_image_path, 'wb') as f:
                        f.write(debug_bytes)
                    print(f"   Saved debug image: {debug_image_path}")
                
                return True
                
            else:
                print(f"❌ Scan endpoint failed with status {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing improved pink detection and bottle edge detection with test_akhir.png")
    print("=" * 70)
    
    success = test_akhir_detection()
    
    if success:
        print("\n✅ Test completed successfully!")
        print("   Check the debug image to see the detection results")
    else:
        print("\n❌ Test failed!")
        print("   Check the error messages above")
