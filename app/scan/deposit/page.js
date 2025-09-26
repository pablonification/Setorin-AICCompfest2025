"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/auth/context"; // adjust path if different

export const dynamic = "force-dynamic";

export default function DepositPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const scanId = sp.get("scan_id");
  const actionId = sp.get("action_id");
  const durationParam = parseInt(sp.get("duration") || "12", 10);
  const { user } = useAuth();

  const [secondsLeft, setSecondsLeft] = useState(durationParam);
  const [status, setStatus] = useState("waiting_for_deposit");
  const [brand, setBrand] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [finalMessage, setFinalMessage] = useState("");
  const doneRef = useRef(false);

  // Countdown timer
  useEffect(() => {
    if (status !== "waiting_for_deposit") return;
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, status]);

  // Auto mark timeout if countdown hits 0 and no final state
  useEffect(() => {
    if (secondsLeft === 0 && status === "waiting_for_deposit") {
      setStatus("timeout_pending");
      // We'll still wait a tiny grace (2s) for any late WS event before finalizing
      const grace = setTimeout(() => {
        if (!doneRef.current) {
          setStatus("deposit_timeout");
          setFinalMessage("Waktu habis. Botol belum terdeteksi.");
        }
      }, 2000);
      return () => clearTimeout(grace);
    }
  }, [secondsLeft, status]);

  // Attach to existing global WS (scan page likely already opened the connection). We fallback by listening to window events or direct global variable.
  useEffect(() => {
    function handleWsMessage(e) {
      let msg;
      try { msg = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch { return; }
      if (!msg || msg.type !== "scan_result") return;
      const data = msg.data || {};
      if (data.scan_id !== scanId) return;
      if (data.email && user?.email && data.email !== user.email) return;

      // Update basics
      if (data.brand) setBrand(data.brand);
      if (data.confidence !== undefined) setConfidence(data.confidence);

      if (data.state === "deposit_success" && !doneRef.current) {
        doneRef.current = true;
        setStatus("deposit_success");
        setFinalMessage(`Setoran berhasil! +${data.points || data.points_awarded || 0} poin`);
        try { localStorage.setItem("smartbin_last_scan", JSON.stringify(data)); } catch {}
        // Navigate ke result setelah sedikit delay
        setTimeout(() => router.replace(`/scan/result?scan_id=${scanId}`), 1200);
      } else if (data.state === "deposit_timeout" && !doneRef.current) {
        doneRef.current = true;
        setStatus("deposit_timeout");
        setFinalMessage("Waktu habis. Botol belum terdeteksi.");
        try { localStorage.setItem("smartbin_last_scan", JSON.stringify(data)); } catch {}
      }
    }

    // Strategy: if global ws exists, add listener; else add window message fallback
    // Here we assume original scan page attaches ws to window.__smartbin_ws
    const ws = typeof window !== "undefined" ? window.__smartbin_ws : null;
    if (ws) {
        ws.addEventListener("message", handleWsMessage);
        return () => ws.removeEventListener("message", handleWsMessage);
    } else {
      // fallback custom event bus (if implemented)
      window.addEventListener("smartbin_ws_message", handleWsMessage);
      return () => window.removeEventListener("smartbin_ws_message", handleWsMessage);
    }
  }, [scanId, user, router]);

  // Guard: if no scan_id present, redirect back
  useEffect(() => {
    if (!scanId) {
      const to = "/scan";
      setTimeout(() => router.replace(to), 500);
    }
  }, [scanId, router]);

  return (
    <div className="min-h-screen flex flex-col items-center bg-[var(--background)] text-[var(--foreground)] px-5 pt-12">
      <h1 className="text-xl font-semibold mb-2">Masukkan Botol Anda</h1>
      {brand && (
        <p className="text-sm mb-1 opacity-80">Brand terdeteksi: <span className="font-medium">{brand}</span>{confidence !== null && <span className="ml-1">({(confidence * 100).toFixed(1)}%)</span>}</p>
      )}
      <p className="text-sm mb-6 opacity-70">Tutup akan menutup otomatis dalam <span className="font-bold">{Math.max(0, secondsLeft)}</span> detik</p>

      <div className="relative w-56 h-56 flex items-center justify-center mb-8">
        <div className={`absolute inset-0 rounded-full border-8 ${status === "deposit_success" ? 'border-green-500' : status === 'deposit_timeout' ? 'border-red-500' : 'border-[var(--color-primary-600)] animate-pulse'}`}></div>
        <div className="flex flex-col items-center justify-center">
          {status === "deposit_success" ? (
            <>
              <img src="/success.svg" alt="Success" className="w-20 h-20 mb-2" />
              <span className="text-green-600 font-semibold">Berhasil</span>
            </>
          ) : status === "deposit_timeout" ? (
            <>
              <img src="/timeout.svg" alt="Timeout" className="w-20 h-20 mb-2" />
              <span className="text-red-600 font-semibold">Timeout</span>
            </>
          ) : (
            <>
              <img src="/deposit.svg" alt="Deposit" className="w-24 h-24 opacity-80 mb-2" />
              <span className="text-sm opacity-75">Masukkan botol sekarang</span>
            </>
          )}
        </div>
      </div>

      {finalMessage && <p className="mb-6 text-sm font-medium">{finalMessage}</p>}

      {status === "deposit_timeout" && (
        <button
          onClick={() => router.replace("/scan")}
          className="px-6 py-3 rounded-full bg-yellow-500 text-white font-medium shadow active:opacity-80"
        >
          Scan Ulang
        </button>
      )}

      {status === "deposit_success" && (
        <p className="text-xs opacity-60">Mengalihkan ke halaman hasil...</p>
      )}

      <div className="mt-10 text-[10px] opacity-40">
        Scan ID: {scanId || '-'} | Action: {actionId || '-'}
      </div>
    </div>
  );
}
