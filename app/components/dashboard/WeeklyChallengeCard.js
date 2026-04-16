"use client";

import Link from "next/link";
import { MOCK_WEEKLY_CHALLENGE } from "../../mock/data";

export default function WeeklyChallengeCard() {
  const progress = Math.min(
    100,
    Math.round(
      (MOCK_WEEKLY_CHALLENGE.current_bottles / MOCK_WEEKLY_CHALLENGE.target_bottles) * 100
    )
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[1.9rem] font-extrabold tracking-[-0.04em] text-slate-900">
          Riwayat Penukaran
        </h2>
        <Link
          href={MOCK_WEEKLY_CHALLENGE.href}
          className="text-sm font-bold text-[#0b8a4a]"
        >
          Lihat Semua
        </Link>
      </div>

      <div className="rounded-[2rem] bg-white p-6 shadow-[0_24px_45px_rgba(148,163,184,0.12)] ring-1 ring-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[1.7rem] font-extrabold tracking-[-0.04em] text-slate-900">
              {MOCK_WEEKLY_CHALLENGE.title}
            </div>
            <p className="mt-4 max-w-[18rem] text-[1.02rem] leading-7 text-slate-600">
              {MOCK_WEEKLY_CHALLENGE.description}
            </p>
          </div>

          <div className="shrink-0 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-[#0b8a4a]">
            {MOCK_WEEKLY_CHALLENGE.reward_points} Poin
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 text-sm">
          <span className="font-bold text-slate-500">Progress</span>
          <span className="font-bold text-slate-700">
            {MOCK_WEEKLY_CHALLENGE.current_bottles} / {MOCK_WEEKLY_CHALLENGE.target_bottles} Botol
          </span>
        </div>

        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#0fa958] to-[#0b8a4a]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </section>
  );
}
