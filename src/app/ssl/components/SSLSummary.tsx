import { Lock } from "lucide-react";

interface SSLSummaryProps {
  stats: {
    total: number;
    valid: number;
    expiring: number;
    pendingDomains: number;
  };
}

export default function SSLSummary({ stats }: SSLSummaryProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 12,
      }}
    >
      {[
        { label: "Total Certs", value: stats.total, color: "#3b82f6" },
        { label: "Valid", value: stats.valid, color: "#10b981" },
        { label: "Expiring Soon", value: stats.expiring, color: "#f59e0b" },
        { label: "Needs SSL", value: stats.pendingDomains, color: "#f97316" },
      ].map((item) => (
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
            <Lock size={18} style={{ color: item.color }} />
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
      ))}
    </div>
  );
}