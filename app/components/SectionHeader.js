"use client";

import Link from "next/link";

export default function SectionHeader({ title, ctaHref, ctaText }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-inter font-bold text-sm leading-none align-middle text-[var(--color-primary-700)]">{title}</h2>
      {ctaHref && ctaText && (
        <Link href={ctaHref} className="font-inter font-bold text-sm leading-none align-middle text-[var(--color-primary-700)]">
          {ctaText}
        </Link>
      )}
    </div>
  );
}


