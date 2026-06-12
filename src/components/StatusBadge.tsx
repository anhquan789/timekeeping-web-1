"use client";

import { STATUS_COLORS } from "@/lib/types";

export default function StatusBadge({
  code,
  label,
  overdue = false,
}: {
  code: string;
  label?: string;
  overdue?: boolean;
}) {
  const classes = overdue
    ? "bg-red-100 text-red-800 ring-1 ring-red-400"
    : STATUS_COLORS[code] ?? "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}
    >
      {label ?? code}
      {overdue && <span title="Quá giờ">⚠</span>}
    </span>
  );
}
