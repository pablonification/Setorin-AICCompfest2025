"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Import components directly instead of the whole page
import MobileScanResult from '../../components/MobileScanResult';

export default function DebugScanPage() {
  // Replicate necessary state from the original ScanPage
  const router = useRouter();
  const [status, setStatus] = useState('Ready');
  const [result, setResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  // Add state for the popup
  const [showInstructions, setShowInstructions] = useState(true);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const attemptedAutoStartRef = useRef(false);

  // Auto-start camera on mount
  useEffect(() => {
    if (!attemptedAutoStartRef.current && !showInstructions) {
      attemptedAutoStartRef.current = true;
      startCamera().catch(() => {});
    }
  }, [showInstructions]);

  // Ensure the video element gets the stream after render
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !cameraStream) return;

    try {
      video.muted = true;
      video.playsInline = true;
      video.srcObject = cameraStream;

      const handleLoaded = () => {
        setStatus('Camera ready');
      };
      video.onloadedmetadata = handleLoaded;

      video.play().catch((err) => {
        console.error('Video play error:', err);
        setStatus('Video play failed');
      });
    } catch (err) {
      console.error('Failed to attach stream to video:', err);
      setStatus('Video attach failed');
    }

    return () => {
      if (video) {
        video.onloadedmetadata = null;
        try {
          video.srcObject = null;
        } catch {}
      }
    };
  }, [cameraStream]);

  const startCamera = async () => {
    try {
      setStatus('Starting camera...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported');
      }
      
      const permissions = await navigator.permissions.query({ name: 'camera' });
      if (permissions.state === 'denied') {
        throw new Error('Camera permission denied');
      }
      
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, min: 640, max: 1920 },
          height: { ideal: 720, min: 480, max: 1080 },
          aspectRatio: { ideal: 16/9 },
          frameRate: { ideal: 30, min: 15 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setStatus('Camera ready');
    } catch (err) {
      console.error('startCamera error:', err);
      setStatus(`Camera error: ${err.message}`);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const captureAndScan = async () => {
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        setStatus('Cannot access camera');
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      
      // Capture frame
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Just for debug - show the captured image
      const imageBlob = await new Promise(resolve => 
        canvas.toBlob(resolve, 'image/jpeg', 0.9)
      );
      
      if (!imageBlob) {
        setStatus('Failed to capture image');
        return;
      }
      
      setCapturedImage(imageBlob);
      setResult({
        is_valid: true,
        brand: "Debug Water",
        confidence: 0.95,
        diameter_mm: 68.5,
        height_mm: 220.0,
        volume_ml: 600.0,
        points_awarded: 15,
        debug_image: URL.createObjectURL(imageBlob)
      });
      
      setStatus('Debug scan completed');
    } catch (e) {
      console.error('captureAndScan error:', e);
      setStatus('Debug capture failed');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="container max-w-[430px] mx-auto min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter pt-4 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-primary-700)] text-white rounded-b-[var(--radius-lg)] -mx-4 px-4 py-6 [box-shadow:var(--shadow-card)]">
        <div className="flex items-center justify-center gap-3 relative">
          <button
            onClick={() => router.back()}
            aria-label="Kembali"
            className="w-9 h-9 flex items-center justify-center absolute left-0"
            style={{ zIndex: 1 }}
          >
            <img src="/back.svg" alt="Back" className="w-6 h-6" />
          </button>
          <div className="flex-1 flex justify-center">
            <div className="text-xl leading-7 font-semibold">Duitin (Debug)</div>
          </div>
        </div>
      </div>

      {/* Instructions Popup - Now with just 2 steps */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white rounded-lg max-w-xs w-full mx-4 p-5 relative">
            <h3 className="text-lg font-bold mb-3 text-center">Panduan Scan Botol</h3>
            <div className="space-y-4 text-sm">
              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-primary-700)] text-white flex items-center justify-center font-bold">1</div>
                <div>
                  <p>Posisikan botol di atas kotak referensi</p>
                  <div className="mt-2 rounded bg-gray-50 p-1">
                    <img 
                      src="/scan-guide/step1.svg" 
                      alt="Posisikan botol" 
                      className="h-24 w-full object-contain" 
                      onError={(e) => e.target.src = '/scan-placeholder.svg'}
                    />
                  </div>
                </div>
              </div>
              
              {/* Step 2 (combined) */}
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-primary-700)] text-white flex items-center justify-center font-bold">2</div>
                <div>
                  <p>Arahkan kamera agar botol dan kotak referensi masuk dalam bingkai.</p>
                  <div className="mt-2 rounded bg-gray-50 p-1">
                    <img 
                      src="/scan-guide/step2.svg" 
                      alt="Tips scan" 
                      className="h-24 w-full object-contain" 
                      onError={(e) => e.target.src = '/scan-placeholder.svg'}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3*/}
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-primary-700)] text-white flex items-center justify-center font-bold">3</div>
              <div>
                <p>Tekan tombol Scan untuk memulai pemindaian.</p>
                <div className="mt-2 rounded bg-gray-50 p-1">

                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowInstructions(false)}
              className="mt-5 w-full py-3 rounded-full bg-[var(--color-primary-700)] text-white font-medium"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Camera preview */}
      <div className="flex flex-col items-center mt-6 px-4">
        <div className="w-full max-w-[320px] h-[420px] bg-black rounded-[var(--radius-md)] flex items-center justify-center overflow-hidden relative">
          {cameraStream ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="object-cover w-full h-full" />
              
            {/* Bottle placement guide overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="relative w-full h-full">
                    {/* Center bottle silhouette guide - moved up slightly */}
                    <div className="absolute top-[35%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-64">
                        <svg width="100%" height="100%" viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-40">
                            <path d="M30 40 L30 10 L70 10 L70 40 L85 70 L85 180 L15 180 L15 70 Z" stroke="white" strokeWidth="3" strokeDasharray="5,5" />
                            <rect x="38" y="170" width="24" height="4" fill="white" fillOpacity="0.6" />
                            <text x="50" y="150" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">Botol</text>
                        </svg>
                    </div>
                    
                    {/* Reference object guide - positioned at the bottom with clear separation */}
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-24 h-36">
                        <svg width="100%" height="100%" viewBox="0 0 40 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-50">
                            {/* 10cm width × 15cm height (2:3 ratio rectangle) */}
                            <rect x="2" y="2" width="36" height="56" stroke="#00ff00" strokeWidth="2" strokeDasharray="4,2" />
                            <text x="20" y="45" textAnchor="middle" fill="#00ff00" fontSize="5" fontWeight="bold">Referensi</text>
                            <text x="20" y="50" textAnchor="middle" fill="#00ff00" fontSize="5" fontWeight="">10×15 cm</text>
                        </svg>
                    </div>
                    
                </div>
            </div>
            </>
          ) : (
            <img src="/scan-yellow.svg" alt="Placeholder" className="w-20 h-20 opacity-60" />
          )}
          <div className="absolute inset-0 border-4 border-white/60 rounded-[var(--radius-md)] pointer-events-none" />
        </div>

        {/* Shutter control */}
        <div className="mt-6 w-full max-w-[320px] flex items-center justify-center">
          {!cameraStream ? (
            <button
              onClick={startCamera}
              className="w-full py-3 rounded-[var(--radius-pill)] bg-[var(--color-primary-600)] text-white font-medium active:opacity-80"
            >
              Nyalakan Kamera
            </button>
          ) : (
            <button
              onClick={captureAndScan}
              disabled={isScanning}
              aria-label="Ambil gambar"
              className="flex items-center justify-center w-24 h-24 rounded-full [box-shadow:var(--shadow-fab)] active:scale-95 disabled:opacity-60"
              style={{ background: 'var(--color-primary-700)' }}
            >
              <img src="/shutter.svg" alt="Shutter" className="w-12 h-12 select-none" draggable="false" />
            </button>
          )}
        </div>

        {cameraStream && (
          <div className="mt-3 w-full max-w-[320px] flex justify-center">
            <button onClick={stopCamera} className="px-4 py-2 text-xs text-gray-700 bg-gray-200 rounded-[var(--radius-pill)] active:opacity-80">
              Matikan Kamera
            </button>
          </div>
        )}
      </div>

      {/* Scan result */}
      <div className="px-4">
        {result && <MobileScanResult result={result} />}
      </div>

      {/* Status indicator */}
      <div className="mt-6 px-4 text-center text-sm text-gray-500">
        Status: {status}
      </div>

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}