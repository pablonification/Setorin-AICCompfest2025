"use client";

import Link from "next/link";

export default function SectionHeader({ title, ctaHref, ctaText }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[22px] leading-7 font-semibold text-gray-900">{title}</h2>
      {ctaHref && ctaText && (
        <Link href={ctaHref} className="text-sm text-[color:var(--color-muted)] hover:text-gray-700">
          {ctaText}
        </Link>
      )}
    </div>
  );
}


