import React from 'react';
import { TextSkeleton } from './Skeleton';

export function MobileScanResultSkeleton() {
  return (
    <div className="mt-6 rounded-lg bg-white overflow-hidden [box-shadow:var(--shadow-card)] p-4">
      <div className="flex justify-between items-center mb-4">
        <TextSkeleton width="w-1/3" height="h-6" />
        <TextSkeleton width="w-1/4" height="h-6" />
      </div>
      <div className="h-[180px] bg-gray-100 rounded-md mb-4" />
      <div className="space-y-3">
        <TextSkeleton width="w-full" height="h-4" />
        <TextSkeleton width="w-3/4" height="h-4" />
        <TextSkeleton width="w-2/3" height="h-4" />
      </div>
    </div>
  );
}

export default function MobileScanResult({ result }) {
  if (loading) {
    return <MobileScanResultSkeleton />;
  }

  if (!result) {
    return (
      <div className="mt-6 text-center text-sm text-gray-500">
        Belum ada hasil. Silakan ambil gambar botol dan tekan Scan.
      </div>
    );
  }

  const isValid = result.is_valid;
  const points = result.points_awarded ?? result.points ?? 0;
  const total = result.total_points ?? undefined;
  const volume = result.volume_ml?.toFixed(1);

  return (
    <div className="rounded-[var(--radius-md)] bg-white p-4 shadow-md mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 truncate">
          {result.brand || 'Unknown Brand'}
        </h3>
        <span
          className={`px-3 py-0.5 rounded-[999px] text-xs font-medium ${
            isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {isValid ? 'Valid' : 'Invalid'}
        </span>
      </div>

      {isValid && (
        <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
          <div>
            <p className="text-gray-500">Poin Didapat</p>
            <p className="font-semibold text-green-600">+{points}</p>
          </div>
          {total !== undefined && (
            <div>
              <p className="text-gray-500">Total Poin</p>
              <p className="font-semibold">{total}</p>
            </div>
          )}
          {volume && (
            <div>
              <p className="text-gray-500">Volume</p>
              <p className="font-semibold">{volume} ml</p>
            </div>
          )}
        </div>
      )}

      {result.reason && (
        <div className="mt-3 text-xs text-gray-600">
          <p className="text-gray-500">Alasan:</p>
          <p>{result.reason}</p>
        </div>
      )}
    </div>
  );
}
