'use client';

import { useEffect, useState } from 'react';

export default function MobileOnlyGuard({ children }) {
  const [isMobile, setIsMobile] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const checkViewport = () => {
      // Consider mobile if width is less than 768px (tablet breakpoint)
      // Also check for mobile user agent as fallback
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = navigator.userAgent.toLowerCase();
      
      // Check if it's a mobile device
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      
      // Consider mobile if:
      // 1. Width < 768px (tablet breakpoint), OR
      // 2. It's a mobile device with touch capabilities
      const mobile = width < 768 || (isMobileDevice && 'ontouchstart' in window);
      
      setIsMobile(mobile);
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    window.addEventListener('orientationchange', checkViewport);
    
    return () => {
      window.removeEventListener('resize', checkViewport);
      window.removeEventListener('orientationchange', checkViewport);
    };
  }, []);

  // Don't render anything until client-side to prevent hydration mismatch
  if (!isClient) {
    return null;
  }

  // If not mobile, show mobile-only message
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-[var(--color-primary-700)] flex flex-col items-center justify-center p-4 sm:p-8 text-center">
        <div className="max-w-sm sm:max-w-md mx-auto w-full">
          {/* Logo */}
          <div className="mb-6 sm:mb-8 flex justify-center">
            <img 
              src="/login-logo.svg" 
              alt="Setorin Logo" 
              className="w-24 sm:w-32 h-auto"
            />
          </div>
          
          {/* Main Message */}
          <div className="bg-white rounded-[var(--radius-lg)] p-6 sm:p-8 shadow-[var(--shadow-card)]">
            <div className="mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[var(--color-primary-600)] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-primary-700)] mb-2">
                Gunakan Mobile
              </h1>
              <p className="text-sm sm:text-base text-[var(--color-muted)] leading-relaxed">
                Aplikasi Setorin dirancang khusus untuk perangkat mobile. 
                Silakan buka di smartphone atau tablet untuk pengalaman terbaik.
              </p>
            </div>
            
            {/* Features List */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm text-[var(--color-primary-700)]">
                <div className="w-2 h-2 bg-[var(--color-primary-600)] rounded-full mr-3"></div>
                Scan botol dengan kamera
              </div>
              <div className="flex items-center text-sm text-[var(--color-primary-700)]">
                <div className="w-2 h-2 bg-[var(--color-primary-600)] rounded-full mr-3"></div>
                Akses lokasi SmartBin terdekat
              </div>
              <div className="flex items-center text-sm text-[var(--color-primary-700)]">
                <div className="w-2 h-2 bg-[var(--color-primary-600)] rounded-full mr-3"></div>
                Navigasi yang dioptimalkan untuk smartphone
              </div>
            </div>
            
            {/* Instructions */}
            <div className="bg-[var(--color-primary-50)] rounded-[var(--radius-md)] p-4 mb-6">
              <h3 className="font-semibold text-[var(--color-primary-700)] mb-2 text-sm">
                Cara Mengakses:
              </h3>
              <div className="space-y-2 text-xs text-[var(--color-primary-700)]">
                <div>1. Buka browser di smartphone/tablet</div>
                <div>2. Kunjungi: <span className="font-mono bg-white px-2 py-1 rounded">setorin.app</span></div>
              </div>
            </div>
            
            {/* Action Button */}
            <div className="bg-[var(--color-primary-600)] text-white rounded-[var(--radius-pill)] py-3 px-6 text-center font-medium">
              Buka di Mobile
            </div>
          </div>
          
          {/* Footer */}
          <div className="mt-6 text-white/70 text-sm">
            <p>© 2025 Setorin. All rights reserved.</p>
          </div>
        </div>
      </div>
    );
  }

  // If mobile, render children normally
  return children;
}
