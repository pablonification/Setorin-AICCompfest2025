"use client";

import { useEffect, useState } from "react";

export default function UserScanStats({ email, token }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const apiBase = process.env.NEXT_PUBLIC_BROWSER_API_URL || "http://localhost:8000";

  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState("desc");
  const [sizeFilter, setSizeFilter] = useState(null);

  useEffect(() => {
    if (!email) return;
    let mounted = true;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set("limit", String(limit));
        qs.set("offset", String(offset));
        qs.set("sort_by", sortBy);
        qs.set("sort_order", sortOrder);
        if (sizeFilter) qs.set("size_filter", sizeFilter);
        const resp = await fetch(`${apiBase}/admin/users/${encodeURIComponent(email)}/stats?${qs.toString()}`, {
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
  }, [email, token, limit, offset, sortBy, sortOrder, sizeFilter]);

  if (!email) return null;

  const formatTimestamp = (ts) => {
    if (!ts) return '—';
    try {
      // Some timestamps from the backend may be ISO strings without timezone
      // (e.g. "2024-09-25T10:00:00"). Parsing that in the browser may be
      // interpreted as local time, causing a timezone shift. Treat
      // timezone-less ISO strings as UTC by appending 'Z' before parsing.
      if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(ts)) {
        return new Date(ts + 'Z').toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      }
      return new Date(ts).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    } catch (e) {
      return String(ts);
    }
  };

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
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium text-gray-700">Filter size</label>
              <select value={sizeFilter || ""} onChange={(e) => setSizeFilter(e.target.value || null)} className="border rounded px-2 py-1">
                <option value="">All</option>
                {Object.keys(stats.counts_per_size || {}).map((label) => (
                  <option key={label} value={label}>{label}</option>
                ))}
              </select>

              <label className="text-sm font-medium text-gray-700 ml-4">Sort</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border rounded px-2 py-1">
                <option value="timestamp">Timestamp</option>
                <option value="volume_ml">Volume</option>
                <option value="points">Points</option>
              </select>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="border rounded px-2 py-1">
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>

              <label className="text-sm font-medium text-gray-700 ml-4">Page size</label>
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0); }} className="border rounded px-2 py-1">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>

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
                        <div className="text-gray-500 text-xs">{formatTimestamp(s.timestamp)}</div>
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

            <div className="flex items-center justify-between mt-3">
              <div className="text-sm text-gray-600">Showing {stats.recent_scans.length} of {stats.total_scans}</div>
              <div className="flex gap-2">
                <button onClick={() => setOffset(Math.max(0, offset - limit))} className="px-3 py-1 border rounded disabled:opacity-50" disabled={offset === 0}>Prev</button>
                <button onClick={() => setOffset(offset + limit)} className="px-3 py-1 border rounded" disabled={stats.recent_scans.length < limit}>Next</button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">No data</p>
        )}
      </div>
    </div>
  );
}


