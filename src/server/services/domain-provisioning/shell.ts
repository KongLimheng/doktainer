import { Server } from "@prisma/client";
import { exec } from "../ssh.service";

export function escapeShellArg(value: string): string {
  return `'${value.replace(/'/g, `"'"'`)}'`;
}

export function escapeDoubleQuotedShellArg(value: string): string {
  return `"${value.replace(/[\\"$`]/g, "\\$&")}"`;
}

export function shellCommand(command: string): string {
  return `sh -c ${escapeShellArg(command)}`;
}

export function privilegedShellCommand(
  server: Server,
  command: string,
): string {
  return server.username === "root"
    ? shellCommand(command)
    : `sudo ${shellCommand(command)}`;
}

export async function execPrivileged(
  server: Server,
  script: string,
): Promise<string> {
  const result = await exec(server, privilegedShellCommand(server, script));

  if (result.code !== 0) {
    throw new Error(result.stderr || result.stdout || "Remote command failed");
  }

  return result.stdout;
}

export async function execPrivilegedLoose(
  server: Server,
  script: string,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  const result = await exec(server, privilegedShellCommand(server, script));
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    code: result.code ?? null,
  };
}
