import { Ban, Flame, Lock, RefreshCw, Shield } from "lucide-react";
import type { SecuritySummaryData } from "./security-types";

interface SecuritySummaryProps {
  summary: SecuritySummaryData;
}

export default function SecuritySummary({ summary }: SecuritySummaryProps) {
  const items = [
    {
      label: "Servers Secured",
      value: `${summary.secured}/${summary.totalServers}`,
      color: "#10b981",
      icon: Shield,
    },
    {
      label: "Firewall Rules",
      value: summary.totalRules,
      color: "#f59e0b",
      icon: Flame,
    },
    {
      label: "IPs Banned",
      value: summary.bannedIps,
      color: "#ef4444",
      icon: Ban,
    },
    {
      label: "Fail2ban Active",
      value: summary.fail2banActive,
      color: "#8b5cf6",
      icon: Lock,
    },
    {
      label: "Realtime Poll",
      value: "15s",
      color: "#3b82f6",
      icon: RefreshCw,
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
