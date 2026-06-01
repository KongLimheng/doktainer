import { Server } from "@prisma/client";

import { exec, execIsolated } from "./commands";
import { hasCommand, type CommandExecutor } from "./internal/system";

export interface ServerPlatformInfo {
  distro: string | null;
  packageManager: "apt-get" | "dnf" | "yum" | "zypper" | "apk" | null;
  sudoNonInteractive: boolean;
  supportedForFail2banInstall: boolean;
}

export interface DockerRuntimeStatus {
  installed: boolean;
  daemonRunning: boolean;
  available: boolean;
  version: string | null;
  reason: string | null;
  canInstall: boolean;
  probeFailed?: boolean;
  platform: ServerPlatformInfo;
}

export interface RuntimeProbeOptions {
  isolated?: boolean;
  timeoutMs?: number;
  queueTimeoutMs?: number;
  platform?: ServerPlatformInfo;
}

const DEFAULT_RUNTIME_PROBE_TIMEOUT_MS = 8_000;

export const UNKNOWN_SERVER_PLATFORM: ServerPlatformInfo = {
  distro: null,
  packageManager: null,
  sudoNonInteractive: false,
  supportedForFail2banInstall: false,
};

export function createDockerProbeFailureStatus(
  reason: string,
  platform: ServerPlatformInfo = UNKNOWN_SERVER_PLATFORM,
): DockerRuntimeStatus {
  return {
    installed: false,
    daemonRunning: false,
    available: false,
    version: null,
    reason,
    canInstall: false,
    probeFailed: true,
    platform,
  };
}

function resolveCommandExecutor(
  options: RuntimeProbeOptions = {},
): CommandExecutor {
  const timeoutMs = options.timeoutMs ?? DEFAULT_RUNTIME_PROBE_TIMEOUT_MS;
  const queueTimeoutMs = options.queueTimeoutMs ?? timeoutMs;

  if (!options.isolated) {
    return (server, command) =>
      exec(server, command, { timeoutMs, queueTimeoutMs });
  }

  return (server, command) =>
    execIsolated(server, command, { timeoutMs });
}

export async function detectServerPlatform(
  server: Server,
  options: RuntimeProbeOptions = {},
): Promise<ServerPlatformInfo> {
  const executor = resolveCommandExecutor(options);
  const [osRelease, aptGet, dnf, yum, zypper, apk, sudoCheck] =
    await Promise.all([
      executor(
        server,
        "cat /etc/os-release 2>/dev/null | grep '^PRETTY_NAME=' | cut -d= -f2- | tr -d '\"'",
      ),
      hasCommand(server, "apt-get", executor),
      hasCommand(server, "dnf", executor),
      hasCommand(server, "yum", executor),
      hasCommand(server, "zypper", executor),
      hasCommand(server, "apk", executor),
      server.username === "root"
        ? Promise.resolve(true)
        : executor(server, "sudo -n true >/dev/null 2>&1"),
    ]);

  const packageManager = aptGet
    ? "apt-get"
    : dnf
      ? "dnf"
      : yum
        ? "yum"
        : zypper
          ? "zypper"
          : apk
            ? "apk"
            : null;

  const sudoNonInteractive =
    server.username === "root"
      ? true
      : !!sudoCheck && typeof sudoCheck !== "boolean"
        ? sudoCheck.code === 0
        : false;

  return {
    distro: osRelease.stdout.trim() || null,
    packageManager,
    sudoNonInteractive,
    supportedForFail2banInstall:
      !!packageManager && (server.username === "root" || sudoNonInteractive),
  };
}

function normalizeDockerError(output: string): string {
  const trimmed = output.trim();
  if (!trimmed) {
    return "Docker is not ready on this server";
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes("cannot connect to the docker daemon")) {
    return "Docker is installed but the daemon is not running";
  }

  if (lower.includes("permission denied")) {
    return "Docker is installed but the current SSH user cannot access the Docker daemon";
  }

  return trimmed;
}

export async function getDockerRuntimeStatus(
  server: Server,
  options: RuntimeProbeOptions = {},
): Promise<DockerRuntimeStatus> {
  const executor = resolveCommandExecutor(options);
  const platform =
    options.platform ?? (await detectServerPlatform(server, options));
  const installed = await hasCommand(server, "docker", executor);

  if (!installed) {
    return {
      installed: false,
      daemonRunning: false,
      available: false,
      version: null,
      reason: "Docker CLI was not found on this server",
      canInstall:
        !!platform.packageManager &&
        (server.username === "root" || platform.sudoNonInteractive),
      platform,
    };
  }

  const directResult = await executor(
    server,
    "docker info --format '{{.ServerVersion}}' 2>&1",
  );

  if (directResult.code === 0) {
    return {
      installed: true,
      daemonRunning: true,
      available: true,
      version: directResult.stdout.trim() || null,
      reason: null,
      canInstall: false,
      platform,
    };
  }

  if (server.username !== "root" && platform.sudoNonInteractive) {
    const sudoResult = await executor(
      server,
      `sudo -n docker info --format '{{.ServerVersion}}' 2>&1`,
    );

    if (sudoResult.code === 0) {
      return {
        installed: true,
        daemonRunning: true,
        available: true,
        version: sudoResult.stdout.trim() || null,
        reason: null,
        canInstall: false,
        platform,
      };
    }

    return {
      installed: true,
      daemonRunning: false,
      available: false,
      version: null,
      reason: normalizeDockerError(sudoResult.stderr || sudoResult.stdout),
      canInstall: false,
      platform,
    };
  }

  return {
    installed: true,
    daemonRunning: false,
    available: false,
    version: null,
    reason: normalizeDockerError(directResult.stderr || directResult.stdout),
    canInstall: false,
    platform,
  };
}
