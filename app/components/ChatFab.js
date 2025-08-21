'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ChatFab() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fabHidden = localStorage.getItem('chatFabHidden');
    if (fabHidden !== 'true') {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleHide = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVisible(false);
    localStorage.setItem('chatFabHidden', 'true');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 animate-fade-in-up">
      <Link href="/rag" className="relative flex items-center group cursor-pointer">
        <div className="bg-[#e9f8ee] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] pl-4 pr-10 py-2">
          <div className="font-semibold text-sm text-[var(--color-primary-700)]">Robin</div>
          <div className="text-xs text-[color:var(--color-muted)]">Siap membantu!</div>
        </div>
        <div className="w-16 h-16 bg-[#f0f7f0] rounded-full flex items-center justify-center shadow-[var(--shadow-card)] border-4 border-white ml-[-2rem]">
          <img src="/robin.svg" alt="Robin Chatbot" className="w-12 h-12" />
        </div>
        <button
          onClick={handleHide}
          aria-label="Tutup"
          className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-[color:var(--color-muted)] hover:text-[var(--foreground)] shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      </Link>
    </div>
  );
}
