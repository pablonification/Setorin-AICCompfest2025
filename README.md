# ♻️ SmartBin – AI-Powered Recycling System

SmartBin adalah sistem bank sampah berbasis Web, AI, dan IoT untuk memvalidasi serta memberi reward setiap kali user membuang botol plastik.

## 🏗️ Arsitektur Singkat

```
Next.js (frontend) ↔ FastAPI (backend) ↔ MongoDB
                               ↘︎ Roboflow (YOLO model)
                               ↘︎ OpenCV measurement
                               ↘︎ IoT (WebSocket → ESP32 simulator)
```

* Frontend : Next.js App Router + WebSocket client untuk status realtime.
* Backend  : FastAPI + Motor (MongoDB), layanan OpenCV, Roboflow, IoT.
* IoT      : Simulator ESP32 via WebSocket (port 8080) untuk membuka / menutup tutup tong.

---

## 🚀 Quick Start (Docker Compose)

```bash
# salin file env contoh
cp .env.example .env
# isi ROBOFLOW_API_KEY Anda

# build & start all services
docker compose up --build
```

Service yang berjalan:

| Service | Port | Deskripsi |
|---------|------|-----------|
| Frontend (Next.js) | 3000 | UI & kamera web |
| Backend (FastAPI)  | 8000 | REST API + WebSocket |
| MongoDB            | 27017 | Database |
| Redis              | 6379  | Cache (opsional) |
| IoT Simulator      | 8080 | WebSocket ESP32 virtual |

---

## ⚙️ Environment Variables

Wajib (backend):
```
MONGODB_URI=<Your MongoDB URI>
MONGODB_DB_NAME=smartbin
ROBOFLOW_API_KEY=<your_key>
ROBOFLOW_MODEL_ID=klasifikasi-per-merk/3
JWT_SECRET_KEY=<jwt_secret>
GOOGLE_CLIENT_ID=<oauth_client_id>
GOOGLE_CLIENT_SECRET=<oauth_client_secret>
GOOGLE_REDIRECT_URI=<https://.../api/auth/google/callback>
ADMIN_EMAILS=user@admin.com,another@admin.com
IOT_WS_URL=ws://iot_simulator:8080
MIN_WITHDRAWAL_POINTS=20000
```

Frontend (build/runtime):
```
NEXT_PUBLIC_BROWSER_API_URL=http://localhost:8000
NEXT_PUBLIC_CONTAINER_API_URL=http://backend:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<oauth_client_id>
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=<http://localhost:3000/auth/callback>
```

`ROBOFLOW_API_KEY` bisa didapat dari halaman model [klasifikasi-per-merk/3](https://universe.roboflow.com/uascv/klasifikasi-per-merk/model/3). `MIN_WITHDRAWAL_POINTS` mengatur minimal poin untuk penarikan dan dipakai oleh backend dan frontend (via metadata endpoint).

---

## 📚 API Reference

### Health
```
GET /health → { "status": "healthy" }
```

### Scan Bottle
```
POST /scan
Header : Content-Type: multipart/form-data
         X-User-Email: user@example.com (optional)
Body   : image=<file>
```
Response `200 OK` (example)
```json
{
  "is_valid": true,
  "brand": "aqua",
  "confidence": 0.92,
  "diameter_mm": 64.5,
  "height_mm": 185.2,
  "volume_ml": 600.4,
  "points_awarded": 10,
  "total_points": 120
}
```

### WebSocket Realtime
```
ws://<backend-host>/ws/status
```
Client akan menerima pesan JSON setiap selesai proses scan:
```json
{
  "type": "scan_result",
  "data": {
    "brand": "aqua",
    "confidence": 0.92,
    "diameter_mm": 64.5,
    "height_mm": 185.2,
    "volume_ml": 600.4,
    "points": 10,
    "total_points": 120,
    "valid": true,
    "events": ["ACK", "lid_opened", "sensor_triggered", "lid_closed"],
    "email": "user@example.com"
  }
}
```

---

## 🤖 IoT Simulator

Simulator berada di folder `iot_simulator/` dan otomatis berjalan via docker compose.

Manual run:
```bash
cd iot_simulator
python websocket_server.py
```
Perintah JSON:
* `{ "cmd": "open" }` – membuka tutup, akan mengirim event berurutan (`lid_opened`, `sensor_triggered`, `lid_closed`).
* `{ "cmd": "close" }` – langsung menutup tutup.

Lihat juga dokumen hardware/firmware ESP32 yang lebih lengkap di `ESP32_SmartBin_Design.md`.

---

## 🏧 Payout (Penarikan Poin)

Endpoint (semua butuh autentikasi Bearer):

- `GET /payout/method` → detail metode payout user (bank/ewallet) atau `null`.
- `POST /payout/method` → set sekali (tidak bisa diubah):
  ```json
  { "method_type": "bank", "bank_code": "BCA", "bank_account_number": "12345678", "bank_account_name": "Nama" }
  // atau
  { "method_type": "ewallet", "ewallet_provider": "OVO", "phone_number": "08xxxxxxxxxx" }
  ```
- `GET /payout/metadata` → daftar bank/ewallet yang didukung dan `min_withdrawal_points`.
- `GET /payout/withdrawals` → riwayat pengajuan penarikan.
- `POST /payout/withdrawals` → ajukan penarikan:
  ```json
  { "amount_points": 20000 }
  ```

Catatan:
- Minimal penarikan mengikuti env `MIN_WITHDRAWAL_POINTS` dan juga diekspos di `GET /payout/metadata`.
- Frontend menjaga agar poin tidak turun karena respons backend yang flakey.

---

## 🧪 Testing

```bash
docker compose exec backend pytest -q
```
Unit test berada di `backend/tests/` dan mencakup validation engine.

---

## 📄 Lisensi
MIT © 2025 SmartBin Team

---

## 🧹 Cleanup (Opsional)

Untuk menghemat storage lokal:

- Hapus artefak build/caches proyek:
  ```bash
  rm -rf .next .turbo dist build node_modules **/__pycache__ .pytest_cache .mypy_cache .ruff_cache htmlcov .coverage* .ipynb_checkpoints .cache
  ```
- Prune Docker (hapus images/containers/volumes yang tidak terpakai – destruktif!):
  ```bash
  docker compose down --volumes --remove-orphans --rmi all
  docker system prune -a --volumes -f
  docker builder prune -a -f
  ```
- Cleanup cache umum (opsional):
  ```bash
  npm cache clean --force
  pip cache purge
  ```
