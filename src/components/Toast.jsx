"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

const ToastContext = createContext(null);

let counter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = "success") => {
    const id = ++counter;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  const cfg = {
    success: { icon: "circle-check-big", ring: "text-brand-600", text: "text-slate-700" },
    info: { icon: "info", ring: "text-sky-600", text: "text-slate-700" },
    error: { icon: "triangle-alert", ring: "text-rose-600", text: "text-slate-700" },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex animate-fade-in items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg"
          >
            <Icon name={cfg[t.type].icon} size={18} className={cfg[t.type].ring} />
            <p className={cn("text-sm font-medium", cfg[t.type].text)}>{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
