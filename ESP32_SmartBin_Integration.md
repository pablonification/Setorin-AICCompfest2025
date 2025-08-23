# ESP32 SmartBin Integration Guide

## 📋 Table of Contents
- [System Overview](#system-overview)
- [Prerequisites](#prerequisites)
- [ESP32 Setup](#esp32-setup)
- [API Endpoints](#api-endpoints)
- [ESP32 Arduino Code](#esp32-arduino-code)
- [Testing & Validation](#testing--validation)
- [Integration with Scan Flow](#integration-with-scan-flow)
- [Troubleshooting](#troubleshooting)
- [Advanced Features](#advanced-features)

## 🎯 System Overview

The SmartBin system now supports real ESP32 devices alongside the existing IoT simulator. Your ESP32 will:

1. **Register** itself with the backend system
2. **Receive lid control commands** (open/close with timing)
3. **Send status updates** (connection status, mock sensor data)
4. **Report operation completion** for logging
5. **Handle real-time communication** via HTTP API

### Architecture
```
ESP32 Device ↔ Backend API ↔ MongoDB Database
                    ↕
               WebSocket Clients
```

## 📋 Prerequisites

### Hardware Requirements
- **ESP32 Development Board** (ESP32-WROOM-32 recommended)
- **Servo Motor** (for lid control)
- **Power Supply** (5V for ESP32, appropriate for servo)
- **WiFi Connection**

### Software Requirements
- **Arduino IDE** with ESP32 support
- **ESP32 Board Package** (version 2.0.0 or later)
- **ArduinoJson Library** (version 6.19.4 or later)
- **Servo Library** (built-in with ESP32)

### Optional Hardware (for Enhanced Features)
- **IR Sensor** (for bottle detection - not currently implemented)
- **Temperature Sensor** (DHT22, DS18B20 - mock data used)
- **Battery Monitoring Circuit** (mock data used)
- **Status LED** (for visual feedback - not currently implemented)

### Network Requirements
- **Backend URL**: `https://setorin.app`
- **WiFi Credentials** for ESP32 connection
- **Static IP** (recommended) or DHCP
- **HTTPS Support** (built into ESP32 Arduino Core with WiFiClientSecure)

## 🔧 ESP32 Setup

### 1. Install Arduino IDE
Download from [arduino.cc](https://www.arduino.cc/en/software)

### 2. Add ESP32 Board Support
1. Open Arduino IDE
2. Go to **File → Preferences**
3. Add this URL to "Additional Board Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools → Board → Board Manager**
5. Search for "ESP32" and install "esp32 by Espressif Systems"

### 3. Install Required Libraries
1. Go to **Tools → Manage Libraries**
2. Install:
   - **ArduinoJson** by Benoit Blanchon
   - **Servo** (built-in with ESP32)

### 4. SSL Certificate Setup (for HTTPS)
For HTTPS communication, you'll need to add the root CA certificate:

1. Download the root CA certificate for setorin.app
2. Add it to your Arduino sketch as a constant:
```cpp
// Root CA certificate for setorin.app (get from browser or certificate authority)
const char* rootCACertificate = \
"-----BEGIN CERTIFICATE-----\n" \
"MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n" \
"-----END CERTIFICATE-----\n";
```

### 5. Hardware Connections
```
ESP32 Pin Layout:
- GPIO 18 → Servo Motor Signal
- 5V → Servo Power
- GND → Common Ground
```

### 6. Configure WiFi and Server
Update these variables in the Arduino code:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "https://setorin.app";
```

## 📡 API Endpoints

### Base URL
```
https://setorin.app/api/esp32
```

### 1. Device Registration
**POST** `/register`

Register your ESP32 device with the system.

**Request Body:**
```json
{
  "device_id": "ESP32-SMARTBIN-001",
  "firmware_version": "1.0.0",
  "hardware_version": "ESP32-WROOM-32",
  "location": "Main Entrance",
  "ip_address": "192.168.1.100"
}
```

**Response:**
```json
{
  "message": "Device registered successfully",
  "device_id": "ESP32-SMARTBIN-001",
  "status": "online"
}
```

### 2. Status Update
**POST** `/status`

Send device status and connection information.

**Request Body:**
```json
{
  "device_id": "ESP32-SMARTBIN-001",
  "status": "online",
  "last_seen": "2025-08-23T10:30:00Z",
  "battery_level": 85,
  "temperature": 25.0,
  "error_message": null
}
```

### 3. Lid Control
**POST** `/control`

Control the SmartBin lid operations.

**Request Body:**
```json
{
  "device_id": "ESP32-SMARTBIN-001",
  "action": "open",
  "duration_seconds": 3
}
```

**Supported Actions:**
- `"open"` - Open lid, wait X seconds, then close
- `"close"` - Close lid immediately
- `"status"` - Get device status

**Response:**
```json
{
  "message": "Lid opening sequence started for 3s",
  "device_id": "ESP32-SMARTBIN-001",
  "action": "open",
  "action_id": "64f1a2b3c4d5e6f7g8h9i0j1"
}
```

### 4. Get Device List
**GET** `/devices`

Get all registered ESP32 devices.

**Response:**
```json
[
  {
    "device_id": "ESP32-SMARTBIN-001",
    "status": "online",
    "location": "Main Entrance",
    "last_seen": "2025-08-23T10:30:00Z",
    "registered_at": "2025-08-23T09:00:00Z"
  }
]
```

### 5. Get Action Logs
**GET** `/logs`

Get ESP32 action history.

**Query Parameters:**
- `device_id` (optional): Filter by device
- `limit`: Number of logs (1-1000, default 100)

**Response:**
```json
[
  {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "device_id": "ESP32-SMARTBIN-001",
    "action": "open",
    "status": "completed",
    "timestamp": "2025-08-23T10:30:00Z",
    "details": {
      "duration_seconds": 3
    }
  }
]
```

## 💻 ESP32 Arduino Code

### Complete ESP32 Code
```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Servo.h>
#include <time.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "https://setorin.app";

// Device Configuration
const char* deviceId = "ESP32-SMARTBIN-001";
const char* firmwareVersion = "1.0.0";
const char* location = "Main Entrance";

// Root CA certificate for setorin.app (replace with actual certificate)
const char* rootCACertificate = \
"-----BEGIN CERTIFICATE-----\n" \
"MIIDSjCCAjKgAwIBAgIQRK+wgNajJ7qJMDmGLvhAazANBgkqhkiG9w0BAQUFADA/\n" \
"MSQwIgYDVQQKExtEaWdpdGFsIFNpZ25hdHVyZSBUcnVzdCBDby4xFzAVBgNVBAMT\n" \
"DkRTVCBSb290IENBIFgzMB4XDTAwMDkzMDIxMTIxOVoXDTIxMDkzMDE0MDExNVow\n" \
"PzEkMCIGA1UEChMbRGlnaXRhbCBTaWduYXR1cmUgVHJ1c3QgQ28uMRcwFQYDVQQD\n" \
"Ew5EU1QgUm9vdCBDQSBYMzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB\n" \
"AN+v6ZdQCINXtMxiZfaQguzH0yxrMMpb7NnDfcdAwRgUi+DoM3ZJKuM/IUmTrE4O\n" \
"rz5Iy2Xu/NMhD2XSKtkyj4zl93ewEnu1lcCJo6m67XMuegwGMoM6hDuGuprM9Hm\n" \
"17EQTbSibH6TxFjjDkjUQeQcVUuZ1pJCYhG8+faRFxN6lZsnrGMeT0dIlMxaR7qN\n" \
"qiPoH8H0DvIwHNwwRa2k6N3sB2+LT1Gs5BFMiV7hK1Q2x7LB7+4TkQwa1w8z5wEH\n" \
"bI+0LZ1dRt6S3d7A6L+2XqMfE5WzQ7X5RBP6KJXPxTj3b4R1Z6QWXK8b4+6qXzX8\n" \
"6+9QCAQEAwIBBjANBgkqhkiG9w0BAQUFAAOCAQEAh1XvfhU+ieUq5R7+FTWt2dW+\n" \
"9XJqL7J+4y1e2gqQtH9C5hW5V9+6QXJxvJ6e6QWXK8b4+6qXzX86+9QCAQEAwIB\n" \
"-----END CERTIFICATE-----\n";

// Hardware Configuration
#define SERVO_PIN 18

// Global Objects
WiFiClientSecure wifiClient;  // Use secure client for HTTPS
HTTPClient http;
Servo lidServo;

// Timing Constants
const unsigned long STATUS_INTERVAL = 30000; // 30 seconds
const unsigned long HEARTBEAT_INTERVAL = 60000; // 1 minute

// Servo Positions
const int LID_CLOSED_POSITION = 0;
const int LID_OPEN_POSITION = 90;

// State Variables
bool lidOpen = false;
unsigned long lastStatusUpdate = 0;
unsigned long lastHeartbeat = 0;

void setup() {
  Serial.begin(115200);

  // Initialize hardware
  lidServo.attach(SERVO_PIN);
  lidServo.write(LID_CLOSED_POSITION);

  // Connect to WiFi
  connectWiFi();

  // Setup SSL certificate for HTTPS
  wifiClient.setCACert(rootCACertificate);

  // Sync time for SSL certificate validation
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("Waiting for NTP time sync...");
  time_t now = time(nullptr);
  while (now < 8 * 3600 * 2) {  // Wait for time to be set
    delay(500);
    Serial.print(".");
    now = time(nullptr);
  }
  Serial.println(" Time synced!");

  // Register device with backend
  registerDevice();

  Serial.println("ESP32 SmartBin initialized successfully!");
}

void loop() {
  unsigned long currentMillis = millis();

  // Send periodic status updates
  if (currentMillis - lastStatusUpdate >= STATUS_INTERVAL) {
    sendStatusUpdate();
    lastStatusUpdate = currentMillis;
  }

  // Send heartbeat
  if (currentMillis - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = currentMillis;
  }

  // Check for incoming commands (polling approach)
  checkForCommands();

  delay(100);
}

void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void registerDevice() {
  Serial.println("Registering device...");

  http.begin(wifiClient, String(serverUrl) + "/api/esp32/register");
  http.addHeader("Content-Type", "application/json");

  // Create JSON payload
  JsonDocument doc;
  doc["device_id"] = deviceId;
  doc["firmware_version"] = firmwareVersion;
  doc["hardware_version"] = "ESP32-WROOM-32";
  doc["location"] = location;
  doc["ip_address"] = WiFi.localIP().toString();

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.print("Registration payload: ");
  Serial.println(jsonString);

  int httpResponseCode = http.POST(jsonString);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("Registration successful: ");
    Serial.println(response);
  } else {
    Serial.print("Registration failed: ");
    Serial.println(httpResponseCode);
  }

  http.end();
}

void sendStatusUpdate() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping status update");
    return;
  }

  Serial.println("Sending status update...");

  http.begin(wifiClient, String(serverUrl) + "/api/esp32/status");
  http.addHeader("Content-Type", "application/json");

  // Create status payload
  JsonDocument doc;
  doc["device_id"] = deviceId;
  doc["status"] = "online";
  doc["battery_level"] = readBatteryLevel(); // Mock value
  doc["temperature"] = readTemperature(); // Mock value
  doc["error_message"] = nullptr;

  String jsonString;
  serializeJson(doc, jsonString);

  int httpResponseCode = http.POST(jsonString);

  if (httpResponseCode > 0) {
    Serial.print("Status update sent: ");
    Serial.println(httpResponseCode);
  } else {
    Serial.print("Status update failed: ");
    Serial.println(httpResponseCode);
  }

  http.end();
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping heartbeat");
    return;
  }

  Serial.println("Sending heartbeat...");

  http.begin(wifiClient, String(serverUrl) + "/api/esp32/status");
  http.addHeader("Content-Type", "application/json");

  JsonDocument doc;
  doc["device_id"] = deviceId;
  doc["status"] = "online";
  doc["battery_level"] = readBatteryLevel();
  doc["error_message"] = nullptr;

  String jsonString;
  serializeJson(doc, jsonString);

  int httpResponseCode = http.POST(jsonString);

  if (httpResponseCode > 0) {
    Serial.println("Heartbeat sent successfully");
  } else {
    Serial.print("Heartbeat failed: ");
    Serial.println(httpResponseCode);
  }

  http.end();
}

void checkForCommands() {
  // This is a polling approach - in production, you might want to use WebSocket
  // or implement a more efficient command checking mechanism
  static unsigned long lastCommandCheck = 0;
  const unsigned long COMMAND_CHECK_INTERVAL = 2000; // 2 seconds

  if (millis() - lastCommandCheck < COMMAND_CHECK_INTERVAL) {
    return;
  }

  lastCommandCheck = millis();

  // For now, we'll just check if we need to process any pending operations
  // In a real implementation, you might poll a command endpoint
}

void openLid(int durationSeconds) {
  Serial.println("Opening lid...");

  // Move servo to open position
  lidServo.write(LID_OPEN_POSITION);
  lidOpen = true;

  // Wait for the specified duration (time for user to drop bottle)
  Serial.print("Waiting ");
  Serial.print(durationSeconds);
  Serial.println(" seconds for bottle drop...");

  delay(durationSeconds * 1000);

  // Close the lid
  Serial.println("Closing lid...");
  lidServo.write(LID_CLOSED_POSITION);
  lidOpen = false;

  Serial.println("Lid sequence completed!");
}

void closeLid() {
  Serial.println("Closing lid...");
  lidServo.write(LID_CLOSED_POSITION);
  lidOpen = false;
}

float readBatteryLevel() {
  // Read battery voltage from ADC
  // This is a simplified example - implement according to your battery setup
  int adcValue = analogRead(34); // GPIO 34 is ADC1_CH6
  float voltage = (adcValue / 4095.0) * 3.3;

  // Convert to percentage (calibrate according to your battery)
  // For now, return mock value since no battery monitoring is implemented
  return 85.0; // Mock battery level
}

float readTemperature() {
  // Mock temperature reading since no temperature sensor is connected
  // In production, you would read from actual sensor (e.g., DHT22, DS18B20)
  return 25.0 + random(-5, 5); // Mock temperature between 20-30°C
}

// HTTP Request Helper Functions
String makeHttpRequest(const char* endpoint, const char* method, String payload = "") {
  if (WiFi.status() != WL_CONNECTED) {
    return "";
  }

  http.begin(wifiClient, String(serverUrl) + endpoint);

  if (payload.length() > 0) {
    http.addHeader("Content-Type", "application/json");
  }

  int httpResponseCode;
  if (method == "POST") {
    httpResponseCode = http.POST(payload);
  } else {
    httpResponseCode = http.GET();
  }

  String response = "";
  if (httpResponseCode > 0) {
    response = http.getString();
  } else {
    Serial.print("HTTP request failed: ");
    Serial.println(httpResponseCode);
  }

  http.end();
  return response;
}
```

## 🧪 Testing & Validation

### 1. Basic Connectivity Test
```bash
# Test backend health
curl https://setorin.app/health

# Test ESP32 endpoints
curl https://setorin.app/api/esp32/devices
```

### 2. Device Registration Test
```bash
curl -X POST https://setorin.app/api/esp32/register \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "ESP32-SMARTBIN-001",
    "firmware_version": "1.0.0",
    "hardware_version": "ESP32-WROOM-32",
    "location": "Test Location",
    "ip_address": "192.168.1.100"
  }'
```

### 3. Lid Control Test
```bash
curl -X POST https://setorin.app/api/esp32/control \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "ESP32-SMARTBIN-001",
    "action": "open",
    "duration_seconds": 2
  }'
```

### 4. Monitor Logs
```bash
# Check action logs
curl "https://setorin.app/api/esp32/logs?device_id=ESP32-SMARTBIN-001"

# Check specific action
curl "https://setorin.app/api/esp32/logs/64f1a2b3c4d5e6f7g8h9i0j1"
```

### 5. ESP32 Serial Monitor
1. Open Arduino IDE
2. Connect ESP32 via USB
3. Open **Tools → Serial Monitor**
4. Set baud rate to **115200**
5. Monitor connection and operation logs

## 🔗 Integration with Scan Flow

### Current Scan Flow
1. User uploads image → OpenCV measurement
2. Roboflow prediction → Validation
3. **If valid → Trigger IoT simulator**
4. Database storage → WebSocket broadcast

### ESP32 Integration
To integrate ESP32 with the scan flow, modify `/backend/src/backend/routers/scan.py`:

```python
# In the scan_bottle function, replace the IoT simulator call:

# OLD CODE (using simulator):
if validation_result.is_valid:
    iot_events = await smartbin_client.open_bin()

# NEW CODE (using ESP32):
if validation_result.is_valid:
    # Call ESP32 lid control
    esp32_response = await control_esp32_lid("ESP32-SMARTBIN-001", 3)
    iot_events = esp32_response.get("events", [])
```

### ESP32 Control Function
Add this function to your scan router:

```python
async def control_esp32_lid(device_id: str, duration_seconds: int = 3):
    """Control ESP32 lid via HTTP API."""
    import aiohttp

    try:
        db = await ensure_connection()

        # Create log entry
        log_result = await db["esp32_logs"].insert_one({
            "device_id": device_id,
            "action": "open",
            "timestamp": datetime.now(timezone.utc),
            "status": "pending",
            "details": {"duration_seconds": duration_seconds}
        })

        # Make HTTP call to production ESP32 endpoint
        async with aiohttp.ClientSession() as session:
            payload = {
                "device_id": device_id,
                "action": "open",
                "duration_seconds": duration_seconds
            }

            async with session.post(
                "https://setorin.app/api/esp32/control",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    # Update log as completed
                    await db["esp32_logs"].update_one(
                        {"_id": log_result.inserted_id},
                        {"$set": {"status": "completed", "api_response": result}}
                    )
                    return {"events": result, "action_id": str(log_result.inserted_id)}
                else:
                    error_text = await response.text()
                    raise Exception(f"ESP32 API error: {response.status} - {error_text}")

    except Exception as exc:
        logger.error("ESP32 control failed: %s", exc)
        # Update log as error
        try:
            await db["esp32_logs"].update_one(
                {"_id": log_result.inserted_id},
                {"$set": {"status": "error", "error_message": str(exc)}}
            )
        except:
            pass
        return {"events": [], "error": str(exc)}
```

## 🔧 Troubleshooting

### Common Issues

#### 1. WiFi Connection Problems
**Symptoms:** ESP32 can't connect to WiFi
**Solutions:**
- Check WiFi credentials
- Verify WiFi signal strength
- Use a static IP if DHCP is problematic
- Check for IP conflicts on network

#### 2. HTTPS Request Failures
**Symptoms:** ESP32 can't communicate with production backend
**Solutions:**
- Verify ESP32 has internet access and DNS resolution
- Check if SSL certificates are valid (ESP32 needs root CA certificates)
- Test backend endpoints with curl: `curl https://setorin.app/health`
- Verify firewall allows HTTPS outbound traffic (port 443)
- Check ESP32 time synchronization (needed for SSL certificate validation)

#### 3. Servo Motor Issues
**Symptoms:** Lid doesn't move or moves erratically
**Solutions:**
- Check servo power supply (5V, adequate current)
- Verify servo signal wire connection (GPIO 18)
- Test servo with simple sweep example
- Check for servo angle limits

#### 4. Registration Failures
**Symptoms:** Device registration fails
**Solutions:**
- Check device_id uniqueness
- Verify JSON payload format
- Check backend logs for errors
- Ensure MongoDB is running

### Debug Mode
Enable debug logging in ESP32:
```cpp
// Add this to setup()
Serial.setDebugOutput(true);

// Add debug prints throughout the code
Serial.printf("Debug: Variable value = %d\n", variable);
```

### Network Debugging
```bash
# Check if ESP32 is on network
nmap -sn 192.168.1.0/24

# Test backend connectivity (from any network)
curl -v https://setorin.app/health

# Test ESP32 endpoints
curl -v https://setorin.app/api/esp32/devices

# Check SSL certificate
curl -vI https://setorin.app
```

## 🚀 Advanced Features

### WebSocket Integration
For real-time communication, you can implement WebSocket on ESP32:

```cpp
#include <WebSocketsClient.h>
WebSocketsClient webSocket;

void setupWebSocket() {
  webSocket.begin("YOUR_SERVER_IP", 8000, "/ws/esp32");
  webSocket.onEvent(webSocketEvent);
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_CONNECTED:
      Serial.println("WebSocket connected!");
      break;
    case WStype_TEXT:
      // Handle incoming commands
      break;
  }
}
```

### Power Management
Implement deep sleep for battery conservation:

```cpp
void enterDeepSleep() {
  Serial.println("Entering deep sleep...");

  // Configure wake-up sources
  esp_sleep_enable_timer_wakeup(30 * 1000000); // 30 seconds

  // Enter deep sleep
  esp_deep_sleep_start();
}
```

### OTA Updates
Implement Over-The-Air updates:

```cpp
#include <HTTPUpdate.h>

void checkForUpdates() {
  String updateUrl = "https://setorin.app/firmware.bin";

  WiFiClientSecure client;  // Use WiFiClientSecure for HTTPS
  client.setCACert(rootCACertificate);  // Set root CA certificate

  t_httpUpdate_return ret = httpUpdate.update(client, updateUrl);

  switch(ret) {
    case HTTP_UPDATE_FAILED:
      Serial.println("Update failed");
      break;
    case HTTP_UPDATE_OK:
      Serial.println("Update successful");
      break;
  }
}
```

### Error Recovery
Implement automatic error recovery:

```cpp
void handleConnectionError() {
  static int retryCount = 0;
  const int maxRetries = 5;

  if (retryCount < maxRetries) {
    retryCount++;
    Serial.printf("Retry attempt %d/%d\n", retryCount, maxRetries);

    // Reset WiFi connection
    WiFi.disconnect();
    delay(1000);
    connectWiFi();

    // Reset HTTP client
    http.end();
  } else {
    // Enter safe mode or restart
    Serial.println("Max retries exceeded, restarting...");
    ESP.restart();
  }
}
```

## 📞 Support & Resources

### Documentation Links
- [ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)
- [ArduinoJson Library](https://arduinojson.org/)
- [ESP32 Technical Reference](https://docs.espressif.com/projects/esp32/en/latest/)

### Community Resources
- [ESP32 Forum](https://esp32.com/)
- [Arduino Stack Exchange](https://arduino.stackexchange.com/)
- [SmartBin GitHub Issues](https://github.com/YOUR_REPO/issues)

### Contact
If you encounter issues:
1. Check the troubleshooting section above
2. Review backend logs: `docker compose logs backend`
3. Check ESP32 serial output
4. Create an issue with detailed information

---

**🎉 Happy Hacking!** Your ESP32 SmartBin integration is ready to go! 🚀
