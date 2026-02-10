import React from 'react';
import SkeletonHeaderBar from './SkeletonHeaderBar';

const SkeletonProfileCard = () => (
  <div className="rounded-[16px] bg-white p-4 animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-full bg-gray-300"></div>
      <div className="flex-1">
        <div className="h-6 w-3/4 bg-gray-300 rounded"></div>
        <div className="h-4 w-1/2 bg-gray-300 rounded mt-2"></div>
      </div>
    </div>
    <div className="mt-4 h-12 bg-gray-300 rounded-[16px]"></div>
  </div>
);

const SkeletonStatCard = () => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
    <div className="p-4">
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
        <div>
          <div className="h-7 w-20 bg-gray-300 rounded"></div>
          <div className="h-5 w-24 bg-gray-300 rounded mt-1"></div>
        </div>
      </div>
    </div>
    <div className="bg-gray-200 px-4 py-3 h-10"></div>
  </div>
);

const SkeletonSettingsSection = () => (
    <div className="rounded-[16px] bg-white p-4 mt-6 animate-pulse">
        <div className="h-6 w-1/3 bg-gray-300 rounded mb-3"></div>
        <div className="space-y-2">
            <div className="h-10 bg-gray-300 rounded-lg"></div>
            <div className="h-10 bg-gray-300 rounded-lg"></div>
            <div className="h-10 bg-gray-300 rounded-lg"></div>
        </div>
    </div>
);


const ProfilePageSkeleton = () => {
  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="bg-[var(--color-primary-700)]">
        <SkeletonHeaderBar />
        <div className="px-4 pb-4">
          <SkeletonProfileCard />
        </div>
      </div>
      <div className="px-4 pb-32 pt-4 space-y-6">
        <div className="space-y-4">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
        </div>
        <SkeletonSettingsSection />
      </div>
    </div>
  );
};

export default ProfilePageSkeleton;
