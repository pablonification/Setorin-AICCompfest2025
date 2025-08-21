'use client';

import ProtectedRoute from '../components/ProtectedRoute';
import EducationGrid from '../components/EducationGrid';

export default function EducationPage() {
  return (
    <ProtectedRoute userOnly={true}>
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">📚 Konten Edukasi</h1>
          <p className="text-gray-600 mb-6">Pelajari lebih banyak tentang daur ulang plastik dan dampaknya.</p>
          <EducationGrid />
        </main>
      </div>
    </ProtectedRoute>
  );
}
