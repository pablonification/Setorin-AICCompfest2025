"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();


  if (pathname === "/login") return null;
  if (pathname.startsWith("/scan")) return null;
  if (pathname.startsWith("/history")) return null;
  if (pathname.startsWith("/temuin")) return null;
  if (pathname.startsWith("/profile/edit")) return null;
  if (pathname.startsWith("/tentang-kami")) return null;
  if (pathname.startsWith("/notifications")) return null;
  if (pathname.startsWith("/rag")) return null;
  if (pathname.startsWith("/infoin")) return null;
  if (pathname.startsWith("/statistics")) return null;
  const isActive = (href) => pathname === href;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-[430px]">
        <div className="relative bg-white border-t border-gray-200 rounded-t-[24px] [box-shadow:var(--shadow-card)] pb-[env(safe-area-inset-bottom)]">
          {/* Center FAB, floating above the bar */}
          <Link
            href="/scan"
            aria-label="Pindai"
            className="absolute left-1/2 -translate-x-1/2 -top-12"
          >
            <span
              className="flex items-center justify-center w-24 h-24 rounded-full border border-gray-200 [box-shadow:var(--shadow-fab)]"
              style={{ background: "var(--color-primary-700)" }}
            >
              <img
                src="/scan-yellow.svg"
                alt=""
                className="w-10 h-10"
                aria-hidden="true"
                draggable="false"
              />
            </span>
          </Link>

          {/* Tabs row (space for the FAB) */}
          <div className="flex items-end justify-between px-16 pt-3 pb-3">
            {/* Left: Home */}
            <Link href="/" className="flex flex-col items-center text-xs">
              <div aria-hidden>
                <img
                  src={isActive("/") ? "/beranda.svg" : "/beranda-nonactive.svg"}
                  alt=""
                  className="w-8 h-8"
                  aria-hidden="true"
                  draggable="false"
                />
              </div>
              <span className={`mt-1 ${isActive("/") ? "text-[var(--color-primary-700)]" : "text-gray-600"}`}>
                Beranda
              </span>
            </Link>
            {/* Right: Saya */}
            <Link href="/profile" className="flex flex-col items-center text-xs">
              <div aria-hidden>
                <img
                  src={isActive("/profile") ? "/profile.svg" : "/profile-nonactive.svg"}
                  alt=""
                  className="w-8 h-8"
                  aria-hidden="true"
                  draggable="false"
                />
              </div>
              <span className={`mt-1 ${isActive("/profile") ? "text-[var(--color-primary-700)]" : "text-gray-600"}`}>
                Profile
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


