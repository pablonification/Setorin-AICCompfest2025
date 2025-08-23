'use client';

import AdminSidebar from '../components/AdminSidebar';
import AdminRoute from '../components/AdminRoute';

export default function AdminLayout({ children }) {
	return (
		<AdminRoute>
			<div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
				<div className="mx-auto max-w-[1200px]">
					<div className="flex">
						<AdminSidebar />
						<main className="flex-1 min-h-screen">
							<div className="px-4 md:px-8 pt-4 pb-10">
								{children}
							</div>
						</main>
					</div>
				</div>
			</div>
		</AdminRoute>
	);
}


