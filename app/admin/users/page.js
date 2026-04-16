'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  FiDownload,
  FiEye,
  FiFilter,
  FiRefreshCw,
  FiSearch,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import AdminRoute from '../../components/AdminRoute';
import {
  AdminBanner,
  AdminButton,
  AdminInput,
  AdminMetricCard,
  AdminModal,
  AdminPageHeader,
  AdminPageShell,
  AdminSectionTitle,
  AdminSelect,
  AdminSurface,
  AdminEmptyState,
} from '../../components/admin/AdminUi';
import { ADMIN_USERS } from '../../mock/data';

const formatNumber = (value) => new Intl.NumberFormat('id-ID').format(value ?? 0);

export default function AdminUsers() {
  const { token } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('points');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(20);
  const [exporting, setExporting] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000';

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;
      const resp = await fetch(
        `${apiBase}/admin/users?limit=${itemsPerPage}&offset=${offset}&sort_by=${sortBy}&sort_order=${sortOrder}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!resp.ok) {
        const payload = await resp.json().catch(() => ({}));
        throw new Error(payload.detail || `Failed: ${resp.status}`);
      }
      const data = await resp.json();
      setUsers(data.users || []);
      setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
    } catch (fetchError) {
      setUsers(ADMIN_USERS);
      setTotalPages(1);
      setError('');
    } finally {
      setLoading(false);
    }
  }, [apiBase, currentPage, itemsPerPage, sortBy, sortOrder, token]);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchUsers();
  }, [fetchUsers, router, token]);

  const buildUsersCsv = (rows) => {
    const headers = ['id', 'email', 'name', 'points', 'total_scans', 'last_active'];
    const body = rows.map((row) => headers.map((key) => JSON.stringify(row[key] ?? '')).join(','));
    return [headers.join(','), ...body].join('\n');
  };

  const exportUsersCsv = async () => {
    try {
      setExporting(true);
      const resp = await fetch(`${apiBase}/admin/users/export.csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (fetchError) {
      const blob = new Blob([buildUsersCsv(ADMIN_USERS)], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setError('');
    } finally {
      setExporting(false);
    }
  };

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.name?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [searchTerm, users]
  );

  const viewUserDetails = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return '';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const totalPoints = filteredUsers.reduce((sum, item) => sum + (item.points || 0), 0);
  const totalScans = filteredUsers.reduce((sum, item) => sum + (item.total_scans || 0), 0);
  const topUser = filteredUsers[0];

  return (
    <AdminRoute>
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="User Operations"
          title="User Management"
          description="Cari, ranking, dan audit pengguna dengan tampilan yang lebih enak dipakai daripada tabel admin lama."
          actions={
            <>
              <AdminButton variant="secondary" icon={FiRefreshCw} onClick={fetchUsers}>
                Refresh
              </AdminButton>
              <AdminButton
                variant="primary"
                icon={FiDownload}
                onClick={exportUsersCsv}
                disabled={exporting}
              >
                {exporting ? 'Exporting...' : 'Export CSV'}
              </AdminButton>
            </>
          }
        />

        {error ? <AdminBanner tone="error">{error}</AdminBanner> : null}

        <div className="grid gap-5 md:grid-cols-3">
          <AdminMetricCard
            title="Visible Users"
            value={formatNumber(filteredUsers.length)}
            subtext="Pengguna yang muncul setelah filter"
            icon={FiUsers}
            tone="sky"
          />
          <AdminMetricCard
            title="Visible Points"
            value={formatNumber(totalPoints)}
            subtext="Total poin pada hasil saat ini"
            icon={FiTrendingUp}
            tone="emerald"
          />
          <AdminMetricCard
            title="Top User"
            value={topUser?.name || 'N/A'}
            subtext={`${formatNumber(topUser?.points || 0)} poin • ${formatNumber(totalScans)} total scan`}
            icon={FiFilter}
            tone="amber"
          />
        </div>

        <AdminSurface>
          <AdminSectionTitle
            title="Search & Filters"
            subtitle="Gunakan pencarian cepat dan sorting untuk berpindah antar kelompok user tanpa kehilangan konteks."
          />
          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <AdminInput
                type="text"
                placeholder="Search users by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11"
              />
            </div>
            <div className="relative">
              <FiFilter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <AdminSelect
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-11"
              >
                <option value="points">Sort by Points</option>
                <option value="email">Sort by Email</option>
              </AdminSelect>
            </div>
          </div>
        </AdminSurface>

        <AdminSurface className="overflow-hidden p-0">
          <div className="border-b border-slate-200/80 px-6 py-5">
            <AdminSectionTitle
              title={`Users (${filteredUsers.length})`}
              subtitle="Klik salah satu user untuk melihat ringkasan aktivitas dan detail akun."
            />
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-emerald-700" />
              <div className="mt-4 text-sm text-slate-500">Loading users...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-6">
              <AdminEmptyState
                title="No users found"
                description="Coba ubah kata kunci pencarian atau sorting untuk melihat hasil yang lain."
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50/90">
                    <tr>
                      <th
                        className="cursor-pointer px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.22em] text-slate-500"
                        onClick={() => handleSort('email')}
                      >
                        Email {getSortIcon('email')}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                        Name
                      </th>
                      <th
                        className="cursor-pointer px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.22em] text-slate-500"
                        onClick={() => handleSort('points')}
                      >
                        Points {getSortIcon('points')}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                        Scans
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="px-6 py-5 text-sm font-semibold text-slate-900">{user.email}</td>
                        <td className="px-6 py-5 text-sm text-slate-700">{user.name || 'N/A'}</td>
                        <td className="px-6 py-5 text-sm font-bold text-slate-900">
                          {formatNumber(user.points || 0)}
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-700">
                          {formatNumber(user.total_scans || 0)}
                        </td>
                        <td className="px-6 py-5">
                          <AdminButton
                            variant="secondary"
                            icon={FiEye}
                            className="px-4 py-2"
                            onClick={() => viewUserDetails(user)}
                          >
                            View Details
                          </AdminButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 ? (
                <div className="flex items-center justify-between border-t border-slate-200/80 px-6 py-4">
                  <div className="text-sm text-slate-500">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-3">
                    <AdminButton
                      variant="secondary"
                      className="px-4 py-2"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </AdminButton>
                    <AdminButton
                      variant="secondary"
                      className="px-4 py-2"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </AdminButton>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </AdminSurface>

        {showUserModal && selectedUser ? (
          <AdminModal
            className="max-w-2xl"
            onClose={() => {
              setShowUserModal(false);
              setSelectedUser(null);
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold uppercase tracking-[0.24em] text-emerald-700">
                  User Detail
                </div>
                <h3 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-900">
                  {selectedUser.name || 'Unnamed User'}
                </h3>
              </div>
              <AdminButton
                variant="ghost"
                className="px-4 py-2"
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                }}
              >
                Close
              </AdminButton>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <AdminSurface className="p-5">
                <div className="text-sm font-semibold text-slate-500">Email</div>
                <div className="mt-2 text-base font-semibold text-slate-900">{selectedUser.email}</div>
              </AdminSurface>
              <AdminSurface className="p-5">
                <div className="text-sm font-semibold text-slate-500">Points</div>
                <div className="mt-2 text-base font-semibold text-slate-900">
                  {formatNumber(selectedUser.points || 0)}
                </div>
              </AdminSurface>
              <AdminSurface className="p-5">
                <div className="text-sm font-semibold text-slate-500">Total Scans</div>
                <div className="mt-2 text-base font-semibold text-slate-900">
                  {formatNumber(selectedUser.total_scans || 0)}
                </div>
              </AdminSurface>
              <AdminSurface className="p-5">
                <div className="text-sm font-semibold text-slate-500">Last Active</div>
                <div className="mt-2 text-base font-semibold text-slate-900">
                  {formatDate(selectedUser.last_active)}
                </div>
              </AdminSurface>
            </div>

            {selectedUser.scan_ids?.length ? (
              <AdminSurface className="mt-4 p-5">
                <div className="text-sm font-semibold text-slate-500">Recent Scans</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">
                  User has {selectedUser.scan_ids.length} associated scan record(s).
                </div>
              </AdminSurface>
            ) : null}
          </AdminModal>
        ) : null}
      </AdminPageShell>
    </AdminRoute>
  );
}
