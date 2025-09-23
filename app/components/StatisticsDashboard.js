'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import { 
  BiArrowToTop, 
  BiBeer, 
  BiBarcodeReader, 
  BiLeaf, 
  BiAward,
  BiRefresh
} from 'react-icons/bi';

// Statistics Card Component
function StatisticsCard({ icon: Icon, total, label, monthly, iconColor = "var(--color-accent-amber)" }) {
  return (
    <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">
      {/* Top Section - White Background */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-[var(--color-accent-amber)]">
            <Icon size={24} />
          </div>
          <div>
            <div className="text-[22px] leading-7 font-semibold text-[var(--color-primary-700)]">
              {total}
            </div>
            <div className="text-[14px] leading-5 text-[var(--color-muted)]">
              {label}
            </div>
          </div>
        </div>
        <div className="text-[var(--color-accent-amber)] opacity-20">
          <Icon size={48} />
        </div>
      </div>
      
      {/* Bottom Section - Green Background */}
      <div className="bg-[var(--color-primary-700)] px-4 py-3 flex justify-between items-center">
        <span className="text-[14px] leading-5 text-white">Bulan ini :</span>
        <span className="text-[14px] leading-5 text-white font-semibold">{monthly}</span>
      </div>
    </div>
  );
}

// Points and Rank Card Component
function PointsRankCard({ points, monthly, rank }) {
  return (
    <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">
      {/* Top Section - White Background */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-[var(--color-accent-amber)]">
            <BiArrowToTop size={24} />
          </div>
          <div>
            <div className="text-[22px] leading-7 font-semibold text-[var(--color-primary-700)]">
              {points}
            </div>
            <div className="text-[14px] leading-5 text-[var(--color-muted)]">
              Total Setor Poin
            </div>
          </div>
        </div>
        <div 
          className="px-3 py-2 rounded-[var(--radius-pill)] text-white text-[14px] leading-5 font-medium"
          style={{ background: 'var(--gradient-primary)' }}
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span>{rank}</span>
          </div>
        </div>
      </div>
      
      {/* Bottom Section - Green Background */}
      <div className="bg-[var(--color-primary-700)] px-4 py-3 flex justify-between items-center">
        <span className="text-[14px] leading-5 text-white">Bulan ini :</span>
        <span className="text-[14px] leading-5 text-white font-semibold">{monthly}</span>
      </div>
    </div>
  );
}

// Environmental Impact Card Component
function EnvironmentalImpactCard({ plasticAvoidedKg, co2AvoidedKg }) {
  return (
    <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">
      {/* Top Section - White Background */}
      <div className="p-4 flex items-center space-x-3">
        <div className="text-[var(--color-accent-amber)]">
          <BiLeaf size={24} />
        </div>
        <div className="text-[22px] leading-7 font-semibold text-[var(--color-primary-700)]">
          Dampak Lingkungan
        </div>
      </div>
      
      {/* Bottom Section - Green Background */}
      <div className="bg-[var(--color-primary-700)] p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-[22px] leading-7 font-semibold text-[var(--color-accent-amber)]">
              {plasticAvoidedKg.toFixed(3)} kg
            </div>
            <div className="text-[12px] leading-4 text-[var(--color-primary-500)] mt-1">
              Sampah Plastik Dihindari
            </div>
          </div>
          <div className="text-center">
            <div className="text-[22px] leading-7 font-semibold text-[var(--color-accent-amber)]">
              {co2AvoidedKg.toFixed(2)} kg
            </div>
            <div className="text-[12px] leading-4 text-[var(--color-primary-500)] mt-1">
              CO2 Dihindari
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Achievement Card Component
function AchievementCard({ currentStreak, longestStreak }) {
  return (
    <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">
      {/* Top Section - White Background */}
      <div className="p-4 flex items-center space-x-3">
        <div className="text-[var(--color-accent-amber)]">
          <BiAward size={24} />
        </div>
        <div className="text-[22px] leading-7 font-semibold text-[var(--color-primary-700)]">
          Pencapaian
        </div>
      </div>
      
      {/* Bottom Section - Green Background */}
      <div className="bg-[var(--color-primary-700)] p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-[22px] leading-7 font-semibold text-white">
              {currentStreak}
            </div>
            <div className="text-[12px] leading-4 text-white mt-1">
              Streak Hari Ini
            </div>
          </div>
          <div className="text-center">
            <div className="text-[22px] leading-7 font-semibold text-white">
              {longestStreak}
            </div>
            <div className="text-[12px] leading-4 text-white mt-1">
              Streak Terpanjang
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchedOnceRef = useRef(false);
  const fetchingRef = useRef(false);

  // Mock data structure for development
  const mockStats = {
    points: {
      total: 100,
      monthly: 50,
      rank: "Perintis"
    },
    bottles: {
      total: 100,
      monthly: 19
    },
    scans: {
      total: 100,
      monthly: 16
    },
    impact: {
      plasticAvoidedKg: 0.457,
      co2AvoidedKg: 1.92
    },
    achievements: {
      currentStreak: 1,
      longestStreak: 1
    }
  };

  useEffect(() => {
    // For now, use mock data
    setStats(mockStats);
    setLoading(false);
    
    // TODO: Uncomment when API is ready
    // if (!auth?.token) return;
    // if (fetchedOnceRef.current || fetchingRef.current) return;
    // fetchedOnceRef.current = true;
    // fetchingRef.current = true;
    // fetchStatistics().finally(() => { fetchingRef.current = false; });
  }, []);

  const fetchStatistics = async () => {
    // TODO: Implement actual API call
    console.log('Fetching statistics...');
  };

  const handleRetry = () => {
    setError(null);
    fetchStatistics();
  };

  if (loading) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-gray-50 font-inter pt-4 pb-24 px-4">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary-600)]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-gray-50 font-inter pt-4 pb-24 px-4">
        <div className="bg-red-50 border border-red-200 rounded-[var(--radius-md)] p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <svg className="h-5 w-5 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-red-600 font-medium">Error: {error}</p>
          </div>
          <button 
            onClick={handleRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-[var(--radius-md)] hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <ProtectedRoute userOnly={true}>
      <div className="max-w-[430px] mx-auto min-h-screen bg-gray-50 font-inter pt-4 pb-24 px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[22px] leading-7 font-semibold text-[var(--color-primary-700)] mb-2">
            Dashboard Statistik
          </h1>
          <p className="text-[14px] leading-5 text-[var(--color-muted)]">
            Lihat progress dan impact kamu dalam program daur ulang Setorin
          </p>
        </div>

        {/* Points and Rank Card */}
        <div className="mb-4">
          <PointsRankCard 
            points={stats.points.total}
            monthly={stats.points.monthly}
            rank={stats.points.rank}
          />
        </div>

        {/* Middle Row - Two Cards Side by Side */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <StatisticsCard 
            icon={BiBeer}
            total={stats.bottles.total}
            label="Total Botol"
            monthly={stats.bottles.monthly}
          />
          <StatisticsCard 
            icon={BiBarcodeReader}
            total={stats.scans.total}
            label="Total Scan"
            monthly={stats.scans.monthly}
          />
        </div>

        {/* Environmental Impact Card */}
        <div className="mb-4">
          <EnvironmentalImpactCard 
            plasticAvoidedKg={stats.impact.plasticAvoidedKg}
            co2AvoidedKg={stats.impact.co2AvoidedKg}
          />
        </div>

        {/* Achievement Card */}
        <div className="mb-6">
          <AchievementCard 
            currentStreak={stats.achievements.currentStreak}
            longestStreak={stats.achievements.longestStreak}
          />
        </div>

        {/* Refresh Button */}
        <div className="text-center">
          <button
            onClick={fetchStatistics}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-[var(--color-primary-600)] text-white rounded-[var(--radius-md)] hover:bg-[var(--color-primary-700)] transition-colors"
          >
            <BiRefresh size={16} />
            <span className="text-[14px] leading-5">Refresh Data</span>
          </button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
