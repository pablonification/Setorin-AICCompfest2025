import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useWebSocket = (userId) => {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);

  const connect = useCallback(() => {
    if (!userId || !token) {
      console.warn('useWebSocket: No userId or token available:', { userId, hasToken: !!token });
      setError('User ID or token not available');
      return;
    }

    try {
      console.log('useWebSocket: Attempting to connect for user:', userId);
      
      // Close existing connection if any
      if (wsRef.current) {
        console.log('useWebSocket: Closing existing connection');
        wsRef.current.close();
      }

      // Create new WebSocket connection
      let wsUrl;
      
      // Debug environment variables
      console.log('useWebSocket: Environment check:', {
        NEXT_PUBLIC_BROWSER_API_URL: process.env.NEXT_PUBLIC_BROWSER_API_URL,
        NEXT_PUBLIC_CONTAINER_API_URL: process.env.NEXT_PUBLIC_CONTAINER_API_URL,
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'server-side'
      });
      
      if (process.env.NEXT_PUBLIC_BROWSER_API_URL) {
        // Use browser API URL (converted to WebSocket) - this is localhost:8000
        wsUrl = process.env.NEXT_PUBLIC_BROWSER_API_URL
          .replace('http://', 'ws://')
          .replace('https://', 'wss://');
        wsUrl = `${wsUrl}/ws/notifications/${userId}`;
      } else if (process.env.NEXT_PUBLIC_CONTAINER_API_URL) {
        // Convert HTTP URL to WebSocket URL for container networking
        wsUrl = process.env.NEXT_PUBLIC_CONTAINER_API_URL
          .replace('http://', 'ws://')
          .replace('https://', 'wss://');
        wsUrl = `${wsUrl}/ws/notifications/${userId}`;
      } else if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        // Development environment - use localhost
        wsUrl = `ws://localhost:8000/ws/notifications/${userId}`;
      } else {
        // Production/Docker environment - use backend container
        wsUrl = `ws://backend:8000/ws/notifications/${userId}`;
      }
      
      console.log('useWebSocket: Connecting to:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('useWebSocket: Connection opened successfully');
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
        
        // Send authentication token
        console.log('useWebSocket: Sending authentication token');
        ws.send(JSON.stringify({ token }));
        
        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('useWebSocket: Message received:', data);
          setLastMessage(data);
          
          // Handle different message types
          switch (data.type) {
            case 'connection_status':
              if (data.status === 'connected') {
                setIsConnected(true);
                setConnectionStatus('connected');
              } else if (data.status === 'connecting') {
                setConnectionStatus('connecting');
              }
              break;
              
            case 'notification':
              // Handle new notification
              console.log('New notification received:', data.data);
              // You can emit a custom event or use a callback here
              window.dispatchEvent(new CustomEvent('newNotification', { 
                detail: data.data 
              }));
              break;
              
            case 'broadcast_notification':
              // Handle broadcast notification
              console.log('Broadcast notification received:', data.data);
              window.dispatchEvent(new CustomEvent('broadcastNotification', { 
                detail: data.data 
              }));
              break;
              
            case 'pong':
              // Handle pong response
              break;
              
            case 'error':
              setError(data.message);
              break;
              
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
          setError('Failed to parse message');
        }
      };

      ws.onerror = (error) => {
        console.error('useWebSocket: Connection error:', error);
        setError('WebSocket connection failed - check if backend is running');
        setConnectionStatus('error');
      };

      ws.onclose = (event) => {
        console.log('useWebSocket: Connection closed:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Provide specific error messages based on close codes
        let errorMessage = null;
        switch (event.code) {
          case 1000:
            // Normal closure
            break;
          case 1006:
            errorMessage = 'Connection abnormally closed - check backend WebSocket service';
            break;
          case 1008:
            errorMessage = 'Authentication failed - invalid token or user ID';
            break;
          case 1011:
            errorMessage = 'Backend server error - check backend logs';
            break;
          default:
            errorMessage = `Connection closed with code ${event.code}: ${event.reason || 'Unknown reason'}`;
        }
        
        if (errorMessage) {
          console.error('useWebSocket:', errorMessage);
          setError(errorMessage);
        }
        
        // Attempt to reconnect if not manually closed
        if (event.code !== 1000) {
          console.log('useWebSocket: Attempting to reconnect in 5 seconds...');
          setConnectionStatus('reconnecting');
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000); // Reconnect after 5 seconds
        }
      };

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError('Failed to create connection');
      setConnectionStatus('error');
    }
  }, [userId, token]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setError(null);
  }, []);

  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const getStatus = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      sendMessage({ type: 'get_status' });
    }
  }, [sendMessage]);

  // Connect on mount and when dependencies change
  useEffect(() => {
    if (userId && token) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [userId, token, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    error,
    connect,
    disconnect,
    sendMessage,
    getStatus
  };
};

export const useNotificationWebSocket = (userId) => {
  const { isConnected, connectionStatus, error, connect, disconnect } = useWebSocket(userId);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const handleNewNotification = (event) => {
      const notification = event.detail;
      setNotifications(prev => [notification, ...prev]);
      
      // Show browser notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title || 'Setorin Notification', {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id
        });
      }
    };

    const handleBroadcastNotification = (event) => {
      const notification = event.detail;
      setNotifications(prev => [notification, ...prev]);
      
      // Show browser notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title || 'Setorin Broadcast', {
          body: notification.message,
          icon: '/favicon.ico',
          tag: `broadcast_${Date.now()}`
        });
      }
    };

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Add event listeners
    window.addEventListener('newNotification', handleNewNotification);
    window.addEventListener('broadcastNotification', handleBroadcastNotification);

    return () => {
      window.removeEventListener('newNotification', handleNewNotification);
      window.removeEventListener('broadcastNotification', handleBroadcastNotification);
    };
  }, []);

  return {
    isConnected,
    connectionStatus,
    error,
    notifications,
    connect,
    disconnect
  };
};
