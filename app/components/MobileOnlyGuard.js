// components/MobileOnlyGuard.jsx
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';
import { useIsMobile } from '../hooks/useIsMobile'; // Adjust path if needed
import { usePathname } from 'next/navigation';

/**
 * A guard component that only renders its children on mobile devices.
 * On desktop, it displays a helpful fallback screen.
 * Admin pages are always allowed on desktop for administrative purposes.
 */
export default function MobileOnlyGuard({ children }) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  
  // This effect ensures we don't have a server-client mismatch (hydration error)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Return null on the server and during the initial client render
  if (!isMounted) {
    return null; 
  }

  // Always allow admin pages on desktop for administrative purposes
  const isAdminPage = pathname?.startsWith('/admin');
  
  // Also allow certain informational/educational pages on desktop
  const isDesktopAllowedPage = isAdminPage || 
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/auth')
  
  // If on mobile OR if it's a desktop-allowed page, render the app
  if (isMobile || isDesktopAllowedPage) {
    return children;
  }
  
  // Otherwise, show the desktop fallback
  return <DesktopFallback />;
}

/**
 * A visually appealing and user-friendly fallback component for desktop users.
 * Includes a QR code to easily switch to a mobile device.
 */
// components/MobileOnlyGuard.jsx (or your file name)
// ... (keep the useIsMobile import, MobileOnlyGuard component, and react-qr-code/framer-motion imports)

/**
 * A highly stylized and visually engaging fallback for desktop users.
 * Features an asymmetrical layout and a prominent phone mockup.
 */
function DesktopFallback() {
    const [url, setUrl] = useState('setorin.app');
  
    useEffect(() => {
      setUrl(window.location.href);
    }, []);
  
    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: 0.2, delayChildren: 0.1 },
      },
    };
  
    const itemVariants = {
      hidden: { y: 20, opacity: 0 },
      visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
    };
  
    return (
      <main className="min-h-screen bg-gray-900 text-white overflow-hidden">
        <div className="relative flex min-h-screen items-center justify-center p-4 lg:p-8">
          {/* Background Gradient */}
          <div className="absolute -top-1/4 left-0 w-full h-full md:w-1/2 md:h-1/2 bg-gradient-to-br from-teal-500/40 to-emerald-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-1/4 right-0 w-full h-full md:w-1/2 md:h-1/2 bg-gradient-to-tl from-sky-500/30 to-indigo-600/10 rounded-full blur-3xl animate-pulse animation-delay-4000" />
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid w-full max-w-6xl grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 items-center"
          >
            {/* Left Column: Content */}
            <div className="z-10 flex flex-col items-center text-center lg:items-start lg:text-left">
              <motion.img
                variants={itemVariants}
                src="/logo-white.svg"
                alt="Setorin Logo"
                className="mb-8 h-auto w-32"
              />
              <motion.h1
                variants={itemVariants}
                className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
              >
                The Full Experience Awaits.
              </motion.h1>
              <motion.p
                variants={itemVariants}
                className="mt-6 max-w-md text-lg text-gray-300"
              >
                Setorin is crafted for your device on the go. Scan the code to seamlessly switch to your mobile.
              </motion.p>
              
              <motion.div variants={itemVariants} className="mt-10">
                <div className="group relative rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-all duration-300 hover:bg-white/10">
                  {url ? (
                    <QRCode
                      value={url}
                      size={160}
                      bgColor="transparent"
                      fgColor="#FFFFFF"
                    />
                  ) : (
                    <div className="h-40 w-40 animate-pulse rounded-md bg-gray-500/50" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 bg-black/50 rounded-lg">
                    <span className="font-bold text-white">Scan Me</span>
                  </div>
                </div>
              </motion.div>
            </div>
  
            {/* Right Column: Phone Mockup */}
            <motion.div 
              className="relative hidden h-full w-full lg:flex items-center justify-center"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
            >
              {/* The Phone */}
              <div className="relative w-[300px] h-[600px] rounded-[48px] border-4 border-gray-700 bg-gray-900 p-2 shadow-2xl shadow-teal-500/20">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-gray-900 rounded-b-xl" />
                <div className="h-full w-full overflow-hidden rounded-[40px] bg-gradient-to-br from-teal-500 to-emerald-600">
                  {/* Content inside the phone screen */}
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <img src="/logo-white.svg" alt="App Logo" className="w-24 opacity-80" />
                    <div className="w-48 h-6 rounded-md bg-white/20" />
                    <div className="w-32 h-6 rounded-md bg-white/20" />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>
    );
  }
  
  // You can keep the `MobileOnlyGuard` component as is, it will now render this new DesktopFallback.
  // Example:
  // export default function MobileOnlyGuard({ children }) { ... }

// A small component for feature list items to keep the code clean
function FeatureItem({ text }) {
  return (
    <div className="flex items-center space-x-3">
      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
        <CheckIcon className="h-3.5 w-3.5 text-blue-600" />
      </div>
      <span className="text-gray-700">{text}</span>
    </div>
  );
}

// SVG Icons for a cleaner look without extra dependencies
function PhoneIcon(props) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  );
}

function CheckIcon(props) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}