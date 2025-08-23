'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../components/ProtectedRoute';
import MobileScanResult from '../components/MobileScanResult';
import TopBar from '../components/TopBar';
import jsQR from 'jsqr';

export default function ScanPage() {
  const { user, token, logout, updateUser } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState('Ready');
  const [result, setResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  // QR code related states
  const [isScanningQR, setIsScanningQR] = useState(true);
  const [qrValidated, setQrValidated] = useState(false);
  const [isLoadingAfterQR, setIsLoadingAfterQR] = useState(false);
  const [qrScanInterval, setQrScanInterval] = useState(null);
  const [qrValidationInProgress, setQrValidationInProgress] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const qrCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef(null);
  const userGestureBoundRef = useRef(false);

  // Debug user state changes
  useEffect(() => {
    console.log('User state changed:', user);
    console.log('User points:', user?.points);
  }, [user]);

  // Cleanup function - removed qrScanInterval dependency to prevent infinite loop
  const cleanupCamera = useCallback(() => {
    console.log('Cleaning up camera...');
    
    // Clear QR scan interval using ref instead of state
    if (qrScanInterval) {
      clearInterval(qrScanInterval);
      setQrScanInterval(null);
    }

    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind, track.label);
        track.stop();
      });
      streamRef.current = null;
    }

    // Clean video element
    if (videoRef.current) {
      const video = videoRef.current;
      video.pause();
      video.srcObject = null;
      video.onloadedmetadata = null;
      video.onerror = null;
      video.oncanplay = null;
    }

    // Reset states
    setCameraStream(null);
    setCameraError(null);
  }, []); // Empty dependency array to prevent infinite loop

  // Component unmount cleanup
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      cleanupCamera();
      
      // Reset all states on unmount
      setStatus('Ready');
      setResult(null);
      setIsScanning(false);
      setCapturedImage(null);
      setCameraError(null);
      setIsScanningQR(true);
      setQrValidated(false);
      setIsLoadingAfterQR(false);
      setQrValidationInProgress(false);
    };
  }, [cleanupCamera]);

  // Browser navigation cleanup
  useEffect(() => {
    const handleBeforeUnload = () => cleanupCamera();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cleanupCamera();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cleanupCamera]);

  // Debug logging for navigation
  useEffect(() => {
    console.log('🔍 Current scan page state:', {
      isScanning,
      result: !!result,
      currentPath: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      hasResult: !!result,
      resultData: result,
      localStorage: {
        processing: typeof window !== 'undefined' ? localStorage.getItem('smartbin_scan_processing') : 'unknown',
        hasData: typeof window !== 'undefined' ? !!localStorage.getItem('smartbin_last_scan') : 'unknown'
      }
    });
  }, [isScanning, result]);

  // Monitor result state and ensure navigation
  useEffect(() => {
    if (result && mountedRef.current) {
      console.log('🎯 Result received, ensuring navigation...');
      
      // Clear all loading states immediately
      setIsScanning(false);
      setIsScanningQR(false);
      setQrValidated(false);
      setIsLoadingAfterQR(false);
      setQrValidationInProgress(false);
      
      // Set completion status
      setStatus('Scan completed successfully!');
      
      // Store result in localStorage for result page
      try {
        localStorage.setItem('smartbin_last_scan', JSON.stringify(result));
        localStorage.setItem('smartbin_scan_processing', '0');
      } catch (e) {
        console.warn('LocalStorage not available:', e);
      }
      
      // Navigate to result page immediately
      console.log('🚀 Immediate navigation to result page...');
      router.push('/scan/result');
    }
  }, [result, router]);

  // Route change listener to reset states
  useEffect(() => {
    const handleRouteChange = () => {
      console.log('🔄 Route change detected, resetting scan states...');
      if (mountedRef.current) {
        setIsScanning(false);
        setIsScanningQR(true);
        setQrValidated(false);
        setIsLoadingAfterQR(false);
        setQrValidationInProgress(false);
        setStatus('Ready');
      }
    };

    // Listen for route changes
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Auto play video function
  const triggerVideoPlay = useCallback(async (video, stream) => {
    if (!video || !stream || !mountedRef.current) return false;
    
    try {
      console.log('🎬 Auto-triggering video play...');
      
      // Ensure srcObject is set
      if (!video.srcObject) {
        console.log('🔗 Setting srcObject for auto-play...');
        video.srcObject = stream;
        
        // Wait for stream to be processed
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      // Configure video for autoplay
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      
      // Attempt to play
      await video.play();
      console.log('✅ Auto-play successful');
      
      if (mountedRef.current) {
        setStatus('Camera ready');
        userGestureBoundRef.current = true;
      }
      
      return true;
    } catch (error) {
      console.warn('⚠️ Auto-play failed:', error);
      if (mountedRef.current) {
        setStatus('Tap video to start');
      }
      return false;
    }
  }, []);

  // Enhanced camera start function - remove cleanupCamera dependency
  const startCamera = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      setStatus('Starting camera...');
      setCameraError(null);
      
      // Clean up any existing stream first - inline cleanup to avoid dependency loop
      console.log('Cleaning up existing camera...');
      
      // Clear QR scan interval
      if (qrScanInterval) {
        clearInterval(qrScanInterval);
        setQrScanInterval(null);
      }

      // Clear retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          console.log('Stopping existing track:', track.kind, track.label);
          track.stop();
        });
        streamRef.current = null;
      }

      // Clean video element
      if (videoRef.current) {
        const video = videoRef.current;
        video.pause();
        video.srcObject = null;
        video.onloadedmetadata = null;
        video.onerror = null;
        video.oncanplay = null;
      }

      // Check for secure context (except localhost)
      const isLocalhost = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname.startsWith('192.168.') ||
         window.location.hostname.startsWith('10.'));
         
      if (typeof window !== 'undefined' && !window.isSecureContext && !isLocalhost) {
        throw new Error('Camera requires HTTPS connection');
      }

      // Check getUserMedia support
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported by this browser');
      }

      // Request camera with progressive fallback
      let stream = null;
      const constraints = [
        // First try: high quality back camera
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 30, min: 10 }
          }
        },
        // Second try: back camera with lower requirements
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        },
        // Third try: front camera
        {
          audio: false,
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        },
        // Last resort: any camera
        {
          audio: false,
          video: true
        }
      ];

      let lastError = null;
      for (let i = 0; i < constraints.length && !stream; i++) {
        try {
          console.log(`Trying camera constraint ${i + 1}:`, constraints[i]);
          stream = await navigator.mediaDevices.getUserMedia(constraints[i]);
          console.log('Camera stream obtained with constraint', i + 1);
          break;
        } catch (error) {
          console.warn(`Camera constraint ${i + 1} failed:`, error);
          lastError = error;
          
          // If permission denied, don't try other constraints
          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            throw error;
          }
        }
      }

      if (!stream) {
        throw lastError || new Error('All camera constraints failed');
      }

      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      // Store stream reference
      streamRef.current = stream;
      setCameraStream(stream);

      // Set up video element with robust approach
      const video = videoRef.current;
      if (video && stream) {
        console.log('Setting up video element with stream...');
        
        // Configure video attributes FIRST
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.controls = false;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('muted', '');
        video.setAttribute('autoplay', '');
        
        // Set explicit styles
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        video.style.backgroundColor = 'black';
        
        // Event handlers
        const handleLoadedMetadata = async () => {
          console.log('✅ Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
          if (mountedRef.current && video.videoWidth > 0 && video.videoHeight > 0) {
            // Try auto-play immediately after metadata loads
            const playSuccess = await triggerVideoPlay(video, stream);
            if (!playSuccess && mountedRef.current) {
              setStatus('Tap video to start');
            }
          }
        };

        const handleError = (e) => {
          console.error('❌ Video error:', e, video.error);
          if (mountedRef.current) {
            setCameraError(`Video error: ${video.error?.message || 'Unknown error'}`);
            setStatus('Video error - tap to retry');
          }
        };

        const handlePlay = () => {
          console.log('▶️ Video playing, dimensions:', video.videoWidth, 'x', video.videoHeight);
          if (mountedRef.current && video.videoWidth > 0) {
            setStatus('Camera ready');
            userGestureBoundRef.current = true;
          }
        };

        const handleCanPlay = async () => {
          console.log('📹 Video can play, attempting autoplay...');
          if (video.paused && mountedRef.current) {
            const playSuccess = await triggerVideoPlay(video, stream);
            if (!playSuccess && mountedRef.current) {
              setStatus('Tap video to start');
            }
          }
        };

        // Remove any existing listeners
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('canplay', handleCanPlay);
        
        // Add event listeners
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('error', handleError);
        video.addEventListener('play', handlePlay);
        video.addEventListener('canplay', handleCanPlay);
        
        // CRITICAL: Set srcObject directly to the stream
        console.log('🔗 Setting video srcObject to stream...');
        video.srcObject = stream;
        
        // Verify assignment and trigger play
        setTimeout(async () => {
          console.log('🔍 Verifying srcObject assignment:', !!video.srcObject);
          console.log('🔍 Video ready state:', video.readyState);
          console.log('🔍 Video paused:', video.paused);
          
          if (!video.srcObject && mountedRef.current) {
            console.warn('⚠️ srcObject not set, retrying...');
            video.srcObject = stream;
          }
          
          // Try to play if not already playing
          if (video.paused && mountedRef.current) {
            console.log('🎬 Attempting delayed video play...');
            await triggerVideoPlay(video, stream);
          }
        }, 200);
      }

    } catch (error) {
      console.error('Camera start failed:', error);
      
      if (!mountedRef.current) return;

      let errorMessage = 'Camera failed to start';
      
      switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          errorMessage = 'Camera permission denied';
          break;
        case 'NotFoundError':
          errorMessage = 'No camera found';
          break;
        case 'NotReadableError':
          errorMessage = 'Camera is busy or hardware error';
          break;
        case 'OverconstrainedError':
          errorMessage = 'Camera requirements not supported';
          break;
        case 'SecurityError':
          errorMessage = 'Camera blocked by security policy';
          break;
        default:
          errorMessage = error.message || 'Camera error';
      }
      
      setCameraError(errorMessage);
      setStatus(`${errorMessage} - tap to retry`);
    }
  }, [triggerVideoPlay]); // Add triggerVideoPlay to dependencies

  // Auto-start camera on mount (with gesture/play fallback retained elsewhere)
  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (mounted && mountedRef.current && !cameraStream && !cameraError) {
        startCamera();
      }
    }, 80);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  // CTA handler to start the camera via explicit user gesture (fallback)
  const handleStartScan = async () => {
    try {
      userGestureBoundRef.current = true;
      setStatus('Starting camera...');
      await retryCamera();
    } catch (e) {
      console.error('Failed to start via CTA:', e);
    }
  };

  // Start QR code scanning when camera is ready
  useEffect(() => {
    if (cameraStream && isScanningQR && !qrValidated && mountedRef.current) {
      console.log('🔍 Starting QR code scanning interval...');
      
      const performQRScan = async () => {
        if (!videoRef.current || !qrCanvasRef.current || !isScanningQR || qrValidationInProgress || !mountedRef.current) {
          return;
        }

        const video = videoRef.current;
        const canvas = qrCanvasRef.current;
        const context = canvas.getContext('2d');

        // Enhanced video readiness check
        if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0 || !video.srcObject) {
          return;
        }

        try {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && (!code.data || code.data.trim() === '')) {
            // Ignore empty payload QR reads
            console.warn('QR Code detected but empty payload, ignoring');
            return;
          }

          if (code && mountedRef.current) {
            console.log('🔍 QR Code detected:', code.data);
            setQrValidationInProgress(true);
            setStatus('Validating QR code...');

            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000'}/api/qr/validate?token=${encodeURIComponent(code.data)}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              let validationResult = {};
              try {
                validationResult = await response.json();
              } catch (_) {
                validationResult = {};
              }
              console.log('📡 QR validation result:', validationResult, 'status:', response.status);

              if (!mountedRef.current) return;

              if (!response.ok) {
                const reason = validationResult.reason || validationResult.detail || validationResult.message || `Server error: ${response.status}`;
                console.log('❌ QR validation server error:', reason);
                setStatus(`Invalid QR code: ${reason}`);
                setTimeout(() => {
                  if (mountedRef.current) setStatus('Scan QR code on SmartBin');
                }, 2000);
                return;
              }

              if (validationResult.valid) {
                console.log('✅ Correct QR code validated!');
                setIsScanningQR(false);
                setQrValidated(true);
                setIsLoadingAfterQR(true);
                setStatus('QR code validated! Loading...');

                // Clear loading state after a reasonable delay
                setTimeout(() => {
                  if (mountedRef.current) {
                    setIsLoadingAfterQR(false);
                    setStatus('Ready to scan bottle');
                  }
                }, 1500); // Increased delay for better UX
              } else {
                const reason = validationResult.reason || validationResult.detail || validationResult.message || 'Invalid';
                console.log('❌ Invalid QR code detected:', reason);
                setStatus(`Invalid QR code: ${reason}`);
                setTimeout(() => {
                  if (mountedRef.current) {
                    setStatus('Scan QR code on SmartBin');
                  }
                }, 2000);
              }
            } catch (error) {
              console.error('❌ QR code validation error:', error);
              if (mountedRef.current) {
                setStatus('Failed to validate QR code. Please try again.');
                setTimeout(() => {
                  if (mountedRef.current) {
                    setStatus('Scan QR code on SmartBin');
                  }
                }, 2000);
              }
            } finally {
              if (mountedRef.current) {
                setQrValidationInProgress(false);
              }
            }
          }
        } catch (error) {
          console.error('❌ QR scanning error:', error);
        }
      };
      
      const interval = setInterval(performQRScan, 500);
      setQrScanInterval(interval);

      return () => {
        console.log('🛑 Stopping QR code scanning interval');
        clearInterval(interval);
        setQrScanInterval(null);
      };
    } else {
      console.log('📋 QR scanning conditions not met:', {
        cameraStream: !!cameraStream,
        isScanningQR,
        qrValidated,
        mounted: mountedRef.current
      });
    }
  }, [cameraStream, isScanningQR, qrValidated, token]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!token || !mountedRef.current) return;
    
    const apiUrl = process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000';
    const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const fullWsUrl = `${wsUrl}/ws/notifications/${user?.id || user?._id}`;
    
    console.log('Connecting to WebSocket:', fullWsUrl);
    
    let ws;
    try {
      ws = new WebSocket(fullWsUrl);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setStatus('WebSocket creation failed');
      return;
    }
    
    ws.onopen = () => {
      console.log('WebSocket connected successfully');
      if (mountedRef.current) {
        setStatus('WebSocket connected');
      }
    };
    
    ws.onmessage = (e) => {
      if (!mountedRef.current) return;
      
      try {
        const msg = JSON.parse(e.data);
        console.log('WebSocket message received:', msg);
        if (msg.type === 'scan_result') {
          console.log('✅ Scan result received via WebSocket:', msg.data);
          
          // Only process WebSocket result if we don't already have a manual result
          if (!result) {
            // Clear all loading and scanning states immediately
            setIsScanning(false);
            setIsScanningQR(false);
            setQrValidated(false);
            setIsLoadingAfterQR(false);
            
            // Set the result
            setResult(msg.data);
            
            // Update user points if available
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
              }
            }
            
            // Set completion status
            setStatus('Scan completed successfully!');
            
            // Persist result for result page to read
            try {
              localStorage.setItem('smartbin_last_scan', JSON.stringify(msg.data));
              localStorage.setItem('smartbin_scan_processing', '0');
            } catch (e) {
              console.warn('LocalStorage not available:', e);
            }

            // Navigate to result page after successful scan with proper delay
            setTimeout(() => {
              if (mountedRef.current) {
                console.log('🚀 Navigating to result page from WebSocket...');
                router.push('/scan/result');
              }
            }, 1000); // Increased delay to ensure state is properly updated
          } else {
            console.log('⚠️ WebSocket result received but manual result already exists, skipping...');
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (mountedRef.current) {
        setStatus('WebSocket error');
      }
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      if (mountedRef.current) {
        setStatus('WebSocket disconnected');
      }
    };
    
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [token, updateUser, user, router, result]);

  const stopCamera = useCallback(() => {
    cleanupCamera();
    setStatus('Camera stopped');
    setCapturedImage(null);
  }, [cleanupCamera]);

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current || !mountedRef.current) return;
    
    try {
      setStatus('Capturing image...');

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Ensure video is ready
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('Video not ready for capture');
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current frame
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create image blob'));
        }, 'image/jpeg', 0.9);
      });

      if (!mountedRef.current) return;

      setCapturedImage(blob);
      
      // Store processing state
      try {
        localStorage.setItem('smartbin_scan_processing', '1');
        localStorage.removeItem('smartbin_last_scan');
      } catch (e) {
        console.warn('LocalStorage not available:', e);
      }

      setIsScanning(true);
      setStatus('Processing image...');
      
      // Clear any existing result to prevent conflicts
      setResult(null);
      
      // Navigate to result screen immediately
      router.push('/scan/result');
      
      // Continue processing in background
      await scanWithBlob(blob);
      
    } catch (error) {
      console.error('Capture error:', error);
      if (mountedRef.current) {
        setStatus('Capture failed - please try again');
        setIsScanning(false);
      }
    }
  };

  const scanWithBlob = async (blob) => {
    if (!token || !blob || !mountedRef.current) return;
    
    let scanTimeout;
    try {
      console.log('🔍 Starting manual scan with blob...');
      const formData = new FormData();
      formData.append('image', blob, 'bottle.jpg');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000'}/api/scan`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Manual scan completed:', data);
      
      if (!mountedRef.current) return;
      
      // Always update result and clear loading states
      setResult(data);
      setIsScanning(false);
      setStatus('Scan completed successfully!');
      
      try {
        localStorage.setItem('smartbin_last_scan', JSON.stringify(data));
        localStorage.setItem('smartbin_scan_processing', '0');
      } catch (e) {
        console.warn('LocalStorage not available:', e);
      }
      
      // Update user points if available
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
          console.log('Manual scan points update:', { current, totalFromServer, awarded, candidate });
          updateUser({ ...user, points: candidate });
        }
      }
      
      // Force navigation to result page immediately
      console.log('🚀 Navigating to result page immediately...');
      router.push('/scan/result');
      
    } catch (error) {
      console.error('Scan error:', error);
      if (mountedRef.current) {
        setStatus('Scan failed - please try again');
        setIsScanning(false);
      }
    } finally {
      // Always clear timeout
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Manual play handler for user interaction
  const handleVideoClick = async () => {
    const video = videoRef.current;
    if (video && cameraStream) {
      try {
        console.log('👆 Manual video click - checking video state...');
        await triggerVideoPlay(video, cameraStream);
      } catch (error) {
        console.warn('❌ Manual play failed:', error);
        setStatus('Manual play failed - retrying camera...');
        retryCamera();
      }
    } else {
      console.warn('⚠️ No video element or camera stream for manual click');
      if (!cameraStream) {
        startCamera();
      }
    }
  };

  // Retry camera function with simplified approach
  const retryCamera = async () => {
    setCameraError(null);
    setStatus('Retrying...');
    
    // Always restart camera completely for reliability
    cleanupCamera();
    
    // Short delay to ensure cleanup completes
    setTimeout(() => {
      if (mountedRef.current) {
        startCamera();
      }
    }, 100);
  };

  // Single-shot QR scan triggered by user
  const scanQROnce = useCallback(async () => {
    if (!videoRef.current || !qrCanvasRef.current || !mountedRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = qrCanvasRef.current;
      const context = canvas.getContext('2d');

      // Ensure video is ready
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0 || !video.srcObject) {
        setStatus('Align QR fully inside the frame');
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code && (!code.data || code.data.trim() === '')) {
        console.warn('QR Code detected but empty payload, ignoring');
        return;
      }

      if (!code) {
        setStatus('No QR detected. Try again.');
        setTimeout(() => mountedRef.current && setStatus('Camera ready'), 1500);
        return;
      }

      setStatus('Validating QR code...');
      // Inline validation to avoid dependency/hoisting issues
      const resp = await fetch(`${process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000'}/api/qr/validate?token=${encodeURIComponent(code.data)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      let validationResult = {};
      try { validationResult = await resp.json(); } catch (_) { validationResult = {}; }

      if (!mountedRef.current) return;

      if (!resp.ok) {
        const reason = validationResult.reason || validationResult.detail || validationResult.message || `Server error: ${resp.status}`;
        setStatus(`Invalid QR code: ${reason}`);
        setTimeout(() => mountedRef.current && setStatus('Camera ready'), 1500);
        return;
      }

      if (validationResult?.valid) {
        setIsScanningQR(false);
        setQrValidated(true);
        setIsLoadingAfterQR(true);
        setStatus('QR code validated! Loading...');
        setTimeout(() => {
          if (mountedRef.current) {
            setIsLoadingAfterQR(false);
            setStatus('Ready to scan bottle');
          }
        }, 800);
      } else {
        const reason = validationResult?.reason || validationResult?.detail || validationResult?.message || 'Invalid QR';
        setStatus(`Invalid QR code: ${reason}`);
        setTimeout(() => mountedRef.current && setStatus('Camera ready'), 1500);
      }
    } catch (error) {
      console.error('QR single-shot error:', error);
      mountedRef.current && setStatus('QR scan failed. Try again.');
    }
  }, [token]);

  // Fallback mechanism to prevent getting stuck in loading state
  useEffect(() => {
    if (isScanning && mountedRef.current) {
      const fallbackTimeout = setTimeout(() => {
        if (mountedRef.current && isScanning) {
          console.warn('⚠️ Fallback: Scan stuck in loading state, checking for result...');
          
          // Check if we have a result in localStorage
          try {
            const storedResult = localStorage.getItem('smartbin_last_scan');
            const processing = localStorage.getItem('smartbin_scan_processing');
            
            if (storedResult && processing === '0') {
              console.log('🔄 Fallback: Found stored result, updating state...');
              const parsedResult = JSON.parse(storedResult);
              setResult(parsedResult);
              setIsScanning(false);
              setStatus('Scan completed (fallback)');
              
              // Navigate to result page
              setTimeout(() => {
                if (mountedRef.current && window.location.pathname === '/scan') {
                  console.log('🚀 Fallback navigation to result page...');
                  router.push('/scan/result');
                }
              }, 500);
            } else {
              console.warn('⚠️ Fallback: No stored result found, resetting scan state...');
              setIsScanning(false);
              setStatus('Scan timeout - please try again');
            }
          } catch (e) {
            console.error('Fallback error:', e);
            setIsScanning(false);
            setStatus('Scan error - please try again');
          }
        }
      }, 15000); // 15 second fallback
      
      return () => clearTimeout(fallbackTimeout);
    }
  }, [isScanning, router]);

  // Aggressive navigation check to prevent getting stuck
  useEffect(() => {
    if (result && mountedRef.current) {
      const navigationCheck = setInterval(() => {
        if (mountedRef.current && window.location.pathname === '/scan' && result) {
          console.log('🔄 Navigation check: Still on scan page with result, forcing navigation...');
          router.push('/scan/result');
          clearInterval(navigationCheck);
        }
      }, 2000); // Check every 2 seconds
      
      return () => clearInterval(navigationCheck);
    }
  }, [result, router]);

  return (
    <ProtectedRoute userOnly={true}>
      <div className="w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
        <TopBar title="Duitin" />

        {/* Camera preview */}
        <div className="flex flex-col items-center pt-6 pb-24 px-4">
          <div className="w-full max-w-[320px] h-[420px] bg-black rounded-[var(--radius-md)] flex items-center justify-center overflow-hidden relative">
            {cameraStream ? (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  controls={false}
                  style={{ 
                    objectFit: 'cover',
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'black'
                  }}
                  onClick={handleVideoClick} // Allow clicking to manually play video
                />
                <div className="absolute inset-0 border-4 border-white/60 rounded-[var(--radius-md)] pointer-events-none" />
                
                {/* Debug overlay with more info */}
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded max-w-[280px]">
                  <div>Stream: {cameraStream ? '✓' : '✗'}</div>
                  <div>Video: {videoRef.current?.videoWidth || 0}x{videoRef.current?.videoHeight || 0}</div>
                  <div>ReadyState: {videoRef.current?.readyState || 0}</div>
                  <div>Paused: {videoRef.current?.paused ? 'Yes' : 'No'}</div>
                  <div>SrcObject: {videoRef.current?.srcObject ? '✓' : '✗'}</div>
                  <div>QR Scanning: {isScanningQR ? '✓' : '✗'}</div>
                  <div>QR Validated: {qrValidated ? '✓' : '✗'}</div>
                  {videoRef.current?.videoWidth === 0 && (
                    <div className="text-yellow-300 mt-1">Tap video to play</div>
                  )}
                  {videoRef.current?.videoWidth > 0 && isScanningQR && (
                    <div className="text-green-300 mt-1">Scanning for QR...</div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <img src="/scan-yellow.svg" alt="Starting Camera" className="w-20 h-20 opacity-60 mb-4" />
                <div className="w-6 h-6 border-2 border-[var(--color-primary-600)] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="mt-6 w-full max-w-[320px] flex items-center justify-center">
            {!cameraStream ? (
              <button
                onClick={handleStartScan}
                className="w-full py-3 rounded-[var(--radius-pill)] bg-[var(--color-primary-600)] text-white font-medium active:opacity-80"
              >
                Mulai Scan
              </button>
            ) : cameraError ? (
              <button
                onClick={retryCamera}
                className="w-full py-3 rounded-[var(--radius-pill)] bg-[var(--color-primary-600)] text-white font-medium active:opacity-80"
              >
                Coba Lagi
              </button>
            ) : isScanningQR ? (
              <div className="flex flex-col items-center space-y-4 w-full">
                <div className="text-center">
                  <div className={`w-24 h-24 rounded-full border-4 border-t-transparent animate-spin mx-auto ${
                    qrValidationInProgress
                      ? 'border-yellow-500'
                      : 'border-[var(--color-primary-600)]'
                  }`}></div>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {qrValidationInProgress ? 'Memvalidasi Kode QR...' : 'Arahkan ke Kode QR'}
                  </p>
                </div>
              </div>
            ) : isLoadingAfterQR ? (
              <div className="flex flex-col items-center space-y-4 w-full">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full border-4 border-[var(--color-primary-600)] border-t-transparent animate-spin mx-auto"></div>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">Loading...</p>
                </div>
              </div>
            ) : qrValidated ? (
              <button
                onClick={captureAndScan}
                disabled={isScanning}
                aria-label="Capture image"
                className="flex items-center justify-center w-24 h-24 rounded-full [box-shadow:var(--shadow-fab)] active:scale-95 disabled:opacity-60"
                style={{ background: 'var(--color-primary-700)' }}
              >
                <img src="/shutter.svg" alt="Shutter" className="w-12 h-12 select-none" draggable="false" />
              </button>
            ) : (
              // If realtime scanning hasn't validated yet, allow manual single-shot scan
              <button
                onClick={scanQROnce}
                className="flex items-center justify-center w-24 h-24 rounded-full border-4 border-[var(--color-primary-600)] text-[var(--color-primary-600)] active:scale-95"
                aria-label="Scan QR once"
              >
                Scan
              </button>
            )}
          </div>

          {/* Camera control buttons */}
          {cameraStream && (
            <div className="mt-3 w-full max-w-[320px] flex justify-center space-x-2">
              <button 
                onClick={stopCamera} 
                className="px-4 py-2 text-xs text-gray-700 bg-gray-200 rounded-[var(--radius-pill)] active:opacity-80"
              >
                Stop Camera
              </button>
              {/* Manual reset button for stuck states */}
              {(isScanning || isLoadingAfterQR || qrValidationInProgress) && (
                <button 
                  onClick={() => {
                    console.log('🔄 Manual reset triggered');
                    setIsScanning(false);
                    setIsLoadingAfterQR(false);
                    setQrValidationInProgress(false);
                    setStatus('Ready to scan');
                  }}
                  className="px-4 py-2 text-xs text-red-600 bg-red-100 rounded-[var(--radius-pill)] active:opacity-80"
                >
                  Reset
                </button>
              )}
              {/* Force navigation button when we have a result */}
              {result && (
                <button 
                  onClick={() => {
                    console.log('🚀 Force navigation triggered');
                    router.push('/scan/result');
                  }}
                  className="px-4 py-2 text-xs text-green-600 bg-green-100 rounded-[var(--radius-pill)] active:opacity-80"
                >
                  Lihat Hasil
                </button>
              )}
            </div>
          )}

          {/* Status display */}
          {status && (
            <div className="mt-2 text-sm text-center text-[var(--color-muted)]">
              {status}
              {/* Show additional debug info in development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-1 text-xs opacity-60">
                  <div>Scanning: {isScanning ? 'Yes' : 'No'}</div>
                  <div>QR Validated: {qrValidated ? 'Yes' : 'No'}</div>
                  <div>Loading: {isLoadingAfterQR ? 'Yes' : 'No'}</div>
                  <div>Result: {result ? 'Received' : 'None'}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scan result */}
        <div className="px-4">
          <MobileScanResult result={result} />
        </div>

        {/* Hidden canvases */}
        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={qrCanvasRef} className="hidden" />
      </div>
    </ProtectedRoute>
  );
}