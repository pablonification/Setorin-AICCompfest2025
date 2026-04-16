'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FiCheck, FiDownload, FiEye, FiRefreshCw, FiX } from 'react-icons/fi';
import AdminRoute from '../../components/AdminRoute';
import {
  AdminBadge,
  AdminBanner,
  AdminButton,
  AdminEmptyState,
  AdminLabel,
  AdminMetricCard,
  AdminModal,
  AdminPageHeader,
  AdminPageShell,
  AdminSectionTitle,
  AdminSelect,
  AdminSurface,
  AdminTextarea,
} from '../../components/admin/AdminUi';
import { ADMIN_WITHDRAWALS } from '../../mock/data';

const formatPoints = (value) => new Intl.NumberFormat('id-ID').format(value ?? 0);

export default function AdminWithdrawals() {
  const { token } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [modalMode, setModalMode] = useState('view');
  const apiBase = process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000';

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await fetch(`${apiBase}/payout/admin/withdrawals?status=${encodeURIComponent(status)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const payload = await resp.json().catch(() => ({}));
        throw new Error(payload.detail || `Failed: ${resp.status}`);
      }
      const data = await resp.json();
      setList(data || []);
    } catch (fetchError) {
      const filtered = status ? ADMIN_WITHDRAWALS.filter((item) => item.status === status) : ADMIN_WITHDRAWALS;
      setList(filtered);
      setError('');
    } finally {
      setLoading(false);
    }
  }, [apiBase, status, token]);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchList();
  }, [fetchList, router, token]);

  const markComplete = async (id) => {
    try {
      const resp = await fetch(`${apiBase}/payout/admin/withdrawals/${id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Failed to complete');
      fetchList();
      setError('');
    } catch (fetchError) {
      setList((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'completed',
                processed_at: new Date().toISOString(),
                admin_note: 'Approved in mock mode.',
              }
            : item
        )
      );
      setError('');
    }
  };

  const rejectRefund = async (id) => {
    if (!adminNote.trim()) {
      setError('Please provide an admin note for rejection');
      return;
    }

    try {
      const resp = await fetch(`${apiBase}/payout/admin/withdrawals/${id}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ admin_note: adminNote }),
      });
      if (!resp.ok) throw new Error('Failed to reject');
      fetchList();
      setShowModal(false);
      setAdminNote('');
      setError('');
    } catch (fetchError) {
      setList((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'rejected',
                processed_at: new Date().toISOString(),
                admin_note: adminNote,
              }
            : item
        )
      );
      setShowModal(false);
      setAdminNote('');
      setError('');
    }
  };

  const buildWithdrawalsCsv = (rows) => {
    const headers = [
      'id',
      'user_email',
      'amount_points',
      'status',
      'method_type',
      'created_at',
      'processed_at',
      'admin_note',
    ];
    const body = rows.map((row) => headers.map((key) => JSON.stringify(row[key] ?? '')).join(','));
    return [headers.join(','), ...body].join('\n');
  };

  const exportCsv = async () => {
    try {
      setExporting(true);
      const resp = await fetch(
        `${apiBase}/payout/admin/withdrawals/export.csv${status ? `?status=${encodeURIComponent(status)}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `withdrawals_${status || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (fetchError) {
      const rows = status ? ADMIN_WITHDRAWALS.filter((item) => item.status === status) : ADMIN_WITHDRAWALS;
      const blob = new Blob([buildWithdrawalsCsv(rows)], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `withdrawals_${status || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setError('');
    } finally {
      setExporting(false);
    }
  };

  const viewWithdrawalDetails = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setModalMode('view');
    setShowModal(true);
  };

  const openRejectModal = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setModalMode('reject');
    setShowModal(true);
  };

  const getStatusTone = (value) => {
    switch (value) {
      case 'pending':
        return 'amber';
      case 'completed':
        return 'emerald';
      case 'rejected':
        return 'rose';
      default:
        return 'slate';
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const pendingCount = list.filter((item) => item.status === 'pending').length;
  const completedCount = list.filter((item) => item.status === 'completed').length;
  const totalPoints = list.reduce((sum, item) => sum + (item.amount_points || 0), 0);
  const pendingPoints = useMemo(
    () => list.filter((item) => item.status === 'pending').reduce((sum, item) => sum + (item.amount_points || 0), 0),
    [list]
  );

  return (
    <AdminRoute>
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Payout Queue"
          title="Withdrawal Management"
          description="Approve, reject, dan audit pencairan dari satu workspace yang lebih jelas dan lebih cepat dipindai."
          actions={
            <>
              <AdminButton variant="secondary" icon={FiRefreshCw} onClick={fetchList}>
                Refresh
              </AdminButton>
              <AdminButton
                variant="primary"
                icon={FiDownload}
                onClick={exportCsv}
                disabled={exporting}
              >
                {exporting ? 'Exporting...' : 'Export CSV'}
              </AdminButton>
            </>
          }
        />

        {error ? <AdminBanner tone="error">{error}</AdminBanner> : null}

        <div className="grid gap-5 md:grid-cols-4">
          <AdminMetricCard
            title="Visible Requests"
            value={formatPoints(list.length)}
            subtext="Jumlah request pada filter saat ini"
            tone="sky"
            icon={FiEye}
          />
          <AdminMetricCard
            title="Pending"
            value={formatPoints(pendingCount)}
            subtext={`${formatPoints(pendingPoints)} poin menunggu proses`}
            tone="amber"
            icon={FiRefreshCw}
          />
          <AdminMetricCard
            title="Completed"
            value={formatPoints(completedCount)}
            subtext="Permintaan yang sudah selesai"
            tone="emerald"
            icon={FiCheck}
          />
          <AdminMetricCard
            title="Total Points"
            value={formatPoints(totalPoints)}
            subtext="Nilai payout pada daftar aktif"
            tone="violet"
            icon={FiDownload}
          />
        </div>

        <AdminSurface>
          <AdminSectionTitle
            title="Queue Filters"
            subtitle="Pindah antara pending, completed, rejected, atau all tanpa kehilangan action utama."
          />
          <div className="mt-5 grid gap-4 md:grid-cols-[240px_auto] md:items-end">
            <div>
              <AdminLabel>Status Filter</AdminLabel>
              <AdminSelect value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="">All Statuses</option>
              </AdminSelect>
            </div>
          </div>
        </AdminSurface>

        <AdminSurface className="overflow-hidden p-0">
          <div className="border-b border-slate-200/80 px-6 py-5">
            <AdminSectionTitle
              title={`Withdrawal Requests (${list.length})`}
              subtitle="Setiap item sekarang dibaca seperti task card, bukan daftar admin datar."
            />
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-emerald-700" />
              <div className="mt-4 text-sm text-slate-500">Loading withdrawals...</div>
            </div>
          ) : list.length === 0 ? (
            <div className="p-6">
              <AdminEmptyState
                title="No withdrawal requests"
                description="Tidak ada request yang cocok dengan status saat ini."
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {list.map((item) => (
                <div key={item.id} className="px-6 py-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <AdminBadge tone={getStatusTone(item.status)}>{item.status}</AdminBadge>
                        <div className="text-2xl font-black tracking-tight text-slate-900">
                          {formatPoints(item.amount_points)} points
                        </div>
                      </div>

                      <div className="mt-4 text-sm leading-7 text-slate-600">
                        <div>
                          <span className="font-semibold text-slate-900">Method:</span>{' '}
                          {item.method_type}
                          {item.method_type === 'bank'
                            ? ` • ${item.bank_code} • ${item.bank_account_number} • ${item.bank_account_name}`
                            : ` • ${item.ewallet_provider} • ${item.phone_number}`}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900">User:</span> {item.user_email}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900">Requested:</span> {formatDate(item.created_at)}
                          {item.processed_at ? ` • Processed: ${formatDate(item.processed_at)}` : ''}
                        </div>
                      </div>

                      {item.admin_note ? (
                        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                          <span className="font-semibold text-slate-900">Admin Note:</span> {item.admin_note}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-3 xl:max-w-[320px] xl:justify-end">
                      <AdminButton
                        variant="secondary"
                        icon={FiEye}
                        className="px-4 py-2"
                        onClick={() => viewWithdrawalDetails(item)}
                      >
                        View Details
                      </AdminButton>
                      {item.status === 'pending' ? (
                        <>
                          <AdminButton
                            variant="primary"
                            icon={FiCheck}
                            className="px-4 py-2"
                            onClick={() => markComplete(item.id)}
                          >
                            Approve
                          </AdminButton>
                          <AdminButton
                            variant="danger"
                            icon={FiX}
                            className="px-4 py-2"
                            onClick={() => openRejectModal(item)}
                          >
                            Reject
                          </AdminButton>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminSurface>

        {showModal && selectedWithdrawal ? (
          <AdminModal
            className="max-w-lg"
            onClose={() => {
              setShowModal(false);
              setAdminNote('');
              setSelectedWithdrawal(null);
            }}
          >
            {modalMode === 'view' ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold uppercase tracking-widest text-emerald-700">
                      Withdrawal Detail
                    </div>
                    <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                      {formatPoints(selectedWithdrawal.amount_points)} points
                    </h3>
                  </div>
                  <AdminButton
                    variant="ghost"
                    className="px-4 py-2"
                    onClick={() => setShowModal(false)}
                  >
                    Close
                  </AdminButton>
                </div>

                <div className="mt-6 space-y-4">
                  <AdminSurface className="p-5">
                    <div className="text-sm font-semibold text-slate-500">Status</div>
                    <div className="mt-2">
                      <AdminBadge tone={getStatusTone(selectedWithdrawal.status)}>
                        {selectedWithdrawal.status}
                      </AdminBadge>
                    </div>
                  </AdminSurface>
                  <AdminSurface className="p-5">
                    <div className="text-sm font-semibold text-slate-500">User</div>
                    <div className="mt-2 text-base font-semibold text-slate-900">{selectedWithdrawal.user_email}</div>
                  </AdminSurface>
                  <AdminSurface className="p-5">
                    <div className="text-sm font-semibold text-slate-500">Withdrawal Method</div>
                    <div className="mt-2 text-sm leading-6 text-slate-700">
                      <div className="font-semibold text-slate-900">{selectedWithdrawal.method_type}</div>
                      {selectedWithdrawal.method_type === 'bank' ? (
                        <div>
                          {selectedWithdrawal.bank_code} - {selectedWithdrawal.bank_account_number} (
                          {selectedWithdrawal.bank_account_name})
                        </div>
                      ) : (
                        <div>
                          {selectedWithdrawal.ewallet_provider} - {selectedWithdrawal.phone_number}
                        </div>
                      )}
                    </div>
                  </AdminSurface>
                  <AdminSurface className="p-5">
                    <div className="text-sm font-semibold text-slate-500">Timeline</div>
                    <div className="mt-2 text-sm leading-6 text-slate-700">
                      <div>Requested: {formatDate(selectedWithdrawal.created_at)}</div>
                      {selectedWithdrawal.processed_at ? (
                        <div>Processed: {formatDate(selectedWithdrawal.processed_at)}</div>
                      ) : null}
                    </div>
                  </AdminSurface>
                  {selectedWithdrawal.admin_note ? (
                    <AdminSurface className="p-5">
                      <div className="text-sm font-semibold text-slate-500">Admin Note</div>
                      <div className="mt-2 text-sm leading-6 text-slate-700">{selectedWithdrawal.admin_note}</div>
                    </AdminSurface>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-bold uppercase tracking-widest text-rose-700">
                  Reject Request
                </div>
                <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                  Reject {formatPoints(selectedWithdrawal.amount_points)} points
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Jelaskan alasan rejection agar tim dan user tidak kehilangan konteks.
                </p>

                <div className="mt-6">
                  <AdminLabel>Admin Note</AdminLabel>
                  <AdminTextarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={4}
                    placeholder="Provide a reason for rejection..."
                  />
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <AdminButton
                    variant="secondary"
                    onClick={() => {
                      setShowModal(false);
                      setAdminNote('');
                      setSelectedWithdrawal(null);
                    }}
                  >
                    Cancel
                  </AdminButton>
                  <AdminButton
                    variant="danger"
                    icon={FiX}
                    onClick={() => rejectRefund(selectedWithdrawal.id)}
                    disabled={!adminNote.trim()}
                  >
                    Reject & Refund
                  </AdminButton>
                </div>
              </>
            )}
          </AdminModal>
        ) : null}
      </AdminPageShell>
    </AdminRoute>
  );
}
