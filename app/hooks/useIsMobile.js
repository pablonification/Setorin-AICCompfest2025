// hooks/useIsMobile.js
'use client';

import { useState, useEffect } from 'react';

/**
 * A custom hook to detect if the user is on a mobile device.
 * It checks window width, user agent, and touch capabilities.
 * @returns {boolean} - True if the device is identified as mobile, otherwise false.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // This check ensures the code only runs on the client-side
    if (typeof window === 'undefined') {
      return;
    }

    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      
      // Check for screen width, mobile user agent, or touch support.
      // This provides a more reliable detection method.
      return window.innerWidth < breakpoint || isMobileUA;
    };

    const handleResize = () => {
      setIsMobile(checkDevice());
    };

    // Initial check on mount
    handleResize();

    // Add event listeners for resize and orientation changes
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Cleanup function to remove event listeners
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [breakpoint]); // Re-run effect if the breakpoint changes

  return isMobile;
}   