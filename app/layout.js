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
  description: "Aplikasi pintar untuk mengelola sampah plastik dengan teknologi AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
