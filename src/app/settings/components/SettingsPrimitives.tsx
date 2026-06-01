"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 42,
        height: 24,
        borderRadius: 12,
        background: checked ? "#2563eb" : "var(--border)",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.2s",
        opacity: disabled ? 0.6 : 1,
        border: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 20 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "white",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label
      style={{
        fontSize: 12,
        color: "var(--text-secondary)",
        marginBottom: 6,
        display: "block",
        fontWeight: 500,
      }}
    >
      {children}
    </label>
  );
}

export function Banner({
  message,
  tone,
}: {
  message: string;
  tone: "success" | "error";
}) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border:
          tone === "success"
            ? "1px solid rgba(16,185,129,0.3)"
            : "1px solid rgba(239,68,68,0.3)",
        background:
          tone === "success"
            ? "rgba(16,185,129,0.1)"
            : "rgba(239,68,68,0.1)",
        color: tone === "success" ? "#10b981" : "#ef4444",
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

export function ActionButton({
  children,
  onClick,
  loading,
  disabled,
  primary,
}: {
  children: ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={primary ? "btn btn-primary" : "btn btn-ghost"}
      onClick={onClick}
      disabled={disabled || loading}
      style={{ padding: "8px 14px", fontSize: 12 }}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : children}
    </button>
  );
}

export function SettingsLoadingPanel() {
  return (
    <div
      className="card"
      style={{
        padding: 24,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <Loader2 size={16} className="animate-spin" />
      Loading settings...
    </div>
  );
}