import React from 'react';

const SkeletonActionGrid = () => {
  return (
    <div className="grid grid-cols-3 bg-white rounded-[12px] p-4 animate-pulse">
      <div className="flex flex-col items-center">
        <div className="w-20 h-20 bg-gray-300 rounded-lg"></div>
        <div className="h-4 w-16 bg-gray-300 rounded mt-2"></div>
      </div>
      <div className="flex flex-col items-center">
        <div className="w-[102px] h-[102px] bg-gray-300 rounded-lg -translate-y-[8.5px]"></div>
        <div className="h-4 w-16 bg-gray-300 rounded mt-1 -translate-y-[18px]"></div>
      </div>
      <div className="flex flex-col items-center">
        <div className="w-20 h-20 bg-gray-300 rounded-lg"></div>
        <div className="h-4 w-16 bg-gray-300 rounded mt-2"></div>
      </div>
    </div>
  );
};

export default SkeletonActionGrid;
