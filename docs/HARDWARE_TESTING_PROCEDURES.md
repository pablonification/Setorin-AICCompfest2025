# HC-SR04 Ultrasonic Sensor Hardware Testing Procedures

**Date:** September 25, 2025  
**Project:** Setorin SmartBin - Hardware Validation  
**Purpose:** Step-by-step testing procedures for ultrasonic sensor integration

---

## 🔧 Phase 1: Basic Hardware Setup

### 1.1 Component Requirements
**Required Components:**
- ESP32 development board
- HC-SR04 ultrasonic sensor
- Jumper wires (4 pieces)
- Breadboard (optional)
- USB cable for ESP32
- Computer with Arduino IDE
- Multimeter (optional, for voltage verification)

**Wiring Diagram:**
```
HC-SR04    →    ESP32
VCC        →    VIN (5V)
GND        →    GND  
TRIG       →    GPIO 19
ECHO       →    GPIO 21
```

### 1.2 Physical Connections
1. **Power Off** ESP32 before making connections
2. **Connect VCC** to ESP32 VIN (5V rail)
3. **Connect GND** to ESP32 GND
4. **Connect TRIG** to ESP32 GPIO 19
5. **Connect ECHO** to ESP32 GPIO 21
6. **Verify connections** with multimeter if available

### 1.3 Upload Firmware
1. **Open Arduino IDE**
2. **Load** `setorin.ino` from your project directory
3. **Select Board**: ESP32 Dev Module
4. **Select Port**: Your ESP32 COM port
5. **Upload** firmware to ESP32
6. **Wait** for "Done uploading" message

---

## 🧪 Phase 2: Sensor Function Testing

### 2.1 Serial Monitor Setup
1. **Open Serial Monitor** in Arduino IDE (Ctrl+Shift+M)
2. **Set baud rate** to 115200
3. **Verify** ESP32 boots and connects to WiFi
4. **Look for** initialization messages:
   ```
   [INFO] Hardware initialized successfully
   [INFO] Baseline distance calibrated: XXX.X cm
   ```

### 2.2 Basic Distance Testing
**Command:** `sensor`

**Expected Response:**
```
Current distance: 123.45 cm
Baseline: 150.00 cm
Status: NORMAL
```

**Testing Steps:**
1. **Type:** `sensor` in Serial Monitor
2. **Record** baseline distance (empty bin)
3. **Hold hand** 10cm above sensor
4. **Type:** `sensor` again
5. **Verify** distance decreases significantly

**✅ Success Criteria:**
- Distance readings are stable (±2cm variation)
- Distance changes when objects are introduced
- No error messages or timeouts

### 2.3 Detection Algorithm Testing
**Command:** `test detect`

**Expected Response:**
```
Testing bottle detection for 10 seconds...
Baseline distance: 150.00 cm
Waiting for bottle...
[Drop bottle now]
Bottle detected at 8.2 seconds!
Detection result: SUCCESS
```

**Testing Steps:**
1. **Clear area** above sensor (empty bin)
2. **Type:** `test detect`
3. **Wait 2 seconds** for baseline measurement
4. **Drop a bottle** into the bin
5. **Observe** detection confirmation

**✅ Success Criteria:**
- Detects bottle within 10 seconds
- Returns "SUCCESS" when bottle is dropped
- Returns "TIMEOUT" if no bottle is dropped

---

## 🍶 Phase 3: Bottle Detection Validation

### 3.1 Test Different Bottle Types
**Test bottles:**
- Plastic water bottles (500ml, 1L)
- Glass bottles (beer, wine)  
- Aluminum cans
- Different shapes (tall/wide)

**For each bottle:**
1. **Clear bin** (remove all objects)
2. **Run:** `test detect`
3. **Drop bottle** after 2-second countdown
4. **Record results** in table below:

| Bottle Type | Size | Material | Detected? | Detection Time |
|------------|------|----------|-----------|----------------|
| Plastic | 500ml | PET | ✅ | 2.3s |
| Plastic | 1L | PET | ✅ | 1.8s |
| Glass | 330ml | Glass | ✅ | 2.1s |
| Aluminum | 350ml | Metal | ✅ | 2.5s |

**✅ Target:** >90% detection rate across all bottle types

### 3.2 False Positive Testing
**Test non-bottle objects:**
- Hand waving
- Piece of paper
- Small toy
- Smartphone

**Testing Process:**
1. **Run:** `test detect`
2. **Wave object** over sensor (don't drop)
3. **Verify** it does NOT trigger detection
4. **Let test timeout** (should return "TIMEOUT")

**✅ Target:** 0% false positives (no detection for non-bottles)

### 3.3 Threshold Tuning
If detection is too sensitive or not sensitive enough:

1. **Open** `setorin.ino` in Arduino IDE
2. **Find line:** `#define BOTTLE_THRESHOLD 50`
3. **Adjust value:**
   - **Increase** (60-80) if too many false positives
   - **Decrease** (30-40) if missing bottles
4. **Re-upload** firmware and test again

---

## 🌐 Phase 4: Communication Testing

### 4.1 WebSocket Command Testing
**Prerequisites:** ESP32 connected to WiFi and WebSocket server

**Test WebSocket Commands:**
1. **Connect** to ESP32 via WebSocket client (or backend)
2. **Send command:**
   ```json
   {
     "action": "open_with_detection",
     "duration_seconds": 5
   }
   ```
3. **Verify response:**
   ```json
   {
     "status": "success",
     "bottle_detected": "NOT_DETECTED"
   }
   ```

### 4.2 HTTP Endpoint Testing
**Test HTTP Control:**
```bash
# Replace with your ESP32 IP address
curl -X POST "http://192.168.1.XXX:80/control" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "open_with_detection",
    "duration_seconds": 5
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "bottle_detected": "NOT_DETECTED",
  "message": "Detection complete"
}
```

---

## 🔍 Phase 5: End-to-End Integration Testing

### 5.1 Complete Flow Testing
**Simulation Steps:**
1. **Take photo** of a bottle (for AI validation)
2. **Submit scan** via frontend/API
3. **Backend** sends `open_with_detection` command  
4. **ESP32** opens lid and waits for bottle
5. **Drop bottle** into bin
6. **ESP32** detects bottle and closes lid
7. **Backend** awards points only if detected

**Expected Log Flow:**
```
[Backend] Sending open_with_detection to ESP32
[ESP32] Lid opened, waiting for bottle...
[ESP32] Bottle detected! Closing lid.
[ESP32] Response: {"bottle_detected": "DETECTED"}
[Backend] Physical deposit confirmed, awarding points
```

### 5.2 Failure Scenario Testing
**Test Case: No Bottle Dropped**
1. **Submit scan** with valid bottle image
2. **ESP32** opens lid and waits
3. **Don't drop bottle** (let it timeout)
4. **Verify** no points are awarded
5. **Check** database shows `physical_deposit_confirmed: false`

---

## 📊 Phase 6: Performance & Reliability Testing

### 6.1 Stress Testing
**Rapid Detection Test:**
1. **Run 20 consecutive** `test detect` commands
2. **Drop bottles** for each test
3. **Record** success rate and response times
4. **Target:** >95% success rate, <3s average detection

### 6.2 Environmental Testing
**Test under different conditions:**
- **Lighting:** Bright light vs dark (shouldn't affect ultrasonic)
- **Temperature:** Room temperature variations
- **Interference:** Other electronics nearby
- **Mounting:** Different sensor angles/positions

### 6.3 Long-term Stability
**24-Hour Test:**
1. **Set up** continuous monitoring
2. **Run** `sensor` command every 5 minutes
3. **Log** all distance readings
4. **Check** for drift or stability issues

---

## 🚨 Troubleshooting Guide

### Common Issues & Solutions

| Problem | Symptoms | Solution |
|---------|----------|----------|
| No readings | "Distance: 0.00 cm" | Check wiring, especially ECHO pin |
| Erratic readings | Wildly varying distances | Check power supply, add delays |
| No detection | Bottle dropped but not detected | Lower BOTTLE_THRESHOLD value |
| False positives | Detection without bottle | Raise BOTTLE_THRESHOLD value |
| Timeout errors | "Sensor timeout" messages | Check 5V power supply |

### Debug Commands Reference
```cpp
"help"          // Show all available commands
"sensor"        // Get current distance reading  
"test detect"   // Run 10-second detection test
"open"          // Manual lid open (3 seconds)
"close"         // Manual lid close
"status"        // Show system status
```

### Voltage Verification
**Using Multimeter:**
1. **Measure VCC** on HC-SR04: Should be ~5V
2. **Measure TRIG** signal: Should toggle 0V/3.3V
3. **Measure ECHO** signal: Should show pulse response

---

## ✅ Final Validation Checklist

### Hardware Validation
- [ ] All connections secure and correct
- [ ] ESP32 boots and connects to WiFi
- [ ] Sensor provides stable distance readings
- [ ] Baseline calibration successful
- [ ] Servo lid operation works correctly

### Detection Validation  
- [ ] Detects various bottle types (>90% success)
- [ ] No false positives with hands/objects
- [ ] Detection time <5 seconds average
- [ ] Threshold properly tuned
- [ ] Timeout handling works correctly

### Communication Validation
- [ ] WebSocket commands work
- [ ] HTTP endpoint responds correctly
- [ ] Debug commands all functional
- [ ] Error handling graceful
- [ ] Logging properly formatted

### Integration Validation
- [ ] End-to-end scan → deposit → points flow
- [ ] Points awarded only on physical confirmation
- [ ] Database records accurate
- [ ] No points awarded on timeout/failure
- [ ] System recovers from errors

---

## 📝 Test Results Template

**Test Date:** ___________  
**Tester:** ___________  
**ESP32 Firmware Version:** ___________  

### Sensor Performance
- Baseline Distance: _______ cm
- Detection Success Rate: _______% 
- Average Detection Time: _______ seconds
- False Positive Rate: _______%

### Bottle Type Results
| Type | Detected | Time |
|------|----------|------|
| 500ml Plastic | ✅/❌ | ___s |
| 1L Plastic | ✅/❌ | ___s |
| Glass Bottle | ✅/❌ | ___s |
| Aluminum Can | ✅/❌ | ___s |

### Issues Found
1. _________________________________
2. _________________________________
3. _________________________________

### Overall Status: ✅ PASS / ❌ FAIL

**Notes:** ________________________________

---

**Ready for production deployment when all validation checks pass!** 🚀