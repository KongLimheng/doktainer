"use client";

import { KeyRound } from "lucide-react";
import type { ServerSystemUser } from "@/lib/api";
import type { UserBadgeTone } from "@/app/servers/components/server-config-utils";

export function ConfigInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 10,
        alignItems: "start",
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          color: "var(--text-primary)",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function UserBadge({
  label,
  tone,
}: {
  label: string;
  tone: UserBadgeTone;
}) {
  const palette = {
    danger: {
      color: "#ef4444",
      background: "rgba(239,68,68,0.08)",
      border: "rgba(239,68,68,0.2)",
    },
    success: {
      color: "#10b981",
      background: "rgba(16,185,129,0.08)",
      border: "rgba(16,185,129,0.2)",
    },
    neutral: {
      color: "var(--text-secondary)",
      background: "var(--bg-input)",
      border: "var(--border)",
    },
    warning: {
      color: "#f59e0b",
      background: "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.2)",
    },
    info: {
      color: "#3b82f6",
      background: "rgba(59,130,246,0.08)",
      border: "rgba(59,130,246,0.2)",
    },
  } as const;
  const style = palette[tone];

  return (
    <span
      className="ui-badge"
      style={{
        color: style.color,
        background: style.background,
        border: `1px solid ${style.border}`,
      }}
    >
      {label}
    </span>
  );
}

export function ServiceStatusBadge({ state }: { state: string }) {
  const normalized = state.toLowerCase();
  const tone =
    normalized === "active"
      ? "success"
      : normalized === "enabled"
        ? "info"
        : normalized === "inactive"
          ? "danger"
          : "warning";

  return <UserBadge label={state} tone={tone} />;
}

export function ServerUserCard({ user }: { user: ServerSystemUser }) {
  const accountLabel = user.isRoot ? "root" : "non-root";
  const accountTone = user.isRoot ? "danger" : "info";

  return (
    <div
      className="card"
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <strong style={{ color: "var(--text-primary)", fontSize: 14 }}>
              {user.username}
            </strong>
            <UserBadge label={accountLabel} tone={accountTone} />
            {user.isSshUser ? (
              <UserBadge label="SSH LOGIN" tone="neutral" />
            ) : null}
          </div>
          <p style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
            UID {user.uid ?? "—"} • GID {user.gid ?? "—"}
          </p>
        </div>
        <KeyRound
          size={16}
          style={{ color: user.isRoot ? "#ef4444" : "#3b82f6" }}
        />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <ConfigInfoRow label="Home" value={user.home ?? "—"} />
        <ConfigInfoRow label="Shell" value={user.shell ?? "—"} />
        <ConfigInfoRow
          label="Groups"
          value={user.groups.length > 0 ? user.groups.join(", ") : "—"}
        />
      </div>
    </div>
  );
}
