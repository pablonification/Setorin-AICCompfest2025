# ♻️ Setorin — Sistem Poin→Rupiah berbasis Ukuran & Koefisien (Draft v1)

Dokumen ini merancang sistem konversi **poin langsung ke Rupiah** untuk Setorin, berbasis **ukuran botol PET** dan **koefisien kualitas/deteksi**. Dirancang agar **transparan**, **adil**, dan **mudah dioperasikan** lintas wilayah/mitra.

---

## 1) Rumus Inti

**Payout per botol (Rp)**

```
Rp = (berat_estimasi_kg(size, brand))
     × (harga_PET_Rp_per_kg_lokal)
     × (K_brand) × (K_kepercayaan_ukur) × (K_kebersihan) × (K_label_tutup)
```

**Keterangan variabel**

* `berat_estimasi_kg(size, brand)`: estimasi berat kosong botol (tanpa isi; bisa termasuk/eksklusif tutup & label tergantung kebijakan).
* `harga_PET_Rp_per_kg_lokal`: harga beli PET/kg yang bisa diubah admin per wilayah/mitra.
* `K_*`: koefisien kualitas/deteksi (0–1.1) yang memodulasi payout agar adil sekaligus mendorong perilaku baik (bersih, dipilah, akurat).

> **Catatan desain:** Jika confidence deteksi terlalu rendah, transaksi tidak dihitung dan pengguna diminta memotret ulang.

---

## 2) Ukuran Umum & Berat Estimasi (Default)

Ukuran botol air minum yang paling sering muncul di Indonesia dan **berat kosong default** (konservatif):

| Ukuran | Berat (g) | Berat (kg) |
| ------ | --------: | ---------: |
| 330 ml |      10.5 |     0.0105 |
| 600 ml |      16.0 |     0.0160 |
| 750 ml |      22.0 |     0.0220 |
| 1.5 L  |      30.0 |     0.0300 |

> **Brand override:** Jika merek/seri + ukuran terdeteksi, berat bisa dioverride dengan nilai spesifik brand (misal AQUA 600 ml = 16.0 g; AQUA 1.5 L = 30.0 g).

---

## 3) Koefisien yang Disarankan

### a) K\_brand (deteksi merek/seri)

* Teridentifikasi (merek+ukuran match katalog): **1.00**
* **Brand tidak terdeteksi**, gunakan koefisien per-ukuran:

  * 330 ml → **0.93**
  * 600 ml → **0.95**
  * 750 ml → **0.96**
  * 1.5 L → **0.97**

### b) K\_kepercayaan\_ukur (confidence dimensi/ukuran)

* ≥ 0.85 → **1.00**
* 0.70–0.84 → **0.97**
* 0.50–0.69 → **0.93**
* < 0.50 → **Reject** (minta foto ulang)

### c) K\_kebersihan

* Bersih & kering → **1.00**
* Sedikit kotor/berembun → **0.95**
* Kotor/berminyak/berbau → **0.85**

### d) K\_label\_tutup

* Dipisah sesuai kategori (tutup PP & label dipilah) → **1.02** (bonus 2%)
* Tidak dipisah → **1.00**
* Kontaminasi (campur non-PET) → **0.95**

---

## 4) Contoh Perhitungan Payout

**Asumsi harga PET** `harga_PET_Rp_per_kg_lokal = Rp 3.700/kg` (dapat disetel per wilayah).

**Kondisi ideal** (brand terdeteksi, bersih, confidence tinggi, label/tutup tidak dipisah → semua K=1):

| Ukuran | Berat (kg) | Rp = berat × 3.700 |
| ------ | ---------: | -----------------: |
| 330 ml |     0.0105 |          **Rp 39** |
| 600 ml |     0.0160 |          **Rp 59** |
| 750 ml |     0.0220 |          **Rp 81** |
| 1.5 L  |     0.0300 |         **Rp 111** |

**Jika brand tidak terdeteksi** (ukuran sama; kalikan K\_brand):

* 330 ml: 39 × 0.93 ≈ **Rp 36**
* 600 ml: 59 × 0.95 ≈ **Rp 56**
* 750 ml: 81 × 0.96 ≈ **Rp 78**
* 1.5 L: 111 × 0.97 ≈ **Rp 108**

**Jika bersih + label/tutup dipisah**, tambahkan **+2%** (mis. 600 ml ideal → ±**Rp 60**).

> Angka kecil itu wajar karena basisnya **harga kiloan**. Transparansi konversi wajib ditampilkan ke pengguna.

---

## 5) Struktur Konfigurasi (JSON)

Konfigurasi ini disimpan di server dan dapat diedit dari panel admin per wilayah/mitra.

```json
{
  "size_weights_g": {
    "330ml": 10.5,
    "600ml": 16.0,
    "750ml": 22.0,
    "1500ml": 30.0
  },
  "brand_overrides_g": {
    "AQUA_600": 16.0,
    "AQUA_1500": 30.0
  },
  "pet_price_idr_per_kg": 3700,
  "coefficients": {
    "brand_unknown": {"330ml": 0.93, "600ml": 0.95, "750ml": 0.96, "1500ml": 0.97},
    "confidence": [
      {"min": 0.85, "k": 1.00},
      {"min": 0.70, "k": 0.97},
      {"min": 0.50, "k": 0.93}
    ],
    "cleanliness": {"clean_dry": 1.00, "slightly_dirty": 0.95, "dirty": 0.85},
    "cap_label": {"separated": 1.02, "mixed": 1.00, "contaminated": 0.95}
  },
  "rounding": "round"
}
```

---

## 6) Pipeline Penilaian (Edge → Server)

1. **Deteksi**: Model vision mendeteksi *merek/seri* (jika ada), *dimensi* (tinggi/diameter), dan *ukuran* (330/600/750/1500 ml) beserta **confidence**.
2. **Estimasi berat**: gunakan `brand_overrides_g` jika tersedia; jika tidak, `size_weights_g`.
3. **Ambil koefisien**:

   * `K_brand` = 1.00 jika merek match; bila tidak → `coefficients.brand_unknown[size]`.
   * `K_kepercayaan_ukur` = dari bin `confidence`.
   * `K_kebersihan` = hasil checklist/deteksi visual.
   * `K_label_tutup` = input user/deteksi material di leher botol.
4. **Hitung payout** dan **bulatkan** (disarankan `round` ke rupiah terdekat; opsi lain `ceil` agar pro-user).
5. **Audit log**: simpan semua faktor per transaksi (ukuran, berat estimasi, K-K, harga/kg, hasil Rp) untuk transparansi & debugging.

---

## 7) Transparansi di Aplikasi

* Tampilkan **rincian hitung**: `berat (g) × harga/kg × K_brand × K_conf × K_bersih × K_label = Rp ...`
* Cantumkan **harga PET/kg** yang berlaku + **tanggal terakhir diperbarui** + **wilayah**.
* Tautkan **“Kenapa poin saya segini?”** berisi penjelasan kebijakan kualitas & contoh.

---

## 8) Roadmap Penajaman

* **Kalibrasi berat per brand**: kumpulkan sampel nyata untuk update `brand_overrides_g`.
* **Dynamic pricing**: jadwal update mingguan/bulanan per mitra; simpan histori harga.
* **Confidence gating adaptif**: ubah threshold berdasarkan kondisi cahaya/latar.
* **Quality ML**: klasifikasi kebersihan & deteksi pemisahan tutup/label otomatis.
* **Gamifikasi non-monetary**: badge/streak/misi agar pengalaman lebih engaging tanpa mengubah rumus dasar.

---

## 9) Contoh Helper (TypeScript, pseudo)

```ts
interface Config {
  size_weights_g: Record<string, number>;
  brand_overrides_g: Record<string, number>;
  pet_price_idr_per_kg: number;
  coefficients: {
    brand_unknown: Record<string, number>;
    confidence: { min: number; k: number }[];
    cleanliness: Record<string, number>;
    cap_label: Record<string, number>;
  };
  rounding: "round" | "ceil" | "floor";
}

function pickConfidenceK(conf: number, bins: {min:number;k:number}[]): number {
  const sorted = [...bins].sort((a,b)=>b.min-a.min);
  for (const bin of sorted) if (conf >= bin.min) return bin.k;
  return NaN; // trigger retry
}

export function computePayoutRp(
  cfg: Config,
  sizeKey: "330ml"|"600ml"|"750ml"|"1500ml",
  brandKey: string | null,
  conf: number,
  cleanlinessKey: keyof Config["coefficients"]["cleanliness"],
  capLabelKey: keyof Config["coefficients"]["cap_label"]
): number | null {
  const gOverride = brandKey ? cfg.brand_overrides_g[brandKey] : undefined;
  const weight_g = gOverride ?? cfg.size_weights_g[sizeKey];
  const weight_kg = weight_g / 1000;

  const K_brand = brandKey ? 1.0 : cfg.coefficients.brand_unknown[sizeKey];
  const K_conf = pickConfidenceK(conf, cfg.coefficients.confidence);
  if (!Number.isFinite(K_conf)) return null; // minta foto ulang
  const K_clean = cfg.coefficients.cleanliness[cleanlinessKey];
  const K_cap = cfg.coefficients.cap_label[capLabelKey];

  const base = weight_kg * cfg.pet_price_idr_per_kg;
  let payout = base * K_brand * K_conf * K_clean * K_cap;

  if (cfg.rounding === "ceil") payout = Math.ceil(payout);
  else if (cfg.rounding === "floor") payout = Math.floor(payout);
  else payout = Math.round(payout);

  return payout;
}
```

---

**Status**: Draft v1 siap diimplementasikan. Silakan tandai bagian yang ingin diubah (angka berat, koefisien, atau harga/kg default), nanti akan diperbarui di sini.
