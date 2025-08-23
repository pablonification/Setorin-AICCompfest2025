"use client";

import TopBar from "../components/TopBar";

export default function KetentuanLayananPage() {
  return (
    <div className="w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
      {/* Header */}
      <TopBar title="Ketentuan Layanan" />

      <main className="px-6 pt-6 pb-28 text-[var(--color-primary-700)]">
        {/* Logo */}
        <div className="mx-auto mt-2 mb-6 w-max">
          <img src="/tentang-kami/setorin-logo.svg" alt="Setorin" className="h-16" />
        </div>

        {/* Introduction */}
        <div className="mb-6">
          <h1 className="text-center text-lg font-semibold mb-4">Ketentuan Layanan Setorin</h1>
          <p className="text-center text-sm leading-6 text-[color:var(--color-muted)]">
            Terakhir diperbarui: {new Date().toLocaleDateString('id-ID')}
          </p>
        </div>

        {/* Terms Content */}
        <div className="space-y-6 text-sm leading-6">
          {/* 1. Acceptance of Terms */}
          <section>
            <h2 className="font-semibold mb-2">1. Penerimaan Ketentuan</h2>
            <p className="text-[color:var(--color-muted)]">
              Dengan mengakses dan menggunakan aplikasi Setorin, Anda menyetujui dan terikat oleh Ketentuan Layanan ini. Jika Anda tidak menyetujui ketentuan ini, mohon untuk tidak menggunakan layanan kami.
            </p>
          </section>

          {/* 2. Description of Service */}
          <section>
            <h2 className="font-semibold mb-2">2. Deskripsi Layanan</h2>
            <p className="text-[color:var(--color-muted)] mb-2">
              Setorin adalah platform ekosistem yang membantu Anda mengubah sampah terpilah menjadi aset bernilai melalui:
            </p>
            <ul className="list-disc list-inside text-[color:var(--color-muted)] space-y-1 ml-2">
              <li>Pengumpulan sampah terpilah</li>
              <li>Penukaran sampah menjadi saldo/points</li>
              <li>Layanan penjemputan sampah</li>
              <li>Edukasi tentang daur ulang</li>
            </ul>
          </section>

          {/* 3. User Responsibilities */}
          <section>
            <h2 className="font-semibold mb-2">3. Tanggung Jawab Pengguna</h2>
            <p className="text-[color:var(--color-muted)] mb-2">Sebagai pengguna, Anda bertanggung jawab untuk:</p>
            <ul className="list-disc list-inside text-[color:var(--color-muted)] space-y-1 ml-2">
              <li>Memastikan sampah yang disetor sudah terpilah dengan benar</li>
              <li>Menjaga kebersihan dan keamanan sampah yang akan disetor</li>
              <li>Tidak menyetor sampah berbahaya atau ilegal</li>
              <li>Menggunakan saldo/points sesuai dengan syarat dan ketentuan</li>
            </ul>
          </section>

          {/* 4. Points and Rewards System */}
          <section>
            <h2 className="font-semibold mb-2">4. Sistem Points dan Rewards</h2>
            <p className="text-[color:var(--color-muted)] mb-2">
              Points yang Anda peroleh dari penyetoran sampah dapat digunakan untuk:
            </p>
            <ul className="list-disc list-inside text-[color:var(--color-muted)] space-y-1 ml-2">
              <li>Tukar dengan saldo tunai</li>
              <li>Produk atau layanan dari partner</li>
              <li>Donasi untuk program lingkungan</li>
            </ul>
            <p className="text-[color:var(--color-muted)] mt-2">
              Points memiliki masa berlaku dan dapat berubah berdasarkan kebijakan Setorin.
            </p>
          </section>

          {/* 5. Privacy Policy */}
          <section>
            <h2 className="font-semibold mb-2">5. Kebijakan Privasi</h2>
            <p className="text-[color:var(--color-muted)]">
              Kami menghormati privasi Anda. Data pribadi yang dikumpulkan hanya digunakan untuk keperluan layanan dan tidak akan dibagikan kepada pihak ketiga tanpa persetujuan Anda, kecuali diperlukan oleh hukum.
            </p>
          </section>

          {/* 6. Limitation of Liability */}
          <section>
            <h2 className="font-semibold mb-2">6. Batasan Tanggung Jawab</h2>
            <p className="text-[color:var(--color-muted)]">
              Setorin tidak bertanggung jawab atas kerugian yang timbul dari penggunaan layanan ini, termasuk namun tidak terbatas pada kerusakan, kehilangan, atau gangguan layanan.
            </p>
          </section>

          {/* 7. Service Changes */}
          <section>
            <h2 className="font-semibold mb-2">7. Perubahan Layanan</h2>
            <p className="text-[color:var(--color-muted)]">
              Setorin berhak mengubah, menangguhkan, atau menghentikan layanan kapan saja tanpa pemberitahuan sebelumnya. Kami akan berupaya memberikan pemberitahuan kepada pengguna tentang perubahan signifikan.
            </p>
          </section>

          {/* 8. Contact Information */}
          <section>
            <h2 className="font-semibold mb-2">8. Kontak</h2>
            <p className="text-[color:var(--color-muted)]">
              Jika Anda memiliki pertanyaan tentang Ketentuan Layanan ini, silakan hubungi kami melalui:
            </p>
            <div className="mt-2 p-3 bg-[var(--color-card)] rounded-[var(--radius-md)]">
              <p className="text-[color:var(--color-primary-700)] font-medium">Email: arqilasp@gmail.com</p>
              <p className="text-[color:var(--color-primary-700)] font-medium">WhatsApp: +62 851-5534-7701</p>
            </div>
          </section>

          {/* 9. Governing Law */}
          <section>
            <h2 className="font-semibold mb-2">9. Hukum yang Berlaku</h2>
            <p className="text-[color:var(--color-muted)]">
              Ketentuan Layanan ini diatur oleh hukum Republik Indonesia. Setiap perselisihan yang timbul akan diselesaikan melalui pengadilan di wilayah hukum Republik Indonesia.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[color:var(--color-muted)]">
            Terima kasih telah menggunakan Setorin untuk berkontribusi dalam menjaga lingkungan.
          </p>
        </div>
      </main>
    </div>
  );
}
