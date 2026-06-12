"use client";

import { getStoredRefreshToken, storeRefreshToken, useAuthStore } from "./auth-store";
import type { Me, PageMeta } from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface ApiResult<T> {
  data: T;
  meta?: PageMeta;
}

let refreshPromise: Promise<boolean> | null = null;

/** Rotates the refresh token; single-flight so parallel 401s refresh once. */
export async function refreshTokens(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) return false;
      try {
        const res = await fetch(`${API_URL}/auth/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const body = await res.json();
        if (!body?.success) return false;
        useAuthStore.getState().setAccessToken(body.data.accessToken);
        storeRefreshToken(body.data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => {
          refreshPromise = null;
        }, 0);
      }
    })();
  }
  return refreshPromise;
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  retryOn401 = true
): Promise<ApiResult<T>> {
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401 && retryOn401) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      return api<T>(path, init, false);
    }
    useAuthStore.getState().clear();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new ApiError("UNAUTHORIZED", "Phiên đăng nhập đã hết hạn", 401);
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // empty body
  }
  if (!res.ok || body?.success === false) {
    throw new ApiError(
      body?.error?.code ?? "ERROR",
      body?.error?.message ?? `Lỗi máy chủ (HTTP ${res.status})`,
      res.status
    );
  }
  return { data: body?.data as T, meta: body?.meta };
}

/** Fetch thô có Authorization (cho upload multipart / download blob). */
export async function authFetch(
  path: string,
  init: RequestInit = {},
  retryOn401 = true
): Promise<Response> {
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401 && retryOn401) {
    const refreshed = await refreshTokens();
    if (refreshed) return authFetch(path, init, false);
  }
  return res;
}

export async function login(email: string, password: string): Promise<Me> {
  const result = await api<{
    user: { id: string };
    accessToken: string;
    refreshToken: string;
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }, false);

  useAuthStore.getState().setAccessToken(result.data.accessToken);
  storeRefreshToken(result.data.refreshToken);

  const me = await api<Me>("/auth/me");
  useAuthStore.getState().setUser(me.data);
  return me.data;
}

export async function logout() {
  const refreshToken = getStoredRefreshToken();
  if (refreshToken) {
    try {
      await api("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }, false);
    } catch {
      // already invalid — vẫn xóa local state
    }
  }
  useAuthStore.getState().clear();
}

/** Khôi phục phiên khi mở trang: dùng refresh token đã lưu. */
export async function bootstrapAuth(): Promise<boolean> {
  const state = useAuthStore.getState();
  if (state.accessToken && state.user) return true;
  const refreshed = await refreshTokens();
  if (!refreshed) return false;
  try {
    const me = await api<Me>("/auth/me", {}, false);
    useAuthStore.getState().setUser(me.data);
    return true;
  } catch {
    return false;
  }
}
