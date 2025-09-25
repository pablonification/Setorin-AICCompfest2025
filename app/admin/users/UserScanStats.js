"use client";

import { useEffect, useState } from "react";

export default function UserScanStats({ email, token }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const apiBase = process.env.NEXT_PUBLIC_BROWSER_API_URL || "http://localhost:8000";

  useEffect(() => {
    if (!email) return;
    let mounted = true;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const resp = await fetch(`${apiBase}/admin/users/${encodeURIComponent(email)}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error("Failed to fetch user stats");
        const data = await resp.json();
        if (mounted) setStats(data);
      } catch (e) {
        if (mounted) setError(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchStats();
    return () => {
      mounted = false;
    };
  }, [email, token]);

  if (!email) return null;

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Scan Statistics</h4>
      <div className="bg-gray-50 rounded-lg p-3">
        {loading ? (
          <p className="text-sm text-gray-600">Loading scan stats...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : stats ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.counts_per_size || {}).length === 0 ? (
                <p className="text-sm text-gray-600">No scans yet</p>
              ) : (
                Object.entries(stats.counts_per_size).map(([label, count]) => (
                  <div key={label} className="px-3 py-1 bg-white border rounded-md text-sm">
                    <strong className="mr-2">{label}</strong>
                    <span className="text-gray-600">{count}</span>
                  </div>
                ))
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Recent Scans</p>
              {(!stats.recent_scans || stats.recent_scans.length === 0) ? (
                <p className="text-sm text-gray-600">No recent scans</p>
              ) : (
                <ul className="space-y-2">
                  {stats.recent_scans.map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-sm bg-white p-2 rounded-md border">
                      <div>
                        <div className="font-medium">{s.size_label || (s.volume_ml ? `${s.volume_ml}ml` : 'Unknown')}</div>
                        <div className="text-gray-500 text-xs">{s.timestamp ? new Date(s.timestamp).toLocaleString() : '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">{s.points?.toLocaleString() || 0} pts</div>
                        <div className={`text-xs ${s.valid ? 'text-green-600' : 'text-red-600'}`}>{s.valid ? 'Valid' : 'Invalid'}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">No data</p>
        )}
      </div>
    </div>
  );
}


