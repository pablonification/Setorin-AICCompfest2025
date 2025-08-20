'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../components/ProtectedRoute';
import NotificationBell from '../components/NotificationBell';
import WebSocketTest from '../components/WebSocketTest';

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

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Check if video is ready
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setStatus('Video not ready yet');
      return;
    }
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Clear canvas first
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob with better quality
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedImage(blob);
        setStatus('Image captured');
        console.log('Image captured:', blob.size, 'bytes');
      } else {
        setStatus('Failed to capture image');
      }
    }, 'image/jpeg', 0.9);
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
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Camera Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Scan Bottle</h2>
              
              {!cameraStream ? (
                <div className="space-y-3">
                  <button
                    onClick={startCamera}
                    className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                  >
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">Click to start camera</p>
                    </div>
                  </button>
                  
                  <button
                    onClick={testCamera}
                    className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                  >
                    Test Camera
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg border border-gray-300 bg-black"
                    style={{ minHeight: '300px' }}
                  />
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={captureImage}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Capture
                    </button>
                    <button
                      onClick={stopCamera}
                      className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
                    >
                      Stop Camera
                    </button>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        stopCamera();
                        setTimeout(startCamera, 500);
                      }}
                      className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 transition-colors text-sm"
                    >
                      Restart Camera
                    </button>
                  </div>
                  
                  {/* Camera Status Indicator */}
                  <div className="text-center text-sm text-gray-600">
                    <div className="flex items-center justify-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${cameraStream ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span>{cameraStream ? 'Camera Active' : 'Camera Inactive'}</span>
                    </div>
                    {videoRef.current && (
                      <div className="mt-1 text-xs text-gray-500">
                        Resolution: {videoRef.current.videoWidth || 0} x {videoRef.current.videoHeight || 0}
                      </div>
                    )}
                    {cameraStream && (
                      <div className="mt-1 text-xs text-gray-500">
                        {(() => {
                          const track = cameraStream.getVideoTracks()[0];
                          if (track) {
                            const settings = track.getSettings();
                            return `FPS: ${settings.frameRate || 'N/A'}, Device: ${track.label || 'Unknown'}`;
                          }
                          return '';
                        })()}
                      </div>
                    )}
                  </div>
                  
                  {capturedImage && (
                    <div className="space-y-3">
                      <img
                        src={URL.createObjectURL(capturedImage)}
                        alt="Captured bottle"
                        className="w-full rounded-lg border border-gray-300"
                      />
                      <button
                        onClick={handleScan}
                        disabled={isScanning}
                        className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isScanning ? 'Scanning...' : 'Scan Bottle'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              <div className="text-sm text-gray-600">
                Status: <span className="font-medium">{status}</span>
              </div>
              
              {/* Debug Info */}
              <details className="mt-2 text-xs text-gray-500">
                <summary className="cursor-pointer hover:text-gray-700">Debug Info</summary>
                <div className="mt-2 space-y-1">
                  <div>Camera Stream: {cameraStream ? 'Active' : 'None'}</div>
                  <div>Video Element: {videoRef.current ? 'Ready' : 'Not Ready'}</div>
                  {videoRef.current && (
                    <>
                      <div>Video Width: {videoRef.current.videoWidth || 'Not Set'}</div>
                      <div>Video Height: {videoRef.current.videoHeight || 'Not Set'}</div>
                      <div>Video Ready State: {videoRef.current.readyState || 'Unknown'}</div>
                    </>
                  )}
                  <div>Captured Image: {capturedImage ? `${capturedImage.size} bytes` : 'None'}</div>
                  
                  {/* Test Notification Button */}
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/notifications/test-create-sample', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`,
                            },
                            body: JSON.stringify({ type: 'system', count: 1 })
                          });
                          if (response.ok) {
                            const result = await response.json();
                            alert(`Test notification created: ${result.message}`);
                          } else {
                            alert('Failed to create test notification');
                          }
                        } catch (error) {
                          console.error('Error creating test notification:', error);
                          alert('Error creating test notification');
                        }
                      }}
                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                    >
                      Test Notification
                    </button>
                  </div>
                </div>
              </details>
            </div>

            {/* Results Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Scan Results</h2>
              
              {result ? (
                <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      {result.brand || 'Unknown Brand'}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      result.is_valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {result.is_valid ? 'Valid' : 'Invalid'}
                    </span>
                  </div>
                  
                  {result.is_valid && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Points Awarded:</span>
                        <p className="font-medium text-green-600">{result.points_awarded}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Points:</span>
                        <p className="font-medium">{result.total_points}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Volume:</span>
                        <p className="font-medium">{result.volume_ml?.toFixed(1)} ml</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Confidence:</span>
                        <p className="font-medium">{(result.confidence * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                  )}
                  
                  {result.reason && (
                    <div>
                      <span className="text-gray-500 text-sm">Reason:</span>
                      <p className="text-sm">{result.reason}</p>
                    </div>
                  )}
                  
                  {result.debug_url && (
                    <div>
                      <span className="text-gray-500 text-sm">Debug Image:</span>
                      <img
                        src={`${process.env.NEXT_PUBLIC_BROWSER_API_URL}${result.debug_url}`}
                        alt="Debug preview"
                        className="mt-2 w-full rounded border"
                        onError={(e) => {
                          console.error('Failed to load debug image:', e.target.src);
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <div className="mt-2 p-2 bg-gray-100 text-gray-600 text-sm rounded border" style={{display: 'none'}}>
                        Debug image failed to load. URL: {`${process.env.NEXT_PUBLIC_BROWSER_API_URL}${result.debug_url}`}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-500">
                  No scan results yet. Capture an image and scan to see results here.
                </div>
              )}
            </div>
          </div>
          
          {/* Hidden canvas for image capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
        
        {/* WebSocket Test Component for Debugging */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <WebSocketTest />
        </div>
      </div>
    </ProtectedRoute>
  );
}
