"use client";

import Link from "next/link";

const ActionItem = ({
  href,
  iconSrc,
  alt,
  tintClassName,
  subtitle,
  imgClassName = "h-8 w-8 object-contain",
}) => (
  <Link
    href={href}
    className="group rounded-[1.75rem] bg-white px-3 py-4 text-left shadow-[0_18px_35px_rgba(148,163,184,0.12)] ring-1 ring-slate-100 transition-transform hover:-translate-y-0.5"
  >
    <div
      className={`flex h-14 w-14 items-center justify-center rounded-[1.1rem] ${tintClassName}`}
    >
      <img
        src={iconSrc}
        alt={alt}
        className={imgClassName}
        draggable="false"
      />
    </div>
    <div className="mt-4 text-sm font-bold text-slate-900">{alt}</div>
    <div className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</div>
  </Link>
);

export default function ActionGrid() {
  return (
    <div className="grid grid-cols-3 gap-3">
      <ActionItem
        href="/infoin"
        iconSrc="/infoin.svg"
        alt="Infoin"
        subtitle="Tips dan artikel"
        tintClassName="bg-emerald-50"
      />
      <ActionItem
        href="/scan"
        iconSrc="/scan-yellow.svg"
        alt="Duitin"
        subtitle="Scan botolmu"
        tintClassName="bg-[#fff6d7]"
      />
      <ActionItem
        href="/temuin"
        iconSrc="/temuin.svg"
        alt="Temuin"
        subtitle="Cari smart bin"
        tintClassName="bg-sky-50"
      />
    </div>
  );
}
