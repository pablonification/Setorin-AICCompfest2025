'use client';

import { useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardScreen from './components/dashboard/DashboardScreen';
import HomePageSkeleton from './components/skeletons/HomePageSkeleton';

export default function HomePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!(token && user)) {
        router.push('/login');
      } else if (user?.role === 'admin') {
        router.push('/admin');
      }
    }
  }, [token, user, loading, router]);

  if (loading || !(token && user)) {
    return <HomePageSkeleton />;
  }

  return <DashboardScreen />;
}
