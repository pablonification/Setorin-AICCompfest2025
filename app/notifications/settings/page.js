'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiBell, FiMail, FiSmartphone, FiClock, FiSave, FiCheck, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';
import TopBar from '../../components/TopBar';

export default function NotificationSettings() {
  const { user, token, getAuthHeaders } = useAuth();
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user && token) {
      fetchSettings();
    }
  }, [user, token]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/notifications/settings', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (updates) => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/notifications/settings', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (key) => {
    if (!settings) return;
    
    const updates = { [key]: !settings[key] };
    updateSettings(updates);
  };

  const handleTimeChange = (key, value) => {
    if (!settings) return;
    
    const updates = { [key]: parseInt(value) };
    updateSettings(updates);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Akses Ditolak</h1>
          <p className="text-gray-600">Silakan login untuk mengakses pengaturan notifikasi.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat pengaturan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
      <TopBar title="Pengaturan Notifikasi" backHref="/notifications" />

      {/* Content */}
      <div className="px-4 pb-24">
        <div className="bg-[var(--color-card)] rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] border border-gray-200">

          {/* Settings Form */}
          <div className="p-4">
            {saveSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-[var(--radius-md)] flex items-center space-x-2">
                <FiCheck className="w-5 h-5 text-[var(--color-success)]" />
                                 <span className="text-green-800 text-sm leading-5">Pengaturan berhasil disimpan!</span>
              </div>
            )}

            {/* Notification Types */}
            <div className="space-y-4">
              <div>
                                 <h3 className="text-lg leading-6 font-semibold text-[var(--foreground)] mb-3">Jenis Notifikasi</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-[var(--radius-md)]">
                    <div className="flex items-center space-x-3">
                      <FiMail className="w-5 h-5 text-[var(--color-primary-600)]" />
                      <div>
                                                 <p className="font-medium text-[var(--foreground)] text-sm leading-5">Email</p>
                         <p className="text-xs leading-4 text-[var(--color-muted)]">Notifikasi via email</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings?.email_notifications || false}
                        onChange={() => handleToggle('email_notifications')}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary-600)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary-600)]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-[var(--radius-md)]">
                    <div className="flex items-center space-x-3">
                      <FiSmartphone className="w-5 h-5 text-[var(--color-success)]" />
                      <div>
                                                 <p className="font-medium text-[var(--foreground)] text-sm leading-5">Push Notifications</p>
                         <p className="text-xs leading-4 text-[var(--color-muted)]">Notifikasi di aplikasi</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings?.push_notifications || false}
                        onChange={() => handleToggle('push_notifications')}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary-600)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary-600)]"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Notification Categories */}
              <div>
                                 <h3 className="text-lg leading-6 font-semibold text-[var(--foreground)] mb-3">Kategori Notifikasi</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-[var(--radius-md)]">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">🗑️</span>
                      <div>
                                                 <p className="font-medium text-[var(--foreground)] text-sm leading-5">Status Tong Sampah</p>
                         <p className="text-xs leading-4 text-[var(--color-muted)]">Update status dan maintenance</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings?.bin_status_notifications || false}
                        onChange={() => handleToggle('bin_status_notifications')}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary-600)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary-600)]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-[var(--radius-md)]">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">🏆</span>
                      <div>
                                                 <p className="font-medium text-[var(--foreground)] text-sm leading-5">Pencapaian</p>
                         <p className="text-xs leading-4 text-[var(--color-muted)]">Milestone dan achievements</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings?.achievement_notifications || false}
                        onChange={() => handleToggle('achievement_notifications')}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary-600)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary-600)]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-[var(--radius-md)]">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">🎁</span>
                      <div>
                                                 <p className="font-medium text-[var(--foreground)] text-sm leading-5">Reward</p>
                         <p className="text-xs leading-4 text-[var(--color-muted)]">Poin dan hadiah</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings?.reward_notifications || false}
                        onChange={() => handleToggle('reward_notifications')}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary-600)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary-600)]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-[var(--radius-md)]">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">ℹ️</span>
                      <div>
                                                 <p className="font-medium text-[var(--foreground)] text-sm leading-5">Sistem</p>
                         <p className="text-xs leading-4 text-[var(--color-muted)]">Update aplikasi dan maintenance</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings?.system_notifications || false}
                        onChange={() => handleToggle('system_notifications')}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary-600)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary-600)]"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Quiet Hours */}
              <div>
                                 <h3 className="text-lg leading-6 font-semibold text-[var(--foreground)] mb-3">Jam Tenang</h3>
                 <p className="text-sm leading-5 text-[var(--color-muted)] mb-3">Atur waktu di mana notifikasi tidak akan dikirim</p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <FiClock className="w-5 h-5 text-[var(--color-muted)]" />
                    <div className="flex-1">
                                             <label className="block text-sm leading-5 font-medium text-[var(--foreground)] mb-1">
                         Mulai
                       </label>
                      <select
                        value={settings?.quiet_hours_start || 22}
                        onChange={(e) => handleTimeChange('quiet_hours_start', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-600)] focus:border-[var(--color-primary-600)] text-sm leading-5"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>
                            {i.toString().padStart(2, '0')}:00
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <FiClock className="w-5 h-5 text-[var(--color-muted)]" />
                    <div className="flex-1">
                      <label className="block text-sm leading-5 font-medium text-[var(--foreground)] mb-1">
                        Selesai
                      </label>
                      <select
                        value={settings?.quiet_hours_end || 7}
                        onChange={(e) => handleTimeChange('quiet_hours_end', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-600)] focus:border-[var(--color-primary-600)] text-sm leading-5"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>
                            {i.toString().padStart(2, '0')}:00
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                                 <p className="text-xs leading-4 text-[color:var(--color-muted)] mt-2">
                   Notifikasi tidak akan dikirim antara {settings?.quiet_hours_start || 22}:00 - {settings?.quiet_hours_end || 7}:00
                 </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setSaveSuccess(true)}
                disabled={isSaving}
                                 className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm leading-5 font-medium rounded-[var(--radius-md)] shadow-sm text-white bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <FiSave className="w-4 h-4 mr-2" />
                    Simpan Pengaturan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
