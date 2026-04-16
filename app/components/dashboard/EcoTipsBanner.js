"use client";

import Link from "next/link";
import { MOCK_DAILY_TIP } from "../../mock/data";

export default function EcoTipsBanner() {
  return (
    <section className="relative overflow-hidden rounded-[2.25rem] bg-[linear-gradient(135deg,#d9f5e3_0%,#c7ebd8_50%,#b8e5cf_100%)] px-6 py-8 shadow-[0_24px_44px_rgba(16,185,129,0.14)]">
      <div className="absolute right-6 top-4 text-[4.5rem] font-black uppercase tracking-[-0.08em] text-[#0b8a4a]/10">
        ECO
      </div>
      <div className="absolute bottom-5 right-8 h-28 w-28 rounded-[1.75rem] border border-[#0b8a4a]/14 bg-[#0b8a4a]/10" />
      <div className="relative max-w-[16rem]">
        <div className="text-xs font-black uppercase tracking-[0.32em] text-slate-800">
          {MOCK_DAILY_TIP.eyebrow}
        </div>
        <h2 className="mt-4 text-[2rem] font-extrabold leading-[1.1] tracking-[-0.05em] text-slate-900">
          {MOCK_DAILY_TIP.title}
        </h2>
        <Link
          href={MOCK_DAILY_TIP.href}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[#10281b] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(16,40,27,0.18)] transition-transform hover:-translate-y-0.5"
        >
          {MOCK_DAILY_TIP.cta}
        </Link>
      </div>
    </section>
  );
}
