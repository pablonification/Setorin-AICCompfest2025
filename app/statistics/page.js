'use client';

import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import StatisticsDashboard from '../components/StatisticsDashboard';
import Leaderboard from '../components/Leaderboard';

export default function StatisticsPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute userOnly={true}>
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Dashboard Statistik Personal</h2>
              <p className="mt-2 text-gray-600">Lihat progress dan impact kamu dalam program daur ulang Setorin</p>
            </div>
            <StatisticsDashboard />
            <div className="mt-8">
              <Leaderboard />
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
