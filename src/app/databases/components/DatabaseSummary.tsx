import { Activity, CheckCircle, Database, HardDrive } from "lucide-react";

interface DatabaseSummaryProps {
  total: number;
  running: number;
  serverCount: number;
  typeCount: number;
}

export default function DatabaseSummary({
  total,
  running,
  serverCount,
  typeCount,
}: DatabaseSummaryProps) {
  const stats = [
    {
      label: "Total DBs",
      value: total,
      color: "#3b82f6",
      icon: Database,
    },
    {
      label: "Running",
      value: running,
      color: "#10b981",
      icon: CheckCircle,
    },
    {
      label: "Servers Used",
      value: serverCount,
      color: "#8b5cf6",
      icon: HardDrive,
    },
    {
      label: "DB Types",
      value: typeCount,
      color: "#f59e0b",
      icon: Activity,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 12,
      }}
    >
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
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
                background: `${s.color}15`,
                border: `1px solid ${s.color}25`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={18} style={{ color: s.color }} />
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
                {s.value}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 3,
                }}
              >
                {s.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
