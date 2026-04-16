'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  FiCalendar,
  FiDollarSign,
  FiDownload,
  FiFileText,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import {
  AdminBanner,
  AdminButton,
  AdminInput,
  AdminLabel,
  AdminPageHeader,
  AdminPageShell,
  AdminSectionTitle,
  AdminSelect,
  AdminSurface,
} from '../../components/admin/AdminUi';
import {
  ADMIN_EDUCATION_CONTENTS,
  ADMIN_QR_CODES,
  ADMIN_USERS,
  ADMIN_WITHDRAWALS,
  MOCK_NOTIFICATIONS,
  MOCK_TRANSACTIONS,
} from '../../mock/data';

function ExportCard({ title, description, icon: Icon, accent, actionLabel, loading, onClick }) {
  return (
    <div className="rounded-3xl border border-emerald-900/5 bg-white p-6 shadow-[0_18px_36px_rgba(148,163,184,0.12)]">
      <div className={`inline-flex rounded-2xl p-3 ${accent}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-800">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-emerald-700/70">{description}</p>
      <div className="mt-6">
        <AdminButton variant="primary" icon={FiDownload} onClick={onClick} disabled={loading}>
          {loading ? 'Exporting...' : actionLabel}
        </AdminButton>
      </div>
    </div>
  );
}

export default function AdminExport() {
  const { token } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState({});
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [exportOptions, setExportOptions] = useState({
    includeHeaders: true,
    format: 'csv',
  });
  const apiBase = process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [router, token]);

  const exportData = async (type, customParams = {}) => {
    const exportId = `${type}_${Date.now()}`;
    setExporting((prev) => ({ ...prev, [exportId]: true }));

    try {
      let endpoint = '';
      const params = new URLSearchParams();

      if (dateRange.startDate && dateRange.endDate) {
        params.append('start_date', dateRange.startDate);
        params.append('end_date', dateRange.endDate);
      }

      Object.entries(customParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });

      params.append('format', exportOptions.format);

      if (exportOptions.includeHeaders) {
        params.append('include_headers', 'true');
      }

      switch (type) {
        case 'users':
          endpoint = `${apiBase}/admin/users/export.${exportOptions.format}`;
          break;
        case 'scans':
          endpoint = `${apiBase}/admin/scans/export.${exportOptions.format}`;
          break;
        case 'transactions':
          endpoint = `${apiBase}/admin/transactions/export.${exportOptions.format}`;
          break;
        case 'withdrawals':
          endpoint = `${apiBase}/payout/admin/withdrawals/export.${exportOptions.format}`;
          break;
        case 'statistics':
          endpoint = `${apiBase}/admin/statistics/export.${exportOptions.format}`;
          break;
        case 'notifications':
          endpoint = `${apiBase}/admin/notifications/export.${exportOptions.format}`;
          break;
        default:
          throw new Error('Unknown export type');
      }

      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      const resp = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.detail || `Export failed: ${resp.status}`);
      }

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.${exportOptions.format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setError('');
    } catch (fetchError) {
      console.error(`Export failed for ${type}:`, fetchError);
      const mockPayloads = {
        users: ADMIN_USERS,
        scans: MOCK_TRANSACTIONS,
        transactions: MOCK_TRANSACTIONS,
        withdrawals: ADMIN_WITHDRAWALS,
        statistics: {
          users: ADMIN_USERS.length,
          qr_codes: ADMIN_QR_CODES.length,
          education_contents: ADMIN_EDUCATION_CONTENTS.length,
        },
        notifications: MOCK_NOTIFICATIONS,
      };
      const payload = mockPayloads[type];
      const serialized =
        exportOptions.format === 'json'
          ? JSON.stringify(payload, null, 2)
          : Array.isArray(payload)
            ? buildCsv(payload)
            : JSON.stringify(payload, null, 2);
      const mimeType = exportOptions.format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;';
      const blob = new Blob([serialized], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.${exportOptions.format === 'xlsx' ? 'json' : exportOptions.format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setError('');
    } finally {
      setExporting((prev) => ({ ...prev, [exportId]: false }));
    }
  };

  const buildCsv = (rows) => {
    if (!Array.isArray(rows) || !rows.length) {
      return 'empty\n';
    }
    const headers = Array.from(
      rows.reduce((keys, row) => {
        Object.keys(row || {}).forEach((key) => keys.add(key));
        return keys;
      }, new Set())
    );
    const body = rows.map((row) => headers.map((key) => JSON.stringify(row?.[key] ?? '')).join(','));
    return [headers.join(','), ...body].join('\n');
  };

  const exportTypes = useMemo(
    () => [
      {
        id: 'users',
        title: 'User Data',
        description: 'Export user information, points, and statistics.',
        icon: FiUsers,
        accent: 'bg-sky-500',
      },
      {
        id: 'scans',
        title: 'Scan Data',
        description: 'Export bottle scan records and measurements.',
        icon: FiTrendingUp,
        accent: 'bg-emerald-500',
      },
      {
        id: 'transactions',
        title: 'Transaction Data',
        description: 'Export point transactions and rewards.',
        icon: FiDollarSign,
        accent: 'bg-amber-500',
      },
      {
        id: 'withdrawals',
        title: 'Withdrawal Data',
        description: 'Export withdrawal requests and their statuses.',
        icon: FiFileText,
        accent: 'bg-violet-500',
      },
      {
        id: 'statistics',
        title: 'Statistics Data',
        description: 'Export aggregated statistics and analytics.',
        icon: FiTrendingUp,
        accent: 'bg-indigo-500',
      },
      {
        id: 'notifications',
        title: 'Notification Data',
        description: 'Export notification history and notification settings.',
        icon: FiFileText,
        accent: 'bg-rose-500',
      },
    ],
    []
  );

  const isExporting = (type) => Object.keys(exporting).some((key) => key.startsWith(type) && exporting[key]);

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Reporting Desk"
        title="Data Export"
        description="Siapkan ekspor terstruktur untuk analisis, audit, dan backup tanpa harus berurusan dengan halaman tools yang kaku."
      />

      {error ? <AdminBanner tone="error">{error}</AdminBanner> : null}

      <AdminSurface>
        <AdminSectionTitle
          title="Export Options"
          subtitle="Atur rentang tanggal, format file, dan opsi header sebelum mengekspor data."
        />

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div>
            <AdminLabel>
              <span className="inline-flex items-center gap-2">
                <FiCalendar className="h-4 w-4" />
                Date Range
              </span>
            </AdminLabel>
            <div className="space-y-3">
              <AdminInput
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
              />
              <AdminInput
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <AdminLabel>Export Format</AdminLabel>
            <AdminSelect
              value={exportOptions.format}
              onChange={(e) => setExportOptions((prev) => ({ ...prev, format: e.target.value }))}
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="xlsx">Excel (XLSX)</option>
            </AdminSelect>
          </div>

          <div>
            <AdminLabel>Options</AdminLabel>
            <label className="flex items-center gap-3 rounded-2xl bg-emerald-50/40 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={exportOptions.includeHeaders}
                onChange={(e) =>
                  setExportOptions((prev) => ({ ...prev, includeHeaders: e.target.checked }))
                }
                className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
              />
              <span>Include headers in exported file</span>
            </label>
          </div>
        </div>
      </AdminSurface>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {exportTypes.map((exportType) => (
          <ExportCard
            key={exportType.id}
            title={exportType.title}
            description={exportType.description}
            icon={exportType.icon}
            accent={exportType.accent}
            actionLabel="Export"
            loading={isExporting(exportType.id)}
            onClick={() => exportData(exportType.id)}
          />
        ))}
      </div>

      <AdminSurface>
        <AdminSectionTitle
          title="Bulk Export"
          subtitle="Untuk backup lengkap, ekspor semua data sekaligus dengan pengaturan rentang waktu yang sama."
        />
        <div className="mt-5 flex flex-wrap gap-3">
          <AdminButton
            variant="primary"
            icon={FiDownload}
            onClick={() => {
              exportTypes.forEach((type) => exportData(type.id));
            }}
          >
            Export All Data
          </AdminButton>
          <AdminButton
            variant="secondary"
            icon={FiCalendar}
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setDateRange({ startDate: today, endDate: today });
            }}
          >
            Set to Today
          </AdminButton>
          <AdminButton
            variant="secondary"
            icon={FiCalendar}
            onClick={() => {
              const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0];
              const today = new Date().toISOString().split('T')[0];
              setDateRange({ startDate: thirtyDaysAgo, endDate: today });
            }}
          >
            Last 30 Days
          </AdminButton>
        </div>
      </AdminSurface>

      <AdminSurface>
        <AdminSectionTitle
          title="Export History"
          subtitle="Placeholder untuk histori export dan log aktivitas. Bisa kita hidupkan nanti kalau kamu mau persist log lokal juga."
        />
        <div className="mt-5 rounded-3xl bg-emerald-50/40 px-5 py-5 text-sm leading-6 text-emerald-700/70">
          Export history and logs will be displayed here. This feature is still placeholder-only in the current project state.
        </div>
      </AdminSurface>
    </AdminPageShell>
  );
}
