"use client";

import Link from "next/link";
import { FiArrowUpRight, FiMapPin, FiTrash2 } from "react-icons/fi";
import { MOCK_NEARBY_SMART_BINS } from "../../mock/data";

export default function SmartBinSection() {
  const bin = MOCK_NEARBY_SMART_BINS[0];

  if (!bin) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[1.9rem] font-extrabold tracking-[-0.04em] text-slate-900">
          Smart Bin Terdekat
        </h2>
        <Link
          href={bin.href}
          className="text-sm font-bold text-[#0b8a4a]"
        >
          Lihat Semua
        </Link>
      </div>

      <Link
        href={bin.href}
        className="flex items-center gap-4 rounded-[2rem] bg-[#f1f4f6] p-4 shadow-[0_16px_35px_rgba(148,163,184,0.12)] ring-1 ring-white"
      >
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#223125] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <FiTrash2 className="h-7 w-7" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.28em] text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {bin.status}
          </div>
          <div className="truncate text-lg font-bold text-slate-800">
            {bin.name}
          </div>
          <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <FiMapPin className="h-4 w-4" />
            <span>{bin.distance_label}</span>
          </div>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#0b8a4a]">
          <FiArrowUpRight className="h-5 w-5" />
        </div>
      </Link>
    </section>
  );
}
