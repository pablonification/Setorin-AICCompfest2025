'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../components/ProtectedRoute';
import MobileScanResult from '../components/MobileScanResult';

export default function ScanPage() {
  const { user, token, logout, updateUser } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState('Ready');
  const [result, setResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const attemptedAutoStartRef = useRef(false);

  // Debug user state changes
  useEffect(() => {
    console.log('User state changed:', user);
    console.log('User points:', user?.points);
  }, [user]);

  // Ensure the video element gets the stream after render
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !cameraStream) return;

    try {
      // Some browsers need this set programmatically before play()
      video.muted = true;
      video.playsInline = true;
      video.srcObject = cameraStream;

      const handleLoaded = () => {
        setStatus('Camera ready');
      };
      video.onloadedmetadata = handleLoaded;

      video.play().catch((err) => {
        console.error('Video play error (effect):', err);
        setStatus('Video play failed');
      });
    } catch (err) {
      console.error('Failed to attach stream to video:', err);
      setStatus('Video attach failed');
    }

    return () => {
      if (video) {
        video.onloadedmetadata = null;
        // Detach stream on cleanup to avoid black frames on restart
        try {
          video.srcObject = null;
        } catch {}
      }
    };
  }, [cameraStream]);

  // Auto-start camera on mount
  useEffect(() => {
    if (!attemptedAutoStartRef.current) {
      attemptedAutoStartRef.current = true;
      startCamera().catch(() => {});
    }
  }, []);

  // Check camera permissions and available devices
  useEffect(() => {
    const checkCameraPermissions = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const permission = await navigator.permissions.query({ name: 'camera' });
          console.log('Camera permission state:', permission.state);
          
          if (permission.state === 'denied') {
            setStatus('Camera permission denied - please allow in browser settings');
          }
        }
        
        // List available devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Available video devices:', videoDevices.length);
        
      } catch (error) {
        console.error('Error checking camera permissions:', error);
      }
    };
    
    checkCameraPermissions();
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!token) return;
    
    // Fix WebSocket URL to use notifications endpoint for user
    const apiUrl = process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000';
    const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const fullWsUrl = `${wsUrl}/ws/notifications/${user?.id || user?._id}`;
    
    console.log('API URL:', apiUrl);
    console.log('WebSocket URL:', wsUrl);
    console.log('Full WebSocket URL:', fullWsUrl);
    
    let ws;
    try {
      ws = new WebSocket(fullWsUrl);
      console.log('WebSocket object created:', ws);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setStatus('WebSocket creation failed');
      return;
    }
    
    ws.onopen = () => {
      console.log('WebSocket connected successfully');
      setStatus('WebSocket connected');
    };
    
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        console.log('WebSocket message received:', msg);
        if (msg.type === 'scan_result') {
          setResult(msg.data);
          // Update user points in context when scan result comes via WebSocket
          console.log('WebSocket scan result:', msg.data);
          console.log('Current user points:', user?.points);
          console.log('Current user object:', user);
          console.log('msg.data.total_points:', msg.data?.total_points);
          console.log('msg.data.total_points type:', typeof msg.data?.total_points);
          if (msg.data && user) {
            const current = user?.points ?? 0;
            const totalFromServer = typeof msg.data.total_points === 'number' ? msg.data.total_points : null;
            const awarded = typeof msg.data.points === 'number' ? msg.data.points : (
              typeof msg.data.points_awarded === 'number' ? msg.data.points_awarded : null
            );
            let candidate = current;
            if (totalFromServer !== null) candidate = Math.max(candidate, totalFromServer);
            if (awarded !== null) candidate = Math.max(candidate, current + awarded);
            if (candidate > current) {
              console.log('Optimistic WS points update:', { current, totalFromServer, awarded, candidate });
              updateUser({ ...user, points: candidate });
            } else {
              console.log('No WS points increase applied:', { current, totalFromServer, awarded, candidate });
            }
          }
          setStatus('Completed');
          setIsScanning(false);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      console.error('WebSocket readyState:', ws.readyState);
      setStatus('WebSocket error');
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      console.log('WebSocket close event:', event);
      setStatus('WebSocket disconnected');
    };
    
    return () => {
      console.log('Cleaning up WebSocket connection');
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [token, updateUser, user]);

  const startCamera = async () => {
    try {
      setStatus('Starting camera...');
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported');
      }
      
      // Check camera permissions first
      const permissions = await navigator.permissions.query({ name: 'camera' });
      if (permissions.state === 'denied') {
        throw new Error('Camera permission denied');
      }
      
      // Try to get camera with better constraints
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280, min: 640, max: 1920 },
          height: { ideal: 720, min: 480, max: 1080 },
          aspectRatio: { ideal: 16/9 },
          frameRate: { ideal: 30, min: 15 }
        }
      };
      
      console.log('Requesting camera with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('Camera stream obtained:', stream.getVideoTracks()[0]?.getSettings());
      setCameraStream(stream);
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        
        // Wait for video to be ready before setting status
        video.onloadedmetadata = () => {
          console.log('Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
          setStatus('Camera ready');
        };
        
        video.onerror = (error) => {
          console.error('Video error:', error);
          setStatus('Video error');
        };
        
        video.oncanplay = () => {
          console.log('Video can play');
        };
        
        // Start playing the video
        video.play().catch(error => {
          console.error('Video play error:', error);
          setStatus('Video play failed');
        });
      }
      
    } catch (error) {
      console.error('Camera error:', error);
      
      // Try fallback constraints
      try {
        console.log('Trying fallback camera constraints...');
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' } // Try front camera
        });
        
        setCameraStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          setStatus('Camera ready (fallback)');
        }
      } catch (fallbackError) {
        console.error('Fallback camera failed:', fallbackError);
        
        // Provide specific error messages
        if (fallbackError.name === 'NotAllowedError') {
          setStatus('Camera access denied - please allow camera permissions');
        } else if (fallbackError.name === 'NotFoundError') {
          setStatus('No camera found on this device');
        } else if (fallbackError.name === 'NotReadableError') {
          setStatus('Camera is in use by another application');
        } else {
          setStatus(`Camera error: ${fallbackError.message}`);
        }
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setCapturedImage(null);
      setStatus('Camera stopped');
    }
  };

  const captureAndScan = async () => {
    try {
      if (!videoRef.current || !canvasRef.current) return;
      setStatus('Mengambil gambar...');

      const getFrameBlob = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Try ImageCapture/grabFrame when available for more reliable capture
        try {
          // @ts-ignore - ImageCapture may not exist on all browsers
          if (cameraStream && typeof ImageCapture !== 'undefined') {
            const track = cameraStream.getVideoTracks()[0];
            // @ts-ignore
            const ic = new ImageCapture(track);
            if (ic.grabFrame) {
              const bitmap = await ic.grabFrame();
              canvas.width = bitmap.width;
              canvas.height = bitmap.height;
              context.drawImage(bitmap, 0, 0);
              const blobViaGrab = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
              if (blobViaGrab) return blobViaGrab;
            }
          }
        } catch (e) {
          // fall back to canvas path below
          console.warn('grabFrame failed, falling back to canvas draw', e);
        }

        // Fallback to drawing current video frame
        if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
          await new Promise((r) => setTimeout(r, 200));
        }
        if (video.videoWidth === 0 || video.videoHeight === 0) return null;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      };

      const blob = await getFrameBlob();
      if (!blob) {
        setStatus('Failed to capture image');
        return;
      }
      setCapturedImage(blob);
      // Immediately navigate to result page with processing state
      try {
        localStorage.setItem('smartbin_scan_processing', '1');
        localStorage.removeItem('smartbin_last_scan');
      } catch {}
      setIsScanning(true);
      setStatus('Processing...');
      // Navigate to result screen while processing continues
      router.push('/scan/result');
      await scanWithBlob(blob);
    } catch (e) {
      console.error('captureAndScan error:', e);
      setStatus('Capture failed');
    } finally {
      setIsScanning(false);
    }
  };

  const scanWithBlob = async (blob) => {
    if (!token || !blob) return;
    try {
      const formData = new FormData();
      formData.append('image', blob, 'bottle.jpg');
      const response = await fetch(`${process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000'}/api/scan`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setResult(data);
      try {
        localStorage.setItem('smartbin_last_scan', JSON.stringify(data));
        localStorage.setItem('smartbin_scan_processing', '0');
      } catch {}
      if (data && user) {
        const current = user?.points ?? 0;
        const totalFromServer = typeof data.total_points === 'number' ? data.total_points : null;
        const awarded = typeof data.points === 'number' ? data.points : (
          typeof data.points_awarded === 'number' ? data.points_awarded : null
        );
        let candidate = current;
        if (totalFromServer !== null) candidate = Math.max(candidate, totalFromServer);
        if (awarded !== null) candidate = Math.max(candidate, current + awarded);
        if (candidate > current) updateUser({ ...user, points: candidate });
      }
      setStatus('Scan completed');
    } catch (err) {
      console.error('scanWithBlob error:', err);
      setStatus('Scan failed');
    }
  };

  const handleScan = async () => {
    if (!capturedImage || !token) return;
    
    setIsScanning(true);
    setStatus('Processing...');
    
    try {
      const formData = new FormData();
      formData.append('image', capturedImage, 'bottle.jpg');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000'}/api/scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setResult(data);
      // Update user points in context after completing scan via HTTP
      console.log('HTTP scan result:', data);
      console.log('Current user points:', user?.points);
      console.log('Current user object:', user);
      console.log('data.total_points:', data?.total_points);
      console.log('data.total_points type:', typeof data?.total_points);
      if (data && user) {
        const current = user?.points ?? 0;
        const totalFromServer = typeof data.total_points === 'number' ? data.total_points : null;
        const awarded = typeof data.points === 'number' ? data.points : (
          typeof data.points_awarded === 'number' ? data.points_awarded : null
        );
        let candidate = current;
        if (totalFromServer !== null) candidate = Math.max(candidate, totalFromServer);
        if (awarded !== null) candidate = Math.max(candidate, current + awarded);
        if (candidate > current) {
          console.log('Optimistic HTTP points update:', { current, totalFromServer, awarded, candidate });
          updateUser({ ...user, points: candidate });
        } else {
          console.log('No HTTP points increase applied:', { current, totalFromServer, awarded, candidate });
        }
      }
      setStatus('Scan completed');
      
    } catch (error) {
      console.error('Scan error:', error);
      setStatus('Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const testCamera = async () => {
    try {
      setStatus('Testing camera...');
      
      // List available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Available video devices:', videoDevices);
      
      if (videoDevices.length === 0) {
        setStatus('No video devices found');
        return;
      }
      
      // Try to get basic video stream
      const testStream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log('Test stream obtained:', testStream.getVideoTracks()[0]?.getSettings());
      
      // Stop test stream
      testStream.getTracks().forEach(track => track.stop());
      setStatus('Camera test successful');
      
    } catch (error) {
      console.error('Camera test failed:', error);
      setStatus(`Camera test failed: ${error.message}`);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <ProtectedRoute userOnly={true}>
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
              <div className="text-xl leading-7 font-semibold">Duitin</div>
            </div>
          </div>
        </div>

        {/* Camera preview */}
        <div className="flex flex-col items-center mt-6 px-4">
          <div className="w-full max-w-[320px] h-[420px] bg-black rounded-[var(--radius-md)] flex items-center justify-center overflow-hidden relative">
            {cameraStream ? (
              <video ref={videoRef} autoPlay playsInline muted className="object-cover w-full h-full" />
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
          <MobileScanResult result={result} />
        </div>

        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </ProtectedRoute>
  );
}
