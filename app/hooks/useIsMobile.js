import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      const width = window.innerWidth;
      const userAgent = navigator.userAgent;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      const breakpoint = 768;
      const isMobileWidth = width < breakpoint;
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isMobileTouch = hasTouch;
      
      setIsMobile(isMobileWidth || isMobileUserAgent || isMobileTouch);
    };

    checkIsMobile();

    const handleResize = () => checkIsMobile();
    const handleOrientationChange = () => checkIsMobile();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return isMobile;
}   