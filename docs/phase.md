# ♻️ SmartBin Project Overview & Roadmap

## 📌 Project Overview
SmartBin adalah sebuah sistem **bank sampah berbasis web & IoT** yang memungkinkan masyarakat membuang **botol plastik** dengan cara yang lebih efisien. Sistem ini menggunakan **kamera HP user** untuk melakukan proses scanning, kemudian data diproses di server dengan bantuan **OpenCV** (untuk mengukur ukuran botol) dan **YOLO** (untuk mengklasifikasikan merek botol). 

Alur utamanya sederhana:
1. User login ke aplikasi web (mobile-first).
2. User scan botol plastik menggunakan kamera HP.
3. Sistem memvalidasi ukuran dan merek botol.
4. Jika valid, IoT bin akan membuka tutupnya otomatis.
5. Setelah botol dimasukkan, sensor IoT mengonfirmasi, lalu tutup kembali.
6. Reward otomatis ditambahkan ke akun user.

Sistem ini dirancang **tetap simple untuk user**, namun bisa diekspansi di masa depan untuk menerima jenis sampah lain, memberikan edukasi, dan menyediakan insight berbasis data.

---

# 🗺️ Roadmap Pengembangan

---

### **Fase 1 – Core System (MVP yang bisa dipakai user)**
🎯 Tujuan: Sistem dasar berjalan → user bisa buang botol plastik, validasi otomatis, reward masuk.

| Feature | Category | Complexity |
|---------|-----------|------------|
| Login & Register User | User | Low |
| Scan botol plastik via kamera HP | User / AI | Medium |
| Pengukuran ukuran botol (OpenCV) | AI | Medium |
| Klasifikasi merek botol (YOLO) | AI | High |
| Validasi sampah → IoT bin terbuka | IoT | Medium |
| Sensor konfirmasi botol masuk | IoT | Medium |
| Reward otomatis masuk ke akun user | Reward | Low |
| Riwayat transaksi user (berapa botol, reward) | User | Low |

---

### **Fase 2 – Value Added (Optional Features)**
🎯 Tujuan: Menambah kenyamanan & engagement sederhana tanpa bikin sistem ribet.

| Feature | Category | Complexity |
|---------|-----------|------------|
| Notifikasi sederhana (misal tong penuh) | User | Low |
| Statistik personal (total botol, reward, impact sederhana) | User / Data | Low |
| Edukasi singkat (tips/infografis) | Edukasi | Low |
| Chatbot RAG sederhana (rule-based) | Edukasi | Medium |

---

### **Fase 3 – Expansion & Scaling**
🎯 Tujuan: Membuat sistem lebih scalable, menarik, dan fleksibel untuk partner/stakeholder.

| Feature | Category | Complexity |
|---------|-----------|------------|
| Multi-entry scan (beberapa botol sekaligus) | IoT / AI | Medium |
| Redirect ke tong lain (jika penuh) | IoT | Medium |
| Leaderboard lokal (kontribusi terbanyak) | User / Data | Medium |
| Dynamic reward (ukuran/merek botol → poin beda) | Reward | Medium |
| Voucher/partnership penukaran poin | Reward | Medium |
| Anomaly detection (deteksi bukan botol) | AI | High |
| Visual feedback (highlight bounding box hasil scan) | AI / UX | Medium |
| Content Hub / Artikel edukasi | Edukasi | Low |
| Survey/feedback form | User | Low |

---

📌 **Alur logis**:  
- **Fase 1** → fokus bikin sistem utama yang bisa dipakai masyarakat luas dengan flow *scan → validasi → buang → reward*.  
- **Fase 2** → tambahkan fitur ringan untuk membuat user lebih engaged (statistik, edukasi, notifikasi).  
- **Fase 3** → expand untuk skalabilitas (lebih banyak botol sekali masuk, integrasi partner, reward dinamis, anomaly detection).