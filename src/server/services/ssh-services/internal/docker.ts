import { Server } from "@prisma/client";
import type { SSHExecCommandResponse } from "node-ssh";

import { exec } from "../commands";
import { detectServerPlatform } from "../platform";

function shouldRetryDockerWithSudo(output: string): boolean {
  const lower = output.toLowerCase();
  return (
    lower.includes("permission denied") ||
    lower.includes("docker.sock") ||
    lower.includes("you must be root")
  );
}

export async function execDocker(
  server: Server,
  command: string,
  options: { timeoutMs?: number; queueTimeoutMs?: number } = {},
): Promise<SSHExecCommandResponse> {
  const directResult = await exec(server, command, options);
  if (directResult.code === 0 || server.username === "root") {
    return directResult;
  }

  const output = `${directResult.stderr || ""}\n${directResult.stdout || ""}`;
  if (!shouldRetryDockerWithSudo(output)) {
    return directResult;
  }

  const platform = await detectServerPlatform(server);
  if (!platform.sudoNonInteractive) {
    return directResult;
  }

  const sudoResult = await exec(server, `sudo -n ${command}`, options);
  return sudoResult.code === 0 ? sudoResult : directResult;
}

export async function execDockerStrict(
  server: Server,
  command: string,
  options: { timeoutMs?: number; queueTimeoutMs?: number } = {},
): Promise<string> {
  const result = await execDocker(server, command, options);
  if (result.code !== 0) {
    throw new Error(`Command failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}
