# Simple Ultrasonic Sensor Integration (YAGNI Approach)
**Date:** September 25, 2025  
**Project:** Setorin SmartBin - HR-SC04 Ultrasonic Sensor Integration  
**Purpose:** Bottle deposit validation to prevent points exploitation

---

## Problem Statement
**Current Issue**: Users can scan bottles and receive points without actually depositing them into the bin.  
**Simple Solution**: Add ultrasonic sensor to physically detect when bottles are deposited.

---

## Minimal Implementation Plan

### 1. Basic Hardware Setup
```cpp
// Simple ESP32 pin configuration
#define TRIG_PIN 19
#define ECHO_PIN 21
#define BOTTLE_THRESHOLD 50 // mm - distance change to detect bottle

float baseline_distance = 0;
```

### 2. Simple Distance Measurement
```cpp
float measureDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH);
  float distance = duration * 0.034 / 2; // Convert to cm
  
  return distance;
}
```

### 3. Basic Bottle Detection
```cpp
bool detectBottle(int timeout_seconds) {
  unsigned long startTime = millis();
  
  while (millis() - startTime < timeout_seconds * 1000) {
    float current_distance = measureDistance();
    
    // Simple threshold check
    if (baseline_distance - current_distance > BOTTLE_THRESHOLD) {
      delay(500); // Wait to confirm
      if (baseline_distance - measureDistance() > BOTTLE_THRESHOLD) {
        return true; // Bottle confirmed
      }
    }
    
    delay(200); // Check every 200ms
  }
  
  return false; // Timeout - no bottle detected
}
```

### 4. Modified ESP32 Flow
```cpp
void handleOpenWithDetection(String sessionToken, int lidSeconds, int detectSeconds) {
  // 1. Open lid
  openLid(lidSeconds);
  
  // 2. Measure baseline (empty bin)
  baseline_distance = measureDistance();
  
  // 3. Wait for bottle
  bool bottleDetected = detectBottle(detectSeconds);
  
  // 4. Close lid
  closeLid();
  
  // 5. Send result
  String result = bottleDetected ? "DETECTED" : "NOT_DETECTED";
  sendWebSocketMessage(sessionToken, result);
}
```

### 5. Backend Changes (Minimal)
```python
# In scan.py - just add physical confirmation check
async def scan_bottle(scan_request: ScanRequest):
    # ... existing validation logic ...
    
    if validation_result.is_valid:
        # Send command and wait for physical confirmation
        device_response = await send_open_with_detection_command(
            device_id=scan_request.device_id,
            session_token=generate_token(),
            lid_seconds=3,
            detect_seconds=10
        )
        
        # Only award points if bottle was physically detected
        if device_response.get('result') == 'DETECTED':
            await add_user_points(scan_request.user_email, validation_result.points_awarded)
            validation_result.deposit_confirmed = True
        else:
            validation_result.deposit_confirmed = False
            validation_result.points_awarded = 0
    
    return validation_result
```

### 6. Simple WebSocket Messages
```javascript
// Backend → ESP32
{
  "type": "command",
  "action": "open_with_detection", 
  "session_token": "abc123",
  "lid_seconds": 3,
  "detect_seconds": 10
}

// ESP32 → Backend
{
  "type": "detection_result",
  "session_token": "abc123", 
  "result": "DETECTED" // or "NOT_DETECTED"
}
```

### 7. Database Update (One Field)
```javascript
// Add to existing scan records
{
  // ... existing fields ...
  "physical_deposit_confirmed": true // or false
}
```

---

## Implementation Steps

### Week 1: Hardware
1. **Wire sensor to ESP32**: VCC→5V, GND→GND, TRIG→19, ECHO→21
2. **Test basic measurement**: Add `measureDistance()` function
3. **Mount sensor**: Place in bin pointing upward from bottom
4. **Test detection**: Drop bottles and verify sensor detects them

### Week 1-2: ESP32 Code  
1. **Add detection logic**: Implement `detectBottle()` function
2. **Add command handler**: Handle `open_with_detection` messages
3. **Test integration**: Verify complete flow works
4. **Tune threshold**: Adjust `BOTTLE_THRESHOLD` for reliability

### Week 2: Backend
1. **Update scan endpoint**: Modify to use new detection command
2. **Update point logic**: Only award points on confirmed deposit  
3. **Add database field**: Store `physical_deposit_confirmed`
4. **Test end-to-end**: Verify scan → deposit → points flow

### Week 2-3: Testing & Deployment
1. **Test various bottles**: Different sizes and materials
2. **Test edge cases**: Hands, other objects (should not trigger)
3. **Tune sensitivity**: Adjust threshold for optimal detection
4. **Deploy to production**: Monitor performance

---

## Success Criteria
- ✅ **No points without deposit**: Prevents exploitation
- ✅ **Reliable detection**: >90% success rate with real bottles
- ✅ **Fast response**: Detection within 10 seconds
- ✅ **No false positives**: Hands/objects don't trigger points

---

## What We're NOT Doing (YAGNI)
- ❌ Temperature compensation
- ❌ Advanced filtering algorithms  
- ❌ Multiple sensor types
- ❌ Machine learning
- ❌ Complex session management
- ❌ Performance analytics
- ❌ Pattern analysis
- ❌ Voltage level shifters
- ❌ Graceful degradation

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Sensor unreliable | Test thoroughly, adjust threshold |
| False negatives | Set reasonable threshold, manual override |
| False positives | Test with common objects, tune threshold |
| Sensor breaks | Replace sensor, add error logging |

---

## Technical Notes

### Wiring
- **VCC** → ESP32 VIN (5V)
- **GND** → ESP32 GND
- **TRIG** → ESP32 GPIO 19
- **ECHO** → ESP32 GPIO 21

### Mounting
- Mount sensor at bottom of collection chamber
- Point sensor upward to detect falling bottles
- Keep sensor clean and unobstructed

### Testing
1. Drop various bottle sizes - confirm detection
2. Wave hands over sensor - should NOT award points
3. Test timeout scenario - no bottle dropped within 10 seconds

---

**This simple approach solves the core problem (preventing point exploitation) with minimal complexity and maximum reliability. Additional features can be added later if needed.**