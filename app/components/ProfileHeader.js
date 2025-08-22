'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function ProfileHeader({ user }) {
  return (
    <div className="flex items-center gap-4 p-4">
      {/* User Avatar */}
      <div className="w-20 h-20 rounded-full border-2 border-[var(--color-primary-700)] flex items-center justify-center overflow-hidden bg-white flex-shrink-0">
        <Image 
          src={user?.avatarUrl || "/profile/default-profile.jpg"} 
          alt="Avatar" 
          width={80}
          height={80}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
      
      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="text-[14px] leading-5 font-semibold text-[var(--color-primary-700)] truncate">
          {user?.name || 'Pengguna'}
        </div>
        <div className="text-[12px] leading-4 text-[var(--color-muted)] mt-1">
          {user?.level || 'Level 1'}
        </div>
      </div>
      
      {/* Edit Profile Link */}
      <Link 
        href="/profile/edit" 
        className="flex items-center gap-2 text-[12px] leading-4 text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] transition-colors"
      >
        <span>Edit Profil</span>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </Link>
    </div>
  );
}
