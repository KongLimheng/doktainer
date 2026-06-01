import type { Container, ContainerDetails } from "@/lib/api";
import type {
  RuntimeMount,
  RuntimePortBinding,
  RuntimeProcess,
  RuntimeTabData,
} from "../types/app-detail-types";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRecord(value: unknown, key: string): JsonRecord | null {
  if (!isRecord(value)) return null;
  const next = value[key];
  return isRecord(next) ? next : null;
}

function getString(value: unknown, fallback = "-") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function getBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function formatCommand(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(" ") || "-";
  }

  return getString(value);
}

function formatDateTime(value: unknown) {
  const raw = getString(value, "");
  if (!raw) return "-";

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString();
}

function extractPortPair(portMapping: string): RuntimePortBinding {
  const [hostSide, containerSide] = portMapping.split("->");
  const hostPort = hostSide?.match(/(\d+)$/)?.[1] ?? "-";
  const hostIp = hostSide?.replace(/:?\d+$/, "") || "0.0.0.0";
  const containerPort = containerSide?.match(/(\d+)\/?([a-z]+)?$/i)?.[1] ?? "-";
  const protocol = containerSide?.match(/\/([a-z]+)$/i)?.[1] ?? "tcp";

  return {
    containerPort,
    publicEndpoint: hostPort === "-" ? "-" : `${hostIp}:${hostPort}`,
    protocol: protocol.toUpperCase(),
    mode: "Published",
  };
}

function buildPortsFromInspect(inspect: JsonRecord): RuntimePortBinding[] {
  const networkSettings = getRecord(inspect, "NetworkSettings");
  const ports = getRecord(networkSettings, "Ports");

  if (!ports) return [];

  return Object.entries(ports).flatMap(([containerPort, bindings]) => {
    const [port, protocol = "tcp"] = containerPort.split("/");

    if (!Array.isArray(bindings) || bindings.length === 0) {
      return [
        {
          containerPort: port,
          publicEndpoint: "Internal only",
          protocol: protocol.toUpperCase(),
          mode: "Container",
        },
      ];
    }

    return bindings.map((binding) => {
      const record = isRecord(binding) ? binding : {};
      const hostIp = getString(record.HostIp, "0.0.0.0");
      const hostPort = getString(record.HostPort);

      return {
        containerPort: port,
        publicEndpoint: `${hostIp}:${hostPort}`,
        protocol: protocol.toUpperCase(),
        mode: "Published",
      };
    });
  });
}

function buildMountsFromInspect(inspect: JsonRecord): RuntimeMount[] {
  const mounts = inspect.Mounts;
  if (!Array.isArray(mounts)) return [];

  return mounts.filter(isRecord).map((mount) => ({
    source: getString(mount.Source, getString(mount.Name)),
    target: getString(mount.Destination),
    type: getString(mount.Type, "Volume"),
    access: getBoolean(mount.RW) === false ? "Read only" : "Read / Write",
  }));
}

function buildProcesses(detail: ContainerDetails | null): RuntimeProcess[] {
  if (!detail?.processes.length) return [];

  return detail.processes.map((process) => ({
    pid: process.pid,
    user: process.user,
    command: process.command,
    cpu: process.cpu,
    memory: process.memory,
  }));
}

function buildHealthStatus(detail: ContainerDetails | null) {
  const state = getRecord(detail?.inspect, "State");
  const health = getRecord(state, "Health");
  return getString(health?.Status, detail ? "available" : "unavailable");
}

export function createRuntimeData(
  container: Container,
  detail: ContainerDetails | null,
): RuntimeTabData {
  const inspect = isRecord(detail?.inspect) ? detail.inspect : {};
  const config = getRecord(inspect, "Config");
  const hostConfig = getRecord(inspect, "HostConfig");
  const state = getRecord(inspect, "State");
  const restartPolicy = getRecord(hostConfig, "RestartPolicy");
  const healthStatus = buildHealthStatus(detail);
  const portsFromInspect = buildPortsFromInspect(inspect);
  const ports =
    portsFromInspect.length > 0
      ? portsFromInspect
      : container.ports.map(extractPortPair);
  const mounts = buildMountsFromInspect(inspect);
  const processes = buildProcesses(detail);

  return {
    summaries: [
      {
        label: "Runtime Engine",
        value: "Docker",
        subvalue: `Server: ${detail?.server.name ?? container.server?.name ?? "-"}`,
        tone: "blue",
      },
      {
        label: "Network Mode",
        value: getString(hostConfig?.NetworkMode, "bridge"),
        subvalue: "Container network namespace",
        tone: "cyan",
      },
      {
        label: "Restart Policy",
        value: getString(restartPolicy?.Name, container.restartPolicy || "-"),
        subvalue: "Docker restart behavior",
        tone: "green",
      },
      {
        label: "Runtime State",
        value: getString(state?.Status, container.status).toUpperCase(),
        subvalue:
          detail && container.status === "RUNNING"
            ? "Runtime detail loaded"
            : "Runtime detail unavailable",
        tone: container.status === "RUNNING" ? "green" : "amber",
      },
    ],
    configuration: [
      { label: "Container ID", value: container.dockerId ?? container.id },
      { label: "Image", value: container.image },
      { label: "Entrypoint", value: formatCommand(config?.Entrypoint) },
      { label: "Command", value: formatCommand(config?.Cmd) },
      { label: "Working Dir", value: getString(config?.WorkingDir) },
      { label: "Started At", value: formatDateTime(state?.StartedAt) },
      { label: "Server IP", value: detail?.server.ip ?? container.server?.ip ?? "-" },
    ],
    ports,
    mounts,
    processes,
    healthChecks: [
      {
        name: "Docker health",
        status: healthStatus,
        interval: "From image config",
        lastRun: detail ? "Loaded just now" : "Unavailable",
      },
      {
        name: "Container state",
        status: getString(state?.Status, container.status),
        interval: "On refresh",
        lastRun: detail ? "Loaded just now" : "Unavailable",
      },
      {
        name: "Process table",
        status: processes.length > 0 ? "Available" : "No processes",
        interval: "On refresh",
        lastRun: detail ? "Loaded just now" : "Unavailable",
      },
    ],
    events: [
      {
        time: "now",
        message: detail
          ? "Runtime inspect data loaded from Docker"
          : "Runtime inspect data is unavailable for this container",
        tone: detail ? "success" : "warning",
      },
      {
        time: "now",
        message: `${ports.length} port binding(s) detected`,
        tone: "info",
      },
      {
        time: "now",
        message: `${mounts.length} mount(s) detected`,
        tone: "info",
      },
      {
        time: "now",
        message: `${processes.length} process(es) detected`,
        tone: processes.length > 0 ? "success" : "warning",
      },
    ],
  };
}
