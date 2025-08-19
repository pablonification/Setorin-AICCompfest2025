### SmartBin IoT – Trapdoor Prototipe (ESP32)

Tujuan: rancangan cepat untuk prototipe dengan validasi “botol telah masuk” berbasis platform trapdoor. Alur utama: pengguna scan/validasi via ponsel → server kirim persetujuan → ESP32 membuka trapdoor → botol jatuh → trapdoor menutup kembali → device lapor deposit complete.

### 1) Mekanisme Trapdoor
- Platform horizontal sebagai penutup corong (posisi default: tertutup, horizontal).
- Stiker referensi (persegi panjang tinggi 10 cm) ditempel vertikal di sisi platform sebagai titik referensi validasi ponsel.
- Pengguna meletakkan botol sejajar stiker ini setelah scan di ponsel.
- Setelah server mengirim sinyal persetujuan, servo menggerakkan engsel sehingga platform membuka ke bawah (seperti lantai jebakan) → botol jatuh ke wadah.
- Servo kemudian menutup kembali platform ke posisi horizontal, menutup rapat.

### 2) Flow End-to-End
1. Frontend melakukan klasifikasi/validasi menggunakan kamera ponsel dengan acuan stiker referensi.
2. Server membuat `session_token` (TTL 15–30 detik, sekali pakai, terikat `device_id`) dan mengirim perintah `open_trapdoor` ke device.
3. Device menerima perintah → membuka trapdoor untuk durasi singkat (mis. 700–1200 ms) sambil memantau sensor.
4. Botol jatuh. Device menutup kembali, konfirmasi close.
5. Device mengirim `deposit_complete` dengan `session_token` dan metrik (open_duration, presence_cleared, chute_passed).
6. Server memvalidasi token dan metrik, barukan poin, dan beri respons ke UI.

### 3) Validasi “Botol Telah Masuk” (tanpa visi di device)
- **Token sesi**: window waktu sempit, sekali pakai, mengikat perintah ke device yang benar.
- **Presence sensor di platform (opsional tapi disarankan)**: microswitch/FSR pada permukaan platform untuk mendeteksi ada/tidaknya objek. Logika:
  - Saat platform tertutup sebelum perintah: presence=true → ada botol.
  - Saat trapdoor dibuka: presence harus berpindah ke false dalam window 1–2 detik (objek jatuh). Jika tetap true → kemungkinan macet, tandai `drop_failed=true`.
- **IR chute sensor (opsional)**: sepasang IR break-beam pada mulut wadah untuk memastikan ada objek melintas saat trapdoor terbuka → `chute_passed=true`.
- **Limit switch penutup**: memastikan platform kembali tertutup rapat (keamanan dan konsistensi siklus).
- Kombinasi sederhana yang kuat untuk demo: limit switch + presence sensor platform. IR chute hanya jika ada waktu.

### 4) Protokol Pesan (WebSocket)
- Device → Server (hello):
```json
{"type":"hello","device_id":"bin-01","capabilities":["servo","limit","presence","chute_ir"],"fw":"trapdoor-0.1.0"}
```
- Server → Device (perintah buka trapdoor):
```json
{"type":"command","action":"open_trapdoor","session_token":"<uuid>","open_ms":900,"timeout_ms":6000}
```
- Device → Server (telemetry/heartbeat 10s):
```json
{"type":"telemetry","device_id":"bin-01","uptime_s":321,"rssi":-58}
```
- Device → Server (hasil akhir):
```json
{"type":"deposit_complete","session_token":"<uuid>","open_duration_ms":920,"presence_before":true,"presence_cleared":true,"chute_passed":false,"closed_ok":true,"drop_failed":false}
```
- Device → Server (anomaly/error):
```json
{"type":"error","code":"CLOSE_TIMEOUT","session_token":"<uuid>","detail":"limit not reached"}
```

### 5) State Machine
- `IDLE` → menunggu perintah.
- `OPENING(session_token)` → servo memutar ke sudut buka. Mulai timer.
- `DROP_WINDOW` → tunggu `presence` berubah ke false atau `chute_ir` terputus. Jika tidak terjadi hingga timeout → `drop_failed=true`.
- `CLOSING` → servo menutup; verifikasi `limit_closed` tercapai.
- `REPORTING` → kirim `deposit_complete` lalu kembali `IDLE`.

### 6) Hardware & Mekanik
- **Controller**: ESP32-DevKitC / NodeMCU-32S.
- **Aktuator**: Servo torsi tinggi (MG996R/DS3218). Linkage langsung ke engsel platform (atau pakai horn + lengan).
- **Sensor**:
  - Limit switch (NC/NO) untuk posisi platform tertutup.
  - Presence sensor di platform: microswitch/FSR menekan saat ada botol.
  - (Opsional) IR break-beam pada mulut wadah (konfirmasi jatuh).
- **Daya**: 5–6V 2–3A untuk servo, regulator ke 5V/3.3V sesuai ESP32 (common ground). Hindari supply servo dari 5V USB board.
- **Mekanik**: Platform berbahan akrilik/PLA, engsel metal kecil; stopper mekanik di posisi tertutup agar konsisten.

### 7) Pinout (ESP32 contoh)
- `GPIO18` → Servo PWM
- `GPIO25` → Limit switch closed (INPUT_PULLUP)
- `GPIO26` → Presence switch/FSR (INPUT atau ADC jika FSR)
- `GPIO27` → IR chute (optional, INPUT_PULLUP)

### 8) Konstanta Waktu & Sudut (awal)
- `TRAP_OPEN_ANGLE = 85–110°` (sesuaikan mekanik)
- `TRAP_CLOSE_ANGLE = 0–10°`
- `OPEN_MS = 900–1200 ms`
- `DROP_TIMEOUT_MS = 2000 ms`
- `CLOSE_TIMEOUT_MS = 2000 ms`

### 9) Skeleton Firmware (Arduino – ESP32)
```cpp
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

const char* WIFI_SSID = "<ssid>";
const char* WIFI_PASS = "<pass>";
const char* WS_HOST   = "<backend-host>"; // contoh: 192.168.1.10
const uint16_t WS_PORT = 8000;             // sesuaikan
const char* WS_PATH   = "/ws/iot";        // sesuaikan backend

WebSocketsClient ws;
Servo trap;
String sessionToken;

enum State { IDLE, OPENING, DROP_WINDOW, CLOSING, REPORTING } state = IDLE;
unsigned long stateTs = 0;

const int PIN_SERVO = 18;
const int PIN_LIMIT = 25;  // LOW = closed
const int PIN_PRES  = 26;  // HIGH = presence (microswitch with pull-up) atau analogRead jika FSR
const int PIN_CHUTE = 27;  // optional, LOW = beam broken

int ANGLE_OPEN = 95;
int ANGLE_CLOSE = 0;
int OPEN_MS = 900;
int DROP_TIMEOUT_MS = 2000;
int CLOSE_TIMEOUT_MS = 2000;

bool presenceBefore = false;
bool presenceCleared = false;
bool chutePassed = false;
bool closedOk = false;
bool dropFailed = false;

bool isClosed() { return digitalRead(PIN_LIMIT) == LOW; }
bool presence() { return digitalRead(PIN_PRES) == HIGH; }
bool chuteBeamBreak() { return digitalRead(PIN_CHUTE) == LOW; }

void sendJson(const JsonDocument& doc){ String p; serializeJson(doc,p); ws.sendTXT(p); }

void sendHello(){ StaticJsonDocument<256> d; d["type"]="hello"; d["device_id"]="bin-01"; auto a=d.createNestedArray("capabilities"); a.add("servo"); a.add("limit"); a.add("presence"); a.add("chute_ir"); d["fw"]="trapdoor-0.1.0"; sendJson(d);} 

void commandOpen(const JsonDocument& d){
  sessionToken = String((const char*)d["session_token"]);
  OPEN_MS = (int)d["open_ms"] | OPEN_MS;
  state = OPENING; stateTs = millis();
  presenceBefore = presence();
  presenceCleared = false; chutePassed = false; closedOk = false; dropFailed = false;
  trap.write(ANGLE_OPEN);
}

void onMessage(const String& msg){ StaticJsonDocument<256> d; if(deserializeJson(d,msg))return; const char* t=d["type"]|""; if(strcmp(t,"command")==0){ const char* a=d["action"]|""; if(strcmp(a,"open_trapdoor")==0) commandOpen(d);} }

void setup(){
  pinMode(PIN_LIMIT, INPUT_PULLUP);
  pinMode(PIN_PRES, INPUT_PULLUP);
  pinMode(PIN_CHUTE, INPUT_PULLUP);
  trap.attach(PIN_SERVO);
  trap.write(ANGLE_CLOSE);
  WiFi.begin(WIFI_SSID, WIFI_PASS); while(WiFi.status()!=WL_CONNECTED) delay(200);
  ws.begin(WS_HOST, WS_PORT, WS_PATH);
  ws.onEvent([](WStype_t t, uint8_t* p, size_t l){ if(t==WStype_CONNECTED) sendHello(); else if(t==WStype_TEXT) onMessage(String((char*)p,l)); });
  ws.setReconnectInterval(2000);
}

void loop(){
  ws.loop();
  unsigned long now = millis();
  switch(state){
    case IDLE: break;
    case OPENING:
      if(now - stateTs >= (unsigned long)OPEN_MS){
        trap.write(ANGLE_CLOSE);
        state = DROP_WINDOW; stateTs = now;
      }
      break;
    case DROP_WINDOW:{
      if(!presence()) presenceCleared = true;
      if(chuteBeamBreak()) chutePassed = true;
      if(now - stateTs >= (unsigned long)DROP_TIMEOUT_MS){
        dropFailed = !(presenceCleared || chutePassed);
        state = CLOSING; stateTs = now;
      }
      break;}
    case CLOSING:
      closedOk = isClosed();
      if(closedOk || (now - stateTs >= (unsigned long)CLOSE_TIMEOUT_MS)){
        StaticJsonDocument<256> d;
        d["type"]="deposit_complete";
        d["session_token"]=sessionToken;
        d["open_duration_ms"]=OPEN_MS;
        d["presence_before"]=presenceBefore;
        d["presence_cleared"]=presenceCleared;
        d["chute_passed"]=chutePassed;
        d["closed_ok"]=closedOk;
        d["drop_failed"]=dropFailed;
        sendJson(d);
        sessionToken = ""; state = REPORTING; stateTs = now;
      }
      break;
    case REPORTING:
      state = IDLE; break;
  }
}
```

Catatan: Jika `PIN_PRES` memakai FSR analog, ubah `presence()` dengan `analogRead()` dan threshold sederhana. Tambahkan debounce 50–150 ms untuk switch.

### 10) Pengujian
- Uji mekanik: platform menutup rapat, tidak selip. Servo punya torsi cukup.
- Uji presence: letakkan botol → presence=true; buka → presence menjadi false.
- Uji end-to-end: ponsel → server kirim `open_trapdoor` → device membuka → botol jatuh → device menutup → `deposit_complete` diterima backend → poin diperbarui.

### 11) Upgrades Lanjutan
- Encoder pada servo atau sensor sudut untuk closed-loop.
- Kamera/AR di ponsel dengan stiker referensi untuk validasi lebih ketat (tetap di sisi ponsel).
- Dua sensor chute untuk verifikasi arah dan jumlah objek.

Tambahan:
Mekanisme trapdoor pada tempat sampah pintar ini beroperasi dengan presisi setelah validasi dari ponsel pengguna berhasil. Bagian atas tempat sampah secara default tertutup oleh sebuah platform horizontal yang datar. Di atas platform ini, ditempelkan secara vertikal sebuah stiker referensi berbentuk persegi panjang dengan tinggi 10 cm yang digunakan dalam proses validasi. Pengguna meletakkan botol yang sudah di-scan di samping stiker ini. Setelah server memproses data dan mengirimkan sinyal persetujuan, mikrokontroler di dalam tempat sampah akan mengaktifkan motor servo. Servo ini kemudian menggerakkan engsel yang membuat seluruh platform terbuka ke bawah layaknya lantai jebakan, sehingga botol tersebut langsung jatuh ke dalam wadah penampungan. Sesaat kemudian, servo secara otomatis akan mengembalikan platform ke posisi horizontal semula, membuat tempat sampah kembali tertutup rapat.
