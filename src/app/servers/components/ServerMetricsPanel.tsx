import type { Server as ServerType, ServerMetric } from "@/lib/api";
import { Activity, Cpu, HardDrive, Server, Wifi } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatBytes,
  formatDateTime,
  formatLastUpdated,
  formatUptime,
} from "./server-utils";

type MetricWithNetwork = ServerMetric & {
  networkMbps?: number | string | null;
  networkMbit?: number | string | null;
  networkRxBps?: number | string | null;
  networkTxBps?: number | string | null;
  networkIn?: number | string | null;
  networkOut?: number | string | null;
};

interface ServerMetricsPanelProps {
  server: ServerType;
  history: ServerMetric[];
  loading: boolean;
  error?: string | null;
}

interface ChartPoint {
  label: string;
  timestamp: string;
  cpu: number;
  ram: number;
  disk: number;
  network: number | null;
}

function toFiniteNumber(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractNetworkMbps(metric: ServerMetric): number | null {
  const candidate = metric as MetricWithNetwork;
  const directValue =
    toFiniteNumber(candidate.networkMbps) ??
    toFiniteNumber(candidate.networkMbit);

  if (directValue !== null) {
    return directValue;
  }

  const rxBps =
    toFiniteNumber(candidate.networkRxBps) ??
    toFiniteNumber(candidate.networkIn);
  const txBps =
    toFiniteNumber(candidate.networkTxBps) ??
    toFiniteNumber(candidate.networkOut);

  if (rxBps === null && txBps === null) {
    return null;
  }

  const totalBps = Math.max(0, (rxBps ?? 0) + (txBps ?? 0));
  return totalBps / 125000;
}

function formatChartTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ResourceCard({
  icon,
  label,
  accent,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  accent: string;
  value: string;
  helper: string;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--metrics-border)",
        background: "var(--metrics-surface-strong)",
        borderRadius: 14,
        padding: 16,
        minHeight: 106,
        display: "grid",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--text-secondary)",
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 10,
              display: "grid",
              placeItems: "center",
              background: `${accent}22`,
              color: accent,
            }}
          >
            {icon}
          </span>
          {label}
        </span>
      </div>
      <strong
        style={{
          color: "var(--text-primary)",
          fontSize: 22,
          lineHeight: 1.1,
        }}
      >
        {value}
      </strong>
      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{helper}</span>
    </div>
  );
}

function MetricChart({
  title,
  color,
  suffix,
  dataKey,
  data,
}: {
  title: string;
  color: string;
  suffix: string;
  dataKey: keyof ChartPoint;
  data: ChartPoint[];
}) {
  return (
    <div
      style={{
        border: "1px solid var(--metrics-border)",
        background: "var(--metrics-surface)",
        borderRadius: 14,
        padding: 16,
        minHeight: 220,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {title}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
            Last {data.length} samples
          </p>
        </div>
      </div>
      <div style={{ width: "100%", minWidth: 0, height: 150, minHeight: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient
                id={`gradient-${String(dataKey)}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--metrics-grid)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--metrics-axis)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--metrics-axis)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={42}
              tickFormatter={(value: number) => `${value}${suffix}`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--metrics-tooltip-bg)",
                border: "1px solid var(--metrics-border-muted)",
                borderRadius: 12,
                color: "var(--metrics-tooltip-text)",
              }}
              labelStyle={{ color: "var(--metrics-tooltip-label)" }}
              formatter={(value) => [`${value ?? 0}${suffix}`, title]}
              labelFormatter={(_, payload) => {
                const point = payload?.[0]?.payload as ChartPoint | undefined;
                return point ? formatDateTime(point.timestamp) : "";
              }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${String(dataKey)})`}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function ServerMetricsPanel({
  server,
  history,
  loading,
  error,
}: ServerMetricsPanelProps) {
  const samples =
    history.length > 0 ? history : server.metrics ? [server.metrics] : [];
  const latest = samples.at(-1) ?? server.metrics ?? null;
  const chartData: ChartPoint[] = samples.map((metric) => ({
    label: formatChartTime(metric.recordedAt),
    timestamp: metric.recordedAt,
    cpu: Number(metric.cpuPct.toFixed(1)),
    ram: Number(metric.ramPct.toFixed(1)),
    disk: Number(metric.diskPct.toFixed(1)),
    network: extractNetworkMbps(metric),
  }));
  const hasNetworkData = chartData.some((item) => item.network !== null);
  const latestNetwork =
    [...chartData].reverse().find((item) => item.network !== null)?.network ??
    null;

  if (loading) {
    return (
      <div
        style={{
          padding: 20,
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "var(--text-muted)",
        }}
      >
        <Activity size={16} className="animate-spin" />
        Loading metrics history for {server.name}...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: 20,
          color: "var(--metrics-error-text)",
          fontSize: 13,
          borderRadius: 12,
          border: "1px solid var(--metrics-error-border)",
          background: "var(--metrics-error-bg)",
        }}
      >
        Failed to load metrics history: {error}
      </div>
    );
  }

  if (!latest) {
    return (
      <div
        style={{
          padding: 20,
          color: "var(--text-muted)",
          fontSize: 13,
        }}
      >
        Metrics are not available for this server yet. Run Refresh Metrics to
        collect the first sample.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background: "rgba(59, 130, 246, 0.12)",
                color: "var(--metrics-server-accent)",
              }}
            >
              <Server size={16} />
            </span>
            <div>
              <strong style={{ color: "var(--text-primary)", fontSize: 16 }}>
                {server.name}
              </strong>
              <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                {server.ip}:{server.sshPort}
              </p>
            </div>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            Latest sample {formatLastUpdated(latest.recordedAt)} with{" "}
            {samples.length} point history.
          </p>
        </div>
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--metrics-border)",
            background: "var(--metrics-surface)",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          Uptime {formatUptime(latest.uptimeSec)}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
        }}
      >
        <ResourceCard
          icon={<Cpu size={15} />}
          label="CPU"
          accent="#3b82f6"
          value={`${latest.cpuPct.toFixed(1)}%`}
          helper={`Updated ${formatLastUpdated(latest.recordedAt)}`}
        />
        <ResourceCard
          icon={<Activity size={15} />}
          label="RAM"
          accent="#8b5cf6"
          value={`${latest.ramPct.toFixed(1)}%`}
          helper={`${formatBytes(latest.ramUsed)} / ${formatBytes(latest.ramTotal)}`}
        />
        <ResourceCard
          icon={<HardDrive size={15} />}
          label="Disk"
          accent="#f59e0b"
          value={`${latest.diskPct.toFixed(1)}%`}
          helper={`${formatBytes(latest.diskUsed)} / ${formatBytes(latest.diskTotal)}`}
        />
        <ResourceCard
          icon={<Wifi size={15} />}
          label="Network I/O"
          accent="#06b6d4"
          value={
            latestNetwork !== null
              ? `${latestNetwork.toFixed(2)} Mbit/s`
              : "No data"
          }
          helper={
            latestNetwork !== null
              ? "Live Rx + Tx throughput sample"
              : "No network sample stored for this point"
          }
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        <MetricChart
          title="CPU"
          color="#3b82f6"
          suffix="%"
          dataKey="cpu"
          data={chartData}
        />
        <MetricChart
          title="RAM"
          color="#8b5cf6"
          suffix="%"
          dataKey="ram"
          data={chartData}
        />
        <MetricChart
          title="Disk"
          color="#f59e0b"
          suffix="%"
          dataKey="disk"
          data={chartData}
        />
        {hasNetworkData ? (
          <MetricChart
            title="Network I/O"
            color="#06b6d4"
            suffix=" Mbit/s"
            dataKey="network"
            data={chartData}
          />
        ) : (
          <div
            style={{
              border: "1px dashed var(--metrics-border-muted)",
              borderRadius: 14,
              padding: 18,
              minHeight: 220,
              display: "grid",
              alignContent: "center",
              justifyItems: "center",
              gap: 8,
              color: "var(--text-muted)",
              background: "var(--metrics-surface-soft)",
              textAlign: "center",
            }}
          >
            <Wifi size={18} />
            <strong style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              Network metrics not available yet
            </strong>
            <p style={{ maxWidth: 260, fontSize: 12 }}>
              No historical network throughput has been stored for this server
              yet. Run Refresh Metrics or wait for the next polling cycle to
              collect the first sample.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
