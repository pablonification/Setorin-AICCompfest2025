"use client";

import { useRouter } from "next/navigation";

// Sunken Court ITB Bandung coordinates
const SUNKEN_COURT_ITB = { lat: -6.8883703, lng: 107.6103749 };

export default function TemuinPage() {
  const router = useRouter();
  const mapsEmbed = `https://www.google.com/maps?q=${SUNKEN_COURT_ITB.lat},${SUNKEN_COURT_ITB.lng}&z=17&hl=id&output=embed`;

  const directionUrl = `https://www.google.com/maps/dir/?api=1&destination=${SUNKEN_COURT_ITB.lat},${SUNKEN_COURT_ITB.lng}`;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-primary-700)] text-white rounded-b-[var(--radius-lg)] px-4 py-6 [box-shadow:var(--shadow-card)]">
        <div className="flex items-center justify-center relative">
          <button
            onClick={() => router.back()}
            aria-label="Kembali"
            className="w-9 h-9 flex items-center justify-center absolute left-0"
          >
            <img src="/back.svg" alt="Back" className="w-6 h-6" />
          </button>
          <div className="text-xl leading-7 font-semibold">Temuin</div>
        </div>
      </div>

      {/* Map section */}
      <div className="relative h-screen">
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
            <div className="text-[12px] leading-4 text-[color:var(--color-muted)]">SmartBin</div>
            <div className="text-[18px] leading-6 font-semibold">Sunken Court ITB</div>
            <div className="text-[12px] leading-4 text-[color:var(--color-muted)] mt-1">
              Jl. X, Lb. Siliwangi, Kecamatan Coblong, Kota Bandung, Jawa Barat 40132
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-[var(--radius-pill)] bg-green-50 text-green-700 text-[12px] leading-4">
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


