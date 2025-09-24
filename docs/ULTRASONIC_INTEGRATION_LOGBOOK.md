# Ultrasonic Sensor Integration Logbook
**Date:** September 25, 2025  
**Project:** Setorin SmartBin - HR-SC04 Ultrasonic Sensor Integration  
**Purpose:** Bottle deposit validation to prevent points exploitation

---

## Current System Analysis

### 1. Scanning Flow Overview
The current bottle scanning system operates in the following sequence:

1. **Frontend Scan Process** (`app/scan/page.js`):
   - User scans QR code for validation
   - Camera captures bottle image with reference sticker (160mm height)
   - Image uploaded to backend via `/api/scan` endpoint

2. **Backend Processing** (`backend/src/backend/routers/scan.py`):
   - **Image Processing**: OpenCV service measures bottle dimensions using reference sticker
   - **AI Classification**: Roboflow service predicts bottle brand and confidence
   - **Validation**: Validates measurements and calculates reward points
   - **IoT Control**: If valid, triggers ESP32 lid opening via HTTP/WebSocket
   - **Database Storage**: Stores scan results and creates transaction records

3. **ESP32 Hardware Control** (`setorin.ino`):
   - Receives open/close commands via WebSocket or HTTP polling
   - Controls servo to open lid for specified duration (1-10 seconds)
   - Automatically closes lid after timeout
   - Reports operation status back to backend

### 2. Current Validation Methods

#### 2.1 Image-Based Validation
- **Reference Sticker**: 160mm black rectangle for scale calibration
- **OpenCV Measurement**: Calculates diameter, height, volume using pixel-to-mm conversion
- **Brand Detection**: Roboflow AI identifies bottle brands with confidence scores
- **Size Validation**: Accepts bottles between 100-350mm height
- **Volume Estimation**: Cylindrical approximation for volume calculation

#### 2.2 Current Anti-Exploitation Measures
- **JWT Authentication**: User token verification for all scan requests
- **Rate Limiting**: Minimum 2-second interval between commands
- **Session Tokens**: Short-lived tokens (15-30 seconds TTL) for device commands
- **Measurement Validation**: Size and aspect ratio checks
- **Transaction Logging**: Complete audit trail in MongoDB

### 3. Current Hardware Setup

#### 3.1 ESP32 Configuration
- **Controller**: ESP32 with WiFi connectivity
- **Actuator**: Servo motor (pins: GPIO18) controlling lid mechanism
- **Sensors**: Status LED (GPIO2) for visual feedback
- **Communication**: WebSocket (primary) + HTTP polling (fallback)
- **Power**: 5V supply for servo, 3.3V for ESP32

#### 3.2 Physical Design
- **Lid Mechanism**: Servo-controlled trapdoor design
- **Reference System**: 160mm vertical sticker for mobile phone scanning
- **Container**: Closed bin with trapdoor opening mechanism

### 4. Identified Vulnerability

#### 4.1 Exploitation Scenario
The current system has a critical vulnerability:
1. User scans valid bottle image → gets approval
2. ESP32 opens lid for configured duration (1-10 seconds)
3. **VULNERABILITY**: No physical verification that bottle was actually deposited
4. User could scan bottle but not deposit it, still receiving points
5. Same bottle could be scanned multiple times without actual deposit

#### 4.2 Trust Model Gap
- **Current**: Trust user to deposit bottle after scan approval
- **Needed**: Physical confirmation of bottle deposit
- **Risk**: Point farming without actual recycling

---

## Ultrasonic Sensor Integration Plan

### 1. HR-SC04 Sensor Specifications
- **Range**: 2cm - 400cm
- **Accuracy**: ±3mm
- **Trigger**: 10µs pulse on TRIG pin
- **Echo**: Response time proportional to distance
- **Voltage**: 5V operation
- **Pins**: VCC, GND, TRIG, ECHO

### 2. Integration Architecture

#### 2.1 Physical Placement Strategy
**Option A: Bottom Detection (Recommended)**
- Mount sensor at bottom of collection chamber
- Detects bottle impact/presence in collection area
- Measures distance change when bottle lands

**Option B: Through-Beam Detection**
- Mount sensor to detect objects passing through opening
- More complex but provides transit confirmation

#### 2.2 ESP32 Pin Assignment
```cpp
// Proposed pin configuration
#define TRIG_PIN 19      // Ultrasonic trigger
#define ECHO_PIN 21      // Ultrasonic echo  
#define SERVO_PIN 18     // Existing servo (unchanged)
#define STATUS_LED_PIN 2 // Existing LED (unchanged)
```

### 3. Detection Logic Design

#### 3.1 Baseline Measurement
```cpp
void calibrateBaseline() {
  // Measure empty container distance
  baseline_distance = measureDistance();
  // Store as reference for bottle detection
}
```

#### 3.2 Bottle Detection Algorithm
```cpp
enum DepositState {
  WAITING_FOR_BOTTLE,
  BOTTLE_DETECTED,
  DEPOSIT_CONFIRMED,
  DEPOSIT_TIMEOUT
};

bool detectBottleDeposit(int timeout_ms) {
  unsigned long start_time = millis();
  float current_distance;
  
  while (millis() - start_time < timeout_ms) {
    current_distance = measureDistance();
    
    // Bottle detected if distance significantly reduced
    if (baseline_distance - current_distance > BOTTLE_THRESHOLD) {
      delay(500); // Stabilization delay
      
      // Confirm bottle is still there
      if (baseline_distance - measureDistance() > BOTTLE_THRESHOLD) {
        return true; // Bottle confirmed
      }
    }
    
    delay(100); // Check every 100ms
  }
  
  return false; // Timeout without detection
}
```

### 4. Modified Scan Flow

#### 4.1 Enhanced Backend Process
```python
# Modified scan.py logic
if validation_result.is_valid:
    # 1. Send open command with session token
    esp32_response = await control_esp32_lid(device_id, duration_seconds)
    
    # 2. Wait for physical deposit confirmation
    deposit_confirmed = await wait_for_deposit_confirmation(device_id, timeout=15)
    
    if deposit_confirmed:
        # Award points only after physical confirmation
        user_total_points = await add_points(user_email, validation_result.points_awarded)
        validation_result.deposit_confirmed = True
    else:
        # No physical deposit detected - no points awarded
        validation_result.deposit_confirmed = False
        validation_result.points_awarded = 0
        validation_result.reason = "NO_PHYSICAL_DEPOSIT_DETECTED"
```

#### 4.2 ESP32 Enhanced State Machine
```cpp
enum SmartBinState {
  IDLE,
  LID_OPENING,
  WAITING_FOR_DEPOSIT,
  DEPOSIT_DETECTED,
  LID_CLOSING,
  CONFIRMING_DEPOSIT
};

void handleDepositSequence() {
  switch (current_state) {
    case LID_OPENING:
      openLid();
      baseline_distance = measureDistance();
      current_state = WAITING_FOR_DEPOSIT;
      break;
      
    case WAITING_FOR_DEPOSIT:
      if (detectBottleDeposit(deposit_timeout)) {
        current_state = DEPOSIT_DETECTED;
        sendDepositConfirmation(session_token, true);
      } else {
        current_state = LID_CLOSING;
        sendDepositConfirmation(session_token, false);
      }
      break;
      
    case DEPOSIT_DETECTED:
      closeLid();
      current_state = CONFIRMING_DEPOSIT;
      break;
  }
}
```

### 5. Communication Protocol Updates

#### 5.1 New WebSocket Messages
```javascript
// ESP32 → Backend: Deposit confirmation
{
  "type": "deposit_confirmation",
  "session_token": "uuid-here",
  "deposit_detected": true,
  "detection_time_ms": 1250,
  "distance_baseline_mm": 180,
  "distance_final_mm": 95,
  "confidence_level": "high"
}

// Backend → ESP32: Enhanced open command
{
  "type": "command", 
  "action": "open_with_detection",
  "session_token": "uuid-here",
  "duration_seconds": 3,
  "detection_timeout": 10,
  "detection_threshold": 50  // mm distance change required
}
```

#### 5.2 Database Schema Updates
```javascript
// Enhanced scan record
{
  "scan_id": "...",
  "user_email": "...",
  "measurement": {...},
  "validation_result": {...},
  "physical_deposit": {
    "confirmed": true,
    "detection_time": "2025-09-25T10:30:45Z",
    "sensor_data": {
      "baseline_distance_mm": 180,
      "final_distance_mm": 95,
      "change_detected_mm": 85,
      "confidence": "high"
    }
  },
  "points_awarded": 150  // Only if physical_deposit.confirmed = true
}
```

---

## Simple YAGNI Implementation Strategy

**Goal**: Add physical validation to prevent point exploitation with minimal complexity.

### 1. Core Problem & Simple Solution
**Problem**: Users can scan bottles and get points without actually depositing them.
**Solution**: Add ultrasonic sensor to detect when bottle actually goes into the bin.

### 2. Minimal Hardware Setup
```cpp
// Simple pin configuration
#define TRIG_PIN 19
#define ECHO_PIN 21
#define BOTTLE_THRESHOLD 50 // mm - any distance change above this = bottle detected

float baseline_distance = 0;
bool deposit_detected = false;
```

### 3. Basic Distance Measurement
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

### 4. Simple Bottle Detection
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
  
  return false; // Timeout
}
```

### 5. Modified ESP32 Flow
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

### 6. Backend Changes (Minimal)
```python
# In scan.py - just add one check
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

### 7. New WebSocket Message
```javascript
// Backend sends to ESP32
{
  "type": "command",
  "action": "open_with_detection", 
  "session_token": "abc123",
  "lid_seconds": 3,
  "detect_seconds": 10
}

// ESP32 responds
{
  "type": "detection_result",
  "session_token": "abc123", 
  "result": "DETECTED" // or "NOT_DETECTED"
}
```

### 8. Database Update (Minimal)
```javascript
// Just add one field to existing scan records
{
  // ... existing fields ...
  "physical_deposit_confirmed": true // or false
}
```

### 9. Simple Implementation Steps

#### Week 1: Hardware
1. Wire HC-SR04 to ESP32 (VCC→5V, TRIG→19, ECHO→21, GND→GND)
2. Add basic distance measurement function
3. Test sensor readings
4. Mount sensor in bin (any reasonable position)

#### Week 1-2: ESP32 Code  
1. Add `detectBottle()` function
2. Add `handleOpenWithDetection()` command handler
3. Test detection with real bottles
4. Adjust `BOTTLE_THRESHOLD` as needed

#### Week 2: Backend
1. Add new command type to ESP32 communication
2. Modify `scan_bottle()` to require physical confirmation
3. Update point awarding logic
4. Add `deposit_confirmed` field to database

#### Week 2: Frontend (Optional)
1. Show "Waiting for deposit..." message
2. Show success/failure after detection
3. Handle timeout cases

### 10. Testing Strategy
1. **Basic Function**: Drop bottle, confirm sensor detects it
2. **False Positive**: Wave hand over sensor, ensure it doesn't trigger points
3. **Edge Cases**: Test with different bottle sizes
4. **Integration**: End-to-end scan → deposit → points flow

### 11. Success Criteria
- ✅ No points awarded without physical deposit
- ✅ Normal bottles detected reliably (>90% success rate)
- ✅ System remains responsive (detection within 10 seconds)
- ✅ Fallback behavior if sensor fails

### 12. What We're NOT Doing (YAGNI)
- ❌ Temperature compensation
- ❌ Advanced filtering algorithms  
- ❌ Multiple sensor types
- ❌ Machine learning fraud detection
- ❌ Complex session management
- ❌ Performance analytics
- ❌ Pattern analysis
- ❌ Voltage level shifters (direct connection should work)
- ❌ Graceful degradation (fix sensor if broken)

### 13. Risk Mitigation
**Risk**: Sensor doesn't work reliably
**Mitigation**: Test thoroughly, adjust threshold, mount properly

**Risk**: False negatives (valid deposits not detected)  
**Mitigation**: Set reasonable threshold, add manual override for staff

**Risk**: False positives (non-bottles trigger detection)
**Mitigation**: Test with common objects, adjust threshold

This simple approach solves the core problem (preventing point exploitation) with minimal complexity and maximum reliability. We can always add more sophisticated features later if actually needed.

---

## Implementation Phases

## Implementation Phases (Simplified)

### Phase 1: Basic Hardware Setup (Week 1)
- [ ] Wire HC-SR04 to ESP32 (4 wires: VCC, GND, TRIG, ECHO)
- [ ] Test basic distance measurement
- [ ] Mount sensor somewhere in the bin
- [ ] Verify sensor can detect bottles

### Phase 2: ESP32 Integration (Week 1-2)
- [ ] Add `measureDistance()` function to existing code
- [ ] Add `detectBottle()` function
- [ ] Add new WebSocket command handler for `open_with_detection`
- [ ] Test end-to-end detection

### Phase 3: Backend Integration (Week 2)
- [ ] Modify `scan_bottle()` endpoint to use new ESP32 command
- [ ] Update point awarding logic to require confirmation
- [ ] Add `physical_deposit_confirmed` field to database
- [ ] Test integration with existing scan flow

### Phase 4: Testing & Deployment (Week 2-3)
- [ ] Test with real bottles of various sizes
- [ ] Tune `BOTTLE_THRESHOLD` for reliability
- [ ] Deploy to production
- [ ] Monitor for false positives/negatives

---

## Simple Technical Considerations

### 1. Sensor Placement
- Mount sensor pointing up from bottom of collection chamber
- Keep sensor clean and unobstructed  
- Test with real bottles to find optimal position

### 2. Threshold Tuning
- Start with 50mm distance change threshold
- Adjust based on testing with actual bottles
- Balance between false positives and missed detections

### 3. Basic Error Handling
- If sensor fails, log error and notify admin
- Add manual override button for staff
- Consider timeout for user experience (10 second max wait)

### 4. Simple Testing
- Drop various bottle sizes and confirm detection
- Test with non-bottles (hands, objects) to avoid false positives
- Verify integration: scan → deposit → points awarded

---

## Security Enhancements

### 1. Anti-Exploitation Measures
- **Physical Confirmation**: No points without confirmed deposit
- **Session Token Binding**: One-time tokens prevent replay attacks
- **Timeout Enforcement**: Limited detection window prevents gaming
- **Sensor Validation**: Multiple sensor readings for confirmation

### 2. Monitoring & Auditing
- **Deposit Success Rate**: Track percentage of successful vs failed deposits
- **Anomaly Detection**: Flag users with unusually high failure rates
- **Sensor Health Monitoring**: Alert on sensor malfunctions
- **Performance Metrics**: Track detection accuracy and false positive rates

---

## Expected Outcomes

### 1. Security Improvements
- **Eliminated Point Farming**: Physical deposit required for points
- **Authentic Recycling**: Ensures actual environmental impact
- **User Behavior Tracking**: Better analytics on deposit success rates
- **Fraud Prevention**: Significantly harder to exploit system

### 2. User Experience
- **Real-time Feedback**: Users know immediately if deposit was successful
- **Clear Instructions**: Feedback helps users deposit bottles correctly
- **Retry Capability**: Failed deposits can be attempted again
- **Trust Building**: Transparent physical validation builds user confidence

### 3. System Reliability
- **Accurate Point Distribution**: Points only awarded for actual recycling
- **Better Analytics**: Physical deposit data improves system metrics
- **Quality Assurance**: Physical validation ensures system integrity
- **Scalability**: Foundation for more sophisticated validation systems

---

## Risk Mitigation

### 1. Technical Risks
- **Sensor Reliability**: Use industrial-grade sensors, implement redundancy
- **Environmental Factors**: Weatherproof housing, temperature compensation
- **Maintenance**: Regular calibration and cleaning procedures
- **Compatibility**: Ensure sensor integration doesn't interfere with existing systems

### 2. User Experience Risks
- **Deposit Difficulty**: Clear instructions and feedback to help users
- **False Negatives**: Tune sensitivity to minimize valid deposit rejections
- **System Downtime**: Graceful degradation when sensors are offline
- **Learning Curve**: User education on proper bottle placement

### 3. Operational Risks
- **Maintenance Overhead**: Train operators on sensor maintenance
- **Cost Implications**: Budget for sensors, installation, and maintenance
- **Integration Complexity**: Thorough testing before production deployment
- **Rollback Plan**: Ability to revert to previous system if needed

---

## Conclusion

The integration of HR-SC04 ultrasonic sensors represents a critical enhancement to the SmartBin system's security and reliability. By adding physical deposit confirmation, the system will:

1. **Eliminate Point Exploitation**: Require actual bottle deposit for point rewards
2. **Improve Data Accuracy**: Provide real recycling metrics vs scan metrics
3. **Build User Trust**: Transparent validation process increases confidence
4. **Enable Future Enhancements**: Foundation for advanced validation features

This integration transforms the SmartBin from a scanning-based system to a true physical validation system, ensuring that environmental impact claims are backed by actual recycling activity.

The proposed implementation plan provides a structured approach to integration while maintaining system reliability and user experience. The phased rollout allows for thorough testing and validation at each step, minimizing risks while maximizing the security and functionality benefits.

---

**Next Steps:**
1. Procure HR-SC04 sensors and testing hardware
2. Set up development environment for firmware modifications
3. Begin Phase 1 hardware integration and testing
4. Document sensor calibration procedures and optimal placement
5. Start parallel development of backend integration features
```

---

## Enhanced Implementation Strategy

Based on comprehensive research of similar IoT sensor integrations, anti-fraud systems, and ESP32 ultrasonic sensor implementations, the following enhanced strategies have been developed to optimize our ultrasonic sensor integration:

### 1. Advanced Sensor Configuration & Calibration

#### 1.1 Environmental Compensation
```cpp
// Temperature compensation for accurate measurements
float calculateTempCompensatedDistance(float rawDistance, float temperature) {
    // Sound speed varies with temperature: v = 331.3 * sqrt(1 + (T/273.15))
    float speedOfSound = 331.3 * sqrt(1 + (temperature / 273.15));
    float timeOfFlight = (rawDistance * 2) / 0.034; // Convert back to time
    return (timeOfFlight * (speedOfSound / 10000)) / 2; // Recalculate with corrected speed
}
```

#### 1.2 Multi-Point Averaging & Noise Filtering
```cpp
class UltrasonicFilter {
private:
    static const int BUFFER_SIZE = 10;
    float readings[BUFFER_SIZE];
    int readIndex = 0;
    bool bufferFilled = false;
    
public:
    float getFilteredReading(float newReading) {
        readings[readIndex] = newReading;
        readIndex = (readIndex + 1) % BUFFER_SIZE;
        if (readIndex == 0) bufferFilled = true;
        
        // Calculate median to eliminate outliers
        float sortedReadings[BUFFER_SIZE];
        int count = bufferFilled ? BUFFER_SIZE : readIndex;
        memcpy(sortedReadings, readings, count * sizeof(float));
        
        // Simple bubble sort for median calculation
        for(int i = 0; i < count-1; i++) {
            for(int j = 0; j < count-i-1; j++) {
                if(sortedReadings[j] > sortedReadings[j+1]) {
                    float temp = sortedReadings[j];
                    sortedReadings[j] = sortedReadings[j+1];
                    sortedReadings[j+1] = temp;
                }
            }
        }
        
        return sortedReadings[count/2]; // Return median
    }
};
```

### 2. Optimized Detection Algorithm

#### 2.1 Multi-Threshold Detection System
```cpp
enum BottleSize {
    SMALL_BOTTLE,   // < 5cm diameter
    MEDIUM_BOTTLE,  // 5-8cm diameter  
    LARGE_BOTTLE    // > 8cm diameter
};

struct DepositThresholds {
    float smallBottleThreshold = 30;  // mm
    float mediumBottleThreshold = 50; // mm
    float largeBottleThreshold = 70;  // mm
    float confidenceLevel = 0.85;    // Detection confidence
};

bool detectBottleDeposit(DepositThresholds thresholds, int timeout_ms) {
    unsigned long startTime = millis();
    int consecutiveDetections = 0;
    const int REQUIRED_DETECTIONS = 5; // Consecutive readings for confirmation
    
    while (millis() - startTime < timeout_ms) {
        float currentDistance = ultrasonicFilter.getFilteredReading(measureDistance());
        float distanceChange = baseline_distance - currentDistance;
        
        bool bottleDetected = false;
        
        // Multi-threshold detection
        if (distanceChange > thresholds.largeBottleThreshold) {
            bottleDetected = true;
            detectedBottleSize = LARGE_BOTTLE;
        } else if (distanceChange > thresholds.mediumBottleThreshold) {
            bottleDetected = true;
            detectedBottleSize = MEDIUM_BOTTLE;
        } else if (distanceChange > thresholds.smallBottleThreshold) {
            bottleDetected = true;
            detectedBottleSize = SMALL_BOTTLE;
        }
        
        if (bottleDetected) {
            consecutiveDetections++;
            if (consecutiveDetections >= REQUIRED_DETECTIONS) {
                // Additional validation - ensure bottle stays for minimum time
                delay(500);
                float confirmDistance = ultrasonicFilter.getFilteredReading(measureDistance());
                if (baseline_distance - confirmDistance > thresholds.smallBottleThreshold) {
                    return true;
                }
            }
        } else {
            consecutiveDetections = 0;
        }
        
        delay(50); // 20Hz sampling rate
    }
    
    return false;
}
```

### 3. Enhanced Communication Protocol

#### 3.1 Robust Session Management
```cpp
struct DepositSession {
    String sessionToken;
    unsigned long startTime;
    unsigned long timeoutDuration;
    BottleSize expectedSize;
    bool isActive;
    int retryCount;
    
    bool isExpired() {
        return (millis() - startTime) > timeoutDuration;
    }
    
    bool canRetry() {
        return retryCount < MAX_RETRIES;
    }
};

class SessionManager {
private:
    DepositSession currentSession;
    static const int MAX_RETRIES = 3;
    
public:
    bool startSession(String token, int timeoutSeconds, BottleSize size) {
        if (currentSession.isActive && !currentSession.isExpired()) {
            return false; // Session already active
        }
        
        currentSession = {
            .sessionToken = token,
            .startTime = millis(),
            .timeoutDuration = timeoutSeconds * 1000,
            .expectedSize = size,
            .isActive = true,
            .retryCount = 0
        };
        
        return true;
    }
    
    void endSession() {
        currentSession.isActive = false;
    }
    
    bool isSessionValid(String token) {
        return currentSession.isActive && 
               currentSession.sessionToken == token && 
               !currentSession.isExpired();
    }
};
```

### 4. Hardware Optimization Strategies

#### 4.1 Sensor Mounting & Isolation
- **Vibration Dampening**: Mount sensor on silicone isolators to minimize servo vibration interference
- **Acoustic Shielding**: Use foam padding around sensor to reduce false echoes from container walls
- **Optimal Positioning**: Mount at 15-degree angle to minimize direct reflections from container bottom
- **Weatherproofing**: Use JSN-SR04T waterproof variant for better reliability in humid environments

#### 4.2 Voltage Compatibility Solution
```cpp
// Voltage divider for ECHO pin (5V to 3.3V)
// Use 1kΩ and 2kΩ resistors for voltage divider
// ECHO_PIN receives 3.3V max signal

const int TRIG_PIN = 19;  // Direct connection (3.3V sufficient to trigger)
const int ECHO_PIN = 21;  // Connect through voltage divider

void setupUltrasonicPins() {
    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);
    
    // Ensure trigger pin starts LOW
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
}
```

### 5. Advanced Error Handling & Recovery

#### 5.1 Sensor Health Monitoring
```cpp
class SensorHealthMonitor {
private:
    int consecutiveErrors = 0;
    unsigned long lastSuccessfulReading = 0;
    static const int MAX_ERRORS = 5;
    static const unsigned long ERROR_TIMEOUT = 30000; // 30 seconds
    
public:
    bool isSensorHealthy() {
        return consecutiveErrors < MAX_ERRORS && 
               (millis() - lastSuccessfulReading) < ERROR_TIMEOUT;
    }
    
    void recordSuccessfulReading() {
        consecutiveErrors = 0;
        lastSuccessfulReading = millis();
    }
    
    void recordError() {
        consecutiveErrors++;
        if (!isSensorHealthy()) {
            sendSystemAlert("SENSOR_MALFUNCTION", "Ultrasonic sensor requires maintenance");
        }
    }
    
    bool attemptSensorRecovery() {
        // Reset sensor pins
        setupUltrasonicPins();
        
        // Re-calibrate baseline
        baseline_distance = measureDistance();
        
        return baseline_distance > 0 && baseline_distance < 400; // Valid range
    }
};
```

### 6. Research Findings Summary

Based on extensive research from RandomNerdTutorials, academic papers, and IoT best practices, the following key insights have been incorporated:

#### 6.1 Hardware Configuration Lessons
- **Voltage Compatibility**: ESP32 GPIO pins are 3.3V, but HC-SR04 typically requires 5V. Use voltage dividers or level shifters for ECHO pin
- **Optimal Wiring**: VCC to VIN (5V), TRIG to GPIO 19, ECHO to GPIO 21 (with voltage divider), GND to GND  
- **Power Considerations**: HC-SR04 draws ~15mA during operation, well within ESP32 limits
- **Timing Requirements**: 10µs trigger pulse, echo pulse duration correlates to distance

#### 6.2 Environmental Factors
- **Temperature Compensation**: Sound speed varies with temperature (331.3 + 0.6*T m/s)
- **Humidity Effects**: Minimal impact on ultrasonic sensors compared to temperature
- **Vibration Isolation**: Critical for reducing false readings from servo motor operation
- **Surface Interference**: Angled mounting reduces direct reflections from container bottom

#### 6.3 Software Optimization Insights
- **Sampling Frequency**: 20Hz optimal balance between responsiveness and processing overhead
- **Median Filtering**: More effective than averaging for eliminating outliers
- **Multi-point Validation**: Require 5+ consecutive readings for confirmation
- **Timeout Management**: 30ms minimum between measurements to avoid echo interference

#### 6.4 Security and Anti-Fraud Measures
- **Pattern Analysis**: Monitor for rapid successive attempts and unusual timing patterns
- **Baseline Drift Detection**: Identify potential tampering through sensor obstruction
- **Multi-factor Authentication**: Combine sensor data with scan correlation for validation
- **Session-based Validation**: Use time-limited tokens to prevent replay attacks

#### 6.5 Performance Optimization
- **Interrupt-based Timing**: Use hardware timers for more accurate distance measurements
- **Non-blocking Operations**: Implement async measurement to prevent system lockup
- **Memory Management**: Circular buffers for efficient data storage and filtering
- **Power Management**: Sleep modes between measurements to conserve battery

### 7. Updated Implementation Phases

Based on research findings, the implementation phases have been refined:

#### Phase 1: Hardware Setup & Validation (Enhanced)
1. Install voltage divider circuit for ECHO pin compatibility
2. Mount sensor with vibration dampening and acoustic shielding  
3. Implement basic distance measurement with environmental compensation
4. Validate accuracy against known objects and distances

#### Phase 2: Software Integration (Research-Enhanced)
1. Implement UltrasonicFilter class with median filtering
2. Add SensorHealthMonitor for reliability
3. Create SessionManager for robust communication
4. Implement multi-threshold detection algorithm

#### Phase 3: System Integration (Optimized)
1. Integrate with existing WebSocket communication
2. Enhance scan.py endpoint with deposit validation
3. Add intelligent timeout management
4. Implement graceful degradation mechanisms

#### Phase 4: Security & Performance (Research-Backed)
1. Deploy pattern analysis for fraud detection
2. Add performance monitoring and metrics collection
3. Implement anti-tampering measures
4. Create comprehensive logging system

This enhanced implementation strategy significantly improves upon the original plan by incorporating real-world research findings and proven best practices from similar IoT sensor deployments.