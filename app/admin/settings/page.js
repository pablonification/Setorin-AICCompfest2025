'use client';

import AdminRoute from '../../components/AdminRoute';

export default function AdminSettingsPage() {
	return (
		<AdminRoute>
			<div className="min-h-screen">
				<div className="max-w-[800px] mx-auto">
					<div className="mb-6">
						<h1 className="text-[22px] leading-7 font-semibold">Settings</h1>
						<p className="text-[12px] leading-4 text-[color:var(--color-muted)] mt-1">Manage admin preferences and system options</p>
					</div>

					<div className="bg-[var(--color-card)] rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] p-5">
						<div className="space-y-5">
							<div>
								<label className="block text-[12px] leading-4 text-[color:var(--color-muted)] mb-1">Theme</label>
								<select className="w-full border rounded-[var(--radius-sm)] px-3 py-2">
									<option>Light</option>
									<option disabled>Dark (coming soon)</option>
								</select>
							</div>
							<div>
								<label className="block text-[12px] leading-4 text-[color:var(--color-muted)] mb-1">Default page size</label>
								<input type="number" defaultValue={20} className="w-full border rounded-[var(--radius-sm)] px-3 py-2" />
							</div>
							<div className="flex justify-end">
								<button className="px-4 py-2 bg-[color:var(--color-primary-600)] text-white rounded-[var(--radius-sm)]">Save changes</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</AdminRoute>
	);
}


