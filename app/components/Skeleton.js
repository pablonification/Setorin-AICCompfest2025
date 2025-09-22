"use client";

export function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded-md ${className}`}
      {...props}
    />
  );
}

export function CircleSkeleton({ size = "h-10 w-10", ...props }) {
  return <Skeleton className={`rounded-full ${size}`} {...props} />;
}

export function TextSkeleton({ width = "w-full", height = "h-4", ...props }) {
  return <Skeleton className={`${width} ${height}`} {...props} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg bg-white [box-shadow:var(--shadow-card)] p-4 overflow-hidden">
      <div className="flex items-center gap-3">
        <CircleSkeleton size="h-12 w-12" />
        <div className="space-y-2 flex-1">
          <TextSkeleton height="h-4" />
          <TextSkeleton width="w-2/3" height="h-3" />
        </div>
      </div>
    </div>
  );
}