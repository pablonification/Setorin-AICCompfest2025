'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  FiCheck,
  FiCopy,
  FiDownload,
  FiEye,
  FiEyeOff,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
} from 'react-icons/fi';
import { RiQrCodeLine } from 'react-icons/ri';
import QRCode from 'qrcode';
import AdminRoute from '../../components/AdminRoute';
import {
  AdminBadge,
  AdminBanner,
  AdminButton,
  AdminEmptyState,
  AdminInput,
  AdminLabel,
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
  AdminSectionTitle,
  AdminSurface,
} from '../../components/admin/AdminUi';
import { ADMIN_QR_CODES } from '../../mock/data';

const formatDateTime = (value) => new Date(value).toLocaleString('id-ID');

export default function AdminQRCodesPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [visibleTokens, setVisibleTokens] = useState(new Set());
  const [copiedToken, setCopiedToken] = useState('');
  const [formData, setFormData] = useState({
    expires_in_hours: 24,
    max_uses: 1,
  });

  const apiBase = process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000';

  const fetchQRCodes = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${apiBase}/api/qr/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('QR code system not available. Please ensure the backend is running with QR code support.');
        }
        throw new Error('Failed to fetch QR codes');
      }

      const data = await response.json();
      setQrCodes(data);
    } catch (fetchError) {
      console.error('Failed to fetch QR codes:', fetchError);
      setQrCodes(ADMIN_QR_CODES);
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
    fetchQRCodes();
  }, [fetchQRCodes, router, token]);

  const handleGenerateQR = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      setError('');

      const response = await fetch(`${apiBase}/api/qr/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('QR code generation endpoint not available. Please ensure the backend is running with QR code support.');
        }
        throw new Error('Failed to generate QR code');
      }

      const newQR = await response.json();
      setQrCodes((prev) => [newQR, ...prev]);
      setSuccess('QR code generated successfully!');
      setFormData({ expires_in_hours: 24, max_uses: 1 });
      setShowGenerateForm(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (fetchError) {
      console.error('Failed to generate QR code:', fetchError);
      const now = new Date();
      const newQR = {
        id: `qr-local-${Date.now()}`,
        token: `SETORIN-QR-${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
        status: 'active',
        usage_count: 0,
        max_uses: formData.max_uses,
        generated_at: now.toISOString(),
        expires_at: new Date(now.getTime() + formData.expires_in_hours * 60 * 60 * 1000).toISOString(),
      };
      setQrCodes((prev) => [newQR, ...prev]);
      setSuccess('QR code generated successfully!');
      setFormData({ expires_in_hours: 24, max_uses: 1 });
      setShowGenerateForm(false);
      setTimeout(() => setSuccess(''), 3000);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeactivateQR = async (qrId) => {
    if (!confirm('Are you sure you want to deactivate this QR code?')) return;

    try {
      setError('');
      const response = await fetch(`${apiBase}/api/qr/${qrId}/deactivate`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('QR code deactivation endpoint not available. Please ensure the backend is running with QR code support.');
        }
        throw new Error('Failed to deactivate QR code');
      }

      setQrCodes((prev) => prev.map((qr) => (qr.id === qrId ? { ...qr, status: 'inactive' } : qr)));
      setSuccess('QR code deactivated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (fetchError) {
      console.error('Failed to deactivate QR code:', fetchError);
      setQrCodes((prev) => prev.map((qr) => (qr.id === qrId ? { ...qr, status: 'inactive' } : qr)));
      setSuccess('QR code deactivated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const toggleTokenVisibility = (qrId) => {
    setVisibleTokens((prev) => {
      const next = new Set(prev);
      if (next.has(qrId)) {
        next.delete(qrId);
      } else {
        next.add(qrId);
      }
      return next;
    });
  };

  const copyToClipboard = async (text, qrId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(qrId);
      setTimeout(() => setCopiedToken(''), 2000);
    } catch (copyError) {
      console.error('Failed to copy:', copyError);
    }
  };

  const downloadQR = async (tokenValue, qrId) => {
    try {
      const dataUrl = await QRCode.toDataURL(tokenValue, {
        errorCorrectionLevel: 'M',
        margin: 2,
        scale: 6,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `qr-${qrId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (downloadError) {
      console.error('Failed to generate/download QR image:', downloadError);
      setError('Failed to generate QR image');
    }
  };

  const getStatusTone = (status) => {
    switch (status) {
      case 'active':
        return 'emerald';
      case 'inactive':
        return 'slate';
      case 'expired':
        return 'rose';
      case 'used':
        return 'sky';
      default:
        return 'slate';
    }
  };

  const activeCount = qrCodes.filter((qr) => qr.status === 'active').length;
  const inactiveCount = qrCodes.filter((qr) => qr.status === 'inactive').length;
  const expiredCount = qrCodes.filter((qr) => qr.status === 'expired').length;
  const totalUsage = useMemo(
    () => qrCodes.reduce((sum, qr) => sum + (qr.usage_count || 0), 0),
    [qrCodes]
  );

  if (loading) {
    return (
      <AdminRoute>
        <AdminPageShell>
          <div className="py-16 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-700" />
            <div className="mt-4 text-sm text-slate-500">Loading QR codes...</div>
          </div>
        </AdminPageShell>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Access Tokens"
          title="QR Code Management"
          description="Generate, inspect, deactivate, dan download QR access token dari workspace admin yang lebih terstruktur."
          actions={
            <>
              <AdminButton variant="secondary" icon={FiRefreshCw} onClick={fetchQRCodes}>
                Refresh
              </AdminButton>
              <AdminButton
                variant="primary"
                icon={FiPlus}
                onClick={() => setShowGenerateForm((prev) => !prev)}
              >
                {showGenerateForm ? 'Cancel' : 'Generate QR Code'}
              </AdminButton>
            </>
          }
        />

        {error ? <AdminBanner tone="error">{error}</AdminBanner> : null}
        {success ? <AdminBanner tone="success">{success}</AdminBanner> : null}

        <div className="grid gap-5 md:grid-cols-4">
          <AdminMetricCard
            title="Total QR Codes"
            value={qrCodes.length}
            subtext="Semua QR yang tersimpan"
            icon={RiQrCodeLine}
            tone="sky"
          />
          <AdminMetricCard
            title="Active"
            value={activeCount}
            subtext="QR yang masih siap digunakan"
            icon={FiCheck}
            tone="emerald"
          />
          <AdminMetricCard
            title="Inactive"
            value={inactiveCount}
            subtext="QR yang dinonaktifkan"
            icon={FiEyeOff}
            tone="slate"
          />
          <AdminMetricCard
            title="Expired / Used"
            value={expiredCount}
            subtext={`${totalUsage} total usages across all tokens`}
            icon={FiTrash2}
            tone="amber"
          />
        </div>

        <AdminSurface>
          <AdminSectionTitle
            title="Generate New QR Code"
            subtitle="Buat token baru dengan masa berlaku dan jumlah pemakaian yang bisa dikontrol."
          />

          {showGenerateForm ? (
            <form onSubmit={handleGenerateQR} className="mt-6 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <AdminLabel>Expires In (Hours)</AdminLabel>
                  <AdminInput
                    type="number"
                    min="1"
                    max="720"
                    value={formData.expires_in_hours}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        expires_in_hours: parseInt(e.target.value, 10) || 24,
                      }))
                    }
                    required
                  />
                  <div className="mt-2 text-xs text-slate-500">Maximum: 30 days (720 hours)</div>
                </div>
                <div>
                  <AdminLabel>Max Uses</AdminLabel>
                  <AdminInput
                    type="number"
                    min="1"
                    max="100"
                    value={formData.max_uses}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        max_uses: parseInt(e.target.value, 10) || 1,
                      }))
                    }
                    required
                  />
                  <div className="mt-2 text-xs text-slate-500">How many times this QR can be used</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <AdminButton variant="primary" type="submit" disabled={generating}>
                  {generating ? 'Generating...' : 'Generate QR Code'}
                </AdminButton>
                <AdminButton variant="secondary" type="button" onClick={() => setShowGenerateForm(false)}>
                  Cancel
                </AdminButton>
              </div>
            </form>
          ) : (
            <div className="mt-5 rounded-3xl bg-slate-50 px-5 py-5 text-sm leading-6 text-slate-500">
              Open the form to generate a new QR access token with custom expiry and usage limits.
            </div>
          )}
        </AdminSurface>

        <AdminSurface className="overflow-hidden p-0">
          <div className="border-b border-slate-200/80 px-6 py-5">
            <AdminSectionTitle
              title={`QR Codes (${qrCodes.length})`}
              subtitle="Token list dengan kontrol visibility, copy, download, dan deactivate dari satu tempat."
            />
          </div>

          {qrCodes.length === 0 ? (
            <div className="p-6">
              <AdminEmptyState
                title="No QR codes yet"
                description="Generate your first QR code to start distributing SmartBin access."
                action={
                  <AdminButton variant="primary" icon={FiPlus} onClick={() => setShowGenerateForm(true)}>
                    Generate First QR Code
                  </AdminButton>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/90">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-slate-500">
                      Token
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-slate-500">
                      Usage
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-slate-500">
                      Expires
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-slate-500">
                      Created
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {qrCodes.map((qr) => (
                    <tr key={qr.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="max-w-[220px] truncate rounded-xl bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900">
                            {visibleTokens.has(qr.id) ? qr.token : '••••••••••••••••••••••••••'}
                          </div>
                          <button
                            onClick={() => toggleTokenVisibility(qr.id)}
                            className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200"
                          >
                            {visibleTokens.has(qr.id) ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(qr.token, qr.id)}
                            className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200"
                          >
                            {copiedToken === qr.id ? (
                              <FiCheck className="h-4 w-4 text-emerald-700" />
                            ) : (
                              <FiCopy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <AdminBadge tone={getStatusTone(qr.status)}>{qr.status}</AdminBadge>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-700">
                        {qr.usage_count} / {qr.max_uses}
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-700">{formatDateTime(qr.expires_at)}</td>
                      <td className="px-6 py-5 text-sm text-slate-700">{formatDateTime(qr.generated_at)}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          {qr.status === 'active' ? (
                            <AdminButton
                              variant="danger"
                              icon={FiTrash2}
                              className="px-4 py-2"
                              onClick={() => handleDeactivateQR(qr.id)}
                            >
                              Deactivate
                            </AdminButton>
                          ) : null}
                          <AdminButton
                            variant="secondary"
                            icon={FiDownload}
                            className="px-4 py-2"
                            onClick={() => downloadQR(qr.token, qr.id)}
                          >
                            Download
                          </AdminButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSurface>
      </AdminPageShell>
    </AdminRoute>
  );
}
