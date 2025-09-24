# ESP32 Ultrasonic Sensor Testing Script
# Usage: .\test_sensor.ps1 192.168.1.100 (replace with your ESP32 IP)

param(
    [Parameter(Mandatory=$true)]
    [string]$ESP32_IP
)

Write-Host "🔧 ESP32 Ultrasonic Sensor Testing Script" -ForegroundColor Cyan
Write-Host "ESP32 IP Address: $ESP32_IP" -ForegroundColor Green
Write-Host ""

# Test 1: Basic connectivity
Write-Host "📡 Test 1: Basic Connectivity" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://$ESP32_IP:80/" -Method GET -TimeoutSec 5
    Write-Host "✅ ESP32 is reachable" -ForegroundColor Green
} catch {
    Write-Host "❌ Cannot reach ESP32. Check IP address and WiFi connection." -ForegroundColor Red
    exit 1
}

# Test 2: Control endpoint test
Write-Host ""
Write-Host "🎮 Test 2: Control Endpoint" -ForegroundColor Yellow
try {
    $body = @{
        action = "open_with_detection"
        duration_seconds = 5
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://$ESP32_IP:80/control" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 15
    
    Write-Host "✅ Control endpoint responded:" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Cyan
    Write-Host "   Bottle Detected: $($response.bottle_detected)" -ForegroundColor Cyan
    Write-Host "   Message: $($response.message)" -ForegroundColor Cyan
    
    if ($response.bottle_detected -eq "NOT_DETECTED") {
        Write-Host "🔍 No bottle detected (expected if bin is empty)" -ForegroundColor Yellow
    } elseif ($response.bottle_detected -eq "DETECTED") {
        Write-Host "🍶 Bottle detected!" -ForegroundColor Green
    } elseif ($response.bottle_detected -eq "TIMEOUT") {
        Write-Host "⏰ Detection timeout" -ForegroundColor Orange
    }
    
} catch {
    Write-Host "❌ Control endpoint error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Multiple detection tests
Write-Host ""
Write-Host "🔄 Test 3: Multiple Detection Tests" -ForegroundColor Yellow
Write-Host "Running 3 consecutive detection tests..."

$results = @()
for ($i = 1; $i -le 3; $i++) {
    Write-Host "   Test $i/3..." -NoNewline
    
    try {
        $body = @{
            action = "open_with_detection"
            duration_seconds = 3
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "http://$ESP32_IP:80/control" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
        $results += $response.bottle_detected
        
        Write-Host " $($response.bottle_detected)" -ForegroundColor $(
            if ($response.bottle_detected -eq "DETECTED") { "Green" }
            elseif ($response.bottle_detected -eq "NOT_DETECTED") { "Yellow" } 
            else { "Red" }
        )
        
        Start-Sleep -Seconds 1
    } catch {
        Write-Host " ERROR" -ForegroundColor Red
        $results += "ERROR"
    }
}

# Results summary
Write-Host ""
Write-Host "📊 Test Results Summary" -ForegroundColor Cyan
Write-Host "Total tests: 3"
Write-Host "DETECTED: $(($results | Where-Object {$_ -eq 'DETECTED'}).Count)"
Write-Host "NOT_DETECTED: $(($results | Where-Object {$_ -eq 'NOT_DETECTED'}).Count)"
Write-Host "TIMEOUT: $(($results | Where-Object {$_ -eq 'TIMEOUT'}).Count)"
Write-Host "ERRORS: $(($results | Where-Object {$_ -eq 'ERROR'}).Count)"

if (($results | Where-Object {$_ -eq 'ERROR'}).Count -eq 0) {
    Write-Host "✅ All communication tests passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Some tests failed. Check ESP32 and network connection." -ForegroundColor Red
}

Write-Host ""
Write-Host "🧪 Manual Testing Instructions:" -ForegroundColor Cyan
Write-Host "1. Connect to ESP32 serial monitor (115200 baud)"
Write-Host "2. Type 'sensor' to check distance readings"
Write-Host "3. Type 'test detect' and drop a bottle to test detection"
Write-Host "4. Verify >90% detection success with various bottles"
Write-Host "5. Test false positives (wave hands - should NOT detect)"

Write-Host ""
Write-Host "🔧 Troubleshooting:" -ForegroundColor Cyan
Write-Host "• No readings: Check ECHO pin (GPIO 21) connection"
Write-Host "• Erratic readings: Check 5V power supply"
Write-Host "• Missing bottles: Lower BOTTLE_THRESHOLD in firmware"
Write-Host "• False positives: Raise BOTTLE_THRESHOLD in firmware"