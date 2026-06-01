"use client";

import Toast from "@/components/Toast";
import type { ToastItem } from "@/lib/use-toast-manager";

export type ToastViewportPosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left";

interface ToastViewportProps {
  toasts: ToastItem[];
  onClose: (id: string) => void;
  position?: ToastViewportPosition;
}

const viewportPositionStyle: Record<
  ToastViewportPosition,
  React.CSSProperties
> = {
  "top-right": {
    top: 80,
    right: 20,
  },
  "top-left": {
    top: 80,
    left: 20,
  },
  "bottom-right": {
    bottom: 20,
    right: 20,
  },
  "bottom-left": {
    bottom: 20,
    left: 20,
  },
};

export default function ToastViewport({
  toasts,
  onClose,
  position = "top-right",
}: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 1100,
        width: "calc(100vw - 32px)",
        maxWidth: 360,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
        ...viewportPositionStyle[position],
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: "auto" }}>
          <Toast
            tone={toast.tone}
            title={toast.title}
            message={toast.message}
            duration={toast.duration}
            showProgress={toast.showProgress}
            onClose={() => onClose(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}
