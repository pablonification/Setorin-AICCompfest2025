'use client';

import { useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useRouter } from 'next/navigation';
import BalanceCard from './components/BalanceCard';
import ActionGrid from './components/ActionGrid';
import HeroCarousel from './components/HeroCarousel';
import HistoryList from './components/HistoryList';
import HeaderBar from './components/HeaderBar';
import ChatFab from './components/ChatFab';

export default function HomePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !(token && user)) {
      router.push('/login');
    }
  }, [token, user, loading, router]);

  if (loading || !(token && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container font-inter">
      {/* Green header background area */}
      <div className="bg-[var(--color-primary-700)] pb-20">
        <div className="px-4 pt-4 space-y-4">
          <HeaderBar />
          <BalanceCard />
          <ActionGrid />
        </div>
      </div>
      {/* Content overlapping the header */}
      <div className="-mt-14 px-4 pb-28 space-y-4">
        <HeroCarousel />
        <HistoryList />
      </div>
      <ChatFab />
    </div>
  );
}
