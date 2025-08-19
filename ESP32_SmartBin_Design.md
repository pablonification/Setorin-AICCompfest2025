### SmartBin IoT – Prototipe Sederhana (Timeline Mepet)

Tujuan: versi cepat yang cukup untuk demo/prototipe dengan fitur minimal namun end-to-end berfungsi:
- **Buka/tutup otomatis** (servo/solenoid).
- **Terima perintah dari server** (WebSocket; fallback HTTP polling).
- **Memastikan botol yang dimasukkan adalah botol yang sama** via sesi token berumur pendek + sensor sederhana.

### 1) Arsitektur Ringkas
- **Controller (disarankan)**: `NodeMCU ESP8266` (lebih murah/sederhana; library WS stabil). Jika stok terbatas, tetap bisa pakai `ESP32` tanpa ubah rancangan.
- **Aktuator**: 
  - Opsi A: `Servo MG996R` (torsi tinggi) untuk membuka pintu/ flap.
  - Opsi B: `Solenoid 12V + relay` untuk kunci magnetis (lebih robust, tapi butuh supply 12V).
- **Sensor minimum**:
  - `IR break-beam` (sepasang) di mulut corong untuk mendeteksi 1 botol lewat (enter/exit).
  - `Reed switch`/limit switch untuk konfirmasi pintu tertutup.
  - (Opsional, jika sempat) `Load cell + HX711` untuk estimasi berat; membantu validasi.
- **Komunikasi**: WebSocket ke backend (sesuai simulator saat ini), dengan heartbeat. Jika ada kendala, fallback ke HTTP polling interval 1–2 detik.
- **Daya**: 5V 2A (servo kecil) atau 12V 3A (solenoid). Regulator step-down ke 5V/3.3V untuk board.

### 2) Mekanisme “Botol yang Sama” (tanpa visi komputer)
Prinsip: validasi proses, bukan identitas unik botol.
1. Aplikasi/Frontend melakukan klasifikasi (via server) → server membuat `DepositSession` berumur pendek (mis. TTL 15–30 detik) dengan `session_token` dan atribut prediksi (merk, perkiraan ukuran/berat jika tersedia).
2. Server mengirim `command: open` ke device dengan menyertakan `session_token`.
3. Device hanya mengizinkan **satu kali lintasan** beam selama status ARMED untuk token tersebut dan menutup segera setelah deteksi.
4. Device mengirim event `deposit_complete` beserta `session_token` dan metrik lokal (durasi lintasan, apakah ada double-pass, optional berat).
5. Server memvalidasi: token masih hidup, belum dipakai, window waktu sesuai, tidak ada anomali (double-pass). Jika pakai load cell: cek berat dalam rentang wajar untuk kelas botol.

Catatan: Ini mencegah penukaran objek secara praktis (window sempit, satu lintasan), cukup untuk demo. Tingkatkan akurasi nanti (kamera/RFID) jika diperlukan.

### 3) Protokol Pesan (WebSocket)
- Device → Server (handshake):
```json
{"type":"hello","device_id":"bin-01","capabilities":["beam","servo","reed","hx711"],"fw":"0.1.0"}
```
- Server → Device (perintah buka):
```json
{"type":"command","action":"open","session_token":"<uuid>","timeout_ms":8000}
```
- Device → Server (telemetry/heartbeat tiap 10s):
```json
{"type":"telemetry","device_id":"bin-01","rssi":-62,"uptime_s":1234}
```
- Device → Server (event selama sesi):
```json
{"type":"event","name":"beam_enter","session_token":"<uuid>","t":1712345678}
```
```json
{"type":"event","name":"beam_exit","session_token":"<uuid>","t":1712345681}
```
```json
{"type":"event","name":"closed","session_token":"<uuid>","ok":true}
```
- Device → Server (hasil akhir):
```json
{"type":"deposit_complete","session_token":"<uuid>","duration_ms":3100,"double_pass":false,"weight_g":null}
```

### 4) State Machine Firmware (ringkas)
- `IDLE` → tunggu perintah.
- `ARMED(session_token)` → siap buka; jika timeout, kembali ke IDLE.
- `OPENING` → gerakkan servo/aktifkan solenoid.
- `WAIT_BOTTLE` → pantau beam; jika beam putus lalu kembali, anggap 1 lintasan.
- `CLOSING` → tutup; konfirmasi dengan reed switch.
- `CONFIRMING` → kirim `deposit_complete` → kembali `IDLE`.

### 5) Skema Pin (NodeMCU ESP8266 contoh)
- `D4 (GPIO2)`: Servo signal (PWM)
- `D5 (GPIO14)`: IR beam sensor 1
- `D6 (GPIO12)`: IR beam sensor 2 (optional, untuk deteksi arah)
- `D7 (GPIO13)`: Reed/limit switch (NC/NO, pakai pull-up internal)
- `D2 (GPIO4)`: HX711 DT (opsional)
- `D3 (GPIO0)`: HX711 SCK (opsional)
- `D8 (GPIO15)`: Relay solenoid (jika pakai solenoid, hindari bentrok boot strap pins)

Power: Sensor ke 5V (atau 3.3V sesuai modul), level logic ke 3.3V. Servo/solenoid pakai supply terpisah dengan ground common.

### 6) Bill of Materials (BOM minimal)
- NodeMCU ESP8266 (1x)
- IR break beam 5mm/8mm (1 set)
- Servo MG996R + horn/arm + bracket (1x) ATAU Solenoid 12V + relay 1 channel (1x)
- Reed switch + magnet kecil (1x)
- Kabel jumper, bracket/3D printed flap, PSU 5V 2A (servo) atau 12V 3A (solenoid)
- (Opsional) Load cell 1–5kg + HX711 (1x)

### 7) Firmware – Kerangka (Arduino Core, ringkas)
```cpp
#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Servo.h>

const char* WIFI_SSID = "<ssid>";
const char* WIFI_PASS = "<pass>";
const char* WS_HOST   = "<backend-host>"; // ex: 192.168.1.10
const uint16_t WS_PORT = 8000;             // sesuaikan
const char* WS_PATH   = "/ws/iot";        // sesuaikan dengan backend

WebSocketsClient ws;
Servo gate;
String sessionToken;
enum State { IDLE, ARMED, OPENING, WAIT_BOTTLE, CLOSING, CONFIRMING } state = IDLE;
unsigned long stateTs = 0;

const int PIN_SERVO = D4;
const int PIN_BEAM1 = D5;
const int PIN_REED  = D7;

void setGate(bool open) { gate.write(open ? 90 : 0); }
bool beamBlocked() { return digitalRead(PIN_BEAM1) == LOW; }
bool gateClosed() { return digitalRead(PIN_REED) == LOW; }

void sendJson(const JsonDocument& doc) {
  String payload; serializeJson(doc, payload);
  ws.sendTXT(payload);
}

void sendHello() {
  StaticJsonDocument<256> doc;
  doc["type"] = "hello";
  doc["device_id"] = "bin-01";
  JsonArray caps = doc.createNestedArray("capabilities");
  caps.add("beam"); caps.add("servo"); caps.add("reed");
  doc["fw"] = "0.1.0";
  sendJson(doc);
}

void onMessage(const String& msg) {
  StaticJsonDocument<256> doc; DeserializationError e = deserializeJson(doc, msg);
  if (e) return;
  const char* type = doc["type"] | "";
  if (strcmp(type, "command") == 0) {
    const char* action = doc["action"] | "";
    if (strcmp(action, "open") == 0) {
      sessionToken = String((const char*)doc["session_token"]);
      state = ARMED; stateTs = millis();
    }
  }
}

void setup() {
  pinMode(PIN_BEAM1, INPUT_PULLUP);
  pinMode(PIN_REED, INPUT_PULLUP);
  gate.attach(PIN_SERVO);
  setGate(false);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(250);

  ws.begin(WS_HOST, WS_PORT, WS_PATH);
  ws.onEvent([](WStype_t t, uint8_t* p, size_t l){
    if (t == WStype_CONNECTED) sendHello();
    else if (t == WStype_TEXT) onMessage(String((char*)p, l));
  });
  ws.setReconnectInterval(2000);
}

void loop() {
  ws.loop();
  unsigned long now = millis();

  switch (state) {
    case IDLE: break;
    case ARMED:
      setGate(true); state = OPENING; stateTs = now; break;
    case OPENING:
      if (now - stateTs > 500) { state = WAIT_BOTTLE; stateTs = now; }
      break;
    case WAIT_BOTTLE:
      if (beamBlocked()) { state = CLOSING; }
      else if (now - stateTs > 8000) { state = CLOSING; }
      break;
    case CLOSING:
      setGate(false);
      if (gateClosed() || now - stateTs > 2000) {
        StaticJsonDocument<192> doc;
        doc["type"] = "deposit_complete";
        doc["session_token"] = sessionToken;
        doc["duration_ms"] = (int)(now - stateTs);
        doc["double_pass"] = false;
        sendJson(doc);
        state = CONFIRMING; stateTs = now;
      }
      break;
    case CONFIRMING:
      state = IDLE; sessionToken = ""; break;
  }
}
```

Catatan: Ini skeleton untuk demo; handle debounce beam, double-pass, dan error sebaiknya ditambahkan jika waktu memungkinkan.

### 8) Fallback HTTP Polling (jika WS bermasalah)
- Device GET `/api/iot/next?device_id=bin-01` setiap 1s → balikan `{action, session_token}` atau `{action:"none"}`.
- Device POST hasil ke `/api/iot/event`.
Konsumsi server lebih tinggi, tapi implementasi mudah.

### 9) Pengujian Cepat
- Uji motor/servo manual: perintah lokal open/close.
- Uji beam: pastikan satu lintasan terdeteksi, tidak sensitif terhadap getaran.
- Uji end-to-end: frontend → server kirim `open` → device buka → masukkan botol → device kirim `deposit_complete` → server validasi token dan hitung poin.

### 10) Timeline Eksekusi (estimasi)
- Hari 1: Rakit hardware, pinout, firmware konek WiFi + WS, buka/tutup.
- Hari 2: Beam + sesi token, event akhir, integrasi backend, demo.

### 11) Upgrade Setelah Demo
- Kamera (ESP32-CAM) untuk verifikasi visual.
- RFID/NFC tag reusable pada botol komunitas.
- Load cell kalibrasi untuk korelasi merk/berat.


