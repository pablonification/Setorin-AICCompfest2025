// ESP32 Polling Code for SmartBin Communication
// Add this code to your existing setorin.ino file to enable polling for commands

// Add this function to your ESP32 code
void pollForCommands() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  static unsigned long lastPoll = 0;
  const unsigned long POLL_INTERVAL = 5000; // Poll every 5 seconds

  if (millis() - lastPoll >= POLL_INTERVAL) {
    lastPoll = millis();

    HTTPClient http;
    String url = String(serverUrl) + "/api/esp32/commands/" + String(deviceId);

    Serial.println("🔍 Polling for commands from: " + url);

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

          Serial.printf("🎯 Received command: %s (duration: %ds, ID: %s)\n",
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

// Add this to your main loop() function:
void loop() {
  // ... your existing code ...

  // Poll for remote commands
  pollForCommands();

  // ... rest of your existing code ...
}

// Usage Instructions:
// 1. Add the pollForCommands() function to your code
// 2. Call it from your main loop
// 3. The ESP32 will automatically check for commands every 5 seconds
// 4. When commands are received, they are executed and marked as complete
// 5. This works regardless of network topology since ESP32 initiates the connection
