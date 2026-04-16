import React from 'react';
import SkeletonHeaderBar from './SkeletonHeaderBar';
import SkeletonBalanceCard from './SkeletonBalanceCard';
import SkeletonActionGrid from './SkeletonActionGrid';
import SkeletonHeroCarousel from './SkeletonHeroCarousel';
import SkeletonHistoryList from './SkeletonHistoryList';

const HomePageSkeleton = () => {
  return (
    <div className="w-full min-h-screen bg-[var(--background)]">
      <div className="bg-[var(--color-primary-700)]">
        <SkeletonHeaderBar />
        <div className="px-4 pb-4 space-y-4">
          <SkeletonBalanceCard />
          <SkeletonActionGrid />
        </div>
      </div>
      <div className="px-4 pb-32 pt-4 space-y-4">
        <SkeletonHeroCarousel />
        <SkeletonHistoryList />
      </div>
    </div>
  );
};

export default HomePageSkeleton;
