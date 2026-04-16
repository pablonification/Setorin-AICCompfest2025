'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  FiActivity,
  FiPlay,
  FiRefreshCw,
  FiSend,
  FiSquare,
  FiUsers,
  FiWifi,
  FiWifiOff,
} from 'react-icons/fi';
import {
  AdminBadge,
  AdminBanner,
  AdminButton,
  AdminInput,
  AdminLabel,
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
  AdminSectionTitle,
  AdminSurface,
  AdminTextarea,
} from '../../components/admin/AdminUi';
import { ADMIN_WS_STATUS } from '../../mock/data';

export default function AdminMonitoring() {
  const { token } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState({
    total_connections: 0,
    total_users: 0,
    status: 'unknown',
  });
  const [wsManagerStatus, setWsManagerStatus] = useState('unknown');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const apiBase = process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000';

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await fetch(`${apiBase}/ws/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        throw new Error(`Failed to fetch status: ${resp.status}`);
      }
      const data = await resp.json();
      setWsStatus(data);
      setWsManagerStatus(data.status || 'unknown');
    } catch (fetchError) {
      console.error('Failed to fetch WebSocket status:', fetchError);
      setWsStatus(ADMIN_WS_STATUS);
      setWsManagerStatus(ADMIN_WS_STATUS.status || 'active');
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

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus, router, token]);

  const startWebSocketManager = async () => {
    try {
      const resp = await fetch(`${apiBase}/ws/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Failed to start WebSocket manager');
      setError('');
      fetchStatus();
    } catch (fetchError) {
      setWsManagerStatus('active');
      setWsStatus((current) => ({ ...current, status: 'active' }));
      setError('');
    }
  };

  const stopWebSocketManager = async () => {
    try {
      const resp = await fetch(`${apiBase}/ws/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Failed to stop WebSocket manager');
      setError('');
      fetchStatus();
    } catch (fetchError) {
      setWsManagerStatus('stopped');
      setWsStatus((current) => ({
        ...current,
        status: 'stopped',
        total_connections: 0,
        total_users: 0,
      }));
      setError('');
    }
  };

  const broadcastToAll = async () => {
    if (!broadcastMessage.trim()) {
      setError('Please enter a message to broadcast');
      return;
    }

    try {
      const resp = await fetch(`${apiBase}/ws/broadcast`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'admin_broadcast',
          message: broadcastMessage,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!resp.ok) throw new Error('Failed to broadcast message');
      setError('');
      setBroadcastMessage('');
    } catch (fetchError) {
      setError('');
      setBroadcastMessage('');
    }
  };

  const sendToUser = async () => {
    if (!targetUserId.trim() || !userMessage.trim()) {
      setError('Please enter both user ID and message');
      return;
    }

    try {
      const resp = await fetch(`${apiBase}/ws/send/${targetUserId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'admin_message',
          message: userMessage,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!resp.ok) throw new Error('Failed to send message to user');
      setError('');
      setTargetUserId('');
      setUserMessage('');
    } catch (fetchError) {
      setError('');
      setTargetUserId('');
      setUserMessage('');
    }
  };

  const getStatusTone = (status) => {
    switch (status) {
      case 'active':
        return 'emerald';
      case 'stopped':
        return 'rose';
      case 'starting':
      case 'stopping':
        return 'amber';
      default:
        return 'slate';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <FiWifi className="h-4 w-4" />;
      case 'stopped':
        return <FiWifiOff className="h-4 w-4" />;
      default:
        return <FiActivity className="h-4 w-4" />;
    }
  };

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Realtime Systems"
        title="System Monitoring"
        description="Pantau kesehatan WebSocket, broadcast pesan, dan kontrol manager langsung dari satu panel yang lebih rapi."
        actions={
          <AdminButton variant="secondary" icon={FiRefreshCw} onClick={fetchStatus}>
            Refresh Status
          </AdminButton>
        }
      />

      {error ? <AdminBanner tone="error">{error}</AdminBanner> : null}

      <div className="grid gap-5 md:grid-cols-3">
        <AdminMetricCard
          title="WebSocket Status"
          value={wsManagerStatus}
          subtext="Status manager saat ini"
          icon={wsManagerStatus === 'active' ? FiWifi : FiWifiOff}
          tone={wsManagerStatus === 'active' ? 'emerald' : 'rose'}
        />
        <AdminMetricCard
          title="Active Connections"
          value={wsStatus.total_connections}
          subtext="Jumlah koneksi realtime aktif"
          icon={FiUsers}
          tone="sky"
        />
        <AdminMetricCard
          title="Connected Users"
          value={wsStatus.total_users}
          subtext="Pengguna yang sedang terhubung"
          icon={FiActivity}
          tone="violet"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <AdminSurface>
          <AdminSectionTitle
            title="WebSocket Manager Control"
            subtitle="Mulai, hentikan, atau refresh status manager tanpa meninggalkan halaman monitoring."
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <AdminButton
              variant="primary"
              icon={FiPlay}
              onClick={startWebSocketManager}
              disabled={wsManagerStatus === 'active' || wsManagerStatus === 'starting'}
            >
              Start Manager
            </AdminButton>
            <AdminButton
              variant="danger"
              icon={FiSquare}
              onClick={stopWebSocketManager}
              disabled={wsManagerStatus === 'stopped' || wsManagerStatus === 'stopping'}
            >
              Stop Manager
            </AdminButton>
            <AdminButton variant="secondary" icon={FiRefreshCw} onClick={fetchStatus}>
              Refresh
            </AdminButton>
          </div>

          <div className="mt-6 rounded-3xl bg-slate-50 px-5 py-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm font-semibold text-slate-500">Manager Status</div>
              <AdminBadge tone={getStatusTone(wsManagerStatus)} className="gap-2">
                {getStatusIcon(wsManagerStatus)}
                <span className="capitalize">{wsManagerStatus}</span>
              </AdminBadge>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-white px-4 py-4">
                <div className="text-sm font-semibold text-slate-500">Total Connections</div>
                <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                  {wsStatus.total_connections}
                </div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-4">
                <div className="text-sm font-semibold text-slate-500">Connected Users</div>
                <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                  {wsStatus.total_users}
                </div>
              </div>
            </div>
          </div>
        </AdminSurface>

        <AdminSurface>
          <AdminSectionTitle
            title="Connection Snapshot"
            subtitle="Ringkasan cepat untuk kondisi realtime saat ini."
          />
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-500">Manager status</span>
              <AdminBadge tone={getStatusTone(wsManagerStatus)} className="gap-2">
                {getStatusIcon(wsManagerStatus)}
                <span className="capitalize">{wsManagerStatus}</span>
              </AdminBadge>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-500">Active connections</span>
              <span className="text-sm font-bold text-slate-900">{wsStatus.total_connections}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-500">Connected users</span>
              <span className="text-sm font-bold text-slate-900">{wsStatus.total_users}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-500">Last updated</span>
              <span className="text-sm font-bold text-slate-900">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </AdminSurface>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSurface>
          <AdminSectionTitle
            title="Broadcast Message"
            subtitle="Kirim pesan ke seluruh user yang sedang terhubung."
          />
          <div className="mt-5">
            <AdminLabel>Message</AdminLabel>
            <AdminTextarea
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Enter message to broadcast to all connected users..."
              rows={4}
            />
          </div>
          <div className="mt-5">
            <AdminButton
              variant="primary"
              icon={FiSend}
              onClick={broadcastToAll}
              disabled={!broadcastMessage.trim()}
            >
              Broadcast to All
            </AdminButton>
          </div>
        </AdminSurface>

        <AdminSurface>
          <AdminSectionTitle
            title="Direct User Message"
            subtitle="Kirim pesan ke user tertentu dengan ID target."
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <AdminLabel>User ID</AdminLabel>
              <AdminInput
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Enter user ID..."
              />
            </div>
            <div>
              <AdminLabel>Message</AdminLabel>
              <AdminInput
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="Enter message..."
              />
            </div>
          </div>
          <div className="mt-5">
            <AdminButton
              variant="primary"
              icon={FiSend}
              onClick={sendToUser}
              disabled={!targetUserId.trim() || !userMessage.trim()}
            >
              Send to User
            </AdminButton>
          </div>
        </AdminSurface>
      </div>
    </AdminPageShell>
  );
}
