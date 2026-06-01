import type { EnvironmentContainer } from "../../types/environment-container-types";

interface EnvironmentContainersSummaryProps {
  containers: EnvironmentContainer[];
}

export default function EnvironmentContainersSummary({
  containers,
}: EnvironmentContainersSummaryProps) {
  const stats = [
    {
      label: "Apps",
      value: containers.length,
      color: "var(--accent-blue)",
    },
    {
      label: "Running",
      value: containers.filter((container) => container.status === "RUNNING")
        .length,
      color: "var(--accent-green)",
    },
    {
      label: "Stopped",
      value: containers.filter((container) => container.status === "STOPPED")
        .length,
      color: "var(--text-muted)",
    },
    {
      label: "Published Ports",
      value: containers.reduce(
        (count, container) => count + container.ports.length,
        0,
      ),
      color: "var(--accent-cyan)",
    },
  ];

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))",
        gap: 12,
      }}
    >
      {stats.map((stat) => (
        <article
          key={stat.label}
          className="card"
          style={{
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 10,
              height: 36,
              borderRadius: 3,
              background: stat.color,
              opacity: 0.75,
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <strong
              style={{
                display: "block",
                fontSize: 24,
                lineHeight: 1,
                color: "var(--text-primary)",
              }}
            >
              {stat.value}
            </strong>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 3 }}>
              {stat.label}
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}
