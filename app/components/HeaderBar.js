"use client";

import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";

export default function HeaderBar() {
  const { logout } = useAuth();

  return (
    <div className="flex items-center justify-between px-3">
      <Link href="/" aria-label="Beranda">
        <img
          src="/logo.svg"
          alt="Setorin"
          className="h-7 w-auto cursor-pointer"
          draggable="false"
        />
      </Link>
      <button
        onClick={() => logout()}
        aria-label="Keluar"
        className="p-2 cursor-pointer"
        type="button"
      >
        <img
          src="/signout.svg"
          alt="Keluar"
          className="h-5 w-5"
          draggable="false"
        />
      </button>
    </div>
  );
}
