"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiBookOpen, FiClock, FiHome, FiUser } from "react-icons/fi";

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;
  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/scan")) return null;
  if (pathname.startsWith("/history")) return null;
  if (pathname.startsWith("/temuin")) return null;
  if (pathname.startsWith("/profile/edit")) return null;
  if (pathname.startsWith("/tentang-kami")) return null;
  if (pathname.startsWith("/notifications")) return null;
  if (pathname.startsWith("/rag")) return null;
  if (pathname.startsWith("/infoin")) return null;
  if (pathname.startsWith("/statistics")) return null;
  if (pathname.startsWith("/ketentuan-layanan")) return null;
  if (pathname.startsWith("/faq")) return null;
  if (pathname.startsWith("/setor-level")) return null;
  const isActive = (href) => pathname === href;
  const navItems = [
    { href: "/", label: "Beranda", icon: FiHome },
    { href: "/history", label: "Aktivitas", icon: FiClock },
    { href: "/infoin", label: "Edukasi", icon: FiBookOpen },
    { href: "/profile", label: "Profil", icon: FiUser },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-[430px] px-4 pb-4">
        <div className="relative rounded-[2rem] bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-4 shadow-[0_24px_48px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 backdrop-blur">
          <Link
            href="/scan"
            aria-label="Pindai"
            className="absolute left-1/2 -translate-x-1/2 -top-7"
          >
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full border-[6px] border-white bg-[#0b8a4a] shadow-[0_18px_32px_rgba(11,138,74,0.34)] transition-transform hover:-translate-y-0.5"
            >
              <img src="/scan-yellow.svg" alt="" className="h-7 w-7" aria-hidden="true" draggable="false" />
            </span>
          </Link>

          <div className="grid grid-cols-5 items-end pt-1">
            {navItems.slice(0, 2).map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex flex-col items-center gap-1 text-[0.72rem]">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                    isActive(href) ? "bg-emerald-50 text-[#0b8a4a]" : "text-slate-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className={isActive(href) ? "font-bold text-[#0b8a4a]" : "font-medium text-slate-500"}>
                  {label}
                </span>
              </Link>
            ))}

            <div className="h-14" aria-hidden="true" />

            {navItems.slice(2).map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex flex-col items-center gap-1 text-[0.72rem]">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                    isActive(href) ? "bg-emerald-50 text-[#0b8a4a]" : "text-slate-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className={isActive(href) ? "font-bold text-[#0b8a4a]" : "font-medium text-slate-500"}>
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

