'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiDownload, FiCalendar, FiUsers, FiTrendingUp, FiDollarSign, FiFileText } from 'react-icons/fi';

export default function AdminExport() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState({});
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0]
  });
  const [exportOptions, setExportOptions] = useState({
    includeHeaders: true,
    format: 'csv'
  });
  const apiBase = process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
  }, [token]);

  const exportData = async (type, customParams = {}) => {
    const exportId = `${type}_${Date.now()}`;
    setExporting(prev => ({ ...prev, [exportId]: true }));
    
    try {
      let endpoint = '';
      let params = new URLSearchParams();
      
      // Add date range if specified
      if (dateRange.startDate && dateRange.endDate) {
        params.append('start_date', dateRange.startDate);
        params.append('end_date', dateRange.endDate);
      }
      
      // Add custom parameters
      Object.entries(customParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      // Add format parameter
      params.append('format', exportOptions.format);
      
      // Add headers parameter
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
      
      // Append query parameters if any
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }
      
      const resp = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` },
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
    } catch (e) {
      console.error(`Export failed for ${type}:`, e);
      setError(e.message || `Failed to export ${type} data`);
    } finally {
      setExporting(prev => ({ ...prev, [exportId]: false }));
    }
  };

  const exportTypes = [
    {
      id: 'users',
      title: 'User Data',
      description: 'Export user information, points, and statistics',
      icon: FiUsers,
      color: 'bg-blue-500',
      endpoint: '/admin/users/export'
    },
    {
      id: 'scans',
      title: 'Scan Data',
      description: 'Export bottle scan records and measurements',
      icon: FiTrendingUp,
      color: 'bg-green-500',
      endpoint: '/admin/scans/export'
    },
    {
      id: 'transactions',
      title: 'Transaction Data',
      description: 'Export point transactions and rewards',
      icon: FiDollarSign,
      color: 'bg-yellow-500',
      endpoint: '/admin/transactions/export'
    },
    {
      id: 'withdrawals',
      title: 'Withdrawal Data',
      description: 'Export withdrawal requests and status',
      icon: FiFileText,
      color: 'bg-purple-500',
      endpoint: '/payout/admin/withdrawals/export'
    },
    {
      id: 'statistics',
      title: 'Statistics Data',
      description: 'Export aggregated statistics and analytics',
      icon: FiTrendingUp,
      color: 'bg-indigo-500',
      endpoint: '/admin/statistics/export'
    },
    {
      id: 'notifications',
      title: 'Notification Data',
      description: 'Export notification history and settings',
      icon: FiFileText,
      color: 'bg-red-500',
      endpoint: '/admin/notifications/export'
    }
  ];

  const isExporting = (type) => {
    return Object.keys(exporting).some(key => key.startsWith(type) && exporting[key]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <FiArrowLeft className="mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Data Export</h1>
          <p className="text-gray-600 mt-2">Export system data in various formats for analysis and reporting</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Export Options */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiCalendar className="inline mr-2" />
                Date Range
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <select
                value={exportOptions.format}
                onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="xlsx">Excel (XLSX)</option>
              </select>
            </div>

            {/* Additional Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeHeaders}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeHeaders: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Headers</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Export Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exportTypes.map((exportType) => {
            const IconComponent = exportType.icon;
            return (
              <div key={exportType.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200">
                <div className="p-6">
                  <div className={`inline-flex p-3 rounded-lg ${exportType.color} mb-4`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {exportType.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {exportType.description}
                  </p>
                  
                  <button
                    onClick={() => exportData(exportType.id)}
                    disabled={isExporting(exportType.id)}
                    className={`w-full inline-flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                      isExporting(exportType.id)
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <FiDownload className="mr-2" />
                    {isExporting(exportType.id) ? 'Exporting...' : 'Export'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bulk Export */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bulk Export</h2>
          <p className="text-gray-600 mb-4">
            Export all data types at once for comprehensive system backup and analysis.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => {
                exportTypes.forEach(type => exportData(type.id));
              }}
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <FiDownload className="mr-2" />
              Export All Data
            </button>
            
            <button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setDateRange({ startDate: today, endDate: today });
              }}
              className="inline-flex items-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <FiCalendar className="mr-2" />
              Set to Today
            </button>
            
            <button
              onClick={() => {
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                const today = new Date().toISOString().split('T')[0];
                setDateRange({ startDate: thirtyDaysAgo, endDate: today });
              }}
              className="inline-flex items-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <FiCalendar className="mr-2" />
              Last 30 Days
            </button>
          </div>
        </div>

        {/* Export History */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Export History</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              Export history and logs will be displayed here. This feature is coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
