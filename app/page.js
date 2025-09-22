'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useRouter } from 'next/navigation';
import BalanceCard from './components/BalanceCard';
import ActionGrid from './components/ActionGrid';
import HeroCarousel from './components/HeroCarousel';
import HistoryList, { HistoryListSkeleton } from './components/HistoryList';
import HeaderBar from './components/HeaderBar';
import ChatFab from './components/ChatFab';
import { TextSkeleton } from './components/Skeleton';

function BalanceCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] bg-white [box-shadow:var(--shadow-card)] p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <TextSkeleton width="w-20" height="h-5" />
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded-full bg-gray-200"></div>
          <div className="h-8 w-20 rounded-full bg-gray-200"></div>
        </div>
      </div>
      <div className="h-8 w-3/4 bg-gray-200 mb-3 rounded-md"></div>
      <div className="h-6 w-full bg-gray-200 rounded-md mb-2"></div>
      <div className="flex justify-between items-center">
        <TextSkeleton width="w-20" height="h-4" />
        <TextSkeleton width="w-16" height="h-4" />
      </div>
    </div>
  );
}

function ActionGridSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse"></div>
          <TextSkeleton width="w-16" height="h-4" className="mt-2" />
        </div>
      ))}
    </div>
  );
}

function HeroCarouselSkeleton() {
  return (
    <div className="h-36 bg-gray-200 rounded-[var(--radius-lg)] animate-pulse"></div>
  );
}

export default function HomePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!(token && user)) {
        router.push('/login');
      } else if (user?.role === 'admin') {
        router.push('/admin');
      }
    }
    
    // Set timeout to simulate data loading
    if (token && user) {
      const timer = setTimeout(() => setContentLoading(false), 1000);
      return () => clearTimeout(timer);
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
          {contentLoading ? <BalanceCardSkeleton /> : <BalanceCard />}
          {contentLoading ? <ActionGridSkeleton /> : <ActionGrid />}
        </div>
      </div>
      
      {/* Content overlapping the header */}
      <div className="-mt-14 px-4 pb-28 space-y-4">
        {contentLoading ? <HeroCarouselSkeleton /> : <HeroCarousel />}
        {contentLoading ? <HistoryListSkeleton /> : <HistoryList />}
      </div>
      <ChatFab />
    </div>
  );
}