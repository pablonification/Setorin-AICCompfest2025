'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../components/ProtectedRoute';
import TopBar from '../components/TopBar';

export default function PayoutPage() {
  const { token, user, updateUser } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [method, setMethod] = useState(null);
  const [methodType, setMethodType] = useState('bank');
  const [bankCode, setBankCode] = useState('BCA');
  const [bankAcc, setBankAcc] = useState('');
  const [bankName, setBankName] = useState('');
  const [ewalletProvider, setEwalletProvider] = useState('OVO');
  const [phoneNumber, setPhoneNumber] = useState('');
//   buat di set, value auto minimum yg autotyped
  const [amount, setAmount] = useState(1000);
  const [withdrawals, setWithdrawals] = useState([]);
  const [banks, setBanks] = useState(["BCA","BNI","BRI","MANDIRI"]);
  const [ewallets, setEwallets] = useState(["OVO","GOPAY","DANA","SHOPEEPAY"]);
//   ini juga
  const [minWithdrawal, setMinWithdrawal] = useState(20000);

  const apiBase = process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchAll();
  }, [token]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [m, w, meta] = await Promise.all([
        fetch(`${apiBase}/payout/method`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiBase}/payout/withdrawals`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiBase}/payout/metadata`),
      ]);
      if (m.ok) {
        const md = await m.json();
        setMethod(md);
      } else if (m.status === 404) {
        setMethod(null);
      }
      if (w.ok) {
        const wd = await w.json();
        setWithdrawals(wd || []);
      }
      if (meta.ok) {
        const metaData = await meta.json();
        if (Array.isArray(metaData?.banks)) setBanks(metaData.banks);
        if (Array.isArray(metaData?.ewallets)) setEwallets(metaData.ewallets);
        const minPts = Number(metaData?.min_withdrawal_points);
        if (!Number.isNaN(minPts) && minPts > 0) {
          setMinWithdrawal(minPts);
          if (!amount || Number(amount) < minPts) {
            setAmount(minPts);
          }
        }
      }
    } catch (e) {
      setError('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  };

  const handleSetMethod = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = methodType === 'bank' ? {
        method_type: 'bank',
        bank_code: bankCode,
        bank_account_number: bankAcc,
        bank_account_name: bankName,
      } : {
        method_type: 'ewallet',
        ewallet_provider: ewalletProvider,
        phone_number: phoneNumber,
      };
      const resp = await fetch(`${apiBase}/payout/method`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const t = await resp.json().catch(() => ({}));
        throw new Error(t.detail || `Failed: ${resp.status}`);
      }
      const md = await resp.json();
      setMethod(md);
    } catch (e) {
      setError(e.message || 'Failed to set method');
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const resp = await fetch(`${apiBase}/payout/withdrawals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount_points: Number(amount) }),
      });
      if (!resp.ok) {
        const t = await resp.json().catch(() => ({}));
        throw new Error(t.detail || `Failed: ${resp.status}`);
      }
      await fetchAll();
      // Refresh user points from backend authoritative source
      try {
        const me = await fetch(`${apiBase}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (me.ok) {
          const meData = await me.json();
          if (meData && typeof meData.points === 'number') {
            updateUser({ ...user, points: meData.points });
          }
        }
      } catch {}
    } catch (e) {
      setError(e.message || 'Failed to request withdrawal');
    }
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
      <div className="pb-10 max-w-[430px] mx-auto min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
        <TopBar title="Pencairan" />

        {/* Safe area */}
        <div className="pt-4 pb-24 px-4">
          {error && (
            <div className="mb-4 p-3 rounded-[var(--radius-sm)] bg-red-50 text-red-700 border border-red-200">{error}</div>
          )}

          {/* Payout method setup (one-time) */}
          <div className="bg-[var(--color-card)] rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] p-4 mb-6">
            <div className="text-sm leading-5 font-semibold mb-2">Metode Pencairan</div>
            {method ? (
              <div className="text-sm leading-5 text-[color:var(--color-muted)]">
                <div>Jenis: <span className="font-medium uppercase text-[var(--foreground)]">{method.method_type}</span></div>
                {method.method_type === 'bank' ? (
                  <div>
                    <div>Bank: {method.bank_code}</div>
                    <div>No. Rekening: {method.bank_account_number}</div>
                    <div>Nama: {method.bank_account_name}</div>
                  </div>
                ) : (
                  <div>
                    <div>Provider: {method.ewallet_provider}</div>
                    <div>No. HP: {method.phone_number}</div>
                  </div>
                )}
                <div className="text-xs leading-4 mt-1">Sudah diset dan tidak bisa diubah.</div>
              </div>
            ) : (
              <form onSubmit={handleSetMethod} className="space-y-3">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="method" value="bank" checked={methodType==='bank'} onChange={() => setMethodType('bank')} />
                    <span>Bank</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="method" value="ewallet" checked={methodType==='ewallet'} onChange={() => setMethodType('ewallet')} />
                    <span>E-Wallet</span>
                  </label>
                </div>
                {methodType === 'bank' ? (
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs leading-4 text-[color:var(--color-muted)] mb-1">Bank</label>
                      <select className="w-full border rounded-[var(--radius-sm)] p-2" value={bankCode} onChange={e=>setBankCode(e.target.value)}>
                        {banks.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs leading-4 text-[color:var(--color-muted)] mb-1">No. Rekening</label>
                      <input className="w-full border rounded-[var(--radius-sm)] p-2" value={bankAcc} onChange={e=>setBankAcc(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-xs leading-4 text-[color:var(--color-muted)] mb-1">Nama Pemilik Rekening</label>
                      <input className="w-full border rounded-[var(--radius-sm)] p-2" value={bankName} onChange={e=>setBankName(e.target.value)} required />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs leading-4 text-[color:var(--color-muted)] mb-1">Provider</label>
                      <select className="w-full border rounded-[var(--radius-sm)] p-2" value={ewalletProvider} onChange={e=>setEwalletProvider(e.target.value)}>
                        {ewallets.map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs leading-4 text-[color:var(--color-muted)] mb-1">No. HP</label>
                      <input className="w-full border rounded-[var(--radius-sm)] p-2" value={phoneNumber} onChange={e=>setPhoneNumber(e.target.value)} required />
                    </div>
                  </div>
                )}
                <button className="text-sm h-12 px-5 rounded-[var(--radius-pill)] bg-[var(--color-primary-700)] text-white" type="submit">Simpan Metode</button>
              </form>
            )}
          </div>

          {/* Withdraw */}
          <div className="bg-[var(--color-card)] rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] p-4 mb-6">
            <div className="text-sm leading-5 font-semibold mb-2">Tarik Poin</div>
            <form onSubmit={handleWithdraw} className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs leading-4 text-[color:var(--color-muted)] mb-1">Jumlah Poin</label>
                <input type="number" min={minWithdrawal} className="w-full border rounded-[var(--radius-sm)] p-2" value={amount} onChange={e=>setAmount(e.target.value)} />
              </div>
              <button className="text-sm h-12 px-5 rounded-[var(--radius-pill)] bg-[var(--color-primary-700)] text-white" type="submit" disabled={!method}>Ajukan</button>
            </form>
            <div className="text-xs leading-4 text-[color:var(--color-muted)] mt-2">Minimal {minWithdrawal} poin. Dana ditransfer manual oleh admin.</div>
          </div>

          {/* List */}
          <div className="bg-[var(--color-card)] rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] p-4">
            <div className="text-sm leading-5 font-semibold mb-2">Riwayat Pencairan</div>
            {withdrawals.length === 0 ? (
              <div className="text-sm leading-5 text-[color:var(--color-muted)]">Belum ada pengajuan</div>
            ) : (
              <div className="divide-y">
                {withdrawals.map(w => (
                  <div key={w.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{w.amount_points} poin</div>
                      <div className="text-xs leading-4 text-[color:var(--color-muted)]">{new Date(w.created_at).toLocaleString('id-ID')}</div>
                    </div>
                    <div className={`text-sm font-semibold ${w.status==='completed'?'text-[color:var(--color-success)]':w.status==='rejected'?'text-[color:var(--color-danger)]':'text-yellow-600'}`}>{w.status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}


