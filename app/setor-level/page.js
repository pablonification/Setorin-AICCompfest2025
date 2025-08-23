"use client";

import { useEffect, useMemo, useState } from "react";
import TopBar from "../components/TopBar";
import { useAuth } from "../contexts/AuthContext";

const TIERS = [
  { key: "Perintis", threshold: 0, next: 5000, voucher: "akses ke 10 voucher pada fitur Tukerin", bonus: "bonus 5% saldo setoran untuk setiap transaksi" },
  { key: "Penjelajah", threshold: 5000, next: 20000, voucher: "akses ke 20 voucher pada fitur Tukerin", bonus: "bonus 7.5% saldo setoran untuk setiap transaksi" },
  { key: "Panutan", threshold: 20000, next: 50000, voucher: "akses ke 50 voucher pada fitur Tukerin", bonus: "bonus 10% saldo setoran untuk setiap transaksi" },
  { key: "Pewaris", threshold: 50000, next: 75000, voucher: "akses ke semua voucher pada fitur Tukerin", bonus: "bonus 15% saldo setoran untuk setiap transaksi" },
];

const tierIconPath = (name) => {
  switch (name) {
    case "Perintis":
      return "/perintis.svg";
    case "Penjelajah":
      return "/penjelajah.svg";
    case "Panutan":
      return "/panutan.svg";
    case "Pewaris":
    default:
      return "/pewaris.svg";
  }
};

function Benefit({ title, desc, icon }) {
  return (
    <div className="flex items-start gap-3">
      <img src={icon} alt="" className="w-8 h-8" aria-hidden />
      <div>
        <div className="text-[14px] leading-5 font-semibold text-yellow-200">{title}</div>
        <div className="text-[12px] leading-4 text-white/90">{desc}</div>
      </div>
    </div>
  );
}

export default function SetorLevelPage() {
  const { user } = useAuth();
  const points = typeof user?.points === "number" ? user.points : 0;

  const defaultTier = useMemo(() => {
    if (points < 5000) return "Perintis";
    if (points < 20000) return "Penjelajah";
    if (points < 50000) return "Panutan";
    return "Pewaris";
  }, [points]);

  const [selected, setSelected] = useState(defaultTier);
  const [animatingIcon, setAnimatingIcon] = useState(null);

  const handleTierClick = (tierKey) => {
    setSelected(tierKey);
    setAnimatingIcon(tierKey);
  };

  useEffect(() => {
    if (animatingIcon) {
      const timer = setTimeout(() => setAnimatingIcon(null), 300);
      return () => clearTimeout(timer);
    }
  }, [animatingIcon]);

  const selectedData = TIERS.find((t) => t.key === selected);

  return (
    <div className="w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
      <TopBar title="Setor Level" backHref="/profile" />

      <div className="max-w-[430px] mx-auto px-4 pt-4 pb-24">
        {/* SVG Timeline */}
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-primary-700)] text-white [box-shadow:var(--shadow-card)] p-4">
          <svg viewBox="0 0 400 90" width="100%" height="90" role="group" aria-label="Setor level timeline">
            <defs>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.25)" />
              </filter>
            </defs>
            <line x1="24" y1="45" x2="376" y2="45" stroke="rgba(255,255,255,0.4)" strokeWidth="4" />
            {(() => {
              const positions = [0.08, 0.36, 0.64, 0.92];
              return positions.map((pos, idx) => {
                const x = 24 + (376 - 24) * pos;
                const tier = TIERS[idx];
                const active = selected === tier.key;
                const isAnimating = animatingIcon === tier.key;
                const transform = isAnimating ? `translate(${x},45) scale(1.2)` : `translate(${x},45)`;
                return (
                  <g
                    key={tier.key}
                    transform={transform}
                    onClick={() => handleTierClick(tier.key)}
                    role="button"
                    aria-label={`Pilih tier ${tier.key}`}
                    style={{ cursor: "pointer", transition: "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)" }}
                  >
                    <image href={tierIconPath(tier.key)} x="-30" y="-30" width="60" height="60" />
                  </g>
                );
              });
            })()}
          </svg>
          <div className="mt-1 grid grid-cols-4 text-center text-[12px] leading-4 font-semibold text-white/90">
            {TIERS.map((t) => (
              <button key={t.key} type="button" className={`px-1 ${selected === t.key ? "text-yellow-200" : "text-white/80"}`} onClick={() => handleTierClick(t.key)}>
                {t.key}
              </button>
            ))}
          </div>
        </div>

        {/* Selected benefits only */}
        <div className="mt-4">
          <div className="rounded-[var(--radius-lg)] overflow-hidden [box-shadow:var(--shadow-card)]" style={{ backgroundImage: "var(--gradient-primary)" }}>
            <div className="p-5">
              <div className="text-center mb-4">
                <div className="text-[16px] leading-6 font-semibold text-yellow-200">Keuntungan {selected}</div>
                <div className="text-[12px] leading-4 text-white/90 mt-1">Threshold: {selectedData?.threshold?.toLocaleString("id-ID")} → {selectedData?.next?.toLocaleString("id-ID")} Setor Poin</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Benefit title="Voucher" desc={`Dapatkan ${selectedData?.voucher}`} icon="/voucher.svg" />
                <Benefit title="Bonus Saldo" desc={`Dapatkan ${selectedData?.bonus}`} icon="/saldo.svg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

