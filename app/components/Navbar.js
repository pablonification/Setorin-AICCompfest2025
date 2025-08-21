"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout, isAdmin } = useAuth();
  
  if (pathname === "/login") return null;
  
  return (
    <div className="w-full bg-white/90 border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-5">
        {/* Left nav - Show different links based on user role */}
        {isAdmin() ? (
          // Admin navigation - only show Admin link
          <>
            <Link href="/admin" className="text-gray-800 font-semibold">Admin</Link>
            <Link href="/rag" className="text-gray-600 hover:text-gray-800">SmartBin AI Agent</Link>
          </>
        ) : (
          // End-user navigation
          <>
            <Link href="/scan" className="text-gray-800 font-semibold">Scan</Link>
            <Link href="/history" className="text-gray-600 hover:text-gray-800">History</Link>
            <Link href="/statistics" className="text-gray-600 hover:text-gray-800">Statistics</Link>
            <Link href="/education" className="text-gray-600 hover:text-gray-800">Education</Link>
            <Link href="/payout" className="text-gray-600 hover:text-gray-800">Payout</Link>
          </>
        )}

        {/* Right side - User info and actions */}
        <div className="ml-auto flex items-center gap-4">
          {/* User info */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-700">
              {user?.name} - {user?.points} points
            </span>
            {isAdmin() && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                Admin
              </span>
            )}
          </div>

          {/* Notifications */}
          <NotificationBell />

          {/* Connection status indicator */}
          <div className="w-3 h-3 bg-green-500 rounded-full" title="Connected" />

          {/* Logout button */}
          <button
            onClick={logout}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
