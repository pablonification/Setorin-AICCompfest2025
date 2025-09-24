import React from 'react';
import TopBar from '../../components/TopBar';

const TemuinPageSkeleton = () => {
  return (
    <div className="w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter animate-pulse">
      <TopBar title="Temuin" />

      <div className="relative" style={{ height: 'calc(100vh - 60px)' }}>
        <div className="absolute inset-0 bg-gray-300"></div>

        <div className="absolute left-1/2 bottom-24 w-[92%] -translate-x-1/2">
          <div className="rounded-[16px] bg-white p-4">
            <div className="h-4 w-1/4 bg-gray-300 rounded"></div>
            <div className="h-6 w-1/2 bg-gray-300 rounded mt-1"></div>
            <div className="h-4 w-full bg-gray-300 rounded mt-1"></div>
            
            <div className="mt-3 flex items-center gap-2">
              <div className="h-6 w-20 bg-gray-300 rounded-full"></div>
            </div>

            <div className="mt-4 h-12 w-full bg-gray-300 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemuinPageSkeleton;
