"use client";

export default function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3" aria-label="Đang tải">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-gray-200" />
      ))}
    </div>
  );
}
