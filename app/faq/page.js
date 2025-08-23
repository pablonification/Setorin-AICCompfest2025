"use client";

import { useState, useId } from "react";
import Link from "next/link";
import TopBar from "../components/TopBar";

function FaqItem({ index, question, answer }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonId = `${panelId}-button`;

  return (
    <div className="border-b border-white/20 last:border-b-0">
      <button
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left py-4 flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
      >
        <span className="text-white text-base leading-5 font-medium">
          {question}
        </span>
        <img
          src={open ? "/panah-atas.svg" : "/panah-bawah.svg"}
          alt=""
          aria-hidden="true"
          className="w-5 h-5 shrink-0"
          draggable="false"
        />
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="pb-4 text-white/90 text-sm leading-5"
        >
          {answer}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const faqs = [
    {
      q: "Apa itu Setorin?",
      a:
        "Setorin adalah platform daur ulang pintar. Kami mengubah sampah terpilah menjadi aset bernilai melalui Setorin dan mitra pengepul.",
    },
    {
      q: "Bagaimana cara mencairkan saldo duitin?",
      a:
        "Saldo dapat ditarik ke e-wallet atau rekening bank yang terverifikasi. Buka menu Tarik, pilih tujuan, masukkan nominal, lalu konfirmasi.",
    },
    {
      q: "Bagaimana cara setorin sampah di Setorin?",
      a:
        "Buka menu Temuin untuk menemukan Setorin Bin terdekat di peta, lalu taruh botol diatas tempat sampah, lakukan scan melalui aplikasi, tunggu tutup tempat sampah terbuka, masukkan sampah. Sistem otomatis memberi poin dan saldo setelah sampah divalidasi.",
    },
    {
      q: "Sampah jenis apa saja yang bisa disetorin?",
      a:
        "Utamanya plastik PET, HDPE, dan PP.",
    },
    {
      q: "Kapan insentif/saldo akan masuk setelah saya setor sampah?",
      a:
        "Biasanya instan setelah validasi. Jika antrian sibuk, proses maksimal 1x24 jam pada hari kerja. Hubungi kami bila lebih lama dari itu.",
    },
  ];

  return (
    <div className="w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
      <TopBar
        title="Seputar Setorin"
        backHref="/"
      />

      {/* Content */}
      <div className="px-4 pb-24 pt-5">
        <div className="rounded-[var(--radius-lg)] [box-shadow:var(--shadow-card)]" style={{ background: "var(--color-primary-700)" }}>
          <div className="px-4">
            {faqs.map((item, idx) => (
              <FaqItem key={idx} index={idx} question={item.q} answer={item.a} />
            ))}
          </div>

          <div className="px-4 pt-2 pb-6 text-center">
            <p className="text-white/90 text-sm">
              Tidak menemukan jawaban yang Anda cari?
            </p>
            <p className="text-white/80 text-sm">
              Jangan ragu untuk menghubungi kami!
            </p>
            <Link
              href="mailto:arqilasp@gmail.com"
              className="inline-flex items-center gap-2 text-[var(--color-primary-700)] bg-white/95 hover:bg-white text-sm font-semibold px-4 py-2 rounded-[var(--radius-pill)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white mt-4"
            >
              Hubungi Kami
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


