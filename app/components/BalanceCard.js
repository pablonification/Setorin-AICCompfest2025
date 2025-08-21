"use client";

import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";

export default function BalanceCard() {
  const { user } = useAuth();
  const points = typeof user?.points === "number" ? user.points : 0;
  const levelTarget = 150; // placeholder target
  const progress = Math.min(100, Math.round((points % levelTarget) / levelTarget * 100));

  return (
    <div className="rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-gray-600">Saldo Setoran</div>
          <div className="text-2xl font-semibold text-gray-900">Rp0</div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/payout"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100"
            aria-label="Top up"
          >
            <div className="w-5 h-5 placeholder-tile" />
          </Link>
          <Link
            href="/payout"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100"
            aria-label="Tarik"
          >
            <div className="w-5 h-5 placeholder-tile" />
          </Link>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-4 rounded-[12px] p-3" style={{ backgroundImage: "var(--gradient-primary)", backgroundBlendMode: "multiply" }}>
        <div className="text-white text-xs flex justify-between">
          <span>Level Perintis</span>
          <span>Setor Poin</span>
        </div>
        <div className="mt-2 h-2 bg-white/30 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1 text-white text-sm font-medium text-right">{points % levelTarget}/{levelTarget}</div>
      </div>
    </div>
  );
}


