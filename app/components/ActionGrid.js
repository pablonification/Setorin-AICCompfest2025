"use client";

import Link from "next/link";

const ActionItem = ({ href, iconSrc, alt }) => (
  <Link href={href} className="flex flex-col items-center">
    <img src={iconSrc} alt={alt} className="w-20 h-20" />
  </Link>
);

export default function ActionGrid() {
  return (
    <div className="grid grid-cols-3 gap-4 bg-white rounded-[12px] p-4">
      <ActionItem href="/scan" iconSrc="/duitin.svg" alt="Duitin" />
      <ActionItem href="/temuin" iconSrc="/temuin.svg" alt="Temuin" />
      <ActionItem href="/payout" iconSrc="/tukerin.svg" alt="Tukerin" />
    </div>
  );
}
