"use client";

import { useToastStore } from "@/lib/toast";

const KIND_CLASSES: Record<string, string> = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-gray-800",
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => remove(t.id)}
          className={`${KIND_CLASSES[t.kind]} max-w-sm rounded-md px-4 py-3 text-left text-sm text-white shadow-lg`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
