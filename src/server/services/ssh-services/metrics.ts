import { Server } from "@prisma/client";
import type { NodeSSH } from "node-ssh";

import { getConnection, withIsolatedConnection } from "./connection";

export interface SystemMetrics {
  cpuPct: number;
  ramPct: number;
  diskPct: number;
  ramUsed: bigint;
  ramTotal: bigint;
  diskUsed: bigint;
  diskTotal: bigint;
  networkRxBps: bigint;
  networkTxBps: bigint;
  uptimeSec: bigint;
  os: string;
}

const NETWORK_BYTES_COMMAND =
  "awk -F'[: ]+' 'NR>2 && $1 != \"lo\" { rx += $3; tx += $11 } END { print rx+0, tx+0 }' /proc/net/dev";
const CPU_STAT_COMMAND = "awk '/^cpu / {print}' /proc/stat";
const MEMORY_COMMAND =
  "awk '/^MemTotal:/ { total=$2 * 1024 } /^MemAvailable:/ { available=$2 * 1024 } END { print total+0, total-available }' /proc/meminfo";

function parseBigIntPair(output: string): [bigint, bigint] {
  const [leftRaw = "0", rightRaw = "0"] = output.trim().split(/\s+/, 2);

  return [BigInt(leftRaw || "0"), BigInt(rightRaw || "0")];
}

function diffCounter(start: bigint, end: bigint): bigint {
  return end >= start ? end - start : 0n;
}

function parseCpuStat(output: string): bigint[] {
  return output
    .trim()
    .split(/\s+/)
    .slice(1)
    .map((value) => BigInt(value || "0"));
}

function sumCpuFields(fields: bigint[]): bigint {
  return fields.reduce((total, value) => total + value, 0n);
}

function calculateCpuPct(start: bigint[], end: bigint[]): number {
  const startTotal = sumCpuFields(start);
  const endTotal = sumCpuFields(end);
  const totalDiff = endTotal - startTotal;
  if (totalDiff <= 0n) return 0;

  const startIdle = (start[3] ?? 0n) + (start[4] ?? 0n);
  const endIdle = (end[3] ?? 0n) + (end[4] ?? 0n);
  const idleDiff = endIdle >= startIdle ? endIdle - startIdle : 0n;
  const busyDiff = totalDiff > idleDiff ? totalDiff - idleDiff : 0n;

  return Math.min(100, Math.max(0, (Number(busyDiff) / Number(totalDiff)) * 100));
}

async function collectMetricsFromConnection(
  ssh: NodeSSH,
): Promise<SystemMetrics> {
  // Parallel execution for speed
  const [cpuStartOut, memOut, diskOut, uptimeOut, osOut, networkStartOut] =
    await Promise.all([
      ssh.execCommand(CPU_STAT_COMMAND),
      ssh.execCommand(MEMORY_COMMAND),
      ssh.execCommand("df -B1 / | awk 'NR==2{print $2, $3}'"),
      ssh.execCommand("cat /proc/uptime | awk '{print int($1)}'"),
      ssh.execCommand(
        "cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"'",
      ),
      ssh.execCommand(NETWORK_BYTES_COMMAND),
    ]);

  await new Promise((resolve) => setTimeout(resolve, 1000));
  const [cpuEndOut, networkEndOut] = await Promise.all([
    ssh.execCommand(CPU_STAT_COMMAND),
    ssh.execCommand(NETWORK_BYTES_COMMAND),
  ]);

  const cpuPct = calculateCpuPct(
    parseCpuStat(cpuStartOut.stdout),
    parseCpuStat(cpuEndOut.stdout),
  );

  const [ramTotal, ramUsed] = memOut.stdout.trim().split(" ").map(BigInt);

  const [diskTotal, diskUsed] = diskOut.stdout.trim().split(" ").map(BigInt);
  const [networkRxStart, networkTxStart] = parseBigIntPair(
    networkStartOut.stdout,
  );
  const [networkRxEnd, networkTxEnd] = parseBigIntPair(networkEndOut.stdout);

  const uptimeSec = BigInt(uptimeOut.stdout.trim() || "0");
  const os = osOut.stdout.trim() || "Linux";

  const ramPct = ramTotal > 0n ? Number((ramUsed * 100n) / ramTotal) : 0;
  const diskPct = diskTotal > 0n ? Number((diskUsed * 100n) / diskTotal) : 0;
  const networkRxBps = diffCounter(networkRxStart, networkRxEnd);
  const networkTxBps = diffCounter(networkTxStart, networkTxEnd);

  return {
    cpuPct,
    ramPct,
    diskPct,
    ramUsed,
    ramTotal,
    diskUsed,
    diskTotal,
    networkRxBps,
    networkTxBps,
    uptimeSec,
    os,
  };
}

/**
 * Collect CPU, RAM, Disk, Uptime metrics via SSH
 */
export async function collectMetrics(
  server: Server,
  options?: { isolated?: boolean },
): Promise<SystemMetrics> {
  if (options?.isolated) {
    return withIsolatedConnection(server, collectMetricsFromConnection);
  }

  const ssh = await getConnection(server);
  return collectMetricsFromConnection(ssh);
}

/**
 * Format uptime seconds into "Xd Yh" string
 */
export function formatUptime(seconds: bigint): string {
  const s = Number(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
