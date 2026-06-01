import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const cfg: Record<
    string,
    {
      className: string;
      icon: React.ReactNode;
      label: string;
    }
  > = {
    ONLINE: {
      className: "badge-online",
      icon: <CheckCircle size={10} />,
      label: "Online",
    },
    WARNING: {
      className: "badge-warning",
      icon: <AlertTriangle size={10} />,
      label: "Warning",
    },
    OFFLINE: {
      className: "badge-offline",
      icon: <XCircle size={10} />,
      label: "Offline",
    },
    UNKNOWN: {
      className: "",
      icon: <XCircle size={10} />,
      label: "Unknown",
    },
  };
  const current = cfg[status] || cfg.UNKNOWN;

  return (
    <span
      className={`ui-badge ${current.className}`}
      style={{
        gap: 5,
      }}
    >
      {status === "ONLINE" ? (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "currentColor",
            display: "inline-block",
          }}
          className="animate-pulse-dot"
        />
      ) : (
        current.icon
      )}
      {current.label}
    </span>
  );
}
