"use client";

import Link from "next/link";

const ActionItem = ({ href, label }) => (
  <Link href={href} className="flex flex-col items-center gap-2">
    <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[var(--color-primary-700)]">
      <div className="w-7 h-7 bg-white/90 rounded-md" aria-hidden />
    </div>
    <div className="text-[12px] text-gray-800">{label}</div>
  </Link>
);

export default function ActionGrid() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <ActionItem href="/scan" label="Duitin" />
      <ActionItem href="/temuin" label="Temuin" />
      <ActionItem href="/payout" label="Tukerin" />
    </div>
  );
}


