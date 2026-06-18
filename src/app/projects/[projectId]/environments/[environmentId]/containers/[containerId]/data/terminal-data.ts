import type { Container, ContainerDetails } from "@/lib/api";
import type { TerminalTabData } from "../types/app-detail-types";

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

function formatCommand(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(" ") || "-";
  }

  return getString(value);
}

export function createTerminalData(
  container: Container,
  detail: ContainerDetails | null,
): TerminalTabData {
  const inspect = isRecord(detail?.inspect) ? detail.inspect : {};
  const config = getRecord(inspect, "Config");
  const state = getRecord(inspect, "State");
  const workingDirectory = getString(config?.WorkingDir, "/");
  const shell = "/bin/sh";
  const isRunning = container.status === "RUNNING";

  return {
    serverId: container.serverId,
    execTarget: container.dockerId || container.name,
    summaries: [
      {
        label: "Session State",
        value: isRunning ? "Ready" : "Unavailable",
        subvalue: isRunning
          ? "Container can accept exec sessions"
          : "Start the container before opening terminal",
        tone: isRunning ? "green" : "amber",
      },
      {
        label: "Shell",
        value: shell,
        subvalue: "Default command shell",
        tone: "blue",
      },
      {
        label: "Working Dir",
        value: workingDirectory,
        subvalue: "Initial terminal path",
        tone: "cyan",
      },
      {
        label: "Processes",
        value: String(detail?.stats.pids ?? 0),
        subvalue: "Runtime process count",
        tone: "purple",
      },
    ],
    canExecute: isRunning,
    shell,
    workingDirectory,
    user: "root",
    prompt: `${container.name}:${workingDirectory}$`,
    output: [
      `Connected to ${container.name}`,
      `Container status: ${container.status}`,
      `Image: ${container.image}`,
      `Shell: ${shell}`,
      `Working directory: ${workingDirectory}`,
      isRunning
        ? "Ready. Run a command to execute it inside this container."
        : "Container is not running. Start the container before executing commands.",
    ],
    presets: [
      {
        id: "pwd",
        label: "Current Path",
        command: "pwd",
        description: "Print the current working directory.",
        tone: "safe",
      },
      {
        id: "env",
        label: "List Env",
        command: "printenv | sort",
        description: "Inspect runtime environment variables.",
        tone: "safe",
      },
      {
        id: "logs",
        label: "List Files",
        command: "ls -la",
        description: "List files in the current working directory.",
        tone: "safe",
      },
      {
        id: "processes",
        label: "Processes",
        command: "ps aux",
        description: "Inspect running processes inside the container.",
        tone: "safe",
      },
    ],
    history: [],
    environment: [
      { label: "Container ID", value: container.dockerId ?? container.id },
      { label: "Entrypoint", value: formatCommand(config?.Entrypoint) },
      { label: "Command", value: formatCommand(config?.Cmd) },
      { label: "Started At", value: getString(state?.StartedAt) },
    ],
    warnings: [
      "Terminal access should be limited to trusted operators.",
      "Commands that change files or processes may require restart/rebuild afterward.",
    ],
  };
}
