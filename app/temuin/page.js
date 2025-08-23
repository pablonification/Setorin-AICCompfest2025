"use client";

import { useRouter } from "next/navigation";
import TopBar from "../components/TopBar";
import { useEffect } from "react";

// Sunken Court ITB Bandung coordinates
const SUNKEN_COURT_ITB = { lat: -6.8883703, lng: 107.6103749 };

export default function TemuinPage() {
  const router = useRouter();
  const mapsEmbed = `https://www.google.com/maps?q=${SUNKEN_COURT_ITB.lat},${SUNKEN_COURT_ITB.lng}&z=17&hl=id&output=embed`;

  const directionUrl = `https://www.google.com/maps/dir/?api=1&destination=${SUNKEN_COURT_ITB.lat},${SUNKEN_COURT_ITB.lng}`;

  // Fix viewport height for mobile browsers
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

  return (
    <div className="w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
      <TopBar title="Temuin" />

      {/* Map section */}
      <div className="relative" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
        <div className="absolute inset-0">
          <iframe
            title="Map Sunken Court ITB Bandung"
            src={mapsEmbed}
            className="w-full h-full"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Bottom card */}
        <div className="absolute left-1/2 bottom-24 w-[92%] -translate-x-1/2">
          <div className="rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4">
            <div className="text-xs leading-4 text-[color:var(--color-muted)]">Setorin Bin</div>
                          <div className="text-lg leading-6 font-semibold">Sunken Court ITB</div>
                          <div className="text-xs leading-4 text-[color:var(--color-muted)] mt-1">
              Jl. X, Lb. Siliwangi, Kecamatan Coblong, Kota Bandung, Jawa Barat 40132
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-[var(--radius-pill)] bg-green-50 text-green-700 text-xs leading-4">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-success)]" />
                Aktif
              </span>
            </div>

            <a
              href={directionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center h-12 rounded-[var(--radius-pill)] bg-[var(--color-primary-700)] text-white font-medium"
            >
              Arahkan
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}


