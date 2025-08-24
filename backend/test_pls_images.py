#!/usr/bin/env python3
"""
Test script to test the current bottle detection system with pls.png and pls2.png images.
"""

import requests
import json
import base64
import os

def test_image(image_path, image_name):
    """Test a single image with the current bottle detection system."""
    
    if not os.path.exists(image_path):
        print(f"❌ Test image not found: {image_path}")
        return False
    
    try:
        # Read the test image
        with open(image_path, 'rb') as f:
            image_bytes = f.read()
        
        print(f"✅ Loaded test image: {image_name}")
        print(f"   Image size: {len(image_bytes)} bytes")
        
        # Test the current scan endpoint
        files = {
            'image': (f'{image_name}.png', image_bytes, 'image/png')
        }
        
        try:
            response = requests.post(
                "http://localhost:8000/api/scan/test", 
                files=files,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Scan endpoint successful for {image_name}!")
                
                # Check if we got measurement results
                if "measurement" in result:
                    measurement = result["measurement"]
                    print(f"\n📏 Measurement Results for {image_name}:")
                    print(f"   Diameter: {measurement.get('diameter_mm', 'N/A')} mm")
                    print(f"   Height: {measurement.get('height_mm', 'N/A')} mm")
                    print(f"   Volume: {measurement.get('volume_ml', 'N/A')} ml")
                    print(f"   Classification: {measurement.get('classification', 'N/A')}")
                    print(f"   Confidence: {measurement.get('confidence_percent', 'N/A')}%")
                    
                    # Check if the volume is realistic
                    volume = measurement.get('volume_ml', 0)
                    if 100 <= volume <= 1000:  # Allow some tolerance for various bottle sizes
                        print(f"\n🎉 SUCCESS! Detected realistic bottle volume: {volume} ml")
                    else:
                        print(f"\n⚠️  Volume seems off: {volume} ml")
                
                # Check if we got debug image
                if "debug_image_base64" in result:
                    print(f"\n🖼️  Debug image generated for {image_name}")
                    # Save debug image
                    debug_data = base64.b64decode(result["debug_image_base64"])
                    debug_filename = f"{image_name}_debug.jpg"
                    with open(debug_filename, "wb") as f:
                        f.write(debug_data)
                    print(f"   Saved as: {debug_filename}")
                
                return True
                
            else:
                print(f"❌ Scan endpoint failed for {image_name} with status {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed for {image_name}: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed for {image_name}: {e}")
        return False

def main():
    """Test both pls.png and pls2.png images."""
    print("🧪 Testing Current Bottle Detection System...")
    print("=" * 60)
    
    # Test pls.png
    print("\n📸 Testing pls.png...")
    print("-" * 30)
    success1 = test_image("../testing/pls.png", "pls")
    
    # Test pls2.png
    print("\n📸 Testing pls2.png...")
    print("-" * 30)
    success2 = test_image("../testing/pls2.png", "pls2")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY:")
    print(f"   pls.png: {'✅ PASSED' if success1 else '❌ FAILED'}")
    print(f"   pls2.png: {'✅ PASSED' if success2 else '❌ FAILED'}")
    
    if success1 and success2:
        print("\n🎉 All tests completed successfully!")
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")

if __name__ == "__main__":
    main()
