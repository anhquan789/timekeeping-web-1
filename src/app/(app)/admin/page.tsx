"use client";

import { useState } from "react";
import AuditTab from "@/components/admin/AuditTab";
import RolesTab from "@/components/admin/RolesTab";
import SettingsTab from "@/components/admin/SettingsTab";
import StatusConfigsTab from "@/components/admin/StatusConfigsTab";
import UsersTab from "@/components/admin/UsersTab";
import { useAuthStore } from "@/lib/auth-store";

type Tab = "users" | "roles" | "status-configs" | "settings" | "audit";

export default function AdminPage() {
  const me = useAuthStore((s) => s.user);
  const perms = me?.permissions ?? [];

  const tabs: { key: Tab; label: string; allowed: boolean }[] = [
    { key: "users", label: "Nhân viên", allowed: perms.includes("user.create") || perms.includes("user.update.any") },
    { key: "roles", label: "Role & quyền", allowed: perms.includes("role.manage") },
    { key: "status-configs", label: "Trạng thái", allowed: perms.includes("settings.manage") },
    { key: "settings", label: "Cấu hình", allowed: perms.includes("settings.manage") },
    { key: "audit", label: "Audit log", allowed: perms.includes("audit.read") },
  ];
  const allowedTabs = tabs.filter((t) => t.allowed);
  const [tab, setTab] = useState<Tab>(allowedTabs[0]?.key ?? "users");

  if (allowedTabs.length === 0) {
    return (
      <div className="card py-10 text-center text-sm text-gray-500">
        Bạn không có quyền truy cập trang quản trị.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Quản trị</h1>
      <div className="flex flex-wrap gap-2">
        {allowedTabs.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "btn-primary" : "btn-secondary"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "users" && <UsersTab />}
      {tab === "roles" && <RolesTab />}
      {tab === "status-configs" && <StatusConfigsTab />}
      {tab === "settings" && <SettingsTab />}
      {tab === "audit" && <AuditTab />}
    </div>
  );
}
