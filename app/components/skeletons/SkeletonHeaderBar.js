import React from 'react';

const SkeletonHeaderBar = () => {
  return (
    <div className="w-full px-4 pt-4 pb-4 flex items-center justify-between bg-[var(--color-primary-700)]">
      <div className="h-7 w-24 bg-gray-300 rounded animate-pulse"></div>
      <div className="h-5 w-5 bg-gray-300 rounded-full animate-pulse"></div>
    </div>
  );
};

export default SkeletonHeaderBar;
