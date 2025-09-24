# 🚀 Quick Start Hardware Testing

## 📋 Pre-Test Checklist (5 minutes)
- [ ] ESP32 powered off
- [ ] HC-SR04 wired: VCC→5V, GND→GND, TRIG→19, ECHO→21  
- [ ] Arduino IDE ready with setorin.ino
- [ ] Serial Monitor set to 115200 baud

## ⚡ Immediate Tests (10 minutes)

### 1. Upload & Boot Test
```bash
# Upload firmware → Open Serial Monitor
# Expected: WiFi connection + "Hardware initialized successfully"
```

### 2. Basic Sensor Test
```bash
# Type: sensor
# Expected: "Current distance: XXX.X cm"
# Hold hand 10cm above sensor, type: sensor again
# Expected: Distance should decrease significantly
```

### 3. Detection Test  
```bash
# Type: test detect
# Drop a bottle within 10 seconds
# Expected: "Bottle detected!" or "TIMEOUT"
```

## 🍶 Bottle Testing (15 minutes)

### Test Each Bottle Type:
1. **Clear bin** completely
2. **Type:** `test detect` 
3. **Drop bottle** after 2-second countdown
4. **Record result** (✅ detected / ❌ missed)

| Bottle | Result | Time |
|--------|---------|------|
| 500ml Plastic | _____ | ____s |
| 1L Plastic | _____ | ____s |  
| Glass Bottle | _____ | ____s |
| Aluminum Can | _____ | ____s |

**Target: >90% detection success**

## 🚫 False Positive Test (5 minutes)
1. **Type:** `test detect`
2. **Wave hand** over sensor (don't drop)
3. **Expected:** Should timeout, NOT detect
4. **Test:** Paper, phone, other objects
5. **Target:** 0% false positives

## 🌐 Communication Test (5 minutes)
**Find ESP32 IP address in Serial Monitor, then:**
```bash
# Replace XXX with your ESP32 IP
curl -X POST "http://192.168.1.XXX:80/control" \
  -H "Content-Type: application/json" \
  -d '{"action": "open_with_detection", "duration_seconds": 5}'

# Expected Response:
# {"status": "success", "bottle_detected": "NOT_DETECTED"}
```

## ⚙️ Quick Threshold Tuning
**If detection issues:**
- **Missing bottles** → Lower threshold: `#define BOTTLE_THRESHOLD 30`
- **False positives** → Raise threshold: `#define BOTTLE_THRESHOLD 70`
- **Re-upload firmware** and test again

## 📞 Debug Commands Reference
```cpp
"sensor"        // Current distance reading
"test detect"   // 10-second detection test  
"help"          // Show all commands
"open"          // Manual lid open
"close"         // Manual lid close
"status"        // System status
```

## ✅ Success Criteria
- [x] ESP32 boots and connects to WiFi
- [x] Sensor gives stable distance readings  
- [x] Detects >90% of bottles dropped
- [x] Zero false positives with hands/objects
- [x] HTTP endpoint responds correctly
- [x] Detection time <5 seconds average

## 🚨 Common Issues
| Problem | Quick Fix |
|---------|-----------|
| "Distance: 0.00" | Check ECHO pin connection |
| Erratic readings | Check 5V power supply |
| No detection | Lower BOTTLE_THRESHOLD |
| False positives | Raise BOTTLE_THRESHOLD |

---
**Total Time: ~40 minutes for complete validation**  
**Next Step:** Deploy backend changes and test full integration