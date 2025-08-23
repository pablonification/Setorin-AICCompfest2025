'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiRefreshCw, FiPlay, FiSquare, FiSend, FiUsers, FiActivity, FiWifi, FiWifiOff } from 'react-icons/fi';

export default function AdminMonitoring() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState({
    total_connections: 0,
    total_users: 0,
    status: 'unknown'
  });
  const [wsManagerStatus, setWsManagerStatus] = useState('unknown');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(null);
  const apiBase = process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchStatus();
    
    // Set up auto-refresh every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`${apiBase}/ws/status`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!resp.ok) {
        throw new Error(`Failed to fetch status: ${resp.status}`);
      }
      const data = await resp.json();
      setWsStatus(data);
      setWsManagerStatus(data.status || 'unknown');
    } catch (e) {
      console.error('Failed to fetch WebSocket status:', e);
      setError(e.message || 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  };

  const startWebSocketManager = async () => {
    try {
      const resp = await fetch(`${apiBase}/ws/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Failed to start WebSocket manager');
      
      setError('');
      fetchStatus();
    } catch (e) {
      setError(e.message || 'Failed to start WebSocket manager');
    }
  };

  const stopWebSocketManager = async () => {
    try {
      const resp = await fetch(`${apiBase}/ws/stop`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Failed to stop WebSocket manager');
      
      setError('');
      fetchStatus();
    } catch (e) {
      setError(e.message || 'Failed to stop WebSocket manager');
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
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'admin_broadcast',
          message: broadcastMessage,
          timestamp: new Date().toISOString()
        }),
      });
      if (!resp.ok) throw new Error('Failed to broadcast message');
      
      setError('');
      setBroadcastMessage('');
    } catch (e) {
      setError(e.message || 'Failed to broadcast message');
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
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'admin_message',
          message: userMessage,
          timestamp: new Date().toISOString()
        }),
      });
      if (!resp.ok) throw new Error('Failed to send message to user');
      
      setError('');
      setTargetUserId('');
      setUserMessage('');
    } catch (e) {
      setError(e.message || 'Failed to send message to user');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'stopped': return 'text-red-600 bg-red-100';
      case 'starting': return 'text-yellow-600 bg-yellow-100';
      case 'stopping': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <FiWifi className="h-5 w-5" />;
      case 'stopped': return <FiWifiOff className="h-5 w-5" />;
      default: return <FiActivity className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-gray-600 mt-2">Monitor WebSocket connections and system health</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* WebSocket Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiWifi className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">WebSocket Status</p>
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(wsManagerStatus)}`}>
                  {getStatusIcon(wsManagerStatus)}
                  <span className="ml-1 capitalize">{wsManagerStatus}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FiUsers className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Connections</p>
                <p className="text-2xl font-bold text-gray-900">{wsStatus.total_connections}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FiActivity className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Connected Users</p>
                <p className="text-2xl font-bold text-gray-900">{wsStatus.total_users}</p>
              </div>
            </div>
          </div>
        </div>

        {/* WebSocket Management */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">WebSocket Manager Control</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={startWebSocketManager}
              disabled={wsManagerStatus === 'active' || wsManagerStatus === 'starting'}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiPlay className="mr-2" />
              Start Manager
            </button>
            <button
              onClick={stopWebSocketManager}
              disabled={wsManagerStatus === 'stopped' || wsManagerStatus === 'stopping'}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSquare className="mr-2" />
              Stop Manager
            </button>
            <button
              onClick={fetchStatus}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiRefreshCw className="mr-2" />
              Refresh Status
            </button>
          </div>
        </div>

        {/* Message Broadcasting */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Broadcast Message to All Users</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Enter message to broadcast to all connected users..."
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
            <button
              onClick={broadcastToAll}
              disabled={!broadcastMessage.trim()}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <FiSend className="mr-2" />
              Broadcast to All
            </button>
          </div>
        </div>

        {/* Send Message to Specific User */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Message to Specific User</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <input
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Enter user ID..."
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <input
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="Enter message..."
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <button
            onClick={sendToUser}
            disabled={!targetUserId.trim() || !userMessage.trim()}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <FiSend className="mr-2" />
            Send to User
          </button>
        </div>

        {/* Connection Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Connection Details</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Manager Status:</span>
                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(wsManagerStatus)}`}>
                  {getStatusIcon(wsManagerStatus)}
                  <span className="ml-1 capitalize">{wsManagerStatus}</span>
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Total Connections:</span>
                <span className="ml-2 text-gray-900">{wsStatus.total_connections}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Connected Users:</span>
                <span className="ml-2 text-gray-900">{wsStatus.total_users}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Last Updated:</span>
                <span className="ml-2 text-gray-900">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

