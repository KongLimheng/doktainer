import type { ReactNode } from "react";

interface ContainerStatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  subvalue?: string;
}

export default function ContainerStatCard({
  icon,
  label,
  value,
  subvalue,
}: ContainerStatCardProps) {
  return (
    <div
      style={{
        background: "var(--bg-input)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {label}
        </span>
        <span style={{ color: "var(--accent)" }}>{icon}</span>
      </div>
      <div
        style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 700 }}
      >
        {value}
      </div>
      {subvalue ? (
        <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
          {subvalue}
        </div>
      ) : null}
    </div>
  );
}