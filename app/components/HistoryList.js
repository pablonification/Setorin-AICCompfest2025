"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function HistoryList({ items = [] }) {
  const authContext = useAuth();
  const token = authContext?.token ?? null;
  const [fetchedItems, setFetchedItems] = useState([]);
  const formatAmount = (n) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Math.abs(n));
  const formatDate = (iso) => {
    try {
      const date = new Date(iso);
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date).replace(",", ", ");
    } catch {
      return iso;
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        const base = process.env.NEXT_PUBLIC_BROWSER_API_URL || "http://localhost:8000";
        // Use scan history endpoint and filter client-side; newest first
        const res = await fetch(`${base}/api/scan/transactions?limit=4&success=1`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        // Keep only valid scans with positive points, take latest 4
        let positives = list.filter((t) => !!t?.valid && (t?.points ?? 0) > 0).slice(0, 4);

        // Fallback: use transactions API if scan history yields no positives
        if (positives.length === 0) {
          try {
            const res2 = await fetch(`${base}/api/transactions?limit=20&offset=0`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });
            if (res2.ok) {
              const data2 = await res2.json();
              const list2 = Array.isArray(data2) ? data2 : [];
              positives = list2.filter((t) => (t?.amount ?? 0) > 0).slice(0, 4).map((t) => ({
                id: t.id || t._id,
                title: "Tukar",
                time: formatDate(t.created_at || t.timestamp),
                amount: t.amount ?? 0,
                points: t.points ?? Math.max(0, t.amount ?? 0),
                icon: "/tukar.svg",
              }));
              setFetchedItems(positives);
              return;
            }
          } catch {}
        }

        const mapped = positives.map((t) => ({
          id: t.id || t._id,
          title: "Tukar",
          time: formatDate(t.created_at || t.timestamp),
          amount: t.points ?? 0,
          points: t.points ?? 0,
          icon: "/tukar.svg",
        }));
        setFetchedItems(mapped);
      } catch (e) {
        console.error("Failed to load last 4 transactions", e);
      }
    };
    load();
  }, [token]);

  if (!items.length && !fetchedItems.length) {
    // revised placeholder list matching requested mock data
    items = [
      { id: 1, title: "BEC Mall", time: "14:22, 17 Agustus 2025", amount: 1000, points: 1, icon: "/tukar.svg" },
      { id: 2, title: "Tarik", time: "12:00, 12 Agustus 2025", amount: -100000, points: 0, icon: "/tarik2.svg" },
      { id: 3, title: "Tarik", time: "10:15, 13 Agustus 2025", amount: -5000, points: 0, icon: "/tarik2.svg" },
      { id: 4, title: "Tukar", time: "16:40, 11 Agustus 2025", amount: 20000, points: 2, icon: "/tukar.svg" },
    ];
  }

  const dataItems = items.length ? items : fetchedItems;

  return (
    <div className="rounded-[16px] bg-[var(--color-primary-700)] text-white [box-shadow:var(--shadow-card)] p-4">
      <div className="flex items-center justify-between">
        <div className="text-base leading-6 font-semibold">Riwayat Setoran</div>
        <Link href="/history" className="text-xs px-2.5 py-1 rounded-[999px] border border-white/60 text-white/90">
          Lihat semua →
        </Link>
      </div>

      <div className="mt-2">
        {dataItems.map((it, idx) => {
          const positive = it.amount >= 0;
          return (
            <div key={it.id} className={`flex items-center gap-4 py-3 ${idx !== 0 ? "border-t border-white/10" : ""}`}>
              <div className="shrink-0">
                {it.icon ? (
                  <img src={it.icon} alt="icon" className="w-10 h-10" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/20" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{it.title}</div>
                <div className="text-xs text-white/80">{it.time}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{positive ? "+" : "-"}{formatAmount(it.amount)}</div>
                {it.points ? (
                  <div className="text-xs text-white/90">+{it.points} Setor Poin</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
