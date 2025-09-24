# HC-SR04 Alternative Wiring Options

## 🔌 Problem: Cannot Connect to VIN Pin

The HC-SR04 ultrasonic sensor typically requires 5V power, but ESP32 VIN pin might not be available or accessible. Here are several alternatives:

---

## ✅ **Option 1: Use 3.3V Power (Recommended)**

**Most HC-SR04 sensors work fine with 3.3V despite being rated for 5V.**

### Wiring:
```
HC-SR04    →    ESP32
VCC        →    3V3 (3.3V pin)
GND        →    GND  
TRIG       →    GPIO 19
ECHO       →    GPIO 21
```

### Pros:
- ✅ Simple, no additional components needed
- ✅ Most HC-SR04 modules work fine at 3.3V
- ✅ No risk of voltage level conflicts

### Cons:
- ⚠️ Slightly reduced range (typically 10-15% less)
- ⚠️ Some cheaper modules might be less reliable

---

## ✅ **Option 2: External 5V Power Supply**

If you have a separate 5V power source (USB power bank, DC adapter, etc.):

### Wiring:
```
5V Supply  →    HC-SR04 VCC
GND (shared) →  HC-SR04 GND + ESP32 GND
ESP32 GPIO19 →  HC-SR04 TRIG
ESP32 GPIO21 →  HC-SR04 ECHO
```

### Important:
- **Share the GND** between ESP32 and external supply
- **Don't connect 5V directly to ESP32** - only to HC-SR04
- Use voltage divider for ECHO if needed (see Option 4)

---

## ✅ **Option 3: USB 5V from Development Board**

Many ESP32 development boards have 5V available from USB power:

### Check for these pins on your ESP32 board:
- **5V** or **5.0V** pin
- **VUSB** pin  
- **USB** pin
- **Vin** pin (if different location)

### Wiring:
```
HC-SR04    →    ESP32
VCC        →    5V/VUSB/USB pin (wherever available)
GND        →    GND  
TRIG       →    GPIO 19
ECHO       →    GPIO 21
```

---

## ✅ **Option 4: Voltage Divider for ECHO (Advanced)**

If using 5V power but want to protect ESP32 ECHO input:

### Circuit:
```
HC-SR04 ECHO → 1kΩ resistor → ESP32 GPIO21
                    ↓
               680Ω resistor
                    ↓
                   GND
```

### Voltage Division:
- 5V × (680Ω / (1000Ω + 680Ω)) = ~2.0V (safe for ESP32)

---

## ✅ **Option 5: Different Sensor Module**

Consider these 3.3V-compatible alternatives:

### HC-SR04+ (3.3V version):
- Direct replacement for HC-SR04
- Native 3.3V operation
- Same pinout and commands

### JSN-SR04T (Waterproof):
- Works at 3.3V-5V
- More robust for outdoor use
- Same interface as HC-SR04

---

## 🧪 **Testing Your Chosen Option**

Regardless of which option you choose, test it with our existing code:

### 1. Upload the firmware (no code changes needed)
### 2. Test with Serial Monitor:
```cpp
// Type these commands:
"sensor"        // Should show distance readings
"test detect"   // Should detect dropped bottles
```

### 3. Expected readings:
- **3.3V operation**: Range ~2cm to 3m (slightly less than 5V)
- **5V operation**: Range ~2cm to 4m (full specification)

---

## 📝 **Recommended Approach**

### **For Quick Testing: Option 1 (3.3V)**
```
HC-SR04    →    ESP32
VCC        →    3V3
GND        →    GND  
TRIG       →    GPIO 19
ECHO       →    GPIO 21
```

**Why this works:**
- Most HC-SR04 sensors are actually tolerant of 3.3V
- ESP32's 3V3 pin can provide enough current (~50mA)
- No additional components needed
- Range reduced to ~3m (still more than enough for bottle detection)

### **Test Results Expected:**
- Distance readings: ✅ Should work
- Bottle detection: ✅ Should work (range 5cm-300cm)
- Accuracy: ✅ Still ±3mm precision

---

## 🔧 **Quick Validation Test**

After wiring with 3.3V:

1. **Power on ESP32**
2. **Open Serial Monitor** (115200 baud)
3. **Type:** `sensor`
4. **Expected:** Distance reading (not 0.00 or error)
5. **Move hand** 10cm above sensor
6. **Type:** `sensor` again  
7. **Expected:** Distance should change significantly

**If this works, you're good to go with 3.3V power!**

---

## 🚨 **Troubleshooting Power Issues**

| Problem | Solution |
|---------|----------|
| "Distance: 0.00" | Check VCC connection to 3V3 pin |
| Erratic readings | Check GND connection |
| Very short range | Sensor might need 5V - try Option 2 or 3 |
| No response | Check if 3V3 pin provides power when USB connected |

---

## 💡 **ESP32 Pin Alternatives**

If GPIO 19/21 are not available, you can use other pins:

```cpp
// In setorin.ino, change these lines:
#define TRIG_PIN 19    // Change to available GPIO
#define ECHO_PIN 21    // Change to available GPIO

// Available GPIO pins on most ESP32 boards:
// GPIO 2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23
```

---

**Bottom line: Try the 3.3V option first - it's the simplest and works for 90% of HC-SR04 modules!** 🔌