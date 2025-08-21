'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import SectionHeader from '../components/SectionHeader';
import SettingsRow from '../components/SettingsRow';

export default function SayaPage() {
  const { user, token, getAuthHeaders } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchUnread();
  }, [token]);

  const fetchUnread = async () => {
    try {
      const res = await fetch('/api/notifications/unread-count', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="mobile-container font-inter">
      {/* Green header */}
      <div className="bg-[var(--color-primary-700)] pb-20">
        <div className="px-4 pt-4">
          {/* Profile Card */}
          <div className="rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full border-4 border-[var(--color-primary-700)] flex items-center justify-center">
                <div className="w-10 h-10 rounded-md bg-gray-300" aria-hidden />
              </div>
              <div className="flex-1">
                <div className="text-[18px] font-semibold text-gray-900">
                  {user?.name || user?.email || 'Pengguna'}
                </div>
                <div className="text-[12px] leading-4 text-[color:var(--color-muted)]">
                  {user?.email}
                </div>
                <div className="mt-2">
                  <button className="px-3 py-1 rounded-[var(--radius-pill)] border border-[var(--color-primary-700)] text-[12px] text-[var(--color-primary-700)]">
                    Edit Profil
                  </button>
                </div>
              </div>
            </div>

            {/* Level pill */}
            <div className="mt-4 rounded-[12px] p-3" style={{ backgroundImage: 'var(--gradient-primary)' }}>
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-white/20" aria-hidden />
                  <span className="font-medium">Perintis</span>
                </div>
                <span className="text-sm">{(user?.points ?? 0)} Setor Poin</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="-mt-14 px-4 pb-28 space-y-6">
        <div className="rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4">
          <SectionHeader title="Akun Saya" />
          <div className="mt-3 space-y-2">
            <SettingsRow href="/notifications" label="Notifikasi" badge={unreadCount} />
            <SettingsRow href="#" label="Alamat Pengiriman" />
            <SettingsRow href="#" label="Metode Pembayaran" />
            <SettingsRow href="#" label="Ubah Bahasa" />
          </div>
        </div>

        <div className="rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4">
          <SectionHeader title="Seputar Setorin" />
          <div className="mt-3 space-y-2">
            <SettingsRow href="#" label="Bantuan" />
            <SettingsRow href="#" label="Lapor Masalah" />
            <SettingsRow href="#" label="Tentang Kami" />
          </div>
        </div>
      </div>
    </div>
  );
}


