#!/usr/bin/env python3
"""
Test script to test the final improved bottle detection with the new algorithm.
"""

import requests
import json
import base64
import os

def test_image_detection(image_path):
    """Test bottle detection on a single image."""
    
    if not os.path.exists(image_path):
        print(f"❌ Test image not found: {image_path}")
        return False
    
    try:
        # Read the test image
        with open(image_path, 'rb') as f:
            image_bytes = f.read()
        
        print(f"✅ Loaded test image: {image_path}")
        print(f"   Image size: {len(image_bytes)} bytes")
        
        # Test the improved scan endpoint
        files = {
            'image': (os.path.basename(image_path), image_bytes, 'image/png')
        }
        
        try:
            response = requests.post(
                "http://localhost:8000/api/scan/test", 
                files=files,
                timeout=30
            )
            
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
                    
                    # Check if the volume is realistic for a 350mL bottle
                    volume = measurement.get('volume_ml', 0)
                    if 200 <= volume <= 500:  # Allow some tolerance
                        print(f"\n🎉 SUCCESS! Detected realistic bottle volume: {volume} ml")
                        print(f"   Expected: ~350ml, Detected: {volume}ml")
                        print(f"   Accuracy: {abs(350 - volume) / 350 * 100:.1f}% off")
                    else:
                        print(f"\n⚠️  Volume still seems off: {volume} ml")
                        print(f"   Expected: ~350ml, Detected: {volume}ml")
                        print(f"   This suggests the bottle detection still needs work")
                
                # Check if we got debug image
                if "debug_image" in result:
                    print(f"\n🖼️  Debug image generated")
                    # Save debug image with unique name
                    debug_data = base64.b64decode(result["debug_image"])
                    debug_filename = f"{os.path.splitext(os.path.basename(image_path))[0]}_debug.jpg"
                    with open(debug_filename, "wb") as f:
                        f.write(debug_data)
                    print(f"   Saved as: {debug_filename}")
                
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

def test_final_bottle_detection():
    """Test the final improved bottle detection with multiple test images."""
    
    test_images = [
        "../testing/pls.png",
        "../testing/pls2.png"
    ]
    
    results = []
    
    for image_path in test_images:
        print(f"\n{'='*60}")
        print(f"🧪 Testing: {os.path.basename(image_path)}")
        print(f"{'='*60}")
        
        success = test_image_detection(image_path)
        results.append((image_path, success))
        
        print(f"\n{'='*60}")
        print(f"✅ Test completed for {os.path.basename(image_path)}: {'SUCCESS' if success else 'FAILED'}")
        print(f"{'='*60}\n")
    
    # Summary
    print("\n" + "="*80)
    print("📊 TEST SUMMARY")
    print("="*80)
    
    for image_path, success in results:
        status = "✅ SUCCESS" if success else "❌ FAILED"
        print(f"{status}: {os.path.basename(image_path)}")
    
    total_tests = len(results)
    successful_tests = sum(1 for _, success in results if success)
    
    print(f"\nOverall: {successful_tests}/{total_tests} tests passed")
    
    return all(success for _, success in results)

if __name__ == "__main__":
    print("🧪 Testing Final Improved Bottle Detection...")
    print("Testing multiple PNG images: pls.png and pls2.png")
    print("=" * 80)
    
    success = test_final_bottle_detection()
    
    if success:
        print("\n🎉 All tests completed successfully!")
    else:
        print("\n⚠️  Some tests failed!")
