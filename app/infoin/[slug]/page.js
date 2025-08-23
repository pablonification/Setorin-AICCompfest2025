'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TopBar from '../../components/TopBar';


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
    <div className="w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
      <TopBar title={item?.category === 'tutorial' ? 'Tutorial' : 'Artikel'} backHref="/infoin" />
      <div className="pt-4 pb-24 px-4">

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

