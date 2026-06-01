"use client";

import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";

export type ToastTone = "success" | "error" | "warning" | "info";

interface ToastProps {
  tone: ToastTone;
  title?: string;
  message: string;
  onClose?: () => void;
  duration?: number;
  showProgress?: boolean;
}

const toneConfig: Record<
  ToastTone,
  {
    title: string;
    icon: typeof CheckCircle;
    border: string;
    background: string;
    titleColor: string;
    messageColor: string;
    closeColor: string;
    iconColor: string;
  }
> = {
  success: {
    title: "Success",
    icon: CheckCircle,
    border: "1px solid rgba(16,185,129,0.35)",
    background:
      "linear-gradient(135deg, rgba(16,185,129,0.16), rgba(15,23,42,0.94))",
    titleColor: "#d1fae5",
    messageColor: "rgba(209,250,229,0.9)",
    closeColor: "rgba(209,250,229,0.75)",
    iconColor: "#10b981",
  },
  error: {
    title: "Error",
    icon: XCircle,
    border: "1px solid rgba(239,68,68,0.35)",
    background:
      "linear-gradient(135deg, rgba(239,68,68,0.18), rgba(15,23,42,0.94))",
    titleColor: "#fee2e2",
    messageColor: "rgba(254,226,226,0.9)",
    closeColor: "rgba(254,226,226,0.75)",
    iconColor: "#ef4444",
  },
  warning: {
    title: "Warning",
    icon: AlertTriangle,
    border: "1px solid rgba(245,158,11,0.35)",
    background:
      "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(15,23,42,0.94))",
    titleColor: "#fef3c7",
    messageColor: "rgba(254,243,199,0.9)",
    closeColor: "rgba(254,243,199,0.75)",
    iconColor: "#f59e0b",
  },
  info: {
    title: "Info",
    icon: Info,
    border: "1px solid rgba(59,130,246,0.35)",
    background:
      "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(15,23,42,0.94))",
    titleColor: "#dbeafe",
    messageColor: "rgba(219,234,254,0.9)",
    closeColor: "rgba(219,234,254,0.75)",
    iconColor: "#3b82f6",
  },
};

export default function Toast({
  tone,
  title,
  message,
  onClose,
  duration,
  showProgress = false,
}: ToastProps) {
  const config = toneConfig[tone];
  const Icon = config.icon;

  return (
    <>
      <div
        className="card animate-slide-in"
        style={{
          padding: "12px 14px",
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          border: config.border,
          background: config.background,
          boxShadow: "0 18px 40px rgba(2,6,23,0.35)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Icon size={18} style={{ color: config.iconColor, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              color: config.titleColor,
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 2,
            }}
          >
            {title ?? config.title}
          </p>
          <p
            style={{
              color: config.messageColor,
              fontSize: 12,
              lineHeight: 1.45,
            }}
          >
            {message}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: config.closeColor,
              padding: 0,
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        )}
        {showProgress && duration && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 3,
              background: "rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                height: "100%",
                width: "100%",
                background: config.iconColor,
                transformOrigin: "left center",
                animation: `toast-progress-shrink ${duration}ms linear forwards`,
              }}
            />
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes toast-progress-shrink {
          from {
            transform: scaleX(1);
          }

          to {
            transform: scaleX(0);
          }
        }
      `}</style>
    </>
  );
}
