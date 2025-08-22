'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProfileHeader from '../components/ProfileHeader';
import StatisticsCard from '../components/StatisticsCard';
import SettingsGroup from '../components/SettingsGroup';

export default function ProfilePage() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchUnread();
  }, [token]);

  const fetchUnread = async () => {
    try {
      const res = await fetch('/api/notifications/unread-count', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch (e) {
      // ignore
    }
  };

  const getAuthHeaders = () => {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Mock data for development
  const mockUser = {
    name: user?.name || 'Pengguna',
    avatarUrl: user?.photo_url || "/profile/default-profile.jpg",
    level: 'Level 2'
  };

  const mockStats = {
    totalDeposits: '32 kg',
    points: '64.000',
    totalWithdrawals: 'Rp 24.000'
  };

  const pengaturanItems = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-600)" strokeWidth="2">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="m13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      ),
      label: 'Notifikasi',
      href: '/notifications'
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-600)" strokeWidth="2">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        </svg>
      ),
      label: 'Metode Pembayaran',
      href: '/profile/payment-methods'
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-600)" strokeWidth="2">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      label: 'Alamat Pengiriman',
      href: '/profile/addresses'
    }
  ];

  const bantuanItems = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-600)" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <path d="M12 17h.01"/>
        </svg>
      ),
      label: 'Bantuan',
      href: '/help'
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-600)" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
      label: 'Lapor Masalah',
      href: '/report-issue'
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-600)" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
      label: 'Tentang Kami',
      href: '/tentang-kami'
    }
  ];

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
      <div className="pt-4 pb-24 px-4 space-y-6">
        {/* Profile Header */}
        <div className="rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] bg-white">
          <ProfileHeader user={mockUser} />
        </div>

        {/* Statistics Card */}
        <StatisticsCard stats={mockStats} />

        {/* Pengaturan Section */}
        <SettingsGroup title="Pengaturan" items={pengaturanItems} />

        {/* Bantuan & Info Section */}
        <SettingsGroup title="Bantuan & Info" items={bantuanItems} />

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-[var(--radius-md)] bg-red-50 hover:bg-red-100 transition-colors"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="var(--color-danger)" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16,17 21,12 16,7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span className="text-[14px] leading-5 font-medium text-[var(--color-danger)]">
            Keluar
          </span>
        </button>
      </div>
    </div>
  );
}


