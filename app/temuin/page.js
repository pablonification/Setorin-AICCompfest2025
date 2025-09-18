"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const LOCATIONS = [
  {
    name: "Sunken Court ITB",
    type: "SmartBin",
    lat: -6.8883703,
    lng: 107.6103749,
    address: "Jl. X, Lb. Siliwangi, Kecamatan Coblong, Kota Bandung, Jawa Barat 40132",
    active: true,
  },
  {
    name: "Aula Barat ITB",
    type: "SmartBin",
    lat: -6.892487,
    lng: 107.609955,
    address: "Jl. Ganesha No.10, Kota Bandung, Jawa Barat 40132",
    active: false,
  },
  {
    name: "Rektorat ITB",
    type: "SmartBin",
    lat: -6.898771,
    lng: 107.609813,
    address: "Jl. Tamansari No.64, Kota Bandung, Jawa Barat 40132",
    active: true,
  },
  {
    name: "TPST Tamansari Bandung",
    type: "Tempat Pengelolaan Sampah Terpadu",
    lat: -6.893630,
    lng: 107.608364,
    address: "Jl. Ganesha No.10, Kota Bandung, Jawa Barat 40132",
    active: true,
  },
];

export default function TemuinPage() {
  const router = useRouter();
  const [activeLocation, setActiveLocation] = useState(LOCATIONS[0]);
  
  const mapsEmbed = `https://www.google.com/maps?q=${activeLocation.lat},${activeLocation.lng}&z=17&hl=id&output=embed`;

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
            title={`Map ${activeLocation.name}`}
            src={mapsEmbed}
            className="w-full h-full"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Scrollable bottom cards */}
        <div className="absolute left-0 right-0 bottom-24 px-4">
          <div className="overflow-x-auto pb-4 -mx-4 px-4 hide-scrollbar">
            <div className="flex gap-4 w-max">
              {LOCATIONS.map((location, index) => {
                const directionUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
                const isActive = activeLocation.lat === location.lat && activeLocation.lng === location.lng;
                
                return (
                  <div 
                    key={index} 
                    className={`rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4 min-w-[280px] max-w-[280px] ${
                      isActive ? 'border-2 border-[var(--color-primary-700)]' : ''
                    }`}
                    onClick={() => setActiveLocation(location)}
                  >
                    <div className="text-[12px] leading-4 text-[color:var(--color-muted)]">{location.type}</div>
                    <div className="text-[18px] leading-6 font-semibold">{location.name}</div>
                    <div className="text-[12px] leading-4 text-[color:var(--color-muted)] mt-1">
                      {location.address}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-[var(--radius-pill)] ${
                        location.active ? 'bg-green-50 text-green-700' : 'bg-red-100 text-red-700'
                      } text-[12px] leading-4`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          location.active ? 'bg-[var(--color-success)]' : 'bg-red-400'
                        }`} />
                        {location.active ? 'Aktif' : 'Tidak Aktif'}
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
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;  /* Chrome, Safari, Opera */
        }
      `}</style>
    </div>
  );
};