/* =============================================================================
 * FRONTEND PHASE 2 IMPLEMENTATION - DEPOSIT STATUS COMPONENT
 * Created during Phase 2 of Ultrasonic Deposit Detection Integration
 * Purpose: Display real-time deposit confirmation status to users
 * ============================================================================= */

import React from 'react';

/**
 * DepositStatus Component - Shows deposit confirmation status
 * 
 * @param {Object} scanResult - The scan result object containing deposit_status
 * @returns {JSX.Element|null} Status display component or null if no deposit status
 */
export default function DepositStatus({ scanResult }) {
  const status = scanResult?.deposit_status;
  
  // Only show status indicator if there's a deposit status
  if (!status) {
    return null;
  }

  // Status configurations for different states
  const statusConfig = {
    pending: {
      icon: '🔍',
      text: 'Drop your bottle in the bin',
      textId: 'Masukkan botol ke dalam tempat sampah',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-200',
      animation: 'animate-pulse'
    },
    detected: {
      icon: '✅',
      text: 'Bottle confirmed!',
      textId: 'Botol berhasil dikonfirmasi!',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
      animation: ''
    },
    timeout: {
      icon: '⏰',
      text: 'No bottle detected',
      textId: 'Tidak ada botol terdeteksi',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      animation: ''
    }
  };

  const config = statusConfig[status];
  
  // Return null for unknown statuses
  if (!config) {
    return null;
  }

  return (
    <div className={`
      mt-3 p-3 rounded-lg border-2 
      ${config.bgColor} 
      ${config.textColor} 
      ${config.borderColor} 
      ${config.animation}
      transition-all duration-300 ease-in-out
    `}>
      <div className="flex items-center justify-center space-x-2">
        <span className="text-lg" role="img" aria-label={status}>
          {config.icon}
        </span>
        <div className="text-center">
          <p className="font-medium text-sm">
            {config.textId}
          </p>
          <p className="text-xs opacity-75 mt-0.5">
            {config.text}
          </p>
        </div>
      </div>
      
      {/* Additional context for timeout */}
      {status === 'timeout' && (
        <div className="mt-2 text-xs text-center opacity-75">
          <p>Silakan coba scan ulang dan pastikan memasukkan botol</p>
        </div>
      )}
      
      {/* Additional context for pending */}
      {status === 'pending' && (
        <div className="mt-2 text-xs text-center opacity-75">
          <p>Tunggu hingga tutup bin tertutup otomatis</p>
        </div>
      )}
    </div>
  );
}