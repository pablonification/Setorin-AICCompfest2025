"use client";

import { useState, useEffect } from "react";

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const slides = [0, 1, 2];

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-[16px] overflow-hidden bg-white [box-shadow:var(--shadow-card)]">
      <div className="h-32 bg-[#FFF4D1] flex items-center justify-end">
        {/* Placeholder illustration */}
        <div className="w-24 h-24 mr-6 bg-gray-300 rounded-[12px]" />
      </div>
      <div className="px-4 py-3 bg-white">
        <div className="text-[22px] leading-7 font-semibold">
          <span className="text-[var(--color-primary-700)]">setorin</span> sampah,
          dapatin <span className="text-[var(--color-accent-amber)]">rupiah!</span>
        </div>
        {/* Dots */}
        <div className="mt-2 flex gap-1">
          {slides.map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full ${index === s ? "w-6 bg-[var(--color-primary-700)]" : "w-2 bg-gray-300"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}


