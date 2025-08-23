'use client';

import AdminSidebar from '../components/AdminSidebar';
import AdminRoute from '../components/AdminRoute';

export default function AdminLayout({ children }) {
	return (
		<AdminRoute>
			<div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
				{/* Fixed left sidebar */}
				<AdminSidebar />
				{/* Content area with left padding to avoid overlapping the fixed sidebar */}
				<main className="min-h-screen md:pl-64">
					<div className="mx-auto w-full max-w-[1200px] px-4 md:px-8 pt-4 pb-10">
						{children}
					</div>
				</main>
			</div>
		</AdminRoute>
	);
}


