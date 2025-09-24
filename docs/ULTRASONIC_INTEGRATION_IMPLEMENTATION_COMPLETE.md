# HC-SR04 Ultrasonic Sensor Integration - Complete Implementation

## Overview
This document describes the complete implementation of HC-SR04 ultrasonic sensor integration for bottle deposit validation in the SmartBin system. This addresses the security concern of users gaming the system by scanning bottles but not actually depositing them.

## Implementation Architecture

### 1. ESP32 Firmware (setorin.ino) - ✅ COMPLETED
**Hardware Configuration:**
- TRIG_PIN: GPIO 19
- ECHO_PIN: GPIO 21
- BOTTLE_THRESHOLD: 50mm distance change
- Voltage: 5V operation (confirmed compatible with ESP32)

**Key Functions Added:**
```cpp
// Hardware Setup
void initializeHardware()  // Added sensor initialization and baseline calibration

// Core Sensor Functions
float measureDistance()    // HC-SR04 measurement using pulseIn timing
bool detectBottle(int timeout_ms)  // Bottle detection with configurable timeout

// Integration Functions
void handleOpenWithDetection()  // Combined lid control with sensor detection
```

**Communication Protocols:**
- **WebSocket**: Handles "open_with_detection" commands with session token support
- **HTTP**: Endpoint `/control` accepts "open_with_detection" action
- **Debug Interface**: Added "sensor" and "test detect" commands for hardware testing

**Response Format:**
```json
{
  "status": "success",
  "bottle_detected": "DETECTED" | "NOT_DETECTED" | "TIMEOUT"
}
```

### 2. Backend API Changes - ✅ COMPLETED

#### 2.1 Scan Service (`backend/src/backend/routers/scan.py`)
**Modified Functions:**
- `control_esp32_lid()`: Added `use_bottle_detection` parameter
- Main scan endpoint: Integrated physical deposit confirmation logic

**Key Changes:**
```python
# Use ultrasonic sensor for bottle detection
esp32_response = await control_esp32_lid(device_id, duration_seconds, use_bottle_detection=True)

# Check physical deposit confirmation
physical_deposit_confirmed = any(
    event.get("event") == "lid_opened" and 
    event.get("response", {}).get("bottle_detected") == "DETECTED"
    for event in iot_events
)

# Only award points if physically deposited
points_to_award = validation_result.points_awarded if physical_deposit_confirmed else 0
```

#### 2.2 ESP32 Control Service (`backend/src/backend/routers/esp32.py`)
**Enhanced Actions:**
- Added support for "open_with_detection" action
- Updated background task handlers to pass detection parameter
- Enhanced WebSocket and HTTP communication

#### 2.3 IoT Client (`backend/src/backend/services/iot_client.py`)
**Enhanced Methods:**
```python
async def open_bin(self, device_id: str, duration_seconds: int = 3, use_bottle_detection: bool = False)
```

#### 2.4 Database Schema Enhancements
**Scan Collection Updates:**
```javascript
{
  // ... existing fields
  "points": 0,  // Actual points awarded (0 if no physical deposit)
  "points_requested": 50,  // Original points before physical verification
  "physical_deposit_confirmed": false,  // Ultrasonic sensor confirmation
  "iot_events": [
    {
      "event": "lid_opened",
      "status": "success", 
      "response": {
        "bottle_detected": "NOT_DETECTED"
      }
    }
  ]
}
```

#### 2.5 API Response Schema (`backend/src/backend/schemas/scan.py`)
**Added Field:**
```python
class ScanResponse(BaseModel):
    # ... existing fields
    physical_deposit_confirmed: Optional[bool] = None  # Ultrasonic sensor confirmation
```

### 3. Security Implementation

#### 3.1 Point Award Logic
**Before Integration:**
```python
# Points awarded based on AI validation only
if validation_result.is_valid and user_email:
    user_total_points = await add_points(user_email, validation_result.points_awarded)
```

**After Integration:**
```python
# Points awarded only with physical deposit confirmation
points_to_award = validation_result.points_awarded if physical_deposit_confirmed else 0
if validation_result.is_valid and user_email and points_to_award > 0:
    user_total_points = await add_points(user_email, points_to_award)
elif validation_result.is_valid and not physical_deposit_confirmed:
    logger.info("Bottle validation passed but no physical deposit detected - no points awarded")
```

#### 3.2 Transaction Creation
**Enhanced Logic:**
```python
# Create transaction only for physically confirmed deposits
if scan_id and validation_result.is_valid and user_email and points_to_award > 0:
    created_transaction = await transaction_service.create_transaction_after_scan(
        user_id=user_id,
        scan_id=scan_id,
        points_awarded=points_to_award  # Actual points (0 if no physical deposit)
    )
```

## Detection Algorithm

### HC-SR04 Timing Protocol
```cpp
// Trigger 10μs pulse
digitalWrite(TRIG_PIN, HIGH);
delayMicroseconds(10);
digitalWrite(TRIG_PIN, LOW);

// Measure echo duration
duration = pulseIn(ECHO_PIN, HIGH, 30000);  // 30ms timeout
distance_cm = duration * 0.034 / 2;
```

### Bottle Detection Logic
```cpp
bool detectBottle(int timeout_ms) {
    unsigned long start_time = millis();
    
    while (millis() - start_time < timeout_ms) {
        float current_distance = measureDistance();
        if (baseline_distance - current_distance > BOTTLE_THRESHOLD) {
            return true;  // Bottle detected
        }
        delay(100);  // Check every 100ms
    }
    return false;  // Timeout, no bottle detected
}
```

## Communication Flow

### 1. Scan Request Flow
```
Frontend → Backend → ESP32
    ↓
Scan Request → control_esp32_lid(use_bottle_detection=True)
    ↓
HTTP POST /api/esp32/control {"action": "open_with_detection"}
    ↓
ESP32 handleOpenWithDetection()
    ↓
Ultrasonic sensor detection + Servo control
    ↓
Response: {"bottle_detected": "DETECTED"/"NOT_DETECTED"/"TIMEOUT"}
```

### 2. Point Award Flow
```
ESP32 Response → Backend Processing → Point Award Decision
    ↓
if bottle_detected == "DETECTED":
    points_to_award = validation_result.points_awarded
else:
    points_to_award = 0
    ↓
Database: Store both requested points and actual points awarded
Transaction: Create only if points_to_award > 0
```

## Testing & Validation

### Hardware Testing Commands
```cpp
// Debug commands available in ESP32 firmware
"sensor"        // Get current distance reading
"test detect"   // Test bottle detection with 10s timeout
"help"          // Show all available commands including sensor commands
```

### Backend Testing
```bash
# Test ultrasonic sensor integration
curl -X POST "http://localhost:8000/api/esp32/control" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "ESP32-SMARTBIN-420",
    "action": "open_with_detection", 
    "duration_seconds": 5
  }'
```

## Deployment Considerations

### 1. Hardware Setup
- Mount HC-SR04 sensor inside bin facing upward
- Ensure 5V power connection
- Verify GPIO pin connections (19=TRIG, 21=ECHO)
- Calibrate baseline distance during initialization

### 2. Configuration Parameters
```cpp
#define BOTTLE_THRESHOLD 50    // mm - adjust based on bottle sizes
#define DETECTION_TIMEOUT 30   // seconds - timeout for bottle detection
```

### 3. Error Handling
- Sensor failure: Falls back to non-detection mode
- Network timeout: Increased to 15 seconds for detection operations
- Graceful degradation: System continues to function without sensor

## Security Benefits

### 1. Point Exploitation Prevention
- **Before**: Users could scan bottles without depositing (100% AI validation)
- **After**: Users must physically deposit bottles to receive points (AI + Physical validation)

### 2. Audit Trail
- Complete logging of detection events
- Separation of requested vs awarded points
- Physical confirmation status stored in database

### 3. Transparency
- API responses include `physical_deposit_confirmed` field
- Frontend can display appropriate messages to users
- Clear distinction between scan validation and deposit confirmation

## Future Enhancements

### 1. Advanced Detection
- Multiple sensor redundancy
- Weight-based validation
- Camera-based bottle confirmation

### 2. Dynamic Configuration
- Remote threshold adjustment
- Sensor calibration endpoints
- Detection timeout configuration

### 3. Analytics
- Detection success rates
- User behavior analysis
- System fraud prevention metrics

## File Summary
**Modified Files:**
1. `setorin.ino` - ESP32 firmware with ultrasonic sensor integration
2. `backend/src/backend/routers/scan.py` - Scan service with physical validation
3. `backend/src/backend/routers/esp32.py` - ESP32 control with detection support
4. `backend/src/backend/services/iot_client.py` - IoT client with detection parameter
5. `backend/src/backend/schemas/scan.py` - Response schema with confirmation field

**Created Files:**
1. `docs/ULTRASONIC_INTEGRATION_SIMPLE.md` - YAGNI implementation strategy
2. `docs/ULTRASONIC_INTEGRATION_IMPLEMENTATION_COMPLETE.md` - This complete documentation

This implementation successfully addresses the security concern while maintaining system simplicity and reliability through the YAGNI (You Aren't Gonna Need It) approach.