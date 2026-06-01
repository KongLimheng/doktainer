"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastTone } from "@/components/Toast";

export interface ToastInput {
  tone: ToastTone;
  title?: string;
  message: string;
  duration?: number;
  showProgress?: boolean;
}

export interface ToastItem extends ToastInput {
  id: string;
}

let toastSequence = 0;

export function useToastManager(defaultDuration = 3000) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    ({ duration, ...toast }: ToastInput) => {
      const id = `toast-${Date.now()}-${toastSequence++}`;
      const nextToast: ToastItem = { id, duration, ...toast };
      setToasts((current) => [...current, nextToast]);

      const timeout = window.setTimeout(() => {
        dismissToast(id);
      }, duration ?? defaultDuration);

      timersRef.current.set(id, timeout);
      return id;
    },
    [defaultDuration, dismissToast],
  );

  const clearToasts = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  useEffect(() => clearToasts, [clearToasts]);

  return {
    toasts,
    pushToast,
    dismissToast,
    clearToasts,
  };
}
