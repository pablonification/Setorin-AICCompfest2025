"use client";

import Link from "next/link";

export default function SettingsRow({ href = "#", icon, label, meta, badge }) {
  return (
    <Link href={href} className="flex items-center justify-between px-4 py-3 rounded-[var(--radius-sm)] bg-gray-50">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-md bg-[var(--color-primary-700)]" aria-hidden />
        <div className="font-inter font-semibold text-sm leading-none align-middle text-[var(--color-primary-700)]">{label}</div>
      </div>
      <div className="flex items-center gap-3">
        {typeof badge === 'number' && badge > 0 && (
          <span className="text-xs bg-[var(--color-primary-700)] text-white px-2 py-0.5 rounded-full">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
        {meta && <div className="font-inter font-semibold text-xs leading-none align-middle text-[var(--color-primary-700)]">{meta}</div>}
        <div className="w-5 h-5 rounded-md bg-gray-300" aria-hidden />
      </div>
    </Link>
  );
}


