import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { SslStatusKey } from "./domain-types";

interface SSLBadgeProps {
  status: SslStatusKey;
}

export default function SSLBadge({ status }: SSLBadgeProps) {
  const cfg: Record<
    SslStatusKey,
    { bg: string; color: string; border: string; label: string }
  > = {
    valid: {
      bg: "rgba(16,185,129,0.1)",
      color: "#10b981",
      border: "rgba(16,185,129,0.3)",
      label: "Valid",
    },
    expiring: {
      bg: "rgba(245,158,11,0.1)",
      color: "#f59e0b",
      border: "rgba(245,158,11,0.3)",
      label: "Expiring",
    },
    expired: {
      bg: "rgba(239,68,68,0.1)",
      color: "#ef4444",
      border: "rgba(239,68,68,0.3)",
      label: "Expired",
    },
    pending: {
      bg: "rgba(139,92,246,0.1)",
      color: "#8b5cf6",
      border: "rgba(139,92,246,0.3)",
      label: "Pending",
    },
    none: {
      bg: "rgba(100,116,139,0.1)",
      color: "#64748b",
      border: "rgba(100,116,139,0.3)",
      label: "No SSL",
    },
  };

  const meta = cfg[status];
  const Icon =
    status === "valid"
      ? CheckCircle
      : status === "expiring" || status === "expired"
        ? AlertTriangle
        : Clock;

  return (
    <span
      style={{
        background: meta.bg,
        color: meta.color,
        border: `1px solid ${meta.border}`,
        padding: "3px 9px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      <Icon size={10} />
      {meta.label}
    </span>
  );
}
