import type { AppMetric } from "../../types/app-detail-types";
import AppMetricCard from "./AppMetricCard";

interface AppMetricsGridProps {
  metrics: AppMetric[];
}

export default function AppMetricsGrid({ metrics }: AppMetricsGridProps) {
  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))",
        gap: 10,
        minWidth: 0,
      }}
    >
      {metrics.map((metric) => (
        <AppMetricCard key={metric.label} metric={metric} />
      ))}
    </section>
  );
}
