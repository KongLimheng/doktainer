import {
  AlertTriangle,
  CheckCircle,
  Globe,
  Lock,
  LucideIcon,
} from "lucide-react";

interface DomainStatsProps {
  total: number;
  active: number;
  sslValid: number;
  sslExpiring: number;
}

type StatItem = {
  label: string;
  value: number;
  color: string;
  icon: LucideIcon;
};

export default function DomainStats({
  total,
  active,
  sslValid,
  sslExpiring,
}: DomainStatsProps) {
  const items: StatItem[] = [
    {
      label: "Total Domains",
      value: total,
      color: "#3b82f6",
      icon: Globe,
    },
    {
      label: "Active",
      value: active,
      color: "#10b981",
      icon: CheckCircle,
    },
    {
      label: "SSL Valid",
      value: sslValid,
      color: "#8b5cf6",
      icon: Lock,
    },
    {
      label: "SSL Expiring",
      value: sslExpiring,
      color: "#f59e0b",
      icon: AlertTriangle,
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
