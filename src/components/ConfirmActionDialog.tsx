"use client";

import type { ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

type ConfirmActionDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "info";
  note?: string;
  icon?: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
};

const toneStyles = {
  danger: {
    color: "#ef4444",
    softBackground: "rgba(239,68,68,0.08)",
    strongBackground: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.22)",
    lightBorder: "rgba(239,68,68,0.18)",
  },
  warning: {
    color: "#f59e0b",
    softBackground: "rgba(245,158,11,0.08)",
    strongBackground: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.22)",
    lightBorder: "rgba(245,158,11,0.18)",
  },
  info: {
    color: "#3b82f6",
    softBackground: "rgba(59,130,246,0.08)",
    strongBackground: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.22)",
    lightBorder: "rgba(59,130,246,0.18)",
  },
} as const;

export default function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  note,
  icon,
  onClose,
  onConfirm,
}: ConfirmActionDialogProps) {
  if (!open) {
    return null;
  }

  const palette = toneStyles[tone];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2, 6, 23, 0.68)",
        backdropFilter: "blur(6px)",
        zIndex: 2200,
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "min(100%, 520px)",
          padding: 0,
          overflow: "hidden",
          boxShadow: "0 28px 70px rgba(2, 6, 23, 0.46)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ padding: 28, display: "grid", gap: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: `1px solid ${palette.lightBorder}`,
                    background: palette.softBackground,
                    display: "grid",
                    placeItems: "center",
                    color: palette.color,
                  }}
                >
                  {icon ?? <AlertTriangle size={16} />}
                </div>
                <strong style={{ color: "var(--text-primary)", fontSize: 18 }}>
                  {title}
                </strong>
              </div>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: 14,
                  lineHeight: 1.7,
                  maxWidth: 430,
                }}
              >
                {description}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                alignSelf: "flex-start",
              }}
              aria-label="Close confirmation dialog"
            >
              <X size={18} />
            </button>
          </div>

          {note ? (
            <div
              style={{
                borderRadius: 12,
                border: `1px solid ${palette.lightBorder}`,
                background: palette.softBackground,
                padding: "14px 16px",
                color: palette.color,
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              {note}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
            }}
          >
            <button className="btn" onClick={onClose}>
              {cancelLabel}
            </button>
            <button
              className="btn"
              onClick={onConfirm}
              style={{
                background: palette.strongBackground,
                color: palette.color,
                border: `1px solid ${palette.border}`,
              }}
            >
              {icon ?? <AlertTriangle size={14} />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
