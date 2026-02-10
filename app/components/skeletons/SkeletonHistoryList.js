import React from 'react';

const SkeletonHistoryListItem = () => (
  <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
      <div>
        <div className="h-5 w-24 bg-gray-300 rounded"></div>
        <div className="h-4 w-20 bg-gray-300 rounded mt-1"></div>
      </div>
    </div>
    <div className="h-6 w-16 bg-gray-300 rounded"></div>
  </div>
);

const SkeletonHistoryList = () => {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-6 w-32 bg-gray-300 rounded"></div>
        <div className="h-5 w-24 bg-gray-300 rounded"></div>
      </div>
      <div className="space-y-2">
        <SkeletonHistoryListItem />
        <SkeletonHistoryListItem />
        <SkeletonHistoryListItem />
      </div>
    </div>
  );
};

export default SkeletonHistoryList;
