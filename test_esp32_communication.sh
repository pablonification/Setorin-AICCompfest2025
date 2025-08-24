#!/bin/bash

# Test ESP32 Communication Script
# This script demonstrates the hybrid communication approach

BACKEND_URL="http://localhost:8000"
DEVICE_ID="ESP32-SMARTBIN-420"

echo "🧪 Testing ESP32 Communication"
echo "================================="

# 1. Register the ESP32 device
echo "📝 1. Registering ESP32 device..."
REGISTER_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/esp32/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"device_id\": \"$DEVICE_ID\",
    \"firmware_version\": \"2.1.0\",
    \"location\": \"Test Location\",
    \"ip_address\": \"192.168.1.100\"
  }")

echo "📥 Registration Response: $REGISTER_RESPONSE"
echo ""

# 2. Check registered devices
echo "📋 2. Checking registered devices..."
DEVICES_RESPONSE=$(curl -s "$BACKEND_URL/api/esp32/devices")
echo "📥 Devices Response: $DEVICES_RESPONSE"
echo ""

# 3. Send control command (this will use command queuing)
echo "🎯 3. Sending control command (open lid)..."
CONTROL_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/esp32/control" \
  -H "Content-Type: application/json" \
  -d "{
    \"device_id\": \"$DEVICE_ID\",
    \"action\": \"open\",
    \"duration_seconds\": 2
  }")

echo "📥 Control Response: $CONTROL_RESPONSE"
echo ""

# 4. Check pending commands
echo "🔍 4. Checking pending commands for ESP32..."
PENDING_RESPONSE=$(curl -s "$BACKEND_URL/api/esp32/commands/$DEVICE_ID")
echo "📥 Pending Commands: $PENDING_RESPONSE"
echo ""

# 5. Get ESP32 logs
echo "📊 5. Checking ESP32 logs..."
LOGS_RESPONSE=$(curl -s "$BACKEND_URL/api/esp32/logs?device_id=$DEVICE_ID&limit=5")
echo "📥 Recent Logs: $LOGS_RESPONSE"
echo ""

echo "✅ Test completed!"
echo ""
echo "📝 Next steps:"
echo "   1. Upload the updated setorin.ino to your ESP32"
echo "   2. The ESP32 will automatically poll for commands every 5 seconds"
echo "   3. Commands will be executed when received"
echo "   4. Both direct HTTP and polling communication work"
