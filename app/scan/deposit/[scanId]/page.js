'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';
import TopBar from '../../../components/TopBar';

export default function DepositConfirmationPage() {
    const router = useRouter();
    const params = useParams();
    const { token, user, updateUser } = useAuth();
    const [timeLeft, setTimeLeft] = useState(15);
    const [depositConfirmed, setDepositConfirmed] = useState(false);
    const [error, setError] = useState(null);
    const [isConfirming, setIsConfirming] = useState(false);
    
    const scanId = params.scanId;
    const countdownRef = useRef(null);
    const wsRef = useRef(null);
    const mountedRef = useRef(true);
    
    useEffect(() => {
        mountedRef.current = true;
        
        if (!scanId) {
            router.push('/scan');
            return;
        }
        
        // Start countdown
        setTimeLeft(15); // 15 seconds timeout
        
        // WebSocket connection for real-time updates
        const setupWebSocket = () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_BROWSER_API_URL || "http://localhost:8000";
                const wsUrl = apiUrl.replace("http://", "ws://").replace("https://", "wss://");
                const fullWsUrl = `${wsUrl}/ws/notifications/${user?.id || user?._id}`;
                
                console.log('🔌 Connecting to WebSocket for deposit confirmation:', fullWsUrl);
                wsRef.current = new WebSocket(fullWsUrl);
                
                wsRef.current.onopen = () => {
                    console.log('✅ WebSocket connected for deposit confirmation');
                };
                
                wsRef.current.onmessage = (e) => {
                    if (!mountedRef.current) return;
                    
                    try {
                        const msg = JSON.parse(e.data);
                        console.log('📨 WebSocket message received:', msg);
                        
                        if (msg.type === "deposit_confirmed" && msg.data.scan_id === scanId) {
                            console.log('🎯 Deposit confirmed via WebSocket!');
                            setDepositConfirmed(true);
                            setError(null);
                            
                            // Update user points if available
                            if (msg.data.total_points && user) {
                                updateUser({ ...user, points: msg.data.total_points });
                            }
                            
                            // Navigate to result page after short delay
                            setTimeout(() => {
                                if (mountedRef.current) {
                                    router.push(`/scan/result?scan_id=${scanId}`);
                                }
                            }, 2000);
                        }
                    } catch (err) {
                        console.error('Error parsing WebSocket message:', err);
                    }
                };
                
                wsRef.current.onerror = (error) => {
                    console.error('WebSocket error:', error);
                };
                
                wsRef.current.onclose = () => {
                    console.log('WebSocket closed, attempting to reconnect...');
                    if (mountedRef.current && !depositConfirmed) {
                        setTimeout(setupWebSocket, 2000);
                    }
                };
            } catch (error) {
                console.error('Error setting up WebSocket:', error);
            }
        };
        
        setupWebSocket();
        
        // Countdown timer
        countdownRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    // Timeout - navigate to result page
                    if (mountedRef.current) {
                        router.push(`/scan/result?scan_id=${scanId}`);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        return () => {
            mountedRef.current = false;
            if (countdownRef.current) clearInterval(countdownRef.current);
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [scanId, user, router, depositConfirmed, updateUser]);
    
    const handleManualConfirm = async () => {
        if (isConfirming || depositConfirmed) return;
        
        setIsConfirming(true);
        setError(null);
        
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BROWSER_API_URL || "http://localhost:8000"}/api/scan/${scanId}/confirm-deposit`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ manual_confirmation: true }),
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Manual deposit confirmation successful:', data);
                
                setDepositConfirmed(true);
                
                // Update user points
                if (data.total_points && user) {
                    updateUser({ ...user, points: data.total_points });
                }
                
                // Navigate to result page
                setTimeout(() => {
                    if (mountedRef.current) {
                        router.push(`/scan/result?scan_id=${scanId}`);
                    }
                }, 1000);
            } else {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                setError(errorData.detail || "Failed to confirm deposit");
            }
        } catch (err) {
            console.error('Network error confirming deposit:', err);
            setError("Network error - please check your connection");
        } finally {
            setIsConfirming(false);
        }
    };
    
    const handleSkip = () => {
        router.push(`/scan/result?scan_id=${scanId}`);
    };
    
    return (
        <ProtectedRoute userOnly={true}>
            <div className="w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
                <TopBar title="Deposit Botol" backHref="/scan" />
                
                <div className="px-4 py-8">
                    <div className="max-w-md mx-auto text-center">
                        {/* Countdown Timer */}
                        <div className="mb-8">
                            <div className="w-32 h-32 mx-auto mb-4 relative">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="none"
                                        className="text-gray-200"
                                    />
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="none"
                                        strokeDasharray={`${2 * Math.PI * 56}`}
                                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - timeLeft / 15)}`}
                                        className="text-blue-500 transition-all duration-1000"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-gray-700">{timeLeft}</span>
                                </div>
                            </div>
                            <p className="text-lg font-medium text-gray-700">Sisa Waktu</p>
                        </div>
                        
                        {/* Instructions */}
                        <div className="mb-8">
                            <h2 className="text-xl font-bold mb-4 text-gray-800">Deposit Botol Anda</h2>
                            <div className="space-y-4 text-left">
                                <div className="flex items-start space-x-3">
                                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">1</div>
                                    <p className="text-gray-600">Buka tutup SmartBin (sudah terbuka otomatis)</p>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">2</div>
                                    <p className="text-gray-600">Masukkan botol ke dalam SmartBin</p>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">3</div>
                                    <p className="text-gray-600">Tunggu konfirmasi otomatis atau tekan tombol di bawah</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Status */}
                        {depositConfirmed ? (
                            <div className="mb-8 p-4 bg-green-100 rounded-lg">
                                <div className="flex items-center justify-center space-x-2">
                                    <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-green-700 font-medium">Deposit Terkonfirmasi!</span>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-8 p-4 bg-yellow-100 rounded-lg">
                                <div className="flex items-center justify-center space-x-2">
                                    <svg className="w-6 h-6 text-yellow-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span className="text-yellow-700 font-medium">Menunggu Deposit...</span>
                                </div>
                            </div>
                        )}
                        
                        {/* Manual Confirm Button */}
                        {!depositConfirmed && (
                            <button
                                onClick={handleManualConfirm}
                                disabled={isConfirming}
                                className="w-full py-4 px-6 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                            >
                                {isConfirming ? (
                                    <div className="flex items-center justify-center space-x-2">
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>Mengkonfirmasi...</span>
                                    </div>
                                ) : (
                                    "Saya Sudah Deposit Botol"
                                )}
                            </button>
                        )}
                        
                        {/* Error Message */}
                        {error && (
                            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                                {error}
                            </div>
                        )}
                        
                        {/* Skip Button */}
                        {!depositConfirmed && (
                            <button
                                onClick={handleSkip}
                                className="mt-4 text-gray-500 underline hover:text-gray-700 transition-colors"
                            >
                                Lewati (Tidak Ada Poin)
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}