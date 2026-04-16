'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  FiActivity,
  FiArrowUpRight,
  FiBookOpen,
  FiDownload,
  FiDollarSign,
  FiRefreshCw,
  FiSettings,
  FiShield,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import { RiQrCodeLine } from 'react-icons/ri';
import AdminRoute from '../components/AdminRoute';
import { ADMIN_DASHBOARD_STATS } from '../mock/data';
import {
  AdminPageShell,
  AdminPageHeader,
  AdminSurface,
  AdminMetricCard,
  AdminButton,
  AdminBadge,
} from '../components/admin/AdminUi';

const formatNumber = (value) => new Intl.NumberFormat('id-ID').format(value ?? 0);

const formatCompact = (value) =>
  new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(value ?? 0);

function ActionCard({ title, description, tone, icon: Icon, onClick }) {
  const tones = {
    emerald:
      'bg-emerald-600 text-white shadow-[0_16px_40px_-4px_rgba(16,185,129,0.3)] border border-transparent',
    white:
      'bg-white text-slate-900 border border-emerald-900/5 shadow-[0_12px_40px_-4px_rgba(16,185,129,0.04)]',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-3xl p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tone === 'emerald' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className={`rounded-full p-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${tone === 'emerald' ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-400'}`}>
          <FiArrowUpRight className="h-5 w-5" />
        </div>
      </div>
      <div className={`mt-8 text-2xl font-black tracking-tight ${tone === 'emerald' ? 'text-white' : 'text-slate-900'}`}>
        {title}
      </div>
      <div className={`mt-3 text-sm leading-relaxed ${tone === 'emerald' ? 'text-emerald-50/90' : 'text-slate-500'}`}>
        {description}
      </div>
    </button>
  );
}

function InsightRow({ label, value, tone = 'slate' }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-900/5 bg-slate-50/50 px-5 py-3">
      <span className="text-sm font-bold text-slate-600">{label}</span>
      <AdminBadge tone={tone}>{value}</AdminBadge>
    </div>
  );
}

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
    expiredQrCodes: 0,
  });
  const apiBase = process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000';

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);

      const requests = [
        fetch(`${apiBase}/admin/users/count`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiBase}/admin/scans/count`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiBase}/payout/admin/withdrawals?status=pending`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiBase}/ws/status`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ];

      let qrResp = null;
      try {
        qrResp = await fetch(`${apiBase}/api/qr/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (fetchError) {
        console.warn('QR stats endpoint not available:', fetchError.message);
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
        totalWithdrawals: pendingWithdrawals,
        activeConnections,
        totalQrCodes,
        activeQrCodes,
        expiredQrCodes,
      });
    } catch (fetchError) {
      console.error('Failed to fetch dashboard stats:', fetchError);
      setStats(ADMIN_DASHBOARD_STATS);
      setError('');
    } finally {
      setLoading(false);
    }
  }, [apiBase, token]);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchDashboardStats();
  }, [fetchDashboardStats, router, token]);

  const qrCoverage =
    stats.totalQrCodes > 0 ? Math.round((stats.activeQrCodes / stats.totalQrCodes) * 100) : 0;
  const pointsPerUser =
    stats.totalUsers > 0 ? Math.round(stats.totalPoints / stats.totalUsers) : 0;
  const userLabel = user?.name?.trim() ? user.name.split(/\s+/)[0] : 'Admin';
  
  const statCards = [
    {
      title: 'Total Users',
      value: formatNumber(stats.totalUsers),
      subtext: `${formatNumber(pointsPerUser)} poin rata-rata per pengguna`,
      tone: 'sky',
      icon: FiUsers,
    },
    {
      title: 'Total Scans',
      value: formatNumber(stats.totalScans),
      subtext: 'Volume aktivitas yang sudah tervalidasi',
      tone: 'emerald',
      icon: FiTrendingUp,
    },
    {
      title: 'Total Points',
      value: formatCompact(stats.totalPoints),
      subtext: `${formatNumber(stats.totalPoints)} poin didistribusikan`,
      tone: 'amber',
      icon: FiDollarSign,
    },
  ];

  if (stats.totalQrCodes >= 0) {
    statCards.push({
      title: 'QR Active Rate',
      value: `${qrCoverage}%`,
      subtext: `${stats.activeQrCodes} aktif dari ${stats.totalQrCodes} QR`,
      tone: 'violet',
      icon: RiQrCodeLine,
    });
  }

  if (loading) {
    return (
      <AdminPageShell>
        <div className="animate-pulse space-y-6">
          <div className="h-12 w-72 rounded-full bg-slate-200" />
          <div className="h-5 w-96 rounded-full bg-slate-100" />
          <div className="mt-8 rounded-3xl bg-emerald-100/50 px-8 py-10">
            <div className="h-5 w-40 rounded-full bg-emerald-200/50" />
            <div className="mt-4 h-14 w-64 rounded-full bg-emerald-200/50" />
          </div>
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin Command Center"
        title={`Halo, ${userLabel}`}
        description="Pantau kesehatan sistem, tarik prioritas operasional, dan jalankan tugas admin dari satu tempat."
        actions={
          <AdminButton onClick={fetchDashboardStats} variant="secondary" icon={FiRefreshCw}>
            Refresh Snapshot
          </AdminButton>
        }
      />

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="relative overflow-hidden rounded-[32px] bg-emerald-700 px-8 py-10 text-white shadow-[0_20px_60px_-12px_rgba(16,185,129,0.3)] md:px-10">
          <div className="pointer-events-none absolute -left-10 top-8 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="pointer-events-none absolute right-8 top-6 h-32 w-32 rounded-full bg-emerald-300/20 blur-3xl" />

          <div className="relative flex flex-col gap-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-xl">
                <div className="text-xs font-extrabold uppercase tracking-[0.25em] text-emerald-200">
                  System Pulse
                </div>
                <div className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
                  {stats.pendingWithdrawals} penarikan perlu diproses
                </div>
                <div className="mt-4 max-w-lg text-base leading-relaxed text-emerald-50/90">
                  Dashboard ditata untuk keputusan cepat: siapa yang menunggu, berapa trafik sistem, dan area mana yang butuh perhatian.
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 px-6 py-5 backdrop-blur-md">
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-200">
                  Status
                </div>
                <div className="mt-2 text-2xl font-black tracking-tight">
                  Healthy
                </div>
                <div className="mt-1 text-sm font-medium text-emerald-100">
                  {stats.activeConnections} koneksi aktif
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-md">
                <div className="text-sm font-bold text-emerald-100">Pending Withdrawals</div>
                <div className="mt-2 text-3xl font-black tracking-tight">{formatNumber(stats.pendingWithdrawals)}</div>
                <div className="mt-2 text-xs font-medium text-emerald-100/80">Perlu approval manual.</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-md">
                <div className="text-sm font-bold text-emerald-100">Live Connections</div>
                <div className="mt-2 text-3xl font-black tracking-tight">{formatNumber(stats.activeConnections)}</div>
                <div className="mt-2 text-xs font-medium text-emerald-100/80">WebSocket & IoT aktif.</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-md">
                <div className="text-sm font-bold text-emerald-100">QR Coverage</div>
                <div className="mt-2 text-3xl font-black tracking-tight">
                  {stats.totalQrCodes >= 0 ? `${qrCoverage}%` : 'N/A'}
                </div>
                <div className="mt-2 text-xs font-medium text-emerald-100/80">
                  {stats.totalQrCodes >= 0
                    ? `${stats.activeQrCodes} QR siap pakai`
                    : 'Belum tersedia'}
                </div>
              </div>
            </div>
          </div>
        </section>

        <AdminSurface className="flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400">
                Operational Snapshot
              </div>
              <div className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                Fokus hari ini
              </div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <FiShield className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-8 flex-1 space-y-3">
            <InsightRow label="Penarikan perlu review" value={`${formatNumber(stats.pendingWithdrawals)} item`} tone="amber" />
            <InsightRow label="Rata-rata poin per user" value={`${formatNumber(pointsPerUser)} pts`} tone="emerald" />
            <InsightRow label="Koneksi sistem aktif" value={`${formatNumber(stats.activeConnections)} live`} tone="violet" />
            {stats.totalQrCodes >= 0 && (
              <InsightRow label="QR aktif" value={`${formatNumber(stats.activeQrCodes)} tersedia`} tone="slate" />
            )}
          </div>

          <div className="mt-6 rounded-3xl border border-emerald-900/5 bg-slate-50/50 p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-slate-600">Stabilitas Operasional</div>
              <div className="text-sm font-black text-emerald-600">92%</div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-[92%] rounded-full bg-emerald-500" />
            </div>
            <div className="mt-3 text-xs font-medium leading-relaxed text-slate-500">
              Sistem sehat, prioritas utama saat ini: approval penarikan
              dan menjaga distribusi QR.
            </div>
          </div>
        </AdminSurface>
      </div>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <AdminMetricCard
            key={card.title}
            title={card.title}
            value={card.value}
            subtext={card.subtext}
            tone={card.tone}
            icon={card.icon}
          />
        ))}
      </section>

      <AdminSurface>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400">
              Quick Actions
            </div>
            <div className="mt-3 text-3xl font-black tracking-tight text-slate-900">
              Langkah paling sering dibutuhkan
            </div>
          </div>
          <div className="text-sm font-medium text-slate-500 mb-1">
            Navigasi instan ke area krusial.
          </div>
        </div>

        <div className="mt-8 grid gap-5 xl:grid-cols-3">
          <ActionCard
            title="Process Withdrawals"
            description="Buka antrean payout, cek request pending, dan lanjutkan approval."
            tone="emerald"
            icon={FiActivity}
            onClick={() => router.push('/admin/withdrawals')}
          />
          {stats.totalQrCodes >= 0 ? (
            <ActionCard
              title="Manage QR Codes"
              description="Pantau QR aktif, cek yang expired, dan atur distribusinya."
              tone="white"
              icon={RiQrCodeLine}
              onClick={() => router.push('/admin/qr-codes')}
            />
          ) : (
            <ActionCard
              title="Manage Users"
              description="Review pengguna, kontribusi, dan histori pemakaian."
              tone="white"
              icon={FiUsers}
              onClick={() => router.push('/admin/users')}
            />
          )}
          <ActionCard
            title="Export Data"
            description="Tarik snapshot data untuk reporting, audit, atau arsip."
            tone="white"
            icon={FiDownload}
            onClick={() => router.push('/admin/export')}
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() => router.push('/admin/users')}
            className="flex items-center gap-4 rounded-3xl border border-emerald-900/5 bg-slate-50/50 px-6 py-5 text-left transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-emerald-900/5">
              <FiUsers className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="font-bold text-slate-700">Open User Directory</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/education')}
            className="flex items-center gap-4 rounded-3xl border border-emerald-900/5 bg-slate-50/50 px-6 py-5 text-left transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-emerald-900/5">
              <FiBookOpen className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="font-bold text-slate-700">Review Education Content</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/monitoring')}
            className="flex items-center gap-4 rounded-3xl border border-emerald-900/5 bg-slate-50/50 px-6 py-5 text-left transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-emerald-900/5">
              <FiSettings className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="font-bold text-slate-700">Open Monitoring Tools</span>
          </button>
        </div>
      </AdminSurface>
    </AdminPageShell>
  );
}
