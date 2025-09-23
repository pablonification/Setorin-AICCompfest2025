import React from 'react';

const SkeletonInfoCard = () => (
  <div className="rounded-[var(--radius-md)] bg-white p-4 mb-4 shadow-md animate-pulse">
    <div className="h-4 w-1/4 bg-gray-300 rounded mb-1"></div>
    <div className="flex items-center">
      <div className="flex-1 h-5 bg-gray-300 rounded"></div>
      <div className="w-4 h-4 bg-gray-300 rounded-full ml-2"></div>
    </div>
    <div className="mt-3 h-6 w-1/3 bg-gray-300 rounded-full"></div>
  </div>
);

const InfoinPageSkeleton = () => {
  return (
    <div className="pt-4 pb-24 px-4">
      {/* Search Bar Skeleton */}
      <div className="mt-4">
        <div className="flex items-center bg-gray-100 rounded-xl px-3 py-2 h-10 animate-pulse">
            <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
            <div className="ml-2 flex-1 h-5 bg-gray-300 rounded"></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="mt-6">
        <div className="h-7 w-1/3 bg-gray-300 rounded mb-3 animate-pulse"></div>
        <SkeletonInfoCard />
        <SkeletonInfoCard />
        <SkeletonInfoCard />
      </div>

      <div className="mt-6">
        <div className="h-7 w-1/3 bg-gray-300 rounded mb-3 animate-pulse"></div>
        <SkeletonInfoCard />
        <SkeletonInfoCard />
      </div>
    </div>
  );
};

export default InfoinPageSkeleton;
