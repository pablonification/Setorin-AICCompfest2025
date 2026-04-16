'use client';

import AdminSidebar from '../components/AdminSidebar';
import AdminRoute from '../components/AdminRoute';

export default function AdminLayout({ children }) {
	return (
		<AdminRoute>
			<div className="min-h-screen bg-[#f8faf9] text-[var(--foreground)] font-plus-jakarta selection:bg-emerald-100 selection:text-emerald-900">
				<AdminSidebar />
				<main className="min-h-screen md:pl-[17rem]">
					<div className="mx-auto w-full max-w-[1380px] px-4 pb-10 pt-4 md:px-8 md:pt-6">
						{children}
					</div>
				</main>
			</div>
		</AdminRoute>
	);
}


