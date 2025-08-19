### Desain Tempat Sampah Pintar Berbasis ESP32 (Scan Botol + Tutup Otomatis)

Dokumen ini merinci kebutuhan komponen, arsitektur, wiring, firmware flow, integrasi backend, rencana kerja, kalibrasi, pengujian, dan operasional untuk tempat sampah sederhana dengan slot scan botol di atas dan tutup di depan yang dapat membuka/menutup berdasarkan hasil klasifikasi botol via server.

---

## Tujuan Sistem
- Mendeteksi adanya botol di slot scan, memotret, dan mengirim ke server untuk klasifikasi/validasi.
- Membuka tutup secara otomatis jika klasifikasi valid; menutup kembali setelah jeda.
- Menghitung poin dan sinkron dengan backend yang sudah ada.
- Andal meski koneksi Wi‑Fi fluktuatif, dan aman secara mekanik/kelistrikan.

---

## Komponen yang Direkomendasikan

- Mikrokontroler dan visi:
  - ESP32‑CAM (OV2640) + USB‑TTL/FTDI untuk flashing.
  - Alternatif: ESP32 DevKit + modul kamera OV2640 (lebih rumit wiring).
- Aktuator tutup:
  - Servo high‑torque 5V (MG996R/DS3218) + bracket/engsel + horn.
  - Alternatif: DC gear motor + driver (L298N/DRV8833) + 2 limit switch.
- Sensor:
  - Deteksi botol: IR break‑beam (transmitter + receiver) atau TCRT5000 (reflective) di mulut slot.
  - Posisi tutup: 2× limit switch (CLOSE/OPEN) atau reed switch + magnet.
  - Kapasitas: Ultrasonic HC‑SR04 (cukup) atau ToF VL53L0X (lebih akurat di ruang sempit).
  - Opsional: Load cell 5–10 kg + HX711 untuk validasi berat.
- Indikator:
  - LED status (RGB/strip) + buzzer 5V.
  - Pencahayaan kamera (LED ring kecil) untuk konsistensi gambar.
- Input manual:
  - Push button untuk buka/manual reset.
- Catu daya:
  - Adaptor 5V 2–3 A untuk servo + LED.
  - ESP32 umumnya punya regulator 5V→3.3V onboard (cek modul). Ground harus common.
- Mekanik:
  - Engsel, bracket servo, sekrup, bahan 3D print/akrilik/plywood.

---

## Arsitektur Sistem

- Sensor botol memicu capture.
- ESP32 menangkap JPEG dan kirim ke backend via HTTP.
- Backend menjalankan model klasifikasi (Roboflow YOLO) dan logika poin.
- Backend membalas hasil:
  - Jika valid: `action=open_lid`, durasi buka (mis. 3 detik), poin yang ditambahkan.
- ESP32 mengeksekusi aksi (servo buka → tunda → tutup).
- OPSI: Gunakan WebSocket agar backend bisa mengirim perintah real‑time (mis. force close/open); repo ini sudah memiliki infrastruktur WS.

Aliran sederhana (HTTP only):
1) IR trigger → ambil foto → POST ke backend (`/scan` atau endpoint scan yang tersedia) → response ok → buka → tutup.

Aliran lanjutan (HTTP + WS):
1) Foto tetap via HTTP; status/perintah tambahan lewat WS (lebih interaktif, server‑driven).

---

## Skema Wiring (Contoh)

Catatan: pastikan level voltase benar dan semua ground disatukan.

- Servo MG996R:
  - Merah → 5V adaptor (bukan dari ESP32).
  - Coklat/Hitam → GND (common).
  - Oranye (signal) → pin PWM ESP32 (mis. `GPIO14`).
- IR break‑beam:
  - VCC → 3.3V (beberapa modul kompatibel 5V; sesuaikan), GND → GND.
  - OUT → `GPIO15` (gunakan pull‑up/pull‑down sesuai modul).
- Limit switch:
  - Satu kaki → GND.
  - Sinyal → `GPIO12` (closed) dan `GPIO13` (open) + internal pull‑up.
- Ultrasonic HC‑SR04:
  - VCC → 5V, GND → GND.
  - Trig → `GPIO2`, Echo → ke input 3.3V melalui level shifter / voltage divider (mis. ke `GPIO4`).
- Buzzer:
  - Positif → 5V via transistor NPN (kolektor ke buzzer, emitter ke GND, basis dari GPIO via resistor).
- LED:
  - Minimal 1 LED indikator ke `GPIO5` + resistor 220Ω; atau gunakan LED strip sesuai kebutuhan.
- Button:
  - Satu kaki → GND, sinyal → `GPIO0` + internal pull‑up (hindari konflik boot pada sebagian pin; sesuaikan).

Pin mapping (ESP32‑CAM):
- Kamera built‑in (OV2640) memiliki pinout fix; pilih GPIO yang aman untuk servo/sensor (`GPIO12/13/14/15` dll.).
- Perhatikan konflik boot pada `GPIO0`, `GPIO2`, `GPIO12`; hindari low saat boot.

---

## Firmware: State Machine

State:
- INIT → WIFI_CONNECT → IDLE
- IDLE → DETECT_BOTTLE (IR high) → CAPTURE → UPLOAD → WAIT_RESULT
- WAIT_RESULT:
  - success → OPEN_LID → HOLD_OPEN (timer/limit switch) → CLOSE_LID → IDLE
  - fail/timeout → ERROR_ALERT → IDLE
- Kapan pun: FAULT (limit switch tidak sesuai) → SAFETY_CLOSE → IDLE

Parameter contoh:
- `OPEN_ANGLE=80°`, `CLOSE_ANGLE=0°`
- `OPEN_DURATION_MS=3000` (fallback bila switch tidak terdeteksi)
- Debounce IR: 100–300 ms

---

## Pseudocode (Arduino Framework)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>

const char* WIFI_SSID = "SSID";
const char* WIFI_PASS = "PASSWORD";
const char* API_URL   = "http://<backend-host>:8000/scan"; // sesuaikan endpoint
const char* DEVICE_TOKEN = "Bearer <device_token>";

const int PIN_SERVO = 14;
const int PIN_IR    = 15;
const int PIN_SW_CLOSED = 12;
const int PIN_SW_OPEN   = 13;

Servo lidServo;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_IR, INPUT_PULLUP);
  pinMode(PIN_SW_CLOSED, INPUT_PULLUP);
  pinMode(PIN_SW_OPEN, INPUT_PULLUP);

  lidServo.attach(PIN_SERVO);
  closeLid();

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
}

void loop() {
  if (bottleDetected()) {
    if (captureAndUpload()) {
      openLid();
      delay(3000); // atau tunggu SW_OPEN dengan timeout
      closeLid();
    } else {
      alertError();
    }
    delay(500); // debounce
  }
}

bool bottleDetected() {
  return digitalRead(PIN_IR) == LOW; // tergantung wiring
}

bool captureAndUpload() {
  // Ambil frame JPEG, POST multipart/form-data ke API_URL dengan Authorization
  // Parse JSON { ok: bool, action: "open_lid" }
  return true;
}

void openLid() { lidServo.write(80); }
void closeLid() { lidServo.write(0); }
void alertError() { /* buzzer/LED */ }
```

MicroPython atau ESP‑IDF juga bisa digunakan sesuai preferensi.

---

## Desain API dan Payload

Endpoint minimal (HTTP):
- `POST /scan` menerima JPEG + info device.
  - Header: `Authorization: Bearer <device_token>`
  - Body: multipart/form-data
    - `image`: file JPEG
    - `device_id`: string
    - `ts`: unix ms (opsional)
- Response (200):
```json
{
  "ok": true,
  "brand": "Aqua",
  "points": 100,
  "action": "open_lid",
  "duration_ms": 3000,
  "message": "valid bottle"
}
```
- Error (4xx):
```json
{ "ok": false, "message": "not a bottle" }
```

Contoh `curl`:
```bash
curl -X POST "http://localhost:8000/scan" \
  -H "Authorization: Bearer <device_token>" \
  -F "device_id=bin-01" \
  -F "image=@/path/frame.jpg;type=image/jpeg"
```

WebSocket (opsional):
- `ws://<backend-host>:8000/ws/device?device_id=bin-01&token=<jwt>`
- Pesan dari server:
```json
{ "cmd": "open_lid", "duration_ms": 3000 }
```
- Status dari device:
```json
{ "event": "state", "state": "OPEN_LID", "ts": 1734420000000 }
```

Catatan integrasi dengan repo:
- Endpoint scan sudah ada di backend (lihat router `scan.py`/`scan_new.py`); sesuaikan dengan payload di atas.
- WebSocket tersedia (`routers/ws.py`); dapat ditambah kanal untuk perangkat.

---

## Rencana Pengerjaan

1) Mekanik
- Rancang bracket servo dan engsel tutup.
- Pasang LED pencahayaan ke area kamera.
- Tempatkan IR di mulut slot (garis lurus transmitter‑receiver).

2) Elektrik
- Jalur 5V servo terpisah dari ESP32; ground disatukan.
- Level shifting untuk Echo HC‑SR04 ke 3.3V.
- Kabel kamera/servo sependek mungkin.

3) Firmware (iteratif)
- v0: Wi‑Fi + IR → servo (tanpa upload).
- v1: Capture JPEG + upload HTTP → buka/tutup.
- v2: Tambah WS untuk perintah real‑time.
- v3: Retry/backoff, offline queue 1 foto, telemetri dasar.

4) Backend
- Pastikan `/scan` menerima multipart dan mengembalikan JSON ringkas.
- Opsional: `POST /device/status` untuk telemetri.

5) Kalibrasi
- Sudut servo open/close, debounce IR, jarak ultrasonic.
- Pencahayaan kamera: exposure/resolusi 640×480/800×600.

6) Uji
- Skenario sukses/gagal, Wi‑Fi drop, server timeout, antrian.
- Safety: jika limit switch tidak terpicu saat buka/tutup.

---

## Kalibrasi & Parameter

- Servo:
  - `CLOSE_ANGLE`: sudut memastikan tutup terkunci.
  - `OPEN_ANGLE`: sudut cukup lebar untuk lewat botol.
  - `OPEN_TIMEOUT_MS`: fallback jika switch tidak terdeteksi.
- IR: Debounce 100–300 ms agar tidak false trigger.
- Ultrasonic: Kalibrasi tinggi bin → konversi jarak ke % kapasitas.
- Kamera: LED menyala beberapa ratus ms sebelum capture untuk pencahayaan stabil.

---

## Daya & Keamanan

- Adaptor 5V 2–3A untuk servo + LED; ESP32 mendapatkan 5V sesuai modul.
- Jangan ambil arus servo dari 5V USB ESP32.
- Gunakan sekring/polyfuse untuk proteksi.
- Desain tutup aman, hindari jepit; tombol darurat untuk override.

---

## BOM (Bill of Materials)

| Item | Qty | Catatan |
|---|---:|---|
| ESP32‑CAM + FTDI | 1 set | Kamera onboard |
| Servo MG996R/DS3218 | 1 | High torque |
| IR break‑beam | 1–2 | Deteksi botol |
| Limit switch | 2 | Posisi open/close |
| HC‑SR04 atau VL53L0X | 1 | Kapasitas |
| Buzzer + LED | 1 set | Indikator |
| Adaptor 5V 2–3A | 1 | Daya utama |
| Kabel, bracket, sekrup | - | Mekanik |

---

## Timeline (Perkiraan)

- Minggu 1: Mekanik + wiring dasar + firmware v0.
- Minggu 2: Capture + upload HTTP v1, integrasi backend.
- Minggu 3: Kalibrasi + uji lapangan + WS opsional.
- Minggu 4: Finishing enclosure + dokumentasi.

---

## Testing Checklist

- Wi‑Fi reconnect otomatis setelah putus.
- Upload retry dengan backoff; tidak spam saat server down.
- Tutup tidak macet; limit switch terbaca benar.
- Kamera mendapat gambar stabil (tidak over/under‑exposure).
- Kegagalan klasifikasi → buzzer/LED merah, tidak membuka.
- Poin bertambah di aplikasi; UI tidak regress ke 0 poin.

---

## Pemeliharaan

- Bersihkan sensor IR/lensa kamera berkala.
- Kalibrasi ulang servo jika posisi bergeser.
- (Opsional) OTA firmware update, simpan versi dan endpoint OTA.

---

## Keamanan & Privasi

- Gunakan token perangkat (JWT) di header Authorization.
- Prefer HTTPS jika memungkinkan; jika LAN, pertimbangkan sertifikat self‑signed.
- Batasi ukuran gambar (≤ 300 KB) untuk mencegah DoS accidental.
- Hindari hardcode kredensial; gunakan provisioning.

---

## Peningkatan ke Depan

- Load cell untuk validasi berat.
- Deteksi multi‑kelas (brand) dan anti‑fraud (duplicate frame).
- Telemetri perangkat (uptime, error rates) di dashboard admin.
- OTA firmware update dan device fleet management.




