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
		<div className="flex h-full flex-col bg-[#F9FBF9] text-slate-700">
			<button
				type="button"
				onClick={() => router.push('/admin')}
				className="w-full border-b border-emerald-900/5 px-5 py-5 text-left transition-colors hover:bg-emerald-50/50"
				aria-label="Go to Home"
			>
				<div className="flex items-center gap-3">
					<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm border border-emerald-100">
						<img src="/login-logo.svg" alt="Setorin" className="h-6 w-auto" />
					</div>
					<div>
						<div className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-600">
							Setorin
						</div>
						<div className="mt-1 text-lg font-extrabold tracking-[-0.04em] text-slate-900">
							Admin
						</div>
					</div>
				</div>
			</button>
			
			<div className="mx-5 mt-5 rounded-3xl border border-emerald-100 bg-white px-4 py-4 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
						<FiShield className="h-5 w-5" />
					</div>
					<div>
						<div className="text-sm font-bold text-slate-800">Control Center</div>
						<div className="text-xs text-slate-500">Live admin workspace</div>
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
									? 'bg-emerald-100/60 text-emerald-900 font-bold border border-emerald-200/50 shadow-sm'
									: 'text-slate-600 hover:bg-emerald-50/50 hover:text-emerald-800 font-medium'
							}`}
						>
							<span className={`grid h-9 w-9 place-items-center rounded-full transition-colors ${
								active ? 'bg-white text-emerald-700 shadow-sm' : 'bg-transparent text-slate-500'
							}`}>
								<Icon className="h-[18px] w-[18px]" />
							</span>
							<span className="truncate">{item.title}</span>
						</button>
					);
				})}
			</nav>

			<div className="px-3 py-3">
				<button
					onClick={handleLogout}
					className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
				>
					<span className="grid h-9 w-9 place-items-center rounded-full bg-transparent">
						<FiLogOut className="h-[18px] w-[18px]" />
					</span>
					<span className="truncate">Logout</span>
				</button>
			</div>
			
			<div className="border-t border-emerald-900/5 px-5 py-4 text-[12px] leading-4 text-slate-400 font-medium">
				© {new Date().getFullYear()} Setorin
			</div>
		</div>
	);

	return (
		<>
			<div className="sticky top-0 z-40 border-b border-emerald-900/5 bg-[#F9FBF9]/80 backdrop-blur-xl md:hidden">
				<div className="flex items-center justify-between px-4 py-4">
					<div className="min-w-0">
						<button
							type="button"
							onClick={() => router.push('/admin')}
							className="flex items-center gap-3 text-left"
							aria-label="Go to Home"
						>
							<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm border border-emerald-100">
								<img src="/login-logo.svg" alt="Setorin" className="h-5 w-auto" />
							</div>
							<div>
								<div className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-600">
									Setorin
								</div>
								<div className="text-lg font-extrabold tracking-[-0.04em] text-slate-900">Admin</div>
							</div>
						</button>
					</div>
					<button
						aria-label="Toggle navigation"
						onClick={() => setMobileOpen(true)}
						className="rounded-full border border-emerald-100 bg-white p-3 text-emerald-700 shadow-sm hover:bg-emerald-50 transition-colors"
					>
						<FiMenu />
					</button>
				</div>
			</div>

			<aside className="fixed left-0 top-0 z-30 hidden h-screen w-[17rem] overflow-hidden border-r border-emerald-900/5 bg-[#F9FBF9] shadow-[4px_0_24px_rgba(16,185,129,0.02)] md:block">
				<SidebarContents />
			</aside>

			{mobileOpen && (
				<div className="md:hidden fixed inset-0 z-50">
					<div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
					<div className="absolute left-0 top-0 h-full w-72 overflow-hidden bg-[#F9FBF9] shadow-2xl animate-fade-in-up">
						<div className="flex items-center justify-between border-b border-emerald-900/5 px-5 py-5">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm border border-emerald-100">
									<img src="/login-logo.svg" alt="Setorin" className="h-5 w-auto" />
								</div>
								<div className="text-lg font-extrabold tracking-[-0.04em] text-slate-900">Admin</div>
							</div>
							<button
								aria-label="Close navigation"
								onClick={() => setMobileOpen(false)}
								className="rounded-full bg-white border border-emerald-100 p-2 text-slate-500 shadow-sm hover:text-slate-800"
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
