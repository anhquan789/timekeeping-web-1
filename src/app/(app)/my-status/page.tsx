"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import Skeleton from "@/components/Skeleton";
import StatusActions from "@/components/StatusActions";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/lib/api";
import {
  formatDuration,
  formatTime,
  startOfTodayIso,
  timeSince,
} from "@/lib/format";
import { CONTACT_LABELS, type CurrentStatus, type HistoryItem } from "@/lib/types";

const WORKING_CODES = ["WORKING", "REMOTE_WORK"];
const BREAK_CODES = ["BREAK", "LUNCH"];

export default function MyStatusPage() {
  const {
    data: status,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["my-status"],
    queryFn: async () => (await api<CurrentStatus>("/statuses/current")).data,
    refetchInterval: 60_000,
  });

  const { data: timeline } = useQuery({
    queryKey: ["my-timeline"],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: startOfTodayIso(),
        limit: "50",
      });
      return (await api<HistoryItem[]>(`/statuses/history?${params}`)).data;
    },
  });

  const totals = useMemo(() => {
    let working = 0;
    let breaks = 0;
    let outing = 0;
    for (const h of timeline ?? []) {
      const m = h.durationMinutes ?? 0;
      if (WORKING_CODES.includes(h.statusCode)) working += m;
      else if (BREAK_CODES.includes(h.statusCode)) breaks += m;
      else if (h.statusCode === "OUTING") outing += m;
    }
    return { working, breaks, outing };
  }, [timeline]);

  if (isLoading) {
    return <Skeleton rows={6} />;
  }
  if (isError || !status) {
    return (
      <div className="card text-sm text-red-700">
        Không tải được trạng thái: {(error as Error)?.message}{" "}
        <button className="underline" onClick={() => refetch()}>
          Thử lại
        </button>
      </div>
    );
  }

  // Timeline trả về mới nhất trước — đảo lại để hiển thị theo thứ tự trong ngày.
  const todayEntries = [...(timeline ?? [])].reverse();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My Status</h1>

      {/* Current status card */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <StatusBadge
                code={status.statusCode}
                label={status.statusLabel}
                overdue={status.isOverdue}
              />
              <span className="text-xs text-gray-500">
                {CONTACT_LABELS[status.contactAvailability] ??
                  status.contactAvailability}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {status.startedAt && (
                <>
                  Từ {formatTime(status.startedAt)} ({timeSince(status.startedAt)})
                </>
              )}
              {status.expectedReturnAt && (
                <>
                  {" · "}Dự kiến quay lại {formatTime(status.expectedReturnAt)}
                </>
              )}
            </div>
            {status.isOverdue && (
              <p className="mt-1 text-sm font-medium text-red-600">
                Bạn đã quá thời gian dự kiến — hãy bấm &quot;Quay lại làm việc&quot;.
              </p>
            )}
            {status.note && (
              <p className="mt-1 text-sm text-gray-500">Ghi chú: {status.note}</p>
            )}
          </div>
          <div className="flex gap-4 text-center text-sm">
            <Total label="Làm việc" value={totals.working} />
            <Total label="Nghỉ" value={totals.breaks} />
            <Total label="Ra ngoài" value={totals.outing} />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Hành động nhanh</h2>
        <StatusActions status={status} />
      </div>

      {/* Today timeline */}
      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Hôm nay</h2>
        {todayEntries.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            Chưa có hoạt động nào hôm nay.
          </p>
        ) : (
          <ol className="space-y-2">
            {todayEntries.map((h) => (
              <li key={h.id} className="flex items-center gap-3 text-sm">
                <span className="w-12 shrink-0 text-xs text-gray-500">
                  {formatTime(h.startedAt)}
                </span>
                <StatusBadge code={h.statusCode} label={h.statusLabel} />
                <span className="text-xs text-gray-500">
                  {h.endedAt
                    ? `→ ${formatTime(h.endedAt)} (${formatDuration(h.durationMinutes)})`
                    : "đang diễn ra"}
                </span>
                {h.lateReason && (
                  <span className="text-xs text-red-500">muộn: {h.lateReason}</span>
                )}
                {h.note && (
                  <span className="truncate text-xs text-gray-400">{h.note}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold">{formatDuration(value)}</div>
    </div>
  );
}
