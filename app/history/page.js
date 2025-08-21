'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../components/ProtectedRoute';
  import HistoryListItem from '../components/HistoryListItem';
import TopBar from '../components/TopBar';

export default function HistoryPage() {
  const { user, token, logout, updateUser } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    total_scans: 0,
    valid_scans: 0,
    total_points: 0,
    success_rate: 0
  });
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    fetchData();
  }, [token, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch transactions, summary and withdrawals in parallel
      const [transactionsResponse, summaryResponse, withdrawalsResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000'}/api/scan/transactions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000'}/api/scan/transactions/summary`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000'}/payout/withdrawals`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      if (!transactionsResponse.ok) {
        throw new Error(`HTTP error! status: ${transactionsResponse.status}`);
      }

      if (!summaryResponse.ok) {
        throw new Error(`HTTP error! status: ${summaryResponse.status}`);
      }
      if (!withdrawalsResponse.ok) {
        throw new Error(`HTTP error! status: ${withdrawalsResponse.status}`);
      }

      const [transactionsData, summaryData, withdrawalsData] = await Promise.all([
        transactionsResponse.json(),
        summaryResponse.json(),
        withdrawalsResponse.json(),
      ]);

      setTransactions(transactionsData);
      setSummary(summaryData);
      setWithdrawals(withdrawalsData || []);
      // Ensure user points stay in sync with backend summary
      if (summaryData && typeof summaryData.total_points === 'number') {
        if (user) {
          updateUser({ ...user, points: summaryData.total_points });
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (valid) => {
    return valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  // Transform backend transactions to match HistoryListItem interface
  const transformTransactions = (backendTransactions) => {
    return backendTransactions.map((transaction) => ({
      id: transaction.id || transaction._id,
      icon: (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          transaction.valid ? 'bg-[color:var(--color-success)]' : 'bg-[color:var(--color-danger)]'
        }`}>
          {transaction.valid ? (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
      ),
      title: transaction.brand || 'Unknown Brand',
      time: formatDate(transaction.timestamp),
      amount: transaction.valid && transaction.points > 0 ? transaction.points * 50 : 0, // Convert points to currency
      points: transaction.valid ? transaction.points : 0
    }));
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute userOnly={true}>
      <div className="max-w-[430px] mx-auto min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
        <TopBar title="Riwayat Transaksi" backHref="/" />
        <div className="pt-4 pb-24 px-4">
          {/* Stats Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6 mt-2">
            <div className="bg-[var(--color-card)] rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-[color:var(--color-success)]/20 rounded-full flex items-center justify-center">
                    <svg className="h-5 w-5 text-[color:var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-[color:var(--color-muted)]">Valid Scans</p>
                  <p className="text-lg font-semibold">{summary.valid_scans}</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-card)] rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-[color:var(--color-accent-amber)]/20 rounded-full flex items-center justify-center">
                    <svg className="h-5 w-5 text-[color:var(--color-accent-amber)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-[color:var(--color-muted)]">Total Points</p>
                  <p className="text-lg font-semibold">{summary.total_points}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] [box-shadow:var(--shadow-card)] p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] leading-6 font-semibold">Transaksi Terbaru</h3>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                    <div className="flex-1 px-4">
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                      <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="text-right">
                      <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-2" />
                      <div className="h-3 w-12 bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-6">
                <p className="text-sm text-[color:var(--color-danger)] mb-3">{error}</p>
                <button
                  onClick={fetchData}
                  className="px-4 py-2 bg-[color:var(--color-primary-600)] text-white rounded-[var(--radius-md)] hover:opacity-90"
                >
                  Coba Lagi
                </button>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-6">
                <svg className="mx-auto h-12 w-12 text-[color:var(--color-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-sm text-[color:var(--color-muted)]">Belum ada transaksi</p>
                <p className="text-xs text-[color:var(--color-muted)]">Mulai scan botol untuk melihat riwayat</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transformTransactions(transactions.slice(0, 10)).map((transaction) => (
                  <div key={transaction.id}>
                    <HistoryListItem transaction={transaction} />
                    {transaction.id !== transactions[transactions.length - 1]?.id && (
                      <div className="border-t border-gray-100 mt-3" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Withdrawals */}
          {withdrawals.length > 0 && (
            <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] [box-shadow:var(--shadow-card)] p-4">
              <h3 className="text-[18px] leading-6 font-semibold mb-4">Riwayat Penarikan</h3>
              <div className="space-y-3">
                {withdrawals.map((w, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-[14px] leading-5 font-medium">{w.amount_points} points</div>
                      <div className="text-[12px] leading-4 text-[color:var(--color-muted)]">
                        {new Date(w.created_at).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className={`text-sm font-semibold ${
                      w.status === 'completed' ? 'text-[color:var(--color-success)]' : 
                      w.status === 'rejected' ? 'text-[color:var(--color-danger)]' : 
                      'text-[color:var(--color-accent-amber)]'
                    }`}>
                      {w.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
