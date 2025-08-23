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
import { RiQrCodeLine } from 'react-icons/ri';
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
    activeConnections: 0,
    totalQrCodes: -1,
    activeQrCodes: 0,
    expiredQrCodes: 0
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
      const requests = [
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
      ];

      // Add QR stats request only if the endpoint might be available
      let qrResp = null;
      try {
        qrResp = await fetch(`${apiBase}/api/qr/stats`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
      } catch (error) {
        console.warn('QR stats endpoint not available:', error.message);
      }

      const [usersResp, scansResp, withdrawalsResp, wsResp] = await Promise.all(requests);

      let totalUsers = 0;
      let totalScans = 0;
      let totalPoints = 0;
      let pendingWithdrawals = 0;
      let activeConnections = 0;
      let totalQrCodes = 0;
      let activeQrCodes = 0;
      let expiredQrCodes = 0;

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

      if (qrResp && qrResp.ok) {
        const qrData = await qrResp.json();
        totalQrCodes = qrData.total_qr_codes || 0;
        activeQrCodes = qrData.active_qr_codes || 0;
        expiredQrCodes = qrData.expired_qr_codes || 0;
      } else if (qrResp && !qrResp.ok) {
        console.warn('QR stats endpoint not available:', qrResp.status);
      }

      setStats({
        totalUsers,
        totalScans,
        totalPoints,
        pendingWithdrawals,
        totalWithdrawals: pendingWithdrawals, // Simplified for now
        activeConnections,
        totalQrCodes,
        activeQrCodes,
        expiredQrCodes
      });
    } catch (e) {
      console.error('Failed to fetch dashboard stats:', e);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Page header */}
          <div className="mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage your Setorin system and monitor performance</p>
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

            {stats.totalQrCodes >= 0 && (
              <div className="bg-[var(--color-card)] rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] p-5">
                <div className="flex items-center">
                  <div className="p-2 bg-teal-100 rounded-[var(--radius-sm)]">
                    <RiQrCodeLine className="h-6 w-6 text-teal-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-[12px] leading-4 text-[color:var(--color-muted)]">Active QR Codes</p>
                    <p className="text-[20px] leading-[1.75] font-semibold text-[var(--foreground)]">{stats.activeQrCodes}</p>
                    <p className="text-[10px] leading-3 text-[color:var(--color-muted)]">{stats.totalQrCodes} total, {stats.expiredQrCodes} expired</p>
                  </div>
                </div>
              </div>
            )}
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
              {stats.totalQrCodes >= 0 && (
                <button
                  onClick={() => router.push('/admin/qr-codes')}
                  className="px-4 py-2 bg-teal-600 text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-colors flex items-center gap-2"
                >
                  <RiQrCodeLine className="h-4 w-4" />
                  Manage QR Codes
                </button>
              )}
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


