import React from 'react';

const SkeletonBalanceCard = () => {
  return (
    <div className="rounded-[16px] bg-white p-5 shadow-md animate-pulse">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 bg-gray-300 rounded"></div>
            <div className="h-4 w-24 bg-gray-300 rounded"></div>
          </div>
          <div className="h-8 w-40 bg-gray-300 rounded mt-2"></div>
        </div>
        <div className="flex gap-2 translate-y-1">
          <div className="w-9 h-9 flex flex-col items-center justify-center">
            <div className="h-4 w-8 bg-gray-300 rounded"></div>
            <div className="w-7 h-7 bg-gray-300 rounded-full mt-1"></div>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-[12px] p-3 bg-gray-200">
        <div className="flex justify-between">
          <div className="h-4 w-20 bg-gray-300 rounded"></div>
          <div className="h-4 w-20 bg-gray-300 rounded"></div>
        </div>
        <div className="mt-2 h-2 bg-gray-300 rounded-full"></div>
        <div className="mt-1 h-4 w-16 bg-gray-300 rounded ml-auto"></div>
      </div>
    </div>
  );
};

export default SkeletonBalanceCard;
