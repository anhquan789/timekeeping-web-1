"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Skeleton from "@/components/Skeleton";
import { bootstrapAuth } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    bootstrapAuth().then((ok) => {
      if (cancelled) return;
      if (!ok) {
        router.replace("/login");
      } else {
        setChecking(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking || !user) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <Skeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
