'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import {
	FiHome,
	FiUsers,
	FiDollarSign,
	FiBookOpen,
	FiActivity,
	FiDownload,
	FiMenu,
	FiX,
	FiLogOut,
	FiShield,
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
		<div className="flex h-full flex-col">
			<button
				type="button"
				onClick={() => router.push('/admin')}
				className="w-full border-b border-white/10 px-5 py-5 text-left transition-colors hover:bg-white/5"
				aria-label="Go to Home"
			>
				<div className="flex items-center gap-3">
					<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
						<img src="/login-logo.svg" alt="Setorin" className="h-6 w-auto" />
					</div>
					<div>
						<div className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-200/80">
							Setorin
						</div>
						<div className="mt-1 text-lg font-extrabold tracking-[-0.04em] text-white">
							Admin
						</div>
					</div>
				</div>
			</button>
			<div className="mx-5 mt-5 rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-200">
						<FiShield className="h-5 w-5" />
					</div>
					<div>
						<div className="text-sm font-bold text-white">Control Center</div>
						<div className="text-xs text-emerald-100/70">Live admin workspace</div>
					</div>
				</div>
			</div>
			<nav className="flex-1 overflow-y-auto px-3 py-5">
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
							className={`mb-1.5 flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm transition-all ${
								active
									? 'bg-white text-[#0d6f3c] shadow-[0_14px_26px_rgba(0,0,0,0.12)]'
									: 'text-emerald-50/80 hover:bg-white/7 hover:text-white'
							}`}
						>
							<span className={`grid h-9 w-9 place-items-center rounded-full ${active ? 'bg-emerald-50 text-[#0d6f3c]' : 'bg-white/8 text-emerald-50/90'}`}>
								<Icon className="h-[18px] w-[18px]" />
							</span>
							<span className="truncate font-semibold">{item.title}</span>
						</button>
					);
				})}
			</nav>
			<div className="px-3 py-3">
				<button
					onClick={handleLogout}
					className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm text-rose-200 transition-colors hover:bg-white/7 hover:text-white"
				>
					<span className="grid h-9 w-9 place-items-center rounded-full bg-white/8">
						<FiLogOut className="h-[18px] w-[18px]" />
					</span>
					<span className="truncate font-semibold">Logout</span>
				</button>
			</div>
			<div className="border-t border-white/10 px-5 py-4 text-[12px] leading-4 text-emerald-100/55">
				© {new Date().getFullYear()} Setorin
			</div>
		</div>
	);

	return (
		<>
			<div className="sticky top-0 z-40 border-b border-emerald-900/5 bg-[#f8faf9]/80 backdrop-blur-xl md:hidden">
				<div className="flex items-center justify-between px-4 py-4">
					<div className="min-w-0">
						<button
							type="button"
							onClick={() => router.push('/admin')}
							className="flex items-center gap-3 text-left"
							aria-label="Go to Home"
						>
							<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm border border-emerald-900/5">
								<img src="/login-logo.svg" alt="Setorin" className="h-5 w-auto" />
							</div>
							<div>
								<div className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">
									Setorin
								</div>
								<div className="text-lg font-extrabold tracking-[-0.04em] text-slate-900">Admin</div>
							</div>
						</button>
					</div>
						<button
							aria-label="Toggle navigation"
							onClick={() => setMobileOpen(true)}
							className="rounded-full border border-emerald-900/5 bg-white p-3 text-slate-700 shadow-[0_4px_12px_rgba(16,185,129,0.05)] hover:bg-slate-50 transition-colors"
						>
						<FiMenu />
					</button>
				</div>
			</div>

			<aside className="fixed left-0 top-0 z-30 hidden h-screen w-[17rem] overflow-hidden bg-[linear-gradient(180deg,#0a6f3c_0%,#0b5c34_100%)] shadow-[0_24px_60px_rgba(15,23,42,0.24)] md:block">
				<SidebarContents />
			</aside>

			{mobileOpen && (
				<div className="md:hidden fixed inset-0 z-50">
					<div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
					<div className="absolute left-0 top-0 h-full w-72 overflow-hidden bg-[linear-gradient(180deg,#0a6f3c_0%,#0b5c34_100%)] shadow-[0_24px_60px_rgba(15,23,42,0.24)] animate-fade-in-up">
						<div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
									<img src="/login-logo.svg" alt="Setorin" className="h-5 w-auto" />
								</div>
								<div className="text-lg font-extrabold tracking-[-0.04em] text-white">Admin</div>
							</div>
							<button
								aria-label="Close navigation"
								onClick={() => setMobileOpen(false)}
								className="rounded-full bg-white/10 p-2 text-white"
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
