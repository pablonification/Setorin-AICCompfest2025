'use client';

import { useState } from 'react';
import TopBar from '../components/TopBar';
import StatisticsDashboard from '../components/StatisticsDashboard';
import Leaderboard from '../components/Leaderboard';
import ProtectedRoute from '../components/ProtectedRoute';

export default function StatisticsPage() {
  return (
    <ProtectedRoute userOnly={true}>
      <div className="w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
        <TopBar title="Statistik Saya" backHref="/profile" />
        
        <div className="pt-6 pb-24 px-4">
          <div className="rounded-lg bg-white [box-shadow:var(--shadow-card)] p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Statistik Personal</h2>
            <StatisticsDashboard />
          </div>
          
          <div className="rounded-lg bg-white [box-shadow:var(--shadow-card)] p-6">
            <h2 className="text-lg font-semibold mb-4">Leaderboard</h2>
            <Leaderboard />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}