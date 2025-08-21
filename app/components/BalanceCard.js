"use client";

import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";

export default function BalanceCard() {
  const { user } = useAuth();
  const points = typeof user?.points === "number" ? user.points : 0;

  // Tier thresholds and labels
  const tiers = [
    { name: "Perintis", threshold: 0, next: 5000 },
    { name: "Penjelajah", threshold: 5000, next: 20000 },
    { name: "Panutan", threshold: 20000, next: 50000 },
    { name: "Pewaris", threshold: 50000, next: 75000 },
  ];

  // Determine current tier based on points
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
  const formattedBalance = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(points);

  return (
    <div className="rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1">
            <img
              src="/saldosetoran.svg"
              alt="Saldo Setoran"
              className="w-5 h-5"
            />
            <div className="text-xs font-semibold text-[var(--color-primary-700)]">
              Saldo Setoran
            </div>
          </div>

          <div className="text-2xl font-semibold text-gray-900">
            Rp{formattedBalance}
          </div>  
        </div>
        <div className="flex gap-2 translate-y-1">
          <Link
            href="/payout"
            aria-label="Tarik"
            className="w-9 h-9 flex flex-col items-center justify-center"
          >
            <span className="text-xs text-[var(--color-primary-700)] font-semibold mt-1">
              Tarik
            </span>
            <img src="/tarik.svg" alt="Tarik" className="w-7 h-7" />
          </Link>
        </div>
      </div>

      {/* Progress */}
      <div
        className="mt-4 rounded-[12px] p-3"
        style={{
          backgroundImage: "var(--gradient-primary)",
          backgroundBlendMode: "multiply",
        }}
      >
        <div className="text-white text-xs flex justify-between">
          <span>Level {currentTier.name}</span>
          <span>Setor Poin</span>
        </div>
        <div className="mt-2 h-2 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1 text-white text-sm font-medium text-right">
          {relative}/{range}
        </div>
      </div>
    </div>
  );
}
