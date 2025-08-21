'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiBell, FiPlus, FiSend, FiTrash2, FiEdit, FiUsers, FiTarget } from 'react-icons/fi';

export default function AdminNotifications() {
  const { user, token, getAuthHeaders } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    notification_type: 'system',
    priority: 2,
    user_id: '',
    bin_id: '',
    bin_status: '',
    achievement_type: '',
    achievement_value: '',
    action_url: '',
    action_text: ''
  });

  useEffect(() => {
    if (user && token) {
      fetchNotifications();
    }
  }, [user, token]);

  const fetchNotifications = async () => {
    try {
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
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let endpoint = '';
      let payload = {};
      
      switch (formData.notification_type) {
        case 'bin_status':
          endpoint = '/api/notifications/admin/bin-status';
          payload = {
            bin_id: formData.bin_id,
            bin_status: formData.bin_status,
            message: formData.message
          };
          break;
        case 'achievement':
          endpoint = '/api/notifications/admin/achievement';
          payload = {
            achievement_type: formData.achievement_type,
            achievement_value: parseInt(formData.achievement_value),
            message: formData.message
          };
          break;
        default:
          endpoint = '/api/notifications/admin/system';
          payload = {
            user_id: formData.user_id || user.id,
            title: formData.title,
            message: formData.message,
            notification_type: formData.notification_type,
            priority: parseInt(formData.priority),
            bin_id: formData.bin_id || undefined,
            bin_status: formData.bin_status || undefined,
            achievement_type: formData.achievement_type || undefined,
            achievement_value: formData.achievement_value ? parseInt(formData.achievement_value) : undefined,
            action_url: formData.action_url || undefined,
            action_text: formData.action_text || undefined
          };
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const result = await response.json();
        alert('Notifikasi berhasil dibuat!');
        setShowCreateForm(false);
        setFormData({
          title: '',
          message: '',
          notification_type: 'system',
          priority: 2,
          user_id: '',
          bin_id: '',
          bin_status: '',
          achievement_type: '',
          achievement_value: '',
          action_url: '',
          action_text: ''
        });
        fetchNotifications();
      } else {
        const error = await response.json();
        alert(`Gagal membuat notifikasi: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create notification:', error);
      alert('Gagal membuat notifikasi');
    }
  };

  const deleteNotification = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus notifikasi ini?')) return;
    
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        alert('Notifikasi berhasil dihapus');
        fetchNotifications();
      } else {
        alert('Gagal menghapus notifikasi');
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      alert('Gagal menghapus notifikasi');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Akses Ditolak</h1>
          <p className="text-gray-600">Silakan login untuk mengakses halaman admin.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat notifikasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FiBell className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Manajemen Notifikasi</h1>
                <p className="text-gray-600">Kelola dan buat notifikasi untuk pengguna</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Buat Notifikasi
            </button>
          </div>
        </div>

        {/* Create Notification Form */}
        {showCreateForm && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Buat Notifikasi Baru</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jenis Notifikasi
                  </label>
                  <select
                    name="notification_type"
                    value={formData.notification_type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="system">Sistem</option>
                    <option value="bin_status">Status Tong Sampah</option>
                    <option value="achievement">Pencapaian</option>
                    <option value="reward">Reward</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioritas
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1}>Rendah</option>
                    <option value={2}>Sedang</option>
                    <option value={3}>Tinggi</option>
                  </select>
                </div>

                {formData.notification_type === 'system' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Judul
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Judul notifikasi"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        User ID (kosongkan untuk semua user)
                      </label>
                      <input
                        type="text"
                        name="user_id"
                        value={formData.user_id}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="User ID atau kosongkan"
                      />
                    </div>
                  </>
                )}

                {formData.notification_type === 'bin_status' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ID Tong Sampah
                      </label>
                      <input
                        type="text"
                        name="bin_id"
                        value={formData.bin_id}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ID tong sampah"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status Tong
                      </label>
                      <select
                        name="bin_status"
                        value={formData.bin_status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Pilih status</option>
                        <option value="full">Penuh</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="available">Tersedia</option>
                      </select>
                    </div>
                  </>
                )}

                {formData.notification_type === 'achievement' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Jenis Pencapaian
                      </label>
                      <input
                        type="text"
                        name="achievement_type"
                        value={formData.achievement_type}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Contoh: Botol ke-100"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nilai Pencapaian
                      </label>
                      <input
                        type="number"
                        name="achievement_value"
                        value={formData.achievement_value}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="100"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pesan
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Pesan notifikasi"
                    required
                  />
                </div>

                {formData.notification_type === 'system' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL Aksi (opsional)
                      </label>
                      <input
                        type="url"
                        name="action_url"
                        value={formData.action_url}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Teks Aksi (opsional)
                      </label>
                      <input
                        type="text"
                        name="action_text"
                        value={formData.action_text}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Klik di sini"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FiSend className="w-4 h-4 mr-2" />
                  Kirim Notifikasi
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Daftar Notifikasi</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jenis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Judul/Pesan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioritas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">
                          {notification.notification_type === 'bin_status' ? 'ðŸ—‘ï¸' :
                           notification.notification_type === 'achievement' ? 'ðŸ†' :
                           notification.notification_type === 'reward' ? 'ðŸŽ' : 'â„¹ï¸'}
                        </span>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {notification.notification_type.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">{notification.title || 'Tidak ada judul'}</div>
                        <div className="text-gray-500 truncate max-w-xs">
                          {notification.message}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        notification.priority === 3 ? 'bg-red-100 text-red-800' :
                        notification.priority === 2 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {notification.priority === 3 ? 'Tinggi' :
                         notification.priority === 2 ? 'Sedang' : 'Rendah'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        notification.is_read ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {notification.is_read ? 'Sudah Dibaca' : 'Belum Dibaca'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(notification.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Hapus notifikasi"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {notifications.length === 0 && (
              <div className="text-center py-8">
                <FiBell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Belum ada notifikasi</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

