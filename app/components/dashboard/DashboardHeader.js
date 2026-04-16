"use client";

import Link from "next/link";
import { FiBell } from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";

const getDisplayName = (name) => {
  if (!name) return "Kawan";
  return name.trim().split(/\s+/)[0];
};

export default function DashboardHeader() {
  const { user } = useAuth();
  const displayName = getDisplayName(user?.name);

  return (
    <div className="flex items-center justify-between gap-4">
      <Link
        href="/profile"
        aria-label="Buka profil"
        className="flex min-w-0 items-center gap-3"
      >
        <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-200 ring-4 ring-white/80 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <img
            src={user?.photo_url || "/profile/default-profile.jpg"}
            alt={user?.name || "Profil"}
            className="h-full w-full object-cover"
            draggable="false"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-500">Halo,</div>
          <div className="truncate text-[1.75rem] font-extrabold leading-none tracking-[-0.04em] text-[#166534]">
            {displayName}
          </div>
        </div>
      </Link>

      <Link
        href="/notifications"
        aria-label="Buka notifikasi"
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 shadow-[0_14px_35px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 transition-transform hover:-translate-y-0.5"
      >
        <FiBell className="h-5 w-5" />
        <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
      </Link>
    </div>
  );
}
