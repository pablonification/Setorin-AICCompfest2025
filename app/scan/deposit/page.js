"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import ProtectedRoute from "../../components/ProtectedRoute";
import TopBar from "../../components/TopBar";

export default function DepositDetectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  
  // States
  const [countdown, setCountdown] = useState(8); // Default 8 seconds
  const [status, setStatus] = useState("waiting"); // waiting, detected, timeout, error
  const [scanData, setScanData] = useState(null);
  const [depositResult, setDepositResult] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  
  // Refs
  const mountedRef = useRef(true);
  const countdownIntervalRef = useRef(null);
  const wsRef = useRef(null);

  // Extract scan data from URL params or localStorage
  useEffect(() => {
    try {
      // Try to get scan data from URL params first
      const scanDataParam = searchParams.get('scanData');
      const actionIdParam = searchParams.get('actionId');
      const durationParam = searchParams.get('duration') || '8';
      
      let parsedScanData = null;
      
      if (scanDataParam) {
        parsedScanData = JSON.parse(decodeURIComponent(scanDataParam));
      } else {
        // Fallback to localStorage
        const storedScan = localStorage.getItem('smartbin_last_scan');
        if (storedScan) {
          parsedScanData = JSON.parse(storedScan);
        }
      }
      
      if (parsedScanData && mountedRef.current) {
        setScanData(parsedScanData);
        setCountdown(parseInt(durationParam));
        console.log('📊 Deposit detection started for scan:', parsedScanData.scan_id);
        console.log('🕐 Duration:', durationParam, 'seconds');
        console.log('🔗 Action ID:', actionIdParam || 'from scan data');
      } else {
        console.warn('⚠️ No scan data found, redirecting to scan page');
        router.replace('/scan');
      }
    } catch (error) {
      console.error('❌ Error parsing scan data:', error);
      router.replace('/scan');
    }
  }, [searchParams, router]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0 && status === "waiting" && mountedRef.current) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (mountedRef.current) {
              setStatus("timeout");
              setIsComplete(true);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }
  }, [countdown, status]);

  // WebSocket connection for real-time deposit updates
  useEffect(() => {
    if (!token || !user || !mountedRef.current) return;

    const connectWebSocket = () => {
      const apiUrl = process.env.NEXT_PUBLIC_BROWSER_API_URL || "http://localhost:8000";
      const wsUrl = apiUrl.replace("http://", "ws://").replace("https://", "wss://");
      const fullWsUrl = `${wsUrl}/ws/notifications/${user?.id || user?._id}`;

      console.log("🔌 Connecting to WebSocket for deposit detection:", fullWsUrl);

      try {
        const ws = new WebSocket(fullWsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("✅ WebSocket connected for deposit detection");
        };

        ws.onmessage = (e) => {
          if (!mountedRef.current) return;

          try {
            const msg = JSON.parse(e.data);
            console.log("📨 WebSocket message received:", msg);

            // Handle ESP32 deposit events
            if (msg.type === "esp32_event" && msg.data) {
              const { event, action_id, device_id, baseline_distance, current_distance, delta_cm } = msg.data;
              
              console.log("🔍 ESP32 deposit event:", {
                event, action_id, device_id, baseline_distance, current_distance, delta_cm
              });

              if (event === "deposit_detected") {
                setDepositResult({
                  event: "detected",
                  action_id,
                  device_id,
                  baseline_distance,
                  current_distance,
                  delta_cm,
                  timestamp: new Date().toISOString()
                });
                setStatus("detected");
                setIsComplete(true);
                
                // Stop countdown
                if (countdownIntervalRef.current) {
                  clearInterval(countdownIntervalRef.current);
                  countdownIntervalRef.current = null;
                }
              } else if (event === "deposit_timeout") {
                setDepositResult({
                  event: "timeout",
                  action_id,
                  device_id,
                  baseline_distance,
                  current_distance,
                  delta_cm,
                  timestamp: new Date().toISOString()
                });
                setStatus("timeout");
                setIsComplete(true);
                
                // Stop countdown
                if (countdownIntervalRef.current) {
                  clearInterval(countdownIntervalRef.current);
                  countdownIntervalRef.current = null;
                }
              }
            }

            // Handle scan result updates (in case we get updated scan data)
            if (msg.type === "scan_result" && msg.data && msg.data.deposit) {
              const { deposit } = msg.data;
              console.log("🔍 Scan result with deposit info:", deposit);
              
              if (deposit.event === "detected") {
                setDepositResult(deposit);
                setStatus("detected");
                setIsComplete(true);
              } else if (deposit.event === "timeout") {
                setDepositResult(deposit);
                setStatus("timeout");  
                setIsComplete(true);
              }
              
              // Stop countdown
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
              }
            }
          } catch (error) {
            console.error("❌ Error parsing WebSocket message:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("❌ WebSocket error:", error);
        };

        ws.onclose = (event) => {
          console.log("🔌 WebSocket closed:", event.code, event.reason);
          wsRef.current = null;
        };

      } catch (error) {
        console.error("❌ Failed to create WebSocket:", error);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [token, user]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Handle continue button
  const handleContinue = useCallback(() => {
    if (status === "detected") {
      // Update localStorage with final result
      if (scanData && depositResult) {
        try {
          const updatedScanData = {
            ...scanData,
            deposit: depositResult,
            is_valid: true,
            valid: true
          };
          localStorage.setItem('smartbin_last_scan', JSON.stringify(updatedScanData));
          localStorage.setItem('smartbin_scan_processing', '0');
        } catch (error) {
          console.error('Failed to update localStorage:', error);
        }
      }
      
      router.push('/scan/result');
    } else {
      // Failed deposit, go back to scan
      try {
        localStorage.removeItem('smartbin_last_scan');
        localStorage.setItem('smartbin_scan_processing', '0');
      } catch (error) {
        console.error('Failed to clear localStorage:', error);
      }
      
      router.push('/scan');
    }
  }, [status, scanData, depositResult, router]);

  // Get status display info
  const getStatusDisplay = () => {
    switch (status) {
      case "waiting":
        return {
          title: "Masukkan Botol ke SmartBin",
          subtitle: `Anda memiliki ${countdown} detik untuk memasukkan botol`,
          icon: "🔍",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200"
        };
      case "detected":
        return {
          title: "Botol Berhasil Dideteksi!",
          subtitle: "Deposit berhasil dikonfirmasi",
          icon: "✅",
          color: "text-green-600",
          bgColor: "bg-green-50", 
          borderColor: "border-green-200"
        };
      case "timeout":
        return {
          title: "Waktu Habis",
          subtitle: "Botol tidak terdeteksi dalam waktu yang ditentukan",
          icon: "⏰",
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200"
        };
      default:
        return {
          title: "Error",
          subtitle: "Terjadi kesalahan",
          icon: "❌",
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200"
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  if (!scanData) {
    return (
      <ProtectedRoute userOnly={true}>
        <div className="w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
          <TopBar title="Deposit Botol" />
          <div className="px-4 pt-8 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-[var(--color-primary-600)] border-t-transparent animate-spin"></div>
            <p className="mt-4 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute userOnly={true}>
      <div className="w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
        {/* TopBar without back button */}
        <TopBar title="Deposit Botol" />
        
        <div className="px-4 pt-6 pb-8">
          {/* Scan Info Card */}
          <div className="bg-white rounded-[var(--radius-md)] p-4 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">
                {scanData.brand || 'Botol Plastik'}
              </h3>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Valid
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-500">Volume</p>
                <p className="font-semibold">{scanData.volume_ml?.toFixed(1) || '0'} ml</p>
              </div>
              <div>
                <p className="text-gray-500">Poin Menanti</p>
                <p className="font-semibold text-green-600">+{scanData.points_awarded || scanData.points || 0}</p>
              </div>
            </div>
          </div>

          {/* Status Card */}
          <div className={`${statusDisplay.bgColor} ${statusDisplay.borderColor} border rounded-[var(--radius-md)] p-6 mb-6`}>
            <div className="text-center">
              <div className="text-6xl mb-4">{statusDisplay.icon}</div>
              <h2 className={`text-xl font-bold ${statusDisplay.color} mb-2`}>
                {statusDisplay.title}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {statusDisplay.subtitle}
              </p>
              
              {/* Countdown Display */}
              {status === "waiting" && (
                <div className="text-center">
                  <div className={`text-4xl font-bold ${statusDisplay.color} mb-2`}>
                    {countdown}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${(countdown / 8) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          {status === "waiting" && (
            <div className="bg-blue-50 border border-blue-200 rounded-[var(--radius-md)] p-4 mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Instruksi:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Masukkan botol ke dalam SmartBin</li>
                <li>• Pastikan botol jatuh hingga ke bawah</li>
                <li>• Tunggu konfirmasi dari sensor</li>
              </ul>
            </div>
          )}

          {/* Deposit Result Details */}
          {depositResult && (
            <div className="bg-gray-50 border border-gray-200 rounded-[var(--radius-md)] p-4 mb-6">
              <h4 className="font-medium text-gray-800 mb-2">Detail Deposit:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-medium">
                    {depositResult.event === "detected" ? "Terdeteksi" : "Timeout"}
                  </span>
                </div>
                {depositResult.baseline_distance && (
                  <div className="flex justify-between">
                    <span>Jarak Awal:</span>
                    <span className="font-medium">{depositResult.baseline_distance?.toFixed(1)} cm</span>
                  </div>
                )}
                {depositResult.current_distance && (
                  <div className="flex justify-between">
                    <span>Jarak Akhir:</span>
                    <span className="font-medium">{depositResult.current_distance?.toFixed(1)} cm</span>
                  </div>
                )}
                {depositResult.delta_cm && (
                  <div className="flex justify-between">
                    <span>Perubahan:</span>
                    <span className="font-medium">{depositResult.delta_cm?.toFixed(1)} cm</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Device ID:</span>
                  <span className="font-medium text-xs">{depositResult.device_id || 'ESP32-SPARTANS'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {isComplete && (
            <div className="space-y-3">
              {status === "detected" ? (
                <>
                  <button
                    onClick={handleContinue}
                    className="w-full h-12 rounded-[var(--radius-pill)] bg-[var(--color-primary-700)] text-white font-medium active:opacity-80"
                  >
                    Lihat Hasil Lengkap
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="w-full h-12 rounded-[var(--radius-pill)] bg-transparent text-[var(--color-primary-700)] font-medium active:opacity-80 border-2 border-[var(--color-primary-700)]"
                  >
                    Kembali ke Beranda
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleContinue}
                    className="w-full h-12 rounded-[var(--radius-pill)] bg-[var(--color-primary-700)] text-white font-medium active:opacity-80"
                  >
                    Coba Scan Ulang
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="w-full h-12 rounded-[var(--radius-pill)] bg-transparent text-[var(--color-primary-700)] font-medium active:opacity-80 border-2 border-[var(--color-primary-700)]"
                  >
                    Kembali ke Beranda
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}