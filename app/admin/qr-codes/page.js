'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiCopy,
  FiCheck
} from 'react-icons/fi';
import { RiQrCodeLine } from 'react-icons/ri';
import QRCode from 'qrcode';
import AdminRoute from '../../components/AdminRoute';

export default function AdminQRCodesPage() {
  const { token, user } = useAuth();
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
    max_uses: 1
  });

  const apiBase = process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchQRCodes();
  }, [token]);

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${apiBase}/api/qr/list`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('QR code system not available. Please ensure the backend is running with QR code support.');
        }
        throw new Error('Failed to fetch QR codes');
      }

      const data = await response.json();
      setQrCodes(data);
    } catch (e) {
      console.error('Failed to fetch QR codes:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      setError('');

      const response = await fetch(`${apiBase}/api/qr/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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

      // Add to the list
      setQrCodes(prev => [newQR, ...prev]);
      setSuccess('QR code generated successfully!');

      // Reset form
      setFormData({ expires_in_hours: 24, max_uses: 1 });
      setShowGenerateForm(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      console.error('Failed to generate QR code:', e);
      setError('Failed to generate QR code');
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
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('QR code deactivation endpoint not available. Please ensure the backend is running with QR code support.');
        }
        throw new Error('Failed to deactivate QR code');
      }

      // Update the QR code in the list
      setQrCodes(prev => prev.map(qr =>
        qr.id === qrId ? { ...qr, status: 'inactive' } : qr
      ));

      setSuccess('QR code deactivated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      console.error('Failed to deactivate QR code:', e);
      setError(e.message);
    }
  };

  const toggleTokenVisibility = (qrId) => {
    setVisibleTokens(prev => {
      const newSet = new Set(prev);
      if (newSet.has(qrId)) {
        newSet.delete(qrId);
      } else {
        newSet.add(qrId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text, qrId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(qrId);
      setTimeout(() => setCopiedToken(''), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const downloadQR = async (token, qrId) => {
    try {
      const dataUrl = await QRCode.toDataURL(token, {
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
    } catch (e) {
      console.error('Failed to generate/download QR image:', e);
      setError('Failed to generate QR image');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      case 'expired': return 'text-red-600 bg-red-100';
      case 'used': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <AdminRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading QR codes...</p>
          </div>
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">QR Code Management</h1>
              <p className="text-gray-600 mt-2">Generate and manage QR codes for SmartBin access</p>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 border border-green-200 rounded-lg">
              {success}
            </div>
          )}

          {/* Generate QR Code Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <RiQrCodeLine className="h-5 w-5" />
                Generate New QR Code
              </h2>
              <button
                onClick={() => setShowGenerateForm(!showGenerateForm)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  showGenerateForm
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <FiPlus className="h-4 w-4" />
                {showGenerateForm ? 'Cancel' : 'Generate QR Code'}
              </button>
            </div>

            {showGenerateForm && (
              <form onSubmit={handleGenerateQR} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expires In (Hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="720"
                      value={formData.expires_in_hours}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        expires_in_hours: parseInt(e.target.value) || 24
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum: 30 days (720 hours)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Uses
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.max_uses}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        max_uses: parseInt(e.target.value) || 1
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">How many times this QR can be used</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={generating}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {generating && <FiRefreshCw className="h-4 w-4 animate-spin" />}
                    Generate QR Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGenerateForm(false)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* QR Codes List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  QR Codes ({qrCodes.length})
                </h2>
                <button
                  onClick={fetchQRCodes}
                  className="px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <FiRefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>

            {qrCodes.length === 0 ? (
              <div className="p-12 text-center">
                <RiQrCodeLine className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No QR codes yet</h3>
                <p className="text-gray-500 mb-4">Generate your first QR code to get started</p>
                <button
                  onClick={() => setShowGenerateForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Generate First QR Code
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Token
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expires
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {qrCodes.map((qr) => (
                      <tr key={qr.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="font-mono text-sm text-gray-900 max-w-[200px] truncate">
                              {visibleTokens.has(qr.id) ? qr.token : '••••••••••••••••••••••••••'}
                            </div>
                            <button
                              onClick={() => toggleTokenVisibility(qr.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {visibleTokens.has(qr.id) ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(qr.token, qr.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {copiedToken === qr.id ? <FiCheck className="h-4 w-4 text-green-600" /> : <FiCopy className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(qr.status)}`}>
                            {qr.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {qr.usage_count} / {qr.max_uses}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(qr.expires_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(qr.generated_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {qr.status === 'active' && (
                            <button
                              onClick={() => handleDeactivateQR(qr.id)}
                              className="text-red-600 hover:text-red-900 flex items-center gap-1"
                            >
                              <FiTrash2 className="h-4 w-4" />
                              Deactivate
                            </button>
                          )}
                          <button
                            onClick={() => downloadQR(qr.token, qr.id)}
                            className="ml-3 text-blue-600 hover:text-blue-900"
                            title="Download QR PNG"
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminRoute>
  );
}
