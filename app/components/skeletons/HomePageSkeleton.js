import React from 'react';

const HomePageSkeleton = () => {
  return (
    <div className="min-h-screen w-full animate-pulse bg-[#f7f9fc]">
      <div className="mx-auto max-w-[430px] px-5 pb-32 pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-slate-200" />
              <div className="space-y-2">
                <div className="h-3 w-12 rounded-full bg-slate-200" />
                <div className="h-8 w-24 rounded-full bg-slate-200" />
              </div>
            </div>
            <div className="h-12 w-12 rounded-full bg-white shadow-sm" />
          </div>

          <div className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0b6f3c_0%,#128a52_100%)] px-6 py-7 shadow-[0_28px_55px_rgba(8,109,57,0.24)]">
            <div className="h-5 w-32 rounded-full bg-white/25" />
            <div className="mt-4 h-11 w-52 rounded-full bg-white/25" />
            <div className="mt-8 flex items-end justify-between gap-4">
              <div className="space-y-3">
                <div className="h-4 w-28 rounded-full bg-white/20" />
                <div className="h-9 w-32 rounded-full bg-white/25" />
              </div>
              <div className="h-12 w-28 rounded-full bg-white/80" />
            </div>
            <div className="mt-6 rounded-[1.5rem] bg-white/10 p-4">
              <div className="h-3 w-full rounded-full bg-white/15" />
              <div className="mt-3 h-2.5 w-full rounded-full bg-white/15" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-[1.75rem] bg-white px-3 py-4 shadow-sm">
                <div className="h-14 w-14 rounded-[1.1rem] bg-slate-100" />
                <div className="mt-4 h-4 w-14 rounded-full bg-slate-200" />
                <div className="mt-2 h-3 w-16 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-8 w-52 rounded-full bg-slate-200" />
              <div className="h-4 w-20 rounded-full bg-slate-200" />
            </div>
            <div className="rounded-[2rem] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-32 rounded-full bg-slate-200" />
                  <div className="h-4 w-40 rounded-full bg-slate-100" />
                </div>
                <div className="h-12 w-12 rounded-full bg-slate-100" />
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-4">
                <div className="h-8 w-44 rounded-full bg-slate-200" />
                <div className="h-5 w-56 rounded-full bg-slate-100" />
                <div className="h-5 w-44 rounded-full bg-slate-100" />
              </div>
              <div className="h-10 w-24 rounded-full bg-emerald-100" />
            </div>
            <div className="mt-6 h-3 w-full rounded-full bg-slate-100" />
          </div>

          <div className="rounded-[2.25rem] bg-emerald-100/80 px-6 py-8 shadow-sm">
            <div className="h-4 w-20 rounded-full bg-emerald-200" />
            <div className="mt-4 h-8 w-52 rounded-full bg-emerald-200/90" />
            <div className="mt-3 h-8 w-48 rounded-full bg-emerald-200/90" />
            <div className="mt-6 h-12 w-40 rounded-full bg-[#10281b]/80" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePageSkeleton;
