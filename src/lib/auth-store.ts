"use client";

import { create } from "zustand";
import type { Me } from "./types";

const REFRESH_TOKEN_KEY = "tk_refresh_token";

interface AuthState {
  accessToken: string | null;
  user: Me | null;
  setAccessToken: (token: string | null) => void;
  setUser: (user: Me | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clear: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    set({ accessToken: null, user: null });
  },
}));

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeRefreshToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
}
