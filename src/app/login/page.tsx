"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Vui lòng nhập email và mật khẩu");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? "Email hoặc mật khẩu không đúng"
            : err.status === 429
              ? "Đăng nhập sai quá nhiều lần, tài khoản tạm khóa. Thử lại sau."
              : err.message
        );
      } else {
        setError("Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <h1 className="mb-1 text-xl font-bold">Company Status System</h1>
        <p className="mb-6 text-sm text-gray-500">
          Đăng nhập bằng tài khoản công ty
        </p>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
      </div>
    </main>
  );
}
