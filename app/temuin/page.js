"use client";

import Link from "next/link";

export default function TemuinPage() {
  return (
    <div className="mobile-container font-inter">
      <div className="px-4 pt-4 pb-28 space-y-4">
        <div className="rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4">
          <div className="text-lg font-semibold">Temuin (Mock)</div>
          <p className="text-sm text-gray-600 mt-1">Peta lokasi perangkat akan tampil di sini. Untuk sementara gunakan placeholder.</p>
          <div className="mt-4 h-64 w-full bg-gray-300 rounded-[12px]" />
        </div>
        <Link href="/" className="block text-center text-[var(--color-primary-700)] font-medium">Kembali</Link>
      </div>
    </div>
  );
}


