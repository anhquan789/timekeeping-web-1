"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Skeleton from "@/components/Skeleton";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/lib/toast";

type SystemSettings = {
  workStartTime: string;
  workEndTime: string;
  defaultLunchMinutes: number;
  defaultBreakMinutes: number;
  outingRequiresApproval: boolean;
  allowDirectChat: boolean;
  allowGroupChat: boolean;
  allowDepartmentChat: boolean;
  messageEditLimitMinutes: number;
  messageRecallLimitMinutes: number;
  fileMaxSizeMb: number;
  loginMaxFailedAttempts: number;
  loginLockMinutes: number;
};

type FormState = {
  workStartTime: string;
  workEndTime: string;
  defaultLunchMinutes: string;
  defaultBreakMinutes: string;
  outingRequiresApproval: boolean;
  allowDirectChat: boolean;
  allowGroupChat: boolean;
  allowDepartmentChat: boolean;
  messageEditLimitMinutes: string;
  messageRecallLimitMinutes: string;
  fileMaxSizeMb: string;
  loginMaxFailedAttempts: string;
  loginLockMinutes: string;
};

function toForm(s: SystemSettings): FormState {
  return {
    workStartTime: s.workStartTime,
    workEndTime: s.workEndTime,
    defaultLunchMinutes: String(s.defaultLunchMinutes),
    defaultBreakMinutes: String(s.defaultBreakMinutes),
    outingRequiresApproval: s.outingRequiresApproval,
    allowDirectChat: s.allowDirectChat,
    allowGroupChat: s.allowGroupChat,
    allowDepartmentChat: s.allowDepartmentChat,
    messageEditLimitMinutes: String(s.messageEditLimitMinutes),
    messageRecallLimitMinutes: String(s.messageRecallLimitMinutes),
    fileMaxSizeMb: String(s.fileMaxSizeMb),
    loginMaxFailedAttempts: String(s.loginMaxFailedAttempts),
    loginLockMinutes: String(s.loginLockMinutes),
  };
}

export default function SettingsTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () =>
      (await api<SystemSettings>("/admin/system-settings")).data,
  });

  useEffect(() => {
    if (settings && !form) {
      setForm(toForm(settings));
    }
  }, [settings, form]);

  function setStr(field: keyof FormState, value: string) {
    setForm((f) => f ? { ...f, [field]: value } : f);
    setDirty(true);
  }

  function setBool(field: keyof FormState, value: boolean) {
    setForm((f) => f ? { ...f, [field]: value } : f);
    setDirty(true);
  }

  async function save() {
    if (!form) return;
    setSubmitting(true);
    try {
      await api("/admin/system-settings", {
        method: "PATCH",
        body: JSON.stringify({
          workStartTime: form.workStartTime || undefined,
          workEndTime: form.workEndTime || undefined,
          defaultLunchMinutes: form.defaultLunchMinutes ? Number(form.defaultLunchMinutes) : undefined,
          defaultBreakMinutes: form.defaultBreakMinutes ? Number(form.defaultBreakMinutes) : undefined,
          outingRequiresApproval: form.outingRequiresApproval,
          allowDirectChat: form.allowDirectChat,
          allowGroupChat: form.allowGroupChat,
          allowDepartmentChat: form.allowDepartmentChat,
          messageEditLimitMinutes: form.messageEditLimitMinutes ? Number(form.messageEditLimitMinutes) : undefined,
          messageRecallLimitMinutes: form.messageRecallLimitMinutes ? Number(form.messageRecallLimitMinutes) : undefined,
          fileMaxSizeMb: form.fileMaxSizeMb ? Number(form.fileMaxSizeMb) : undefined,
          loginMaxFailedAttempts: form.loginMaxFailedAttempts ? Number(form.loginMaxFailedAttempts) : undefined,
          loginLockMinutes: form.loginLockMinutes ? Number(form.loginLockMinutes) : undefined,
        }),
      });
      toast.success("Đã lưu cấu hình hệ thống");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || !form) return <Skeleton rows={8} />;

  return (
    <div className="space-y-6">
      <Section title="Giờ làm việc">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Giờ bắt đầu (HH:mm)">
            <input
              type="time"
              value={form.workStartTime}
              onChange={(e) => setStr("workStartTime", e.target.value)}
            />
          </Field>
          <Field label="Giờ kết thúc (HH:mm)">
            <input
              type="time"
              value={form.workEndTime}
              onChange={(e) => setStr("workEndTime", e.target.value)}
            />
          </Field>
          <Field label="Nghỉ trưa mặc định (phút)">
            <input
              type="number"
              min={0}
              value={form.defaultLunchMinutes}
              onChange={(e) => setStr("defaultLunchMinutes", e.target.value)}
            />
          </Field>
          <Field label="Giải lao mặc định (phút)">
            <input
              type="number"
              min={0}
              value={form.defaultBreakMinutes}
              onChange={(e) => setStr("defaultBreakMinutes", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Yêu cầu ra ngoài">
        <Toggle
          label="Yêu cầu duyệt khi ra ngoài"
          description="Nếu bật, nhân viên phải chờ manager duyệt trước khi chuyển sang trạng thái OUTING"
          value={form.outingRequiresApproval}
          onChange={(v) => setBool("outingRequiresApproval", v)}
        />
      </Section>

      <Section title="Chat">
        <div className="space-y-3">
          <Toggle
            label="Cho phép chat cá nhân (direct)"
            value={form.allowDirectChat}
            onChange={(v) => setBool("allowDirectChat", v)}
          />
          <Toggle
            label="Cho phép tạo chat nhóm"
            value={form.allowGroupChat}
            onChange={(v) => setBool("allowGroupChat", v)}
          />
          <Toggle
            label="Cho phép chat phòng ban"
            value={form.allowDepartmentChat}
            onChange={(v) => setBool("allowDepartmentChat", v)}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Field label="Thời gian sửa tin nhắn (phút)">
            <input
              type="number"
              min={0}
              value={form.messageEditLimitMinutes}
              onChange={(e) => setStr("messageEditLimitMinutes", e.target.value)}
            />
          </Field>
          <Field label="Thời gian thu hồi tin nhắn (phút)">
            <input
              type="number"
              min={0}
              value={form.messageRecallLimitMinutes}
              onChange={(e) => setStr("messageRecallLimitMinutes", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Upload file">
        <div className="w-48">
          <Field label="Dung lượng tối đa (MB)">
            <input
              type="number"
              min={1}
              value={form.fileMaxSizeMb}
              onChange={(e) => setStr("fileMaxSizeMb", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Bảo mật đăng nhập">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Số lần sai tối đa trước khi khóa">
            <input
              type="number"
              min={1}
              value={form.loginMaxFailedAttempts}
              onChange={(e) => setStr("loginMaxFailedAttempts", e.target.value)}
            />
          </Field>
          <Field label="Thời gian khóa (phút)">
            <input
              type="number"
              min={1}
              value={form.loginLockMinutes}
              onChange={(e) => setStr("loginLockMinutes", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <div className="flex justify-end">
        <button
          className="btn-primary"
          onClick={save}
          disabled={submitting || !dirty}
        >
          {submitting ? "Đang lưu…" : "Lưu cấu hình"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-600">{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <div className="relative mt-0.5 inline-flex">
        <input
          type="checkbox"
          className="sr-only"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={`h-5 w-9 rounded-full transition-colors ${value ? "bg-blue-600" : "bg-gray-300"}`}
        />
        <div
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </div>
      <span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-gray-500">{description}</span>
        )}
      </span>
    </label>
  );
}
