"use client";

import Link from "next/link";

const ActionItem = ({
  href,
  iconSrc,
  alt,
  imgClassName = "w-full h-full object-cover",
  containerClassName = "w-20 h-20",
  labelClassName = "mt-2 text-xs font-medium text-[var(--color-muted)]"
}) => (
  <Link href={href} className="flex flex-col items-center">
    <div className={`${containerClassName} flex items-center justify-center bg-[var(--color-card)]`}>
      <img
        src={iconSrc}
        alt={alt}
        className={imgClassName}
        draggable="false"
      />
    </div>
    <span className={labelClassName}>{alt}</span>
  </Link>
);

export default function ActionGrid() {
  return (
    <div className="grid grid-cols-3 bg-white rounded-[12px] p-4">
      <ActionItem href="/infoin" iconSrc="/infoin.svg" alt="Infoin" />
      <ActionItem
        href="/scan"
        iconSrc="/duitin.avif"
        alt="Duitin"
        containerClassName="w-[102px] h-[102px] -translate-y-[8.5px]"
        imgClassName="w-full h-full object-contain"
        labelClassName="mt-1 -translate-y-[18px] text-xs font-medium text-[var(--color-muted)]"
      />
      <ActionItem href="/temuin" iconSrc="/temuin.svg" alt="Temuin" />
    </div>
  );
}
