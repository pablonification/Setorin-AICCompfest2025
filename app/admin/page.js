'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  FiUsers, 
  FiDollarSign, 
  FiBell, 
  FiBookOpen, 
  FiActivity, 
  FiDownload, 
  FiTrendingUp, 
  FiSettings, 
  FiShield 
} from 'react-icons/fi';
import AdminRoute from '../components/AdminRoute';

export default function AdminPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalScans: 0,
    totalPoints: 0,
    pendingWithdrawals: 0,
    totalWithdrawals: 0,
    activeConnections: 0
  });
  const apiBase = process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchDashboardStats();
  }, [token]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      // Fetch various statistics
      const [usersResp, scansResp, withdrawalsResp, wsResp] = await Promise.all([
        fetch(`${apiBase}/admin/users/count`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${apiBase}/admin/scans/count`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${apiBase}/payout/admin/withdrawals?status=pending`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${apiBase}/ws/status`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
      ]);

      let totalUsers = 0;
      let totalScans = 0;
      let totalPoints = 0;
      let pendingWithdrawals = 0;
      let activeConnections = 0;

      if (usersResp.ok) {
        const usersData = await usersResp.json();
        totalUsers = usersData.total_users || 0;
        totalPoints = usersData.total_points || 0;
      }

      if (scansResp.ok) {
        const scansData = await scansResp.json();
        totalScans = scansData.total_scans || 0;
      }

      if (withdrawalsResp.ok) {
        const withdrawalsData = await withdrawalsResp.json();
        pendingWithdrawals = Array.isArray(withdrawalsData) ? withdrawalsData.length : 0;
      }

      if (wsResp.ok) {
        const wsData = await wsResp.json();
        activeConnections = wsData.total_connections || 0;
      }

      setStats({
        totalUsers,
        totalScans,
        totalPoints,
        pendingWithdrawals,
        totalWithdrawals: pendingWithdrawals, // Simplified for now
        activeConnections
      });
    } catch (e) {
      console.error('Failed to fetch dashboard stats:', e);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const adminSections = [
    {
      title: 'User Management',
      description: 'Manage users, view statistics, and monitor activity',
      icon: FiUsers,
      href: '/admin/users',
      color: 'bg-blue-500'
    },
    {
      title: 'Withdrawal Management',
      description: 'Process withdrawal requests and manage payouts',
      icon: FiDollarSign,
      href: '/admin/withdrawals',
      color: 'bg-green-500'
    },
    {
      title: 'Notification Center',
      description: 'Create and manage system notifications',
      icon: FiBell,
      href: '/admin/notifications',
      color: 'bg-yellow-500'
    },
    {
      title: 'Educational Content',
      description: 'Manage educational materials and content',
      icon: FiBookOpen,
      href: '/admin/education',
      color: 'bg-purple-500'
    },
    {
      title: 'System Monitoring',
      description: 'Monitor WebSocket connections and system health',
      icon: FiActivity,
      href: '/admin/monitoring',
      color: 'bg-red-500'
    },
    {
      title: 'Data Export',
      description: 'Export data in various formats for analysis',
      icon: FiDownload,
      href: '/admin/export',
      color: 'bg-indigo-500'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminRoute>
      <div className="min-h-screen">
        <div className="max-w-[1000px] mx-auto">
          {/* Page header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-[22px] leading-7 font-semibold text-[var(--foreground)]">Admin Dashboard</h1>
              <p className="text-[12px] leading-4 text-[color:var(--color-muted)] mt-1">Manage your Setorin system and monitor performance</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-[var(--color-card)] rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] p-5">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-[var(--radius-sm)]">
                  <FiUsers className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-[12px] leading-4 text-[color:var(--color-muted)]">Total Users</p>
                  <p className="text-[20px] leading-[1.75] font-semibold text-[var(--foreground)]">{stats.totalUsers.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-card)] rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] p-5">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-[var(--radius-sm)]">
                  <FiTrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-[12px] leading-4 text-[color:var(--color-muted)]">Total Scans</p>
                  <p className="text-[20px] leading-[1.75] font-semibold text-[var(--foreground)]">{stats.totalScans.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-card)] rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] p-5">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-[var(--radius-sm)]">
                  <FiDollarSign className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-[12px] leading-4 text-[color:var(--color-muted)]">Total Points</p>
                  <p className="text-[20px] leading-[1.75] font-semibold text-[var(--foreground)]">{stats.totalPoints.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-card)] rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] p-5">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-[var(--radius-sm)]">
                  <FiActivity className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-[12px] leading-4 text-[color:var(--color-muted)]">Pending Withdrawals</p>
                  <p className="text-[20px] leading-[1.75] font-semibold text-[var(--foreground)]">{stats.pendingWithdrawals}</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-card)] rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] p-5">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-[var(--radius-sm)]">
                  <FiShield className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-[12px] leading-4 text-[color:var(--color-muted)]">Active Connections</p>
                  <p className="text-[20px] leading-[1.75] font-semibold text-[var(--foreground)]">{stats.activeConnections}</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-card)] rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] p-5">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-100 rounded-[var(--radius-sm)]">
                  <FiSettings className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-[12px] leading-4 text-[color:var(--color-muted)]">System Status</p>
                  <p className="text-[14px] leading-5 font-semibold text-green-600">Healthy</p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminSections.map((section, index) => {
              const IconComponent = section.icon;
              return (
                <div
                  key={index}
                  className="bg-[var(--color-card)] rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                  onClick={() => router.push(section.href)}
                >
                  <div className="p-5">
                    <div className={`inline-flex p-3 rounded-[var(--radius-sm)] ${section.color} mb-3`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-[16px] leading-6 font-semibold text-[var(--foreground)] mb-1">
                      {section.title}
                    </h3>
                    <p className="text-[12px] leading-4 text-[color:var(--color-muted)]">
                      {section.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-6 bg-[var(--color-card)] rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] p-5">
            <h2 className="text-[18px] leading-6 font-semibold text-[var(--foreground)] mb-3">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/admin/withdrawals')}
                className="px-4 py-2 bg-[color:var(--color-primary-600)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-colors"
              >
                Process Withdrawals
              </button>
              <button
                onClick={() => router.push('/admin/notifications')}
                className="px-4 py-2 bg-blue-600 text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-colors"
              >
                Send Notification
              </button>
              <button
                onClick={() => router.push('/admin/export')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-colors"
              >
                Export Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminRoute>
  );
}


