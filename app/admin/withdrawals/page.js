'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiDownload, FiCheck, FiX, FiEye, FiRefreshCw } from 'react-icons/fi';
import AdminRoute from '../../components/AdminRoute';

export default function AdminWithdrawals() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [modalMode, setModalMode] = useState('view'); // 'view' or 'reject'
  const apiBase = process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchList();
  }, [token, status]);

  const fetchList = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`${apiBase}/payout/admin/withdrawals?status=${encodeURIComponent(status)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!resp.ok) {
        const t = await resp.json().catch(() => ({}));
        throw new Error(t.detail || `Failed: ${resp.status}`);
      }
      const data = await resp.json();
      setList(data || []);
    } catch (e) {
      setError(e.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async (id) => {
    try {
      const resp = await fetch(`${apiBase}/payout/admin/withdrawals/${id}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Failed to complete');
      fetchList();
      setError('');
    } catch (e) {
      setError(e.message || 'Update failed');
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
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_note: adminNote }),
      });
      if (!resp.ok) throw new Error('Failed to reject');
      fetchList();
      setShowModal(false);
      setAdminNote('');
      setError('');
    } catch (e) {
      setError(e.message || 'Update failed');
    }
  };

  const exportCsv = async () => {
    try {
      setExporting(true);
      const resp = await fetch(`${apiBase}/payout/admin/withdrawals/export.csv${status?`?status=${encodeURIComponent(status)}`:''}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
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
    } catch (e) {
      setError(e.message || 'Export failed');
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
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminRoute>
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
            <h1 className="text-3xl font-bold text-gray-900">Withdrawal Management</h1>
            <p className="text-gray-600 mt-2">Process withdrawal requests and manage payouts</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Filters and Actions */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <label className="font-medium text-gray-700">Status Filter:</label>
                <select 
                  className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="">All Statuses</option>
                </select>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={fetchList}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <FiRefreshCw className="mr-2" />
                  Refresh
                </button>
                <button
                  onClick={exportCsv}
                  disabled={exporting}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <FiDownload className="mr-2" />
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>
            </div>
          </div>

          {/* Withdrawals List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Withdrawal Requests ({list.length})
              </h2>
            </div>
            
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading withdrawals...</p>
              </div>
            ) : list.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No withdrawal requests found for the selected status.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {list.map((item) => (
                  <div key={item.id} className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                          <span className="text-lg font-semibold text-gray-900">
                            {item.amount_points.toLocaleString()} points
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Method:</span> {item.method_type}
                          {item.method_type === 'bank' ? (
                            <span> • {item.bank_code} • {item.bank_account_number} • {item.bank_account_name}</span>
                          ) : (
                            <span> • {item.ewallet_provider} • {item.phone_number}</span>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          Requested: {formatDate(item.created_at)}
                          {item.processed_at && (
                            <span> • Processed: {formatDate(item.processed_at)}</span>
                          )}
                        </div>
                        
                        {item.admin_note && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                            <span className="font-medium">Admin Note:</span> {item.admin_note}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewWithdrawalDetails(item)}
                          className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <FiEye className="mr-2" />
                          View Details
                        </button>
                        
                        {item.status === 'pending' && (
                          <>
                            <button
                              onClick={() => markComplete(item.id)}
                              className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <FiCheck className="mr-2" />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                openRejectModal(item);
                              }}
                              className="inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <FiX className="mr-2" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Details/Rejection Modal */}
        {showModal && selectedWithdrawal && (
          <div className="fixed inset-0 bg-[var(--color-overlay)] flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              
              {modalMode === 'view' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Withdrawal Details</h3>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Amount</label>
                      <p className="text-lg font-semibold text-gray-900">{selectedWithdrawal.amount_points.toLocaleString()} points</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Status</label>
                      <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedWithdrawal.status)}`}>
                        {selectedWithdrawal.status}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">User</label>
                      <p className="text-gray-900">{selectedWithdrawal.user_email}</p>
                    </div>
                     <div>
                      <label className="block text-sm font-medium text-gray-500">Withdrawal Method</label>
                      <div className="text-gray-900">
                        <p className="font-semibold">{selectedWithdrawal.method_type}</p>
                        {selectedWithdrawal.method_type === 'bank' ? (
                          <p>{selectedWithdrawal.bank_code} - {selectedWithdrawal.bank_account_number} ({selectedWithdrawal.bank_account_name})</p>
                        ) : (
                          <p>{selectedWithdrawal.ewallet_provider} - {selectedWithdrawal.phone_number}</p>
                        )}
                      </div>
                    </div>
                     <div>
                      <label className="block text-sm font-medium text-gray-500">Timestamps</label>
                      <p className="text-gray-900">Requested: {formatDate(selectedWithdrawal.created_at)}</p>
                      {selectedWithdrawal.processed_at && <p className="text-gray-900">Processed: {formatDate(selectedWithdrawal.processed_at)}</p>}
                    </div>
                    {selectedWithdrawal.admin_note && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Admin Note</label>
                        <p className="text-gray-900 bg-gray-50 p-2 rounded">{selectedWithdrawal.admin_note}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">Close</button>
                  </div>
                </>
              )}

              {modalMode === 'reject' && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Reject Withdrawal Request
                  </h3>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Rejecting withdrawal for <strong>{selectedWithdrawal.amount_points?.toLocaleString()} points</strong>
                    </p>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Note (Required)
                    </label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Provide a reason for rejection..."
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setAdminNote('');
                        setSelectedWithdrawal(null);
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => rejectRefund(selectedWithdrawal.id)}
                      disabled={!adminNote.trim()}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      Reject & Refund
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        )}
      </div>
    </AdminRoute>
  );
}
