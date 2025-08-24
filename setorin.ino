#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <time.h>
#include <Preferences.h>

// ============================================================================
// CONFIGURATION - UPDATE THESE VALUES FOR YOUR SETUP
// ============================================================================

// WiFi Configuration
const char* ssid = "###";
const char* password = "1234nais";

// Server Configuration
const char* serverUrl = "https://api.setorin.app";

// Device Configuration
const char* deviceId = "ESP32-SMARTBIN-420";
const char* firmwareVersion = "2.1.0";
const char* location = "Main Entrance";

// Hardware Configuration
#define SERVO_PIN 18
#define SERVO_CLOSED_POSITION 38
#define SERVO_OPEN_POSITION 180
#define STATUS_LED_PIN 2  // Built-in LED on most ESP32 boards

// ============================================================================
// GLOBAL OBJECTS AND VARIABLES
// ============================================================================

WiFiClientSecure wifiClient;
HTTPClient http;
WebServer server(80);  // HTTP server on port 80 for receiving commands
Servo lidServo;  // Using Servo class from ESP32Servo library
Preferences preferences;

// Timing Constants
const unsigned long STATUS_INTERVAL = 30000;      // 30 seconds
const unsigned long HEARTBEAT_INTERVAL = 60000;   // 1 minute
const unsigned long RECONNECT_INTERVAL = 30000;   // 30 seconds


// State Variables
bool lidOpen = false;
bool isInitialized = false;
bool isRegistered = false;
unsigned long lastStatusUpdate = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastReconnectAttempt = 0;
int connectionRetries = 0;
const int MAX_RETRIES = 5;

// Debug Configuration
bool debugMode = true;  // Set to false to reduce serial output
bool verboseAPI = true; // Set to false to reduce API debug logs

// ============================================================================
// ROOT CA CERTIFICATE FOR HTTPS
// ============================================================================
// This is Let's Encrypt root CA certificate - commonly used for HTTPS sites
const char* rootCACertificate = \
"-----BEGIN CERTIFICATE-----\n" \
"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\n" \
"-----END CERTIFICATE-----\n";

// ============================================================================
// SETUP FUNCTION
// ============================================================================

void setup() {
  // Initialize serial communication
  Serial.begin(115200);
  delay(1000); // Give serial time to initialize
  
  Serial.println("\n\n");
  Serial.println("==========================================");
  Serial.println("    ESP32 SmartBin v2.1 - REAL WORKING");
  Serial.println("==========================================");
  
  // Print system configuration for debugging
  printSystemConfiguration();
  
  // Initialize preferences storage
  preferences.begin("smartbin", false);
  debugLog("Preferences storage initialized");
  
  // Initialize hardware
  initializeHardware();
  
  // Connect to WiFi
  connectWiFi();
  
  // Setup SSL and time synchronization
  setupSSLAndTime();
  
  // Setup HTTP server for receiving commands
  setupHTTPServer();
  
  // Register device with backend
  registerDevice();
  
  // Initialize timers
  lastStatusUpdate = millis();
  lastHeartbeat = millis();
  
  Serial.println("✅ ESP32 SmartBin initialized successfully!");
  Serial.println("🚀 Device is now operational with HYBRID communication!");
  Serial.println("📡 DIRECT HTTP: Backend can send commands to ESP32 HTTP server");
  Serial.println("🔍 POLLING: ESP32 checks for queued commands every 5 seconds");
  Serial.println("🌐 CROSS-NETWORK: Works across any network topology");
  Serial.println("🎯 Ready to receive commands from SmartBin app");
  Serial.println("🐛 Type 'debug' for debug commands or 'help' for all commands");
  Serial.println("==========================================");
  
  isInitialized = true;
  
  // Blink LED to indicate successful initialization
  blinkStatusLED(3, 200);
}

// ============================================================================
// MAIN LOOP - HANDLES HTTP SERVER REQUESTS
// ============================================================================

void loop() {
  if (!isInitialized) {
    Serial.println("❌ Device not initialized, restarting...");
    ESP.restart();
    return;
  }

  unsigned long currentMillis = millis();

  // Check WiFi connection and reconnect if necessary
  if (WiFi.status() != WL_CONNECTED) {
    handleWiFiDisconnection();
    return;
  }

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

  // Handle HTTP server requests
  server.handleClient();

  // Poll for remote commands from backend (cross-network communication)
  pollForRemoteCommands();

  // Handle serial commands (for manual testing)
  handleSerialCommands();

  // Small delay to prevent watchdog issues
  delay(100);
}

// ============================================================================
// HARDWARE INITIALIZATION
// ============================================================================

void initializeHardware() {
  Serial.println("🔧 Initializing hardware...");
  
  // Initialize status LED
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);
  
  // Initialize servo
  lidServo.attach(SERVO_PIN);
  lidServo.write(SERVO_CLOSED_POSITION);
  delay(1000); // Give servo time to reach position
  
  Serial.println("✅ Servo initialized and positioned to closed");
  Serial.println("✅ Status LED initialized");
}

// ============================================================================
// WIFI CONNECTION MANAGEMENT
// ============================================================================

void connectWiFi() {
  Serial.println("📶 Starting WiFi connection process...");
  debugLog("WiFi Configuration:");
  debugLog("  SSID: " + String(ssid));
  debugLog("  Password: " + String(password).substring(0, 3) + "***");
  debugLog("  WiFi Mode: STA (Station)");
  
  // Print WiFi status before connection
  Serial.printf("🔍 Initial WiFi Status: %d\n", WiFi.status());
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  debugLog("WiFi.begin() called");

  int attempts = 0;
  const int maxAttempts = 20;
  
  while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
    delay(500);
    Serial.print(".");
    attempts++;
    
    // Debug every 5 attempts
    if (attempts % 5 == 0) {
      Serial.printf("\n🔍 Attempt %d/%d - Status: %d\n", attempts, maxAttempts, WiFi.status());
    }
    
    // Blink LED during connection attempt
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected successfully!");
    Serial.print("📱 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("📱 Gateway: ");
    Serial.println(WiFi.gatewayIP());
    Serial.print("📱 Subnet: ");
    Serial.println(WiFi.subnetMask());
    Serial.print("📱 DNS: ");
    Serial.println(WiFi.dnsIP());
    Serial.print("📶 Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    Serial.print("📡 MAC Address: ");
    Serial.println(WiFi.macAddress());
    
    // Turn off LED after successful connection
    digitalWrite(STATUS_LED_PIN, LOW);
    
    // Reset retry counter
    connectionRetries = 0;
    
    debugLog("WiFi connection established successfully");
  } else {
    Serial.println("\n❌ WiFi connection failed!");
    Serial.printf("❌ Final WiFi Status: %d\n", WiFi.status());
    Serial.printf("❌ Attempts made: %d/%d\n", attempts, maxAttempts);
    Serial.println("🔄 Restarting in 5 seconds...");
    delay(5000);
    ESP.restart();
  }
}

void handleWiFiDisconnection() {
  unsigned long currentMillis = millis();
  
  if (currentMillis - lastReconnectAttempt >= RECONNECT_INTERVAL) {
    Serial.println("❌ WiFi connection lost, attempting to reconnect...");
    
    if (connectionRetries < MAX_RETRIES) {
      connectionRetries++;
      Serial.printf("🔄 Reconnection attempt %d/%d\n", connectionRetries, MAX_RETRIES);
      
      WiFi.disconnect();
      delay(1000);
      WiFi.begin(ssid, password);
      
      lastReconnectAttempt = currentMillis;
    } else {
      Serial.println("❌ Max reconnection attempts reached, restarting...");
      ESP.restart();
    }
  }
  
  // Blink LED rapidly to indicate connection issues
  digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
  delay(100);
}

// ============================================================================
// SSL AND TIME SETUP
// ============================================================================

void setupSSLAndTime() {
  Serial.println("🔐 Setting up SSL and time synchronization...");
  
  // Set root CA certificate
  wifiClient.setCACert(rootCACertificate);
  
  // Configure time
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  
  Serial.print("⏰ Waiting for NTP time sync...");
  time_t now = time(nullptr);
  int timeAttempts = 0;
  const int maxTimeAttempts = 30;
  
  while (now < 8 * 3600 * 2 && timeAttempts < maxTimeAttempts) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
    timeAttempts++;
  }
  
  if (now > 8 * 3600 * 2) {
    Serial.println(" ✅ Time synchronized!");
    
    // Display current time
    struct tm timeinfo;
    gmtime_r(&now, &timeinfo);
    Serial.printf("🕐 Current UTC time: %04d-%02d-%02d %02d:%02d:%02d\n",
                  timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday,
                  timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
  } else {
    Serial.println(" ⚠️ Time sync failed, continuing anyway...");
    Serial.println("⚠️ SSL certificate validation may fail!");
  }
}

// ============================================================================
// DEVICE REGISTRATION
// ============================================================================

void registerDevice() {
  Serial.println("📝 Registering device with backend...");

  String endpoint = String(serverUrl) + "/api/esp32/register";
  debugLog("API Endpoint: " + endpoint);
  
  // Test DNS resolution first
  if (!testDNSResolution()) {
    Serial.println("❌ DNS resolution failed, cannot register");
    return;
  }
  
  http.begin(wifiClient, endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "ESP32-SmartBin/2.1.0");
  http.setTimeout(15000); // 15 second timeout for registration
  
  debugLog("HTTP client configured for registration");
  debugLog("  Timeout: 15000ms");
  debugLog("  SSL: Enabled with root CA");

  // Create registration payload
  DynamicJsonDocument doc(1024);
  doc["device_id"] = deviceId;
  doc["firmware_version"] = firmwareVersion;
  doc["hardware_version"] = "ESP32-WROOM-32";
  doc["location"] = location;
  doc["ip_address"] = WiFi.localIP().toString();

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.print("📤 Registration payload: ");
  Serial.println(jsonString);
  debugLog("Payload size: " + String(jsonString.length()) + " bytes");

  Serial.println("🌐 Sending POST request to backend...");
  unsigned long requestStart = millis();
  
  int httpResponseCode = http.POST(jsonString);
  
  unsigned long requestDuration = millis() - requestStart;
  Serial.printf("⏱️ Request completed in %lu ms\n", requestDuration);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("✅ Registration HTTP %d: ", httpResponseCode);
    Serial.println(response);
    debugLog("Response length: " + String(response.length()) + " bytes");
    
    // Parse response to check if registration was accepted
    DynamicJsonDocument responseDoc(1024);
    DeserializationError error = deserializeJson(responseDoc, response);
    
    if (!error) {
      if (responseDoc.containsKey("device_id")) {
        isRegistered = true;
        Serial.println("✅ Device successfully registered with backend");
        debugLog("Registration confirmed by backend");
        
        // Store registration timestamp
        preferences.putULong("registered_at", time(nullptr));
        debugLog("Registration timestamp stored in preferences");
      } else {
        Serial.println("⚠️ Registration response missing device_id field");
        debugLog("Response JSON: " + response);
      }
    } else {
      Serial.print("❌ Failed to parse registration response: ");
      Serial.println(error.c_str());
      debugLog("Raw response: " + response);
    }
  } else {
    Serial.printf("❌ Registration failed with HTTP code: %d\n", httpResponseCode);
    String errorMsg = http.errorToString(httpResponseCode);
    Serial.println("❌ Error description: " + errorMsg);
    debugLog("HTTP error details: " + errorMsg);
    
    // Additional error diagnostics
    if (httpResponseCode == -1) {
      Serial.println("🔍 HTTP_ERROR_CONNECTION_REFUSED - Check server URL and network");
    } else if (httpResponseCode == -3) {
      Serial.println("🔍 HTTP_ERROR_CONNECTION_LOST - Network instability");
    } else if (httpResponseCode == -11) {
      Serial.println("🔍 HTTP_ERROR_READ_TIMEOUT - Server response timeout");
    }
    
    Serial.println("🔄 Will retry on next status update...");
  }

  http.end();
  debugLog("HTTP client connection closed");
}

// ============================================================================
// STATUS UPDATES AND HEARTBEAT
// ============================================================================

void sendStatusUpdate() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected, skipping status update");
    debugLog("WiFi Status: " + String(WiFi.status()));
    return;
  }

  Serial.println("📊 Sending status update...");
  debugLog("Status update initiated at " + getCurrentTimestamp());

  String endpoint = String(serverUrl) + "/api/esp32/status";
  debugLog("Status endpoint: " + endpoint);
  
  http.begin(wifiClient, endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "ESP32-SmartBin/2.1.0");
  http.setTimeout(10000);
  
  if (verboseAPI) {
    Serial.println("🔗 HTTP client configured for status update");
    Serial.println("  📡 SSL: Enabled");
    Serial.println("  ⏱️ Timeout: 10000ms");
    Serial.printf("  🔗 Free heap before request: %d bytes\n", ESP.getFreeHeap());
  }

  // Create status payload - EXACTLY matching ESP32Status model in backend
  DynamicJsonDocument doc(1024);
  doc["device_id"] = deviceId;
  doc["status"] = "online";
  doc["last_seen"] = getCurrentTimestamp();
  doc["battery_level"] = readBatteryLevel();
  doc["temperature"] = readTemperature();
  doc["error_message"] = nullptr;

  String jsonString;
  serializeJson(doc, jsonString);

  if (verboseAPI) {
    Serial.print("📤 Status payload: ");
    Serial.println(jsonString);
    debugLog("Payload size: " + String(jsonString.length()) + " bytes");
  }

  Serial.println("🌐 Sending status POST request...");
  unsigned long requestStart = millis();
  
  int httpResponseCode = http.POST(jsonString);
  
  unsigned long requestDuration = millis() - requestStart;

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("✅ Status update HTTP %d (took %lu ms)\n", httpResponseCode, requestDuration);
    
    if (verboseAPI && response.length() > 0) {
      Serial.println("📥 Response: " + response);
    }
    
    // Blink LED to indicate successful communication
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(50);
    digitalWrite(STATUS_LED_PIN, LOW);
    
    debugLog("Status update successful");
  } else {
    Serial.printf("❌ Status update failed: HTTP %d (took %lu ms)\n", httpResponseCode, requestDuration);
    String errorMsg = http.errorToString(httpResponseCode);
    Serial.println("❌ Error: " + errorMsg);
    debugLog("HTTP error details: " + errorMsg);
    
    // Detailed error analysis
    analyzeHTTPError(httpResponseCode, "status update");
  }

  http.end();
  debugLog("Status update HTTP connection closed");
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected, skipping heartbeat");
    return;
  }

  Serial.println("💓 Sending heartbeat...");

  String endpoint = String(serverUrl) + "/api/esp32/status";
  
  http.begin(wifiClient, endpoint);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  DynamicJsonDocument doc(1024);
  doc["device_id"] = deviceId;
  doc["status"] = "online";
  doc["last_seen"] = getCurrentTimestamp();
  doc["battery_level"] = readBatteryLevel();
  doc["temperature"] = readTemperature();
  doc["error_message"] = nullptr;

  String jsonString;
  serializeJson(doc, jsonString);

  int httpResponseCode = http.POST(jsonString);

  if (httpResponseCode > 0) {
    Serial.println("✅ Heartbeat sent successfully");
  } else {
    Serial.print("❌ Heartbeat failed: ");
    Serial.println(httpResponseCode);
  }

  http.end();
}

// ============================================================================
// SERVO CONTROL FUNCTIONS
// ============================================================================

void openLid(int durationSeconds) {
  if (lidOpen) {
    Serial.println("⚠️ Lid is already open, ignoring command");
    return;
  }
  
  Serial.print("🚪 Opening lid for ");
  Serial.print(durationSeconds);
  Serial.println(" seconds...");

  // Move servo to open position
  lidServo.write(SERVO_OPEN_POSITION);
  lidOpen = true;
  Serial.println("✅ Lid opened");

  // Blink LED to indicate lid is open
  for (int i = 0; i < 3; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(200);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(200);
  }

  // Wait for the specified duration
  Serial.println("⏳ Waiting for bottle drop...");
  delay(durationSeconds * 1000);

  // Close the lid
  Serial.println("🔒 Closing lid...");
  lidServo.write(SERVO_CLOSED_POSITION);
  lidOpen = false;
  Serial.println("✅ Lid closed");

  Serial.println("🎉 Lid sequence completed!");
  
  // Report completion to backend
  reportLidOperation("open", durationSeconds, "completed");
}

void closeLid() {
  if (!lidOpen) {
    Serial.println("⚠️ Lid is already closed, ignoring command");
    return;
  }
  
  Serial.println("🔒 Closing lid...");
  lidServo.write(SERVO_CLOSED_POSITION);
  lidOpen = false;
  Serial.println("✅ Lid closed");
  
  // Report completion to backend
  reportLidOperation("close", 0, "completed");
}

void reportLidOperation(const char* action, int duration, const char* status) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected, cannot report operation");
    return;
  }

  Serial.println("📤 Reporting lid operation to backend...");

  // NOTE: The backend esp32.py doesn't have a /logs POST endpoint
  // The backend handles logging internally when you call /control
  // So this function is for future use or local logging only
  
  Serial.printf("📝 Local log: %s action %s after %ds\n", action, status, duration);
}

// ============================================================================
// SENSOR READING FUNCTIONS
// ============================================================================

float readBatteryLevel() {
  // Mock battery level - replace with actual battery monitoring circuit
  // For now, return a simulated value between 80-95%
  static int mockBattery = 85;
  mockBattery += random(-2, 3);
  mockBattery = constrain(mockBattery, 80, 95);
  return (float)mockBattery;
}

float readTemperature() {
  // Mock temperature reading - replace with actual sensor (DHT22, DS18B20)
  // Returns temperature between 20-30°C with small random variation
  static float baseTemp = 25.0;
  baseTemp += random(-10, 10) / 10.0;
  baseTemp = constrain(baseTemp, 20.0, 30.0);
  return baseTemp;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

String getCurrentTimestamp() {
  // Get current UTC time as ISO 8601 string
  time_t now = time(nullptr);
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  
  char timestamp[25];
  strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(timestamp);
}

void blinkStatusLED(int count, int delayMs) {
  for (int i = 0; i < count; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(delayMs);
  }
}

// ============================================================================
// REMOTE COMMAND POLLING (for cross-network communication)
// ============================================================================

void pollForRemoteCommands() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  static unsigned long lastPoll = 0;
  const unsigned long POLL_INTERVAL = 5000; // Poll every 5 seconds

  if (millis() - lastPoll >= POLL_INTERVAL) {
    lastPoll = millis();

    HTTPClient http;
    String url = String(serverUrl) + "/api/esp32/commands/" + String(deviceId);

    Serial.println("🔍 Polling for remote commands from: " + url);

    http.begin(wifiClient, url);
    http.addHeader("Content-Type", "application/json");

    int httpResponseCode = http.GET();

    if (httpResponseCode == 200) {
      String response = http.getString();
      Serial.println("📥 Command poll response: " + response);

      DynamicJsonDocument doc(1024);
      DeserializationError error = deserializeJson(doc, response);

      if (!error) {
        // Process commands
        JsonArray commands = doc.as<JsonArray>();
        for (JsonObject command : commands) {
          String action = command["action"];
          int duration = command["duration_seconds"] | 3;
          String commandId = command["id"];

          Serial.printf("🎯 Received remote command: %s (duration: %ds, ID: %s)\n",
                       action.c_str(), duration, commandId.c_str());

          if (action == "open") {
            Serial.println("🚪 Executing remote open command");
            openLid(duration);

            // Mark command as complete
            String completeUrl = String(serverUrl) + "/api/esp32/commands/" + commandId + "/complete";
            Serial.println("✅ Marking command complete: " + completeUrl);

            http.begin(wifiClient, completeUrl);
            http.PUT("");
            http.end();

          } else if (action == "close") {
            Serial.println("🔒 Executing remote close command");
            closeLid();

            // Mark command as complete
            String completeUrl = String(serverUrl) + "/api/esp32/commands/" + commandId + "/complete";
            Serial.println("✅ Marking command complete: " + completeUrl);

            http.begin(wifiClient, completeUrl);
            http.PUT("");
            http.end();
          }
        }
      } else {
        Serial.println("❌ Failed to parse command response: " + String(error.c_str()));
      }
    } else {
      Serial.printf("❌ Command poll failed with HTTP %d\n", httpResponseCode);
    }

    http.end();
  }
}

// ============================================================================
// MANUAL COMMAND INTERFACE (for testing)
// ============================================================================

void handleSerialCommands() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "open") {
      Serial.println("🚪 Manual lid open command received");
      openLid(3);
    } else if (command == "close") {
      Serial.println("🔒 Manual lid close command received");
      closeLid();
    } else if (command == "status") {
      Serial.println("📊 Manual status request");
      sendStatusUpdate();
    } else if (command == "info") {
      printSystemInfo();
    } else if (command == "register") {
      Serial.println("📝 Manual registration command");
      registerDevice();
    } else if (command == "restart") {
      Serial.println("🔄 Manual restart command");
      ESP.restart();
    } else if (command == "server") {
      Serial.println("🌐 Testing HTTP server endpoints");
      Serial.printf("  Health: http://%s/health\n", WiFi.localIP().toString().c_str());
      Serial.printf("  Control: http://%s/control\n", WiFi.localIP().toString().c_str());
    } else if (command == "poll") {
      Serial.println("🔍 Manually triggering command poll");
      pollForRemoteCommands();
    } else if (command == "debug") {
      Serial.println("🐛 Debug commands:");
      Serial.println("  debug on     - Enable debug mode");
      Serial.println("  debug off    - Disable debug mode");
      Serial.println("  debug api    - Toggle API verbose logging");
      Serial.println("  debug wifi   - Show WiFi diagnostics");
      Serial.println("  debug dns    - Test DNS resolution");
      Serial.println("  debug ssl    - Test SSL connection");
      Serial.println("  debug heap   - Show memory usage");
      Serial.println("  debug config - Show full configuration");
    } else if (command.startsWith("debug ")) {
      handleDebugCommands(command.substring(6));
    } else if (command == "help") {
      Serial.println("📖 Available commands:");
      Serial.println("  open     - Open lid for 3 seconds");
      Serial.println("  close    - Close lid immediately");
      Serial.println("  status   - Send status update");
      Serial.println("  server   - Show HTTP server endpoints");
      Serial.println("  poll     - Manually poll for remote commands");
      Serial.println("  info     - Print system information");
      Serial.println("  register - Re-register device");
      Serial.println("  restart  - Restart ESP32");
      Serial.println("  debug    - Show debug commands");
      Serial.println("  help     - Show this help");
    } else if (command.length() > 0) {
      Serial.printf("❌ Unknown command: %s\n", command.c_str());
      Serial.println("Type 'help' for available commands");
    }
  }
}

void printSystemInfo() {
  Serial.println("\n📊 System Information:");
  Serial.printf("Device ID: %s\n", deviceId);
  Serial.printf("Firmware Version: %s\n", firmwareVersion);
  Serial.printf("Location: %s\n", location);
  Serial.printf("Registered: %s\n", isRegistered ? "Yes" : "No");
  Serial.printf("Lid Status: %s\n", lidOpen ? "Open" : "Closed");
  Serial.printf("Free Heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("Chip ID: %06X\n", (uint32_t)ESP.getEfuseMac());
  Serial.printf("CPU Frequency: %d MHz\n", ESP.getCpuFreqMHz());
  Serial.printf("Flash Size: %d MB\n", ESP.getFlashChipSize() / 1024 / 1024);
  Serial.printf("WiFi RSSI: %d dBm\n", WiFi.RSSI());
  Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("Uptime: %lu seconds\n", millis() / 1000);
  Serial.printf("Battery Level: %.1f%%\n", readBatteryLevel());
  Serial.printf("Temperature: %.1f°C\n", readTemperature());
  Serial.println();
}

// ============================================================================
// HTTP SERVER SETUP FOR RECEIVING COMMANDS
// ============================================================================

void setupHTTPServer() {
  Serial.println("🌐 Setting up HTTP server for command reception...");
  
  // Handle lid control commands from backend
  server.on("/control", HTTP_POST, handleControlRequest);
  
  // Health check endpoint
  server.on("/health", HTTP_GET, []() {
    DynamicJsonDocument response(512);
    response["status"] = "online";
    response["device_id"] = deviceId;
    response["timestamp"] = getCurrentTimestamp();
    response["lid_status"] = lidOpen ? "open" : "closed";
    
    String jsonString;
    serializeJson(response, jsonString);
    
    server.send(200, "application/json", jsonString);
    debugLog("Health check requested");
  });
  
  // Handle CORS preflight
  server.on("/control", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(200, "text/plain", "OK");
  });
  
  server.begin();
  Serial.printf("✅ HTTP server started on http://%s:80\n", WiFi.localIP().toString().c_str());
  Serial.println("📡 Ready to receive direct commands from backend");
  debugLog("HTTP server endpoints configured: /control, /health");
}

void handleControlRequest() {
  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "Method Not Allowed");
    return;
  }

  String requestBody = server.arg("plain");
  Serial.println("🎯 DIRECT SERVER COMMAND RECEIVED!");
  Serial.println("📥 Request: " + requestBody);
  
  debugLog("Processing direct server command: " + requestBody);

  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, requestBody);

  if (error) {
    Serial.print("❌ Failed to parse command JSON: ");
    Serial.println(error.c_str());
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }

  String action = doc["action"];
  int durationSeconds = doc["duration_seconds"] | 3;

  Serial.printf("🔧 Executing direct command: %s (duration: %ds)\n", action.c_str(), durationSeconds);

  if (action == "open") {
    if (lidOpen) {
      Serial.println("⚠️ Lid is already open");
      server.send(400, "application/json", "{\"error\":\"Lid already open\"}");
      return;
    }
    
    Serial.printf("🚪 [DIRECT] Opening lid for %d seconds...\n", durationSeconds);
    
    // Execute lid opening sequence
    lidServo.write(SERVO_OPEN_POSITION);
    lidOpen = true;
    Serial.println("✅ [DIRECT] Lid opened");

    // Blink LED rapidly to indicate direct server command
    for (int i = 0; i < 8; i++) {
      digitalWrite(STATUS_LED_PIN, HIGH);
      delay(50);
      digitalWrite(STATUS_LED_PIN, LOW);
      delay(50);
    }

    // Send immediate response
    server.send(200, "application/json", "{\"status\":\"lid_opened\",\"message\":\"Lid opened successfully\"}");
    
    // Wait for duration in background
    Serial.printf("⏳ [DIRECT] Waiting %d seconds for bottle drop...\n", durationSeconds);
    delay(durationSeconds * 1000);

    // Close lid
    Serial.println("🔒 [DIRECT] Closing lid...");
    lidServo.write(SERVO_CLOSED_POSITION);
    lidOpen = false;
    Serial.println("✅ [DIRECT] Lid closed");
    Serial.println("🎉 [DIRECT] Lid sequence completed!");

  } else if (action == "close") {
    if (!lidOpen) {
      Serial.println("⚠️ Lid is already closed");
      server.send(200, "application/json", "{\"status\":\"already_closed\",\"message\":\"Lid already closed\"}");
      return;
    }
    
    Serial.println("🔒 [DIRECT] Closing lid...");
    lidServo.write(SERVO_CLOSED_POSITION);
    lidOpen = false;
    Serial.println("✅ [DIRECT] Lid closed");
    
    server.send(200, "application/json", "{\"status\":\"lid_closed\",\"message\":\"Lid closed successfully\"}");

  } else {
    Serial.printf("❌ Unknown action: %s\n", action.c_str());
    server.send(400, "application/json", "{\"error\":\"Unknown action\"}");
  }
}

// ============================================================================
// DEBUG AND DIAGNOSTIC FUNCTIONS
// ============================================================================

void debugLog(String message) {
  if (debugMode) {
    Serial.println("🐛 DEBUG: " + message);
  }
}

void printSystemConfiguration() {
  Serial.println("🔧 ESP32 System Configuration:");
  Serial.printf("  📟 Board: DOIT ESP32 DEVKIT V1\n");
  Serial.printf("  💾 Chip Model: %s\n", ESP.getChipModel());
  Serial.printf("  🔢 Chip Revision: %d\n", ESP.getChipRevision());
  Serial.printf("  💾 Flash Size: %d MB\n", ESP.getFlashChipSize() / 1024 / 1024);
  Serial.printf("  🔄 CPU Frequency: %d MHz\n", ESP.getCpuFreqMHz());
  Serial.printf("  🆔 MAC Address: %s\n", WiFi.macAddress().c_str());
  Serial.printf("  📡 WiFi Mode: %d\n", WiFi.getMode());
  Serial.println();
  
  Serial.println("⚙️ SmartBin Configuration:");
  Serial.printf("  🆔 Device ID: %s\n", deviceId);
  Serial.printf("  📍 Location: %s\n", location);
  Serial.printf("  🔗 Server URL: %s\n", serverUrl);
  Serial.printf("  🔧 Servo Pin: %d\n", SERVO_PIN);
  Serial.printf("  💡 LED Pin: %d\n", STATUS_LED_PIN);
  Serial.printf("  📊 Status Interval: %lu ms\n", STATUS_INTERVAL);
  Serial.printf("  💓 Heartbeat Interval: %lu ms\n", HEARTBEAT_INTERVAL);
  Serial.println();
}

void handleDebugCommands(String debugCmd) {
  debugCmd.trim();
  
  if (debugCmd == "on") {
    debugMode = true;
    Serial.println("🐛 Debug mode enabled");
  } else if (debugCmd == "off") {
    debugMode = false;
    Serial.println("🐛 Debug mode disabled");
  } else if (debugCmd == "api") {
    verboseAPI = !verboseAPI;
    Serial.printf("🐛 API verbose logging: %s\n", verboseAPI ? "enabled" : "disabled");
  } else if (debugCmd == "wifi") {
    printWiFiDiagnostics();
  } else if (debugCmd == "dns") {
    testDNSResolution();
  } else if (debugCmd == "ssl") {
    testSSLConnection();
  } else if (debugCmd == "heap") {
    printMemoryUsage();
  } else if (debugCmd == "config") {
    printFullConfiguration();
  } else {
    Serial.println("❌ Unknown debug command. Type 'debug' for available options.");
  }
}

void printWiFiDiagnostics() {
  Serial.println("📶 WiFi Diagnostics:");
  Serial.printf("  Status: %d (%s)\n", WiFi.status(), getWiFiStatusString(WiFi.status()).c_str());
  Serial.printf("  SSID: %s\n", WiFi.SSID().c_str());
  Serial.printf("  BSSID: %s\n", WiFi.BSSIDstr().c_str());
  Serial.printf("  Channel: %d\n", WiFi.channel());
  Serial.printf("  RSSI: %d dBm\n", WiFi.RSSI());
  Serial.printf("  Local IP: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("  Gateway: %s\n", WiFi.gatewayIP().toString().c_str());
  Serial.printf("  Subnet: %s\n", WiFi.subnetMask().toString().c_str());
  Serial.printf("  DNS 1: %s\n", WiFi.dnsIP().toString().c_str());
  Serial.printf("  DNS 2: %s\n", WiFi.dnsIP(1).toString().c_str());
  Serial.printf("  Hostname: %s\n", WiFi.getHostname());
  Serial.printf("  Auto Reconnect: %s\n", WiFi.getAutoReconnect() ? "enabled" : "disabled");
  Serial.println();
}

String getWiFiStatusString(int status) {
  switch (status) {
    case WL_IDLE_STATUS: return "WL_IDLE_STATUS";
    case WL_NO_SSID_AVAIL: return "WL_NO_SSID_AVAIL";
    case WL_SCAN_COMPLETED: return "WL_SCAN_COMPLETED";
    case WL_CONNECTED: return "WL_CONNECTED";
    case WL_CONNECT_FAILED: return "WL_CONNECT_FAILED";
    case WL_CONNECTION_LOST: return "WL_CONNECTION_LOST";
    case WL_DISCONNECTED: return "WL_DISCONNECTED";
    default: return "UNKNOWN";
  }
}

bool testDNSResolution() {
  Serial.println("🔍 Testing DNS resolution for api.setorin.app...");
  
  IPAddress serverIP;
  bool dnsSuccess = WiFi.hostByName("api.setorin.app", serverIP);
  
  if (dnsSuccess) {
    Serial.printf("✅ DNS resolved: api.setorin.app → %s\n", serverIP.toString().c_str());
    debugLog("DNS resolution successful");
    return true;
  } else {
    Serial.println("❌ DNS resolution failed for api.setorin.app");
    debugLog("DNS resolution failed - check internet connectivity");
    
    // Try alternative DNS servers
    Serial.println("🔍 Testing alternative DNS servers...");
    Serial.printf("  Current DNS 1: %s\n", WiFi.dnsIP().toString().c_str());
    Serial.printf("  Current DNS 2: %s\n", WiFi.dnsIP(1).toString().c_str());
    
    return false;
  }
}

void testSSLConnection() {
  Serial.println("🔐 Testing SSL connection to api.setorin.app...");
  
  WiFiClientSecure testClient;
  testClient.setCACert(rootCACertificate);
  
  if (testClient.connect("api.setorin.app", 443)) {
    Serial.println("✅ SSL connection successful");
    Serial.println("🔐 Certificate verification passed");
    testClient.stop();
    debugLog("SSL test connection successful");
  } else {
    Serial.println("❌ SSL connection failed");
    Serial.println("🔍 Possible issues:");
    Serial.println("  - Invalid root CA certificate");
    Serial.println("  - Time not synchronized (required for SSL)");
    Serial.println("  - Firewall blocking HTTPS (port 443)");
    Serial.println("  - Server unreachable");
    debugLog("SSL test connection failed");
  }
}

void printMemoryUsage() {
  Serial.println("💾 Memory Usage:");
  Serial.printf("  Free Heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("  Largest Free Block: %d bytes\n", ESP.getMaxAllocHeap());
  Serial.printf("  Min Free Heap: %d bytes\n", ESP.getMinFreeHeap());
  Serial.printf("  Heap Size: %d bytes\n", ESP.getHeapSize());
  Serial.printf("  Free PSRAM: %d bytes\n", ESP.getFreePsram());
  Serial.printf("  PSRAM Size: %d bytes\n", ESP.getPsramSize());
  Serial.println();
}

void printFullConfiguration() {
  Serial.println("🔧 Complete ESP32 Configuration:");
  Serial.println("==========================================");
  
  // Hardware info
  Serial.println("🖥️ Hardware:");
  Serial.printf("  Chip: %s Rev %d\n", ESP.getChipModel(), ESP.getChipRevision());
  Serial.printf("  Cores: %d\n", ESP.getChipCores());
  Serial.printf("  Flash: %d MB @ %d MHz\n", ESP.getFlashChipSize() / 1024 / 1024, ESP.getFlashChipSpeed() / 1000000);
  Serial.printf("  PSRAM: %d bytes\n", ESP.getPsramSize());
  
  // Software info
  Serial.println("\n💻 Software:");
  Serial.printf("  Arduino Core: %s\n", ESP.getSdkVersion());
  Serial.printf("  Sketch Size: %d bytes\n", ESP.getSketchSize());
  Serial.printf("  Free Sketch Space: %d bytes\n", ESP.getFreeSketchSpace());
  
  // Network info
  Serial.println("\n📡 Network:");
  Serial.printf("  WiFi Status: %s\n", getWiFiStatusString(WiFi.status()).c_str());
  Serial.printf("  IP: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("  Gateway: %s\n", WiFi.gatewayIP().toString().c_str());
  Serial.printf("  DNS: %s\n", WiFi.dnsIP().toString().c_str());
  Serial.printf("  MAC: %s\n", WiFi.macAddress().c_str());
  
  // SmartBin config
  Serial.println("\n🗂️ SmartBin:");
  Serial.printf("  Device ID: %s\n", deviceId);
  Serial.printf("  Server: %s\n", serverUrl);
  Serial.printf("  Registered: %s\n", isRegistered ? "Yes" : "No");
  Serial.printf("  Debug Mode: %s\n", debugMode ? "On" : "Off");
  Serial.printf("  API Verbose: %s\n", verboseAPI ? "On" : "Off");
  
  Serial.println("==========================================");
}

void analyzeHTTPError(int errorCode, String operation) {
  Serial.printf("🔍 Analyzing HTTP error %d for %s:\n", errorCode, operation.c_str());
  
  switch (errorCode) {
    case -1:
      Serial.println("  🚫 CONNECTION_REFUSED - Server rejected connection");
      Serial.println("     → Check if backend is running");
      Serial.println("     → Verify server URL is correct");
      Serial.println("     → Check firewall settings");
      break;
    case -2:
      Serial.println("  🌐 SEND_HEADER_FAILED - Failed to send HTTP headers");
      Serial.println("     → Network connectivity issue");
      Serial.println("     → Check WiFi stability");
      break;
    case -3:
      Serial.println("  📡 SEND_PAYLOAD_FAILED - Failed to send request body");
      Serial.println("     → Network dropped during transmission");
      Serial.println("     → Payload might be too large");
      break;
    case -4:
      Serial.println("  🔄 NOT_CONNECTED - HTTP client not connected");
      Serial.println("     → Call http.begin() before making request");
      break;
    case -5:
      Serial.println("  🔗 CONNECTION_LOST - Connection lost during request");
      Serial.println("     → Network instability");
      Serial.println("     → Server closed connection");
      break;
    case -6:
      Serial.println("  ❌ NO_STREAM - No HTTP stream available");
      break;
    case -7:
      Serial.println("  📝 NO_HTTP_SERVER - Server didn't respond with HTTP");
      break;
    case -8:
      Serial.println("  🔍 TOO_LESS_RAM - Insufficient memory");
      Serial.println("     → Reduce payload size or increase heap");
      break;
    case -9:
      Serial.println("  📊 ENCODING - HTTP encoding error");
      break;
    case -10:
      Serial.println("  🌊 STREAM_WRITE - Stream write error");
      break;
    case -11:
      Serial.println("  ⏰ READ_TIMEOUT - Server response timeout");
      Serial.println("     → Server is slow or overloaded");
      Serial.println("     → Increase timeout value");
      break;
    default:
      if (errorCode >= 400 && errorCode < 500) {
        Serial.printf("  🚫 Client Error %d - Check request format\n", errorCode);
        if (errorCode == 404) {
          Serial.println("     → Endpoint not found - verify API path");
        } else if (errorCode == 400) {
          Serial.println("     → Bad request - check JSON payload format");
        } else if (errorCode == 401) {
          Serial.println("     → Unauthorized - check authentication");
        }
      } else if (errorCode >= 500) {
        Serial.printf("  🔥 Server Error %d - Backend issue\n", errorCode);
        Serial.println("     → Contact backend administrator");
      } else {
        Serial.printf("  ❓ Unknown error code: %d\n", errorCode);
      }
      break;
  }
  
  // Additional diagnostics
  Serial.printf("  🔗 Free heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("  📶 WiFi RSSI: %d dBm\n", WiFi.RSSI());
  Serial.printf("  ⏰ Uptime: %lu seconds\n", millis() / 1000);
}
