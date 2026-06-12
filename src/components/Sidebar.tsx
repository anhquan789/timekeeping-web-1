"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

const ITEMS: { href: string; label: string; enabled: boolean }[] = [
  { href: "/", label: "Dashboard", enabled: true },
  { href: "/my-status", label: "My Status", enabled: true },
  { href: "/employees", label: "Employees", enabled: true },
  { href: "/chat", label: "Chat", enabled: true },
  { href: "/outing-requests", label: "Outing Requests", enabled: true },
  { href: "/notifications", label: "Notifications", enabled: true },
  { href: "/departments", label: "Departments", enabled: false },
  { href: "/reports", label: "Reports", enabled: false },
  { href: "/admin", label: "Admin", enabled: false },
];

export default function Sidebar() {
  const pathname = usePathname();

  const { data: unread } = useQuery({
    queryKey: ["unread-count"],
    queryFn: async () =>
      (await api<{ count: number }>("/notifications/unread-count")).data.count,
    refetchInterval: 30_000,
  });

  return (
    <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white md:block">
      <div className="px-4 py-5 text-lg font-bold">Company Status</div>
      <nav className="space-y-0.5 px-2">
        {ITEMS.map((item) =>
          item.enabled ? (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium ${
                pathname === item.href
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span>{item.label}</span>
              {item.href === "/notifications" && (unread ?? 0) > 0 && (
                <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {(unread ?? 0) > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          ) : (
            <span
              key={item.href}
              className="block cursor-not-allowed rounded-md px-3 py-2 text-sm text-gray-300"
              title="Sắp ra mắt"
            >
              {item.label}
            </span>
          )
        )}
      </nav>
    </aside>
  );
}
