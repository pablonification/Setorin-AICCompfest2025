import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import AuthDebugger from "./components/AuthDebugger";
import BottomNav from "./components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Setorin - Smart Recycling System",
  description: "Recycle plastic bottles and earn rewards with AI-powered validation",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-inter`}
      >
        <AuthProvider>
          {children}
          {/* <AuthDebugger /> */}
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
