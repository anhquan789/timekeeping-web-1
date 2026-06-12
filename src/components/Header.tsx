"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, logout } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { CurrentStatus } from "@/lib/types";
import StatusBadge from "./StatusBadge";

export default function Header() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const { data: status } = useQuery({
    queryKey: ["my-status"],
    queryFn: async () => (await api<CurrentStatus>("/statuses/current")).data,
  });

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        {status && (
          <StatusBadge
            code={status.statusCode}
            label={status.statusLabel}
            overdue={status.isOverdue}
          />
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {user?.fullName}
          {user?.role ? ` · ${user.role}` : ""}
        </span>
        <button onClick={handleLogout} className="btn-secondary">
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
