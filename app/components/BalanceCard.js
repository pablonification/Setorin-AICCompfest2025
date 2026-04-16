"use client";

import Link from "next/link";
import { FiArrowUpRight } from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";

export default function BalanceCard() {
  const { user } = useAuth();
  const points = typeof user?.points === "number" ? user.points : 0;

  const tiers = [
    { name: "Perintis", threshold: 0, next: 5000 },
    { name: "Penjelajah", threshold: 5000, next: 20000 },
    { name: "Panutan", threshold: 20000, next: 50000 },
    { name: "Pewaris", threshold: 50000, next: 75000 },
  ];

  const currentTier = (() => {
    if (points < 5000) return tiers[0];
    if (points < 20000) return tiers[1];
    if (points < 50000) return tiers[2];
    return tiers[3];
  })();

  const nextThreshold = currentTier.next;
  const base = currentTier.threshold;
  const range = Math.max(1, (nextThreshold ?? points) - base);
  const relative = Math.max(0, Math.min(points - base, range));
  const progress = Math.min(100, Math.round((relative / range) * 100));
  const formattedPoints = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(points);
  const formattedValue = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(points);

  return (
    <div
      className="relative overflow-hidden rounded-[2.5rem] px-6 py-7 text-white shadow-[0_28px_55px_rgba(8,109,57,0.28)]"
      style={{
        backgroundImage:
          "linear-gradient(135deg, #056c38 0%, #0c7a44 58%, #138753 100%)",
      }}
    >
      <div className="pointer-events-none absolute -left-10 top-8 h-28 w-28 rounded-full bg-[#b8f5c4]/10 blur-2xl" />
      <div className="pointer-events-none absolute -right-6 bottom-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="max-w-[11rem]">
          <div className="text-lg font-medium tracking-[0.02em] text-emerald-50/90">
            Total Poin Kamu
          </div>
          <div className="mt-2 text-[2.25rem] font-extrabold leading-none tracking-[-0.05em]">
            {formattedPoints} Poin
          </div>
        </div>

        <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-emerald-50/90 backdrop-blur-sm">
          {currentTier.name}
        </div>
      </div>

      <div className="relative mt-8 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-emerald-50/80">Nilai Konversi Rupiah</div>
          <div className="mt-1 text-[1.95rem] font-bold leading-none tracking-[-0.05em] text-white">
            {formattedValue}
          </div>
        </div>

        <div className="shrink-0">
          <Link
            href="/payout"
            aria-label="Tarik Poin"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#0a6e3c] shadow-[0_12px_30px_rgba(7,39,21,0.18)] transition-transform hover:-translate-y-0.5"
          >
            <span>Tarik Poin</span>
            <FiArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <Link
        href="/setor-level"
        aria-label="Lihat progres level"
        className="relative mt-6 block rounded-[1.5rem] border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
          <span>Level {currentTier.name}</span>
          <span>{progress}% tercapai</span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-sm text-white/80">
          <span>{relative.toLocaleString("id-ID")} poin terkumpul</span>
          <span>{range.toLocaleString("id-ID")} target berikutnya</span>
        </div>
      </Link>
    </div>
  );
}
