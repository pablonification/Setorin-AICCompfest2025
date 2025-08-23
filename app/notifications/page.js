'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FiBell, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';
import NotificationItem from '../components/NotificationItem';
import TopBar from '../components/TopBar';

export default function NotificationsPage() {
  const { user, token, getAuthHeaders } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'unread'

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchNotifications();
    fetchUnreadCount();
  }, [token]);

  const fetchNotifications = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/notifications', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications/unread-count', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const notification = notifications.find(n => n.id === notificationId);
        if (notification && !notification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };



  const filteredNotifications = activeTab === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-4">Akses Ditolak</h1>
          <p className="text-[var(--color-muted)]">Silakan login untuk mengakses notifikasi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
      <TopBar title="Notifikasi" backHref="/profile" />

      {/* Stats */}
      <div className="bg-[var(--color-primary-700)] text-white pt-4 pb-6 px-4 rounded-b-[var(--radius-lg)] [box-shadow:var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-[var(--radius-pill)] text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-white text-[var(--color-primary-700)]'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-4 py-2 rounded-[var(--radius-pill)] text-sm font-medium transition-colors ${
                activeTab === 'unread'
                  ? 'bg-white text-[var(--color-primary-700)]'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Belum Dibaca ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-white/80 hover:text-white underline"
            >
              Tandai Semua Dibaca
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-24">
        {/* Refresh Button */}
        <div className="mb-4">
          <button
            onClick={fetchNotifications}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-[var(--radius-md)] bg-[var(--color-card)] border border-gray-200 text-[var(--color-muted)] hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Memuat...' : 'Refresh Notifikasi'}</span>
          </button>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-[var(--color-card)] rounded-[var(--radius-md)] p-4 border border-gray-200">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-300 rounded w-full"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <FiBell className="w-8 h-8 text-[var(--color-muted)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
              {activeTab === 'unread' ? 'Tidak Ada Notifikasi Belum Dibaca' : 'Tidak Ada Notifikasi'}
            </h3>
            <p className="text-[var(--color-muted)]">
              {activeTab === 'unread' 
                ? 'Semua notifikasi sudah dibaca' 
                : 'Anda akan menerima notifikasi di sini'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
