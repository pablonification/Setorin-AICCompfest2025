'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../components/ProtectedRoute';
import MobileScanResult from '../../components/MobileScanResult';

export default function ScanResultPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const processing = localStorage.getItem('smartbin_scan_processing');
        const raw = localStorage.getItem('smartbin_last_scan');
        if (processing === '0' && raw) {
          const parsed = JSON.parse(raw);
          setData(parsed);
          setLoading(false);
          clearInterval(interval);
        }
      } catch {}
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <ProtectedRoute userOnly={true}>
      <div className="container max-w-[430px] mx-auto min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter pt-4 pb-24">
        {/* Header */}
        <header className="h-12 flex items-center px-4 text-white font-semibold bg-[var(--color-primary-700)] shadow rounded-[var(--radius-sm)]">
          <button onClick={() => router.push('/scan')} className="mr-2 active:opacity-70">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          Duitin
        </header>

        {loading ? (
          <div className="px-4 mt-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full border-4 border-white/40 border-t-[var(--color-primary-600)] animate-spin"></div>
            <p className="mt-4 text-sm text-gray-600">Memproses hasil scan...</p>
          </div>
        ) : (
          <div className="px-4">
            <MobileScanResult result={data} />

            {(() => {
              const invalid = data?.is_valid === false || data?.valid === false || (typeof data?.points_awarded === 'number' && data.points_awarded <= 0);
              return invalid ? (
                <button
                  onClick={() => {
                    try {
                      localStorage.removeItem('smartbin_last_scan');
                      localStorage.setItem('smartbin_scan_processing', '0');
                    } catch {}
                    router.push('/scan');
                  }}
                  className="mt-6 w-full py-3 rounded-[var(--radius-pill)] bg-[var(--color-primary-600)] text-white font-medium active:opacity-80"
                >
                  Ambil Ulang Foto
                </button>
              ) : null;
            })()}

            <button
              onClick={() => router.push('/')}
              className="mt-3 w-full py-3 rounded-[var(--radius-pill)] bg-gray-200 text-gray-800 font-medium active:opacity-80"
            >
              Selesai
            </button>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
