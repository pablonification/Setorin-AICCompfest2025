'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function InfoCard({ item }) {
  return (
    <Link href={`/infoin/${item.slug}`} className="block">
      <div className="rounded-[var(--radius-md)] bg-[var(--color-card)] [box-shadow:var(--shadow-card)] p-4 mb-4">
        <div className="text-[12px] leading-4 text-[color:var(--color-muted)] mb-1">
          {item.category === 'tutorial' ? 'Tutorial' : 'Artikel'}
        </div>
        <div className="flex items-center">
          <div className="flex-1 text-[14px] leading-5 font-medium text-[var(--foreground)]">
            {item.title}
          </div>
          <img src="/read.svg" alt="next" className="w-4 h-4 opacity-70" aria-hidden="true" />
        </div>
        <div className="mt-3 bg-[var(--color-primary-700)] text-white rounded-[var(--radius-pill)] px-3 py-1 inline-block text-[12px] leading-4">
          Estimasi Baca : {item.estimated_read_time} menit
        </div>
      </div>
    </Link>
  );
}

export default function InfoinPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [tutorials, setTutorials] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, aRes] = await Promise.all([
        fetch('/api/infoin?category=tutorial&limit=50'),
        fetch('/api/infoin?category=article&limit=50')
      ]);
      const tData = await tRes.json();
      const aData = await aRes.json();
      setTutorials(tRes.ok ? (tData.items || []) : []);
      setArticles(aRes.ok ? (aData.items || []) : []);
    } catch (e) {
      setTutorials([]);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTutorials = useMemo(() => {
    if (!query) return tutorials;
    const q = query.toLowerCase();
    return tutorials.filter((x) => (x.title + ' ' + (x.description || '')).toLowerCase().includes(q));
  }, [tutorials, query]);

  const filteredArticles = useMemo(() => {
    if (!query) return articles;
    const q = query.toLowerCase();
    return articles.filter((x) => (x.title + ' ' + (x.description || '')).toLowerCase().includes(q));
  }, [articles, query]);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
      <div className="pt-4 pb-24 px-4">
        {/* Header Bar */}
        <div className="sticky top-0 z-10 bg-[var(--color-primary-700)] text-white rounded-b-[var(--radius-lg)] -mx-4 px-4 py-5 [box-shadow:var(--shadow-card)]">
          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => router.back()}
              aria-label="Kembali"
              className="w-9 h-9 flex items-center justify-center z-10"
            >
              <img src="/back.svg" alt="Back" className="w-6 h-6" />
            </button>
            <div className="flex-1 flex justify-center absolute left-0 right-0 pointer-events-none">
              <div className="text-xl leading-7 font-semibold pointer-events-none">Infoin</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center bg-white rounded-xl px-3 py-2">
              <img src="/search.svg" alt="Cari" className="w-5 h-5 opacity-70" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ml-2 flex-1 outline-none text-[14px] leading-5 text-black placeholder:text-[color:var(--color-muted)]"
                placeholder="Jenis Sampah Apa Saja yang Bisa di-Setorin?"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-8 text-center text-[color:var(--color-muted)]">Memuat...</div>
        ) : (
          <>
            <div className="mt-6">
              <div className="text-xl leading-7 font-semibold mb-3">Tutorial</div>
              {filteredTutorials.map((item) => (
                <InfoCard key={item.id} item={item} />
              ))}
            </div>

            <div className="mt-6">
              <div className="text-xl leading-7 font-semibold mb-3">Artikel</div>
              {filteredArticles.map((item) => (
                <InfoCard key={item.id} item={item} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


