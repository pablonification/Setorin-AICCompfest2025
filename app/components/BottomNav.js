"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  // Hide on login page
  if (pathname === "/login") return null;

  const isActive = (href) => pathname === href;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-[430px]">
        <div className="relative bg-white border-t [box-shadow:var(--shadow-card)] rounded-t-[16px]">
          <div className="flex items-end justify-between px-8 pt-2 pb-4">
            {/* Left: Home */}
            <Link href="/" className="flex flex-col items-center text-xs">
              <div
                className={`w-7 h-7 rounded-md ${
                  isActive("/") ? "bg-[var(--color-primary-700)]" : "bg-gray-300"
                }`}
                aria-hidden
              />
              <span className={`mt-1 ${isActive("/") ? "text-[var(--color-primary-700)]" : "text-gray-600"}`}>
                Beranda
              </span>
            </Link>

            {/* Center FAB: Scan */}
            <Link
              href="/scan"
              className="-mt-8 w-16 h-16 rounded-full flex items-center justify-center [box-shadow:var(--shadow-fab)]"
              style={{ backgroundImage: "var(--gradient-primary)" }}
              aria-label="Pindai"
            >
              <div className="w-7 h-7 bg-white/90 rounded-md" aria-hidden />
            </Link>

            {/* Right: Saya (History for now) */}
            <Link href="/history" className="flex flex-col items-center text-xs">
              <div
                className={`w-7 h-7 rounded-md ${
                  isActive("/history") ? "bg-[var(--color-primary-700)]" : "bg-gray-300"
                }`}
                aria-hidden
              />
              <span className={`mt-1 ${isActive("/history") ? "text-[var(--color-primary-700)]" : "text-gray-600"}`}>
                Saya
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


