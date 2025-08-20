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
import AdminNav from '../components/AdminNav';

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your SmartBin system and monitor performance</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiUsers className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FiTrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Scans</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalScans.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FiDollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Points</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPoints.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FiActivity className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Withdrawals</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingWithdrawals}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FiShield className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Connections</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeConnections}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <FiSettings className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">System Status</p>
                <p className="text-lg font-semibold text-green-600">Healthy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Navigation */}
        <AdminNav />

        {/* Admin Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                onClick={() => router.push(section.href)}
              >
                <div className="p-6">
                  <div className={`inline-flex p-3 rounded-lg ${section.color} mb-4`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {section.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {section.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/admin/withdrawals')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Process Withdrawals
            </button>
            <button
              onClick={() => router.push('/admin/notifications')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Send Notification
            </button>
            <button
              onClick={() => router.push('/admin/export')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Export Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


