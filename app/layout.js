import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import AuthDebugger from "./components/AuthDebugger";
import BottomNav from "./components/BottomNav";
import MobileOnlyGuard from './components/MobileOnlyGuard';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Setorin - Smart Waste Management",
  description: "Aplikasi pintar untuk mengelola sampah plastik dengan teknologi AI dan sistem reward yang inovatif",
  keywords: ["waste management", "plastic recycling", "AI", "smart bin", "sustainability", "environment"],
  authors: [{ name: "Setorin Team" }],
  creator: "Setorin",
  publisher: "Setorin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://setorin.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Setorin - Smart Waste Management",
    description: "Aplikasi pintar untuk mengelola sampah plastik dengan teknologi AI dan sistem reward yang inovatif",
    url: 'https://setorin.app',
    siteName: 'Setorin',
    images: [
      {
        url: '/logo.svg',
        width: 1200,
        height: 630,
        alt: 'Setorin Logo',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Setorin - Smart Waste Management",
    description: "Aplikasi pintar untuk mengelola sampah plastik dengan teknologi AI dan sistem reward yang inovatif",
    images: ['/logo.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/favicon.ico',
    },
  },
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: '#0e7f4e',
  category: 'environment',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0e7f4e" />
        <meta name="msapplication-TileColor" content="#0e7f4e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Setorin" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-inter`}
      >
        <AuthProvider>
          <MobileOnlyGuard>
            {children}
            {/* <AuthDebugger /> */}
            <BottomNav />
          </MobileOnlyGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
