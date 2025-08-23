# ♻️ Setorin – AI-Powered Recycling System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green)](https://fastapi.tiangolo.com)

Setorin adalah sistem bank sampah cerdas yang menggabungkan teknologi Web, AI, dan IoT untuk memvalidasi serta memberikan reward setiap kali pengguna membuang botol plastik. Sistem ini menggunakan kecerdasan buatan untuk mengidentifikasi merek botol, mengukur dimensi, dan menghitung volume untuk memastikan keaslian dan kualitas sampah yang dikumpulkan.

## 🎯 Tujuan Proyek

Setorin bertujuan untuk:
- **Mendorong partisipasi masyarakat** dalam program daur ulang melalui sistem reward
- **Memastikan kualitas sampah** yang dikumpulkan melalui validasi AI
- **Memberikan pengalaman pengguna yang seamless** dengan teknologi modern
- **Memonitor aktivitas real-time** melalui dashboard admin yang komprehensif

## ✨ Fitur Utama

### 🤖 AI-Powered Validation
- **Deteksi Merek Botol**: Menggunakan YOLO model untuk mengidentifikasi merek botol (Aqua, Le Mineral, dll.)
- **Pengukuran Dimensi**: OpenCV untuk mengukur diameter, tinggi, dan menghitung volume
- **Validasi Kualitas**: Memastikan botol memenuhi standar kualitas yang ditentukan

### 💰 Reward System
- **Poin Otomatis**: Pemberian poin berdasarkan volume dan jenis botol
- **Tracking Poin**: Sistem monitoring poin real-time
- **Penarikan Reward**: Integrasi dengan bank transfer dan e-wallet

### 🌐 Real-time Dashboard
- **Admin Panel**: Monitoring lengkap aktivitas pengguna dan sistem
- **Analytics**: Statistik dan laporan penggunaan
- **User Management**: Pengelolaan data pengguna dan transaksi

### 📱 IoT Integration
- **Smart Bin Control**: Kontrol tutup tong sampah via WebSocket
- **Real-time Events**: Monitoring status perangkat IoT

## 🏗️ Arsitektur & Tech Stack

### Frontend Stack
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + Custom CSS Variables
- **Authentication**: Google OAuth 2.0
- **State Management**: React Context API
- **Real-time**: WebSocket Client
- **UI Components**: Custom React Components

### Backend Stack
- **Framework**: FastAPI (Python)
- **Database**: MongoDB dengan Motor (async driver)
- **Authentication**: JWT + Google OAuth
- **AI/ML**: Roboflow API (YOLO model), OpenCV
- **Real-time**: WebSocket dengan FastAPI
- **Validation**: Pydantic models

### IoT & Hardware
- **Protocol**: WebSocket
- **Simulator**: ESP32 virtual simulator
- **Communication**: JSON-based commands
- **Hardware**: ESP32 microcontroller (simulated)

### DevOps & Tools
- **Containerization**: Docker & Docker Compose
- **Database**: MongoDB
- **Cache**: Redis (optional)
- **Testing**: Pytest
- **Linting**: ESLint, Ruff

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js       │    │    FastAPI      │    │    MongoDB      │
│   Frontend      │◄──►│    Backend      │◄──►│    Database     │
│   (Port 3000)   │    │   (Port 8000)   │    │   (Port 27017)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │   Roboflow API  │              │
         │              │   (YOLO Model)  │              │
         │              └─────────────────┘              │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Google OAuth   │    │    OpenCV       │    │    WebSocket    │
│  Authentication │    │  Measurement    │    │  ESP32 Simulator│
│                 │    │                 │    │   (Port 8080)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 📁 Struktur Proyek

```
smartbin/
├── app/                          # Next.js Frontend
│   ├── admin/                   # Admin Dashboard Pages
│   │   ├── education/          # Educational Content Management
│   │   ├── monitoring/         # System Monitoring
│   │   ├── users/              # User Management
│   │   └── withdrawals/        # Withdrawal Management
│   ├── api/                     # API Routes (Next.js)
│   ├── auth/                    # Authentication Pages
│   ├── components/              # Reusable React Components
│   ├── contexts/                # React Context Providers
│   ├── hooks/                   # Custom React Hooks
│   └── page.js                  # Home Page
├── backend/                     # FastAPI Backend
│   ├── src/
│   │   ├── backend/
│   │   │   ├── core/           # Configuration & Settings
│   │   │   ├── db/             # Database Connection
│   │   │   ├── domain/         # Domain Models
│   │   │   ├── models/         # Data Models
│   │   │   ├── repositories/   # Data Access Layer
│   │   │   ├── routers/        # API Route Handlers
│   │   │   ├── schemas/        # Pydantic Schemas
│   │   │   ├── services/       # Business Logic
│   │   │   └── tests/          # Unit Tests
│   └── main.py                 # FastAPI Application Entry
├── iot_simulator/              # ESP32 Simulator
│   └── websocket_server.py     # WebSocket Server
├── public/                     # Static Assets
├── docker-compose.yml          # Docker Compose Configuration
├── Dockerfile.frontend         # Frontend Docker Config
├── package.json                # Frontend Dependencies
└── requirements.txt            # Backend Dependencies
```

## 🚀 Instalasi & Menjalankan Aplikasi

### Prasyarat Sistem
- **Docker & Docker Compose** (versi terbaru)
- **Git** untuk cloning repository
- **Roboflow API Key** (untuk AI validation)

### Quick Start dengan Docker (Recommended)

```bash
# 1. Clone repository
git clone <repository-url>
cd smartbin

# 2. Setup environment variables
cp .env.example .env
# Edit .env dan isi ROBOFLOW_API_KEY Anda

# 3. Build dan start semua services
docker compose up --build
```

### Manual Installation (Development)

#### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# atau
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Configure your environment variables

# Run backend
uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup
```bash
# Install dependencies
npm install

# Setup environment
cp .env.local.example .env.local
# Configure your environment variables

# Run development server
npm run dev
```

#### IoT Simulator Setup
```bash
cd iot_simulator
python websocket_server.py
```

### Service Ports

| Service | Port | URL | Deskripsi |
|---------|------|-----|-----------|
| **Frontend** | 3000 | http://localhost:3000 | UI & Camera Interface |
| **Backend** | 8000 | http://localhost:8000 | REST API + WebSocket |
| **MongoDB** | 27017 | - | Database |
| **Redis** | 6379 | - | Cache (opsional) |
| **IoT Simulator** | 8080 | ws://localhost:8080 | WebSocket ESP32 |

### Environment Configuration

#### Backend (.env)
```bash
# Database
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=smartbin

# AI/ML Services
ROBOFLOW_API_KEY=your_roboflow_api_key_here
ROBOFLOW_MODEL_ID=klasifikasi-per-merk/3

# Authentication
JWT_SECRET_KEY=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
ADMIN_EMAILS=admin@setorin.com

# IoT Configuration
IOT_WS_URL=ws://localhost:8080
MIN_WITHDRAWAL_POINTS=20000
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_BROWSER_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
```



## 📊 Monitoring & Analytics

### Admin Dashboard Features
- **Real-time User Activity**: Monitor scanning activity
- **System Health**: WebSocket connections, IoT status
- **Analytics**: Usage statistics, popular brands
- **User Management**: Profile management, point adjustments
- **Withdrawal Processing**: Approve/reject requests

### Performance Metrics
- **Scan Success Rate**: Percentage of valid scans
- **Average Processing Time**: AI validation speed
- **User Engagement**: Daily active users, scan frequency
- **Reward Distribution**: Points earned vs redeemed

## 🔧 Troubleshooting

### Common Issues

#### Docker Issues
```bash
# Reset Docker environment
docker compose down --volumes --remove-orphans --rmi all
docker system prune -a --volumes -f

# Rebuild specific service
docker compose build --no-cache backend
docker compose up backend
```

#### API Connection Issues
```bash
# Check if backend is running
curl http://localhost:8000/health

# Check MongoDB connection
docker compose exec mongodb mongo --eval "db.stats()"
```

#### WebSocket Issues
```bash
# Test WebSocket connection
websocat ws://localhost:8000/ws/status

# Check IoT simulator
curl -X POST ws://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"cmd": "open"}'
```

#### Camera Issues
- Pastikan browser memiliki akses ke kamera
- Coba akses `https://localhost:3000` untuk HTTPS
- Check browser console untuk error messages

## 📈 Roadmap

### Version 1.1 (Current)
- ✅ AI-powered bottle validation
- ✅ Real-time WebSocket updates
- ✅ Admin dashboard
- ✅ Reward system

### Version 1.2 (Upcoming)
- 🔄 Mobile app (React Native)
- 🔄 Advanced analytics dashboard
- 🔄 Multi-language support
- 🔄 Integration with waste management partners

### Version 2.0 (Future)
- 🤖 Advanced ML models for better accuracy
- 📱 IoT device management
- 🌍 Multi-location support
- 📊 Advanced reporting and insights

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**MIT © 2025 Setorin Team**

---

## 🙏 Acknowledgments

- **Roboflow** for providing AI model hosting
- **OpenCV** community for computer vision tools
- **FastAPI** team for excellent Python framework
- **Next.js** team for React framework
- **MongoDB** for NoSQL database solution


---

*Built with ❤️ for a cleaner and more sustainable future*


