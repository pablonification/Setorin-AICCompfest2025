'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import {
	FiHome,
	FiUsers,
	FiDollarSign,
	FiBell,
	FiBookOpen,
	FiActivity,
	FiDownload,
	FiSettings,
	FiMenu,
	FiX,
	FiLogOut
} from 'react-icons/fi';
import { RiQrCodeLine } from 'react-icons/ri';

const navItems = [
	{ title: 'Dashboard', href: '/admin', icon: FiHome },
	{ title: 'Users', href: '/admin/users', icon: FiUsers },
	{ title: 'Withdrawals', href: '/admin/withdrawals', icon: FiDollarSign },
	{ title: 'Education', href: '/admin/education', icon: FiBookOpen },
	{ title: 'Monitoring', href: '/admin/monitoring', icon: FiActivity },
	{ title: 'Export', href: '/admin/export', icon: FiDownload },
	{ title: 'QR Codes', href: '/admin/qr-codes', icon: RiQrCodeLine },

];

export default function AdminSidebar() {
	const router = useRouter();
	const pathname = usePathname();
	const { logout } = useAuth();
	const [mobileOpen, setMobileOpen] = useState(false);

	const isActive = (href) => (href === '/admin' ? pathname === href : pathname.startsWith(href));

	const handleLogout = () => {
		logout();
		router.push('/login');
	};

	const SidebarContents = () => (
		<div className="h-full flex flex-col">
			<button
				type="button"
				onClick={() => router.push('/admin')}
				className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 w-full text-left hover:bg-gray-50 transition-colors cursor-pointer"
				aria-label="Go to Home"
			>
				<img src="/login-logo.svg" alt="Setorin" className="h-6 w-auto" />
				<span className="text-sm font-semibold tracking-wide">Admin</span>
			</button>
			<nav className="flex-1 px-2 py-3 overflow-y-auto">
				{navItems.map((item) => {
					const Icon = item.icon;
					const active = isActive(item.href);
					return (
						<button
							key={item.href}
							onClick={() => {
								setMobileOpen(false);
								router.push(item.href);
							}}
							className={`w-full flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm mb-1 transition-colors ${
								active
									? 'bg-[color:var(--color-primary-700)] text-white'
									: 'text-gray-700 hover:bg-gray-100'
							}`}
						>
							<span className="grid place-items-center w-5 h-5">
								<Icon className={active ? 'text-white' : 'text-gray-600'} />
							</span>
							<span className="truncate">{item.title}</span>
						</button>
					);
				})}
			</nav>
			<div className="px-2 py-3">
				<button
					onClick={handleLogout}
					className="w-full flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
				>
					<span className="grid place-items-center w-5 h-5">
						<FiLogOut className="text-red-600" />
					</span>
					<span className="truncate">Logout</span>
				</button>
			</div>
			<div className="px-3 py-3 text-[12px] leading-4 text-[color:var(--color-muted)] border-t border-gray-200">
				© {new Date().getFullYear()} Setorin
			</div>
		</div>
	);

	return (
		<>
			{/* Mobile top bar */}
			<div className="md:hidden sticky top-0 z-40 bg-[var(--background)] border-b border-gray-200">
				<div className="flex items-center justify-between px-4 py-3">
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => router.push('/admin')}
							className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 w-full text-left hover:bg-gray-50 transition-colors cursor-pointer"
							aria-label="Go to Home"
						>
							<img src="/login-logo.svg" alt="Setorin" className="h-5 w-auto" />
							<span className="text-sm font-semibold">Admin</span>
						</button>
					</div>
					<button
						aria-label="Toggle navigation"
						onClick={() => setMobileOpen(true)}
						className="p-2 rounded-[var(--radius-sm)] hover:bg-gray-100"
					>
						<FiMenu />
					</button>
				</div>
			</div>

			{/* Desktop sidebar (fixed to the very left) */}
			<aside className="hidden md:block fixed left-0 top-0 h-screen w-64 bg-[var(--color-card)] [box-shadow:var(--shadow-card)] z-30">
				<SidebarContents />
			</aside>

			{/* Mobile drawer */}
			{mobileOpen && (
				<div className="md:hidden fixed inset-0 z-50">
					<div
						className="absolute inset-0 bg-black/40"
						onClick={() => setMobileOpen(false)}
					/>
					<div className="absolute left-0 top-0 h-full w-72 bg-[var(--color-card)] [box-shadow:var(--shadow-card)] animate-fade-in-up">
						<div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
							<div className="flex items-center gap-3">
								<img src="/login-logo.svg" alt="Setorin" className="h-5 w-auto" />
								<span className="text-sm font-semibold">Admin</span>
							</div>
							<button
								aria-label="Close navigation"
								onClick={() => setMobileOpen(false)}
								className="p-2 rounded-[var(--radius-sm)] hover:bg-gray-100"
							>
								<FiX />
							</button>
						</div>
						<SidebarContents />
					</div>
				</div>
			)}
		</>
	);
}


