"use client";

import Link from "next/link";

export default function HistoryList({ items = [] }) {
  const formatAmount = (n) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Math.abs(n));

  if (!items.length) {
    // simple placeholder list
    items = [
      { id: 1, title: "BEC Mall IV", time: "14:22, 17 Agustus 2025", amount: 1000, points: 1 },
      { id: 2, title: "Rumah", time: "12:00, 15 Agustus 2025", amount: -10000, points: 2 },
      { id: 3, title: "Tarik", time: "12:00, 12 Agustus 2025", amount: -100000, points: 0 },
      { id: 4, title: "Top Up", time: "09:00, 12 Agustus 2025", amount: 52500, points: 5 },
    ];
  }

  return (
    <div className="rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-3">
      <div className="flex items-center justify-between px-1 py-2">
        <div className="text-[13px] font-semibold">Riwayat Setoran</div>
        <Link href="/history" className="text-[12px] text-gray-600 flex items-center gap-1">
          Lihat semua <span className="inline-block w-3 h-3 bg-gray-300 rounded" />
        </Link>
      </div>

      <div className="divide-y">
        {items.map((it) => {
          const positive = it.amount >= 0;
          return (
            <div key={it.id} className="flex items-center gap-3 py-3 px-1">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary-700)] flex items-center justify-center">
                <div className="w-4 h-4 bg-white/90 rounded" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{it.title}</div>
                <div className="text-[12px] text-gray-500">{it.time}</div>
              </div>
              <div className="text-right">
                <div className={`text-[13px] font-semibold ${positive ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
                  {positive ? "+" : "-"}{formatAmount(it.amount)}
                </div>
                {it.points ? (
                  <div className="text-[12px] text-gray-500">+{it.points} Setor Poin</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


