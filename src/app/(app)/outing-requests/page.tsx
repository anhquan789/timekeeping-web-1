"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Modal from "@/components/Modal";
import Skeleton from "@/components/Skeleton";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatDateTime, localInputToIso } from "@/lib/format";
import { toast } from "@/lib/toast";
import {
  OUTING_STATUS_COLORS,
  OUTING_STATUS_LABELS,
  type OutingRequest,
} from "@/lib/types";

type Tab = "mine" | "pending";

export default function OutingRequestsPage() {
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const canApprove =
    me?.permissions.includes("outing.approve.all") ||
    me?.permissions.includes("outing.approve.department");

  const [tab, setTab] = useState<Tab>("mine");
  const [createOpen, setCreateOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<OutingRequest | null>(null);
  const [returnTarget, setReturnTarget] = useState<OutingRequest | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["outings", tab],
    queryFn: async () => {
      const path =
        tab === "pending"
          ? "/outing-requests/pending?limit=50"
          : `/outing-requests?limit=50&userId=${me?.id}`;
      return (await api<OutingRequest[]>(path)).data;
    },
    enabled: !!me,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["outings"] });
    queryClient.invalidateQueries({ queryKey: ["my-status"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/outing-requests/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ note: "Approved" }),
      }),
    onSuccess: () => {
      toast.success("Đã duyệt yêu cầu");
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Duyệt thất bại"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Yêu cầu ra ngoài</h1>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          + Tạo yêu cầu
        </button>
      </div>

      <div className="flex gap-2">
        <button
          className={tab === "mine" ? "btn-primary" : "btn-secondary"}
          onClick={() => setTab("mine")}
        >
          Của tôi
        </button>
        {canApprove && (
          <button
            className={tab === "pending" ? "btn-primary" : "btn-secondary"}
            onClick={() => setTab("pending")}
          >
            Chờ tôi duyệt
          </button>
        )}
      </div>

      {isLoading ? (
        <Skeleton rows={4} />
      ) : (requests ?? []).length === 0 ? (
        <div className="card py-10 text-center text-sm text-gray-500">
          {tab === "pending"
            ? "Không có yêu cầu nào chờ duyệt."
            : "Bạn chưa có yêu cầu ra ngoài nào."}
        </div>
      ) : (
        <div className="space-y-3">
          {(requests ?? []).map((r) => {
            const overdue =
              r.approvalStatus === "APPROVED" &&
              !r.actualReturnTime &&
              new Date(r.expectedReturnTime).getTime() < Date.now();
            return (
              <div key={r.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.purpose}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${OUTING_STATUS_COLORS[r.approvalStatus]}`}
                      >
                        {OUTING_STATUS_LABELS[r.approvalStatus]}
                      </span>
                      {overdue && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          Quá giờ về
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {tab === "pending" && (
                        <span className="font-medium">{r.user.fullName} · </span>
                      )}
                      📍 {r.destinationName}
                      {r.destinationAddress ? ` (${r.destinationAddress})` : ""}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(r.startTime)} →{" "}
                      {formatDateTime(r.expectedReturnTime)}
                      {r.actualReturnTime &&
                        ` · về lúc ${formatDateTime(r.actualReturnTime)}`}
                    </p>
                    {r.rejectReason && (
                      <p className="mt-1 text-xs text-red-600">
                        Lý do từ chối: {r.rejectReason}
                      </p>
                    )}
                    {r.lateReason && (
                      <p className="mt-1 text-xs text-orange-600">
                        Về muộn: {r.lateReason}
                      </p>
                    )}
                    {r.approver && (
                      <p className="mt-1 text-xs text-gray-400">
                        Duyệt bởi {r.approver.fullName}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {tab === "pending" && r.approvalStatus === "PENDING" && (
                      <>
                        <button
                          className="btn-primary"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(r.id)}
                        >
                          Duyệt
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => setRejectTarget(r)}
                        >
                          Từ chối
                        </button>
                      </>
                    )}
                    {tab === "mine" && r.approvalStatus === "APPROVED" && (
                      <button
                        className="btn-primary"
                        onClick={() => setReturnTarget(r)}
                      >
                        Đã quay lại
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateOutingModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          invalidate();
        }}
      />
      <RejectModal
        target={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onDone={() => {
          setRejectTarget(null);
          invalidate();
        }}
      />
      <ReturnModal
        target={returnTarget}
        onClose={() => setReturnTarget(null)}
        onDone={() => {
          setReturnTarget(null);
          invalidate();
        }}
      />
    </div>
  );
}

function CreateOutingModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit() {
    setError(null);
    if (!form.purpose || !form.destinationName || !form.startTime || !form.expectedReturnTime) {
      setError("Vui lòng điền mục đích, điểm đến, giờ đi và giờ về dự kiến");
      return;
    }
    setSubmitting(true);
    try {
      await api("/outing-requests", {
        method: "POST",
        body: JSON.stringify({
          requestType: "CUSTOMER_VISIT",
          purpose: form.purpose,
          destinationName: form.destinationName,
          destinationAddress: form.destinationAddress || undefined,
          startTime: localInputToIso(form.startTime),
          expectedReturnTime: localInputToIso(form.expectedReturnTime),
          note: form.note || undefined,
        }),
      });
      toast.success("Đã tạo yêu cầu — chờ quản lý duyệt");
      setForm({});
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tạo yêu cầu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Tạo yêu cầu ra ngoài" open={open} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label>Mục đích *</label>
          <input
            value={form.purpose ?? ""}
            onChange={(e) => set("purpose", e.target.value)}
            placeholder="Gặp khách hàng"
          />
        </div>
        <div>
          <label>Điểm đến *</label>
          <input
            value={form.destinationName ?? ""}
            onChange={(e) => set("destinationName", e.target.value)}
            placeholder="Company ABC"
          />
        </div>
        <div>
          <label>Địa chỉ</label>
          <input
            value={form.destinationAddress ?? ""}
            onChange={(e) => set("destinationAddress", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label>Giờ đi *</label>
            <input
              type="datetime-local"
              value={form.startTime ?? ""}
              onChange={(e) => set("startTime", e.target.value)}
            />
          </div>
          <div>
            <label>Dự kiến về *</label>
            <input
              type="datetime-local"
              value={form.expectedReturnTime ?? ""}
              onChange={(e) => set("expectedReturnTime", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label>Ghi chú</label>
          <textarea
            rows={2}
            value={form.note ?? ""}
            onChange={(e) => set("note", e.target.value)}
          />
        </div>
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button className="btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? "Đang gửi…" : "Tạo yêu cầu"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RejectModal({
  target,
  onClose,
  onDone,
}: {
  target: OutingRequest | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!target) return;
    if (!reason.trim()) {
      setError("Lý do từ chối là bắt buộc");
      return;
    }
    setSubmitting(true);
    try {
      await api(`/outing-requests/${target.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      toast.success("Đã từ chối yêu cầu");
      setReason("");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Từ chối thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Từ chối yêu cầu" open={target !== null} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          {target?.user.fullName} — {target?.purpose}
        </p>
        <div>
          <label>Lý do từ chối *</label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Không phù hợp thời gian…"
          />
        </div>
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button className="btn-danger" onClick={submit} disabled={submitting}>
            Từ chối
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ReturnModal({
  target,
  onClose,
  onDone,
}: {
  target: OutingRequest | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [resultNote, setResultNote] = useState("");
  const [lateReason, setLateReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isLate = target
    ? new Date(target.expectedReturnTime).getTime() < Date.now()
    : false;

  async function submit() {
    if (!target) return;
    if (isLate && !lateReason.trim()) {
      setError("Bạn về muộn hơn dự kiến — vui lòng nhập lý do");
      return;
    }
    setSubmitting(true);
    try {
      await api(`/outing-requests/${target.id}/return`, {
        method: "POST",
        body: JSON.stringify({
          resultNote: resultNote || undefined,
          lateReason: isLate ? lateReason.trim() : undefined,
        }),
      });
      toast.success("Đã xác nhận quay lại");
      setResultNote("");
      setLateReason("");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xác nhận thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Xác nhận đã quay lại" open={target !== null} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label>Kết quả chuyến đi</label>
          <textarea
            rows={2}
            value={resultNote}
            onChange={(e) => setResultNote(e.target.value)}
            placeholder="Đã gặp khách hàng…"
          />
        </div>
        {isLate && (
          <div>
            <label>Lý do về muộn *</label>
            <input
              value={lateReason}
              onChange={(e) => setLateReason(e.target.value)}
              placeholder="Khách hàng kéo dài cuộc họp…"
            />
          </div>
        )}
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button className="btn-primary" onClick={submit} disabled={submitting}>
            Xác nhận
          </button>
        </div>
      </div>
    </Modal>
  );
}
