'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import SectionHeader from '../components/SectionHeader';
import SettingsRow from '../components/SettingsRow';
import { TextSkeleton, CircleSkeleton } from '../components/Skeleton';

// Create a Profile Skeleton component
function ProfileSkeleton() {
  return (
    <>
      {/* Profile Card Skeleton */}
      <div className="rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4">
        <div className="flex items-center gap-4">
          <CircleSkeleton size="w-20 h-20" className="border-4 border-[var(--color-primary-700)]" />
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-2">
                <TextSkeleton width="w-32" height="h-6" />
                <TextSkeleton width="w-40" height="h-3" />
              </div>
              <div className="h-6 w-20 rounded-full bg-gray-200 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Level pill skeleton */}
        <div className="mt-4 rounded-[16px] p-3 bg-gray-200 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-300" />
              <div className="h-4 w-16 bg-gray-300 rounded" />
            </div>
            <div className="h-4 w-24 bg-gray-300 rounded" />
          </div>
        </div>
      </div>

      {/* Account settings skeleton */}
      <div className="mt-6 rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4">
        <TextSkeleton width="w-24" height="h-6" />
        <div className="mt-3 space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
                <TextSkeleton width="w-24" height="h-4" />
              </div>
              <div className="w-4 h-4 bg-gray-200 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
      
      {/* About section skeleton */}
      <div className="mt-6 rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4">
        <TextSkeleton width="w-32" height="h-6" />
        <div className="mt-3 space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
                <TextSkeleton width="w-28" height="h-4" />
              </div>
              <div className="w-4 h-4 bg-gray-200 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function SayaPage() {
  const { user, token, getAuthHeaders } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    
    const initProfile = async () => {
      setLoading(true);
      await fetchUnread();
      setLoading(false);
    };
    
    initProfile();
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
          {/* Profile Content - shows skeleton during loading */}
          {loading ? (
            <ProfileSkeleton />
          ) : (
            <>
              {/* Profile Card */}
              <div className="rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full border-4 border-[var(--color-primary-700)] flex items-center justify-center overflow-hidden bg-white">
                    <img src={user?.photo_url || "/profile/default-profile.jpg"} alt="Avatar" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-inter font-bold text-lg leading-none text-[var(--color-primary-700)]">
                          {user?.name || user?.email || 'Pengguna'}
                        </div>
                        <div className="font-inter text-xs leading-none mt-1 text-[var(--color-primary-700)]">
                          {user?.email}
                        </div>
                      </div>
                      <Link href="/profile/edit" className="font-inter text-xs leading-none px-3 py-1 rounded-[var(--radius-pill)] border border-[var(--color-primary-700)] text-[var(--color-primary-700)]">
                        Edit Profil
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Level pill */}
                <div className="mt-4 rounded-[16px] p-3" style={{ backgroundImage: 'var(--gradient-primary)' }}>
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                      <img src="/profile/level.svg" alt="Level" />
                      <span className="font-inter font-bold text-sm leading-none">Perintis</span>
                    </div>
                    <span className="font-inter text-sm leading-none">{(user?.points ?? 0)} Setor Poin</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="-mt-14 px-4 pb-28 space-y-6">
        {loading ? (
          // This part is already rendered in the ProfileSkeleton component
          <div className="opacity-0">Loading...</div>
        ) : (
          <>
            <div className="rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4">
              <SectionHeader title="Akun Saya" />
              <div className="mt-3 space-y-2">
                <SettingsRow href="/notifications" label="Notifikasi" badge={unreadCount} icon="/profile/notifikasi.svg" />
                <SettingsRow href="/statistics" label="Statistics" icon="/profile/alamat-pengiriman.svg" />
              </div>
            </div>

            <div className="rounded-[16px] bg-white [box-shadow:var(--shadow-card)] p-4">
              <SectionHeader title="Seputar Setorin" />
              <div className="mt-3 space-y-2">
                <SettingsRow href="#" label="Bantuan" icon="/profile/bantuan.svg" />
                <SettingsRow href="#" label="Lapor Masalah" icon="/profile/lapor-masalah.svg" />
                <SettingsRow href="/tentang-kami" label="Tentang Kami" icon="/profile/tentang-kami.svg" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}