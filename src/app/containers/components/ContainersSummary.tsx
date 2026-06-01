interface ContainersSummaryProps {
  total: number;
  running: number;
  stopped: number;
  pausedAndError: number;
}

export default function ContainersSummary({
  total,
  running,
  stopped,
  pausedAndError,
}: ContainersSummaryProps) {
  const stats = [
    { label: "Total", value: total, color: "#3b82f6" },
    { label: "Running", value: running, color: "#10b981" },
    { label: "Stopped", value: stopped, color: "#64748b" },
    { label: "Paused / Error", value: pausedAndError, color: "#ef4444" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 12,
      }}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="card"
          style={{
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 10,
              height: 36,
              borderRadius: 3,
              background: stat.color,
              opacity: 0.7,
            }}
          />
          <div>
            <p
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1,
              }}
            >
              {stat.value}
            </p>
            <p
              style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}
            >
              {stat.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
