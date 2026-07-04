import { Activity, CheckCircle, Server, XCircle } from "lucide-react";

interface ServersSummaryProps {
  counts: {
    total: number;
    online: number;
    offline: number;
    containers: number;
  };
}

export default function ServersSummary({ counts }: ServersSummaryProps) {
  const items = [
    {
      label: "Total Servers",
      value: counts.total,
      color: "#3b82f6",
      icon: Server,
    },
    {
      label: "Online",
      value: counts.online,
      color: "#10b981",
      icon: CheckCircle,
    },
    {
      label: "Offline",
      value: counts.offline,
      color: "#ef4444",
      icon: XCircle,
    },
    {
      label: "Total Containers",
      value: counts.containers,
      color: "#8b5cf6",
      icon: Activity,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
      }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="card"
            style={{
              padding: 16,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: `${item.color}15`,
                border: `1px solid ${item.color}25`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={18} style={{ color: item.color }} />
            </div>
            <div>
              <p
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1,
                }}
              >
                {item.value}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 3,
                }}
              >
                {item.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
