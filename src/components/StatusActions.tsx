"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Modal from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import { localInputToIso } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { CurrentStatus, OutingStatusResponse } from "@/lib/types";

type ActionKey =
  | "start-work"
  | "break"
  | "lunch"
  | "meeting"
  | "outing"
  | "remote-work"
  | "back-to-work"
  | "end-work";

const CAN_PAUSE_FROM = ["WORKING", "REMOTE_WORK"];
const PAUSED = ["BREAK", "LUNCH", "MEETING", "OUTING"];
const ACTIVE = [...CAN_PAUSE_FROM, ...PAUSED];

function isEnabled(action: ActionKey, code: string): boolean {
  switch (action) {
    case "start-work":
      return !ACTIVE.includes(code);
    case "break":
    case "lunch":
    case "meeting":
    case "outing":
      return CAN_PAUSE_FROM.includes(code);
    case "remote-work":
      return code === "NOT_STARTED" || code === "WORKING";
    case "back-to-work":
      return PAUSED.includes(code);
    case "end-work":
      return code === "WORKING" || code === "REMOTE_WORK" || code === "MEETING";
  }
}

const LABELS: Record<ActionKey, string> = {
  "start-work": "Bắt đầu làm việc",
  break: "Nghỉ giải lao",
  lunch: "Ăn trưa",
  meeting: "Họp",
  outing: "Ra ngoài",
  "remote-work": "Làm từ xa",
  "back-to-work": "Quay lại làm việc",
  "end-work": "Kết thúc ngày",
};

export default function StatusActions({ status }: { status: CurrentStatus }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<ActionKey | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openModal(action: ActionKey) {
    setForm({});
    setFormError(null);
    setOpen(action);
  }

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit() {
    if (!open) return;
    setFormError(null);

    const body: Record<string, unknown> = {};
    const needReturnAt = open === "break" || open === "lunch" || open === "outing";

    if (needReturnAt && !form.expectedReturnAt) {
      setFormError("Vui lòng chọn thời gian dự kiến quay lại");
      return;
    }
    if (open === "meeting" && !form.meetingTitle) {
      setFormError("Vui lòng nhập tiêu đề cuộc họp");
      return;
    }
    if (open === "outing" && (!form.purpose || !form.destinationName)) {
      setFormError("Vui lòng nhập mục đích và điểm đến");
      return;
    }
    if (open === "back-to-work" && status.isOverdue && !form.lateReason) {
      setFormError("Bạn quay lại muộn hơn dự kiến — vui lòng nhập lý do");
      return;
    }

    if (form.note) body.note = form.note;
    if (form.expectedReturnAt) {
      body.expectedReturnAt = localInputToIso(form.expectedReturnAt);
    }
    if (open === "start-work" && form.workLocation) body.workLocation = form.workLocation;
    if (open === "meeting") {
      body.meetingTitle = form.meetingTitle;
      if (form.locationName) body.locationName = form.locationName;
    }
    if (open === "outing") {
      body.purpose = form.purpose;
      body.destinationName = form.destinationName;
      if (form.destinationAddress) body.destinationAddress = form.destinationAddress;
    }
    if (open === "remote-work" && form.locationName) body.locationName = form.locationName;
    if (open === "back-to-work" && form.lateReason) body.lateReason = form.lateReason;

    setSubmitting(true);
    try {
      if (open === "outing") {
        const result = await api<OutingStatusResponse>("/statuses/outing", {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (result.data.requiresApproval) {
          toast.info("Đã tạo yêu cầu ra ngoài — chờ quản lý duyệt");
        } else {
          toast.success("Đã chuyển sang trạng thái Ra ngoài");
        }
      } else {
        await api(`/statuses/${open}`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success(`${LABELS[open]} thành công`);
      }
      setOpen(null);
      queryClient.invalidateQueries({ queryKey: ["my-status"] });
      queryClient.invalidateQueries({ queryKey: ["my-timeline"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  }

  const actions: ActionKey[] = [
    "start-work",
    "break",
    "lunch",
    "meeting",
    "outing",
    "remote-work",
    "back-to-work",
    "end-work",
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map((a) => (
          <button
            key={a}
            className={a === "end-work" ? "btn-danger" : "btn-secondary"}
            disabled={!isEnabled(a, status.statusCode)}
            onClick={() => openModal(a)}
          >
            {LABELS[a]}
          </button>
        ))}
      </div>

      <Modal
        title={open ? LABELS[open] : ""}
        open={open !== null}
        onClose={() => setOpen(null)}
      >
        <div className="space-y-3">
          {(open === "break" || open === "lunch" || open === "outing") && (
            <div>
              <label>Dự kiến quay lại *</label>
              <input
                type="datetime-local"
                value={form.expectedReturnAt ?? ""}
                onChange={(e) => set("expectedReturnAt", e.target.value)}
              />
            </div>
          )}
          {open === "meeting" && (
            <>
              <div>
                <label>Tiêu đề cuộc họp *</label>
                <input
                  value={form.meetingTitle ?? ""}
                  onChange={(e) => set("meetingTitle", e.target.value)}
                  placeholder="Họp dự án ABC"
                />
              </div>
              <div>
                <label>Phòng họp</label>
                <input
                  value={form.locationName ?? ""}
                  onChange={(e) => set("locationName", e.target.value)}
                  placeholder="Meeting Room 1"
                />
              </div>
              <div>
                <label>Dự kiến kết thúc</label>
                <input
                  type="datetime-local"
                  value={form.expectedReturnAt ?? ""}
                  onChange={(e) => set("expectedReturnAt", e.target.value)}
                />
              </div>
            </>
          )}
          {open === "outing" && (
            <>
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
            </>
          )}
          {(open === "start-work" || open === "remote-work") && (
            <div>
              <label>Địa điểm làm việc</label>
              <input
                value={
                  (open === "start-work" ? form.workLocation : form.locationName) ?? ""
                }
                onChange={(e) =>
                  set(open === "start-work" ? "workLocation" : "locationName", e.target.value)
                }
                placeholder={open === "remote-work" ? "Home" : "Văn phòng"}
              />
            </div>
          )}
          {open === "back-to-work" && status.isOverdue && (
            <div>
              <label>Lý do quay lại muộn *</label>
              <input
                value={form.lateReason ?? ""}
                onChange={(e) => set("lateReason", e.target.value)}
                placeholder="Cuộc họp kéo dài…"
              />
            </div>
          )}
          <div>
            <label>Ghi chú</label>
            <textarea
              rows={2}
              value={form.note ?? ""}
              onChange={(e) => set("note", e.target.value)}
            />
          </div>

          {formError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setOpen(null)}>
              Hủy
            </button>
            <button className="btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? "Đang gửi…" : "Xác nhận"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
