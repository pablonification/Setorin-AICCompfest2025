'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';


export default function InfoinDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { slug } = params || {};
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/infoin/${encodeURIComponent(slug)}`);
        const data = await res.json();
        setItem(res.ok ? data : null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
      <div className="pt-4 pb-24 px-4">
        <div className="sticky top-0 z-10 bg-[var(--color-primary-700)] text-white rounded-b-[var(--radius-lg)] [box-shadow:var(--shadow-card)]">
          <div className="mx-auto max-w-[430px] px-4 pt-6 pb-6 relative">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                aria-label="Kembali"
                className="w-9 h-9 flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                <img src="/back.svg" alt="Kembali" className="w-6 h-6" />
              </button>

              <h1 className="absolute left-1/2 -translate-x-1/2 text-xl leading-7 font-semibold">
                Infoin
              </h1>

              <div className="w-9 h-9 flex items-center justify-center">
                {/* Right placeholder for centering */}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-[color:var(--color-muted)]">Memuat...</div>
        ) : !item ? (
          <div className="py-8 text-center text-[color:var(--color-danger)]">Konten tidak ditemukan</div>
        ) : (
          <article className="mt-5 bg-[var(--color-card)] rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] p-4">
            <div className="text-xs leading-4 text-[color:var(--color-muted)] mb-2">
              {item.category === 'tutorial' ? 'Tutorial' : 'Artikel'} · {item.estimated_read_time} menit baca
            </div>
            <h1 className="text-lg leading-6 font-semibold mb-3">{item.title}</h1>
            {item.media_url ? (
              <img src={item.media_url} alt={item.title} className="w-full rounded-[var(--radius-md)] mb-4" />
            ) : null}
            <div className="whitespace-pre-wrap text-sm leading-5 text-[var(--foreground)]">
              {item.content}
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

