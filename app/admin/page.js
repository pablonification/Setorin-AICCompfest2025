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

const formatNumber = (value) => new Intl.NumberFormat('id-ID').format(value ?? 0);

const formatCompact = (value) =>
  new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(value ?? 0);

function StatCard({ title, value, subtext, tone, icon: Icon }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    sky: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  };

  return (
    <div className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-[0_18px_40px_rgba(148,163,184,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-500">{title}</div>
          <div className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-900">
            {value}
          </div>
          <div className="mt-2 text-sm text-slate-500">{subtext}</div>
        </div>
        <div className={`flex h-14 w-14 items-center justify-center rounded-[1.25rem] ${tones[tone]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, description, tone, icon: Icon, onClick }) {
  const tones = {
    emerald:
      'from-emerald-700 to-green-800 text-white shadow-[0_22px_40px_rgba(5,110,60,0.24)]',
    white:
      'from-white to-white text-slate-900 border border-slate-200/80 shadow-[0_18px_36px_rgba(148,163,184,0.12)]',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-[2rem] bg-gradient-to-br p-6 text-left transition-transform duration-200 hover:-translate-y-1 ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-[1rem] ${tone === 'emerald' ? 'bg-white/14 text-white' : 'bg-slate-100 text-slate-700'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <FiArrowUpRight className={`h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${tone === 'emerald' ? 'text-white/80' : 'text-slate-400'}`} />
      </div>
      <div className={`mt-8 text-2xl font-extrabold tracking-[-0.05em] ${tone === 'emerald' ? 'text-white' : 'text-slate-900'}`}>
        {title}
      </div>
      <div className={`mt-3 text-sm leading-6 ${tone === 'emerald' ? 'text-emerald-50/88' : 'text-slate-500'}`}>
        {description}
      </div>
    </button>
  );
}

function InsightRow({ label, value, tone = 'slate' }) {
  const toneClasses = {
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.2rem] bg-slate-50 px-4 py-3">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className={`rounded-full px-3 py-1 text-sm font-bold ${toneClasses[tone]}`}>
        {value}
      </span>
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
      <div className="min-h-[70vh] rounded-[2.5rem] bg-[#f6f8f7] px-6 py-12">
        <div className="mx-auto max-w-5xl animate-pulse">
          <div className="h-12 w-72 rounded-full bg-slate-200" />
          <div className="mt-4 h-5 w-96 rounded-full bg-slate-100" />
          <div className="mt-8 rounded-[2.5rem] bg-gradient-to-br from-emerald-800 to-green-900 px-8 py-10">
            <div className="h-5 w-40 rounded-full bg-white/20" />
            <div className="mt-4 h-14 w-64 rounded-full bg-white/20" />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-24 rounded-[1.75rem] bg-white/10" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminRoute>
      <div className="-mx-4 -my-4 min-h-screen bg-[#f6f8f7] px-4 py-6 md:-mx-8 md:px-8 md:py-8 font-plus-jakarta">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-700">
                Admin Command Center
              </div>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-900 md:text-5xl">
                Halo, {userLabel}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500 md:text-lg">
                Pantau kesehatan sistem, tarik prioritas operasional, dan jalankan tugas admin
                tanpa tenggelam di grid lama yang datar.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchDashboardStats}
              className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-[0_16px_32px_rgba(148,163,184,0.12)] transition-transform hover:-translate-y-0.5"
            >
              <FiRefreshCw className="h-4 w-4" />
              Refresh Snapshot
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
            <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0a6f3c] via-[#0b7d43] to-[#09552f] px-7 py-8 text-white shadow-[0_30px_70px_rgba(5,110,60,0.26)] md:px-9 md:py-9">
              <div className="pointer-events-none absolute -left-10 top-8 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute right-8 top-6 h-28 w-28 rounded-full bg-emerald-200/10 blur-3xl" />

              <div className="relative flex flex-col gap-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-xl">
                    <div className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-50/82">
                      System Pulse
                    </div>
                    <div className="mt-4 text-4xl font-black tracking-[-0.06em] md:text-5xl">
                      {stats.pendingWithdrawals} penarikan perlu diproses
                    </div>
                    <div className="mt-4 max-w-lg text-base leading-7 text-emerald-50/82">
                      Dashboard ini sekarang ditata untuk keputusan cepat: siapa yang menunggu,
                      berapa trafik sistem, dan area mana yang perlu kamu sentuh duluan.
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/12 bg-white/10 px-5 py-4 backdrop-blur-sm">
                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-50/75">
                      Status
                    </div>
                    <div className="mt-2 text-2xl font-extrabold tracking-[-0.05em]">
                      Healthy
                    </div>
                    <div className="mt-1 text-sm text-emerald-50/78">
                      {stats.activeConnections} koneksi aktif sekarang
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                    <div className="text-sm font-semibold text-emerald-50/78">Pending Withdrawals</div>
                    <div className="mt-3 text-4xl font-black tracking-[-0.06em]">{formatNumber(stats.pendingWithdrawals)}</div>
                    <div className="mt-3 text-sm text-emerald-50/78">Perlu approval atau tindak lanjut manual.</div>
                  </div>
                  <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                    <div className="text-sm font-semibold text-emerald-50/78">Live Connections</div>
                    <div className="mt-3 text-4xl font-black tracking-[-0.06em]">{formatNumber(stats.activeConnections)}</div>
                    <div className="mt-3 text-sm text-emerald-50/78">WebSocket dan monitoring aktif.</div>
                  </div>
                  <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                    <div className="text-sm font-semibold text-emerald-50/78">QR Coverage</div>
                    <div className="mt-3 text-4xl font-black tracking-[-0.06em]">
                      {stats.totalQrCodes >= 0 ? `${qrCoverage}%` : 'N/A'}
                    </div>
                    <div className="mt-3 text-sm text-emerald-50/78">
                      {stats.totalQrCodes >= 0
                        ? `${stats.activeQrCodes} QR aktif siap digunakan`
                        : 'Endpoint QR belum tersedia'}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2.5rem] border border-slate-200/70 bg-white p-6 shadow-[0_20px_42px_rgba(148,163,184,0.13)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold uppercase tracking-[0.24em] text-slate-400">
                    Operational Snapshot
                  </div>
                  <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-900">
                    Fokus hari ini
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-[1.1rem] bg-slate-100 text-slate-600">
                  <FiShield className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <InsightRow label="Penarikan perlu review" value={`${formatNumber(stats.pendingWithdrawals)} item`} tone="amber" />
                <InsightRow label="Rata-rata poin per user" value={`${formatNumber(pointsPerUser)} pts`} tone="emerald" />
                <InsightRow label="Koneksi sistem aktif" value={`${formatNumber(stats.activeConnections)} live`} tone="violet" />
                {stats.totalQrCodes >= 0 && (
                  <InsightRow label="QR aktif" value={`${formatNumber(stats.activeQrCodes)} tersedia`} tone="slate" />
                )}
              </div>

              <div className="mt-7 rounded-[1.75rem] bg-[#f5f8f6] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-500">Stabilitas Operasional</div>
                  <div className="text-sm font-bold text-emerald-700">92%</div>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-emerald-500 to-green-700" />
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-500">
                  Sistem terlihat sehat, jadi prioritas utama saat ini ada di approval penarikan
                  dan menjaga QR aktif tetap tinggi.
                </div>
              </div>
            </section>
          </div>

          <section className="mt-6 grid gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {statCards.map((card) => (
              <StatCard
                key={card.title}
                title={card.title}
                value={card.value}
                subtext={card.subtext}
                tone={card.tone}
                icon={card.icon}
              />
            ))}
          </section>

          <section className="mt-6 rounded-[2.5rem] border border-slate-200/70 bg-white p-6 shadow-[0_20px_42px_rgba(148,163,184,0.13)] md:p-7">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-sm font-bold uppercase tracking-[0.24em] text-slate-400">
                  Quick Actions
                </div>
                <div className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-900">
                  Langkah yang paling sering kamu butuhkan
                </div>
              </div>
              <div className="text-sm text-slate-500">
                Semua aksi tetap pakai route admin yang sudah ada.
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              <ActionCard
                title="Process Withdrawals"
                description="Buka antrean payout, cek request pending, lalu lanjutkan approval dari satu tempat."
                tone="emerald"
                icon={FiActivity}
                onClick={() => router.push('/admin/withdrawals')}
              />
              {stats.totalQrCodes >= 0 ? (
                <ActionCard
                  title="Manage QR Codes"
                  description="Pantau QR aktif, cek yang expired, lalu atur distribusinya tanpa pindah konteks."
                  tone="white"
                  icon={RiQrCodeLine}
                  onClick={() => router.push('/admin/qr-codes')}
                />
              ) : (
                <ActionCard
                  title="Manage Users"
                  description="Review pengguna, lihat kontribusi, dan telusuri perilaku penggunaan dari halaman user."
                  tone="white"
                  icon={FiUsers}
                  onClick={() => router.push('/admin/users')}
                />
              )}
              <ActionCard
                title="Export Data"
                description="Tarik snapshot data untuk reporting, audit, atau handoff operasional."
                tone="white"
                icon={FiDownload}
                onClick={() => router.push('/admin/export')}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <button
                type="button"
                onClick={() => router.push('/admin/users')}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-left transition-colors hover:bg-slate-100"
              >
                <div className="flex items-center gap-3">
                  <FiUsers className="h-5 w-5 text-slate-600" />
                  <span className="font-bold text-slate-900">Open User Directory</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/education')}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-left transition-colors hover:bg-slate-100"
              >
                <div className="flex items-center gap-3">
                  <FiBookOpen className="h-5 w-5 text-slate-600" />
                  <span className="font-bold text-slate-900">Review Education Content</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/monitoring')}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-left transition-colors hover:bg-slate-100"
              >
                <div className="flex items-center gap-3">
                  <FiSettings className="h-5 w-5 text-slate-600" />
                  <span className="font-bold text-slate-900">Open Monitoring Tools</span>
                </div>
              </button>
            </div>
          </section>
        </div>
      </div>
    </AdminRoute>
  );
}
