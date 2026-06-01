import { Server } from "@prisma/client";
import { exec } from "../ssh.service";
import {
  escapeDoubleQuotedShellArg,
  execPrivileged,
  execPrivilegedLoose,
  shellCommand,
} from "./shell";

export async function pathExists(
  server: Server,
  filePath: string,
): Promise<boolean> {
  const result = await exec(
    server,
    shellCommand(
      `[ -e ${escapeDoubleQuotedShellArg(filePath)} ] && printf yes || printf no`,
    ),
  );

  return (result.stdout || "").trim() === "yes";
}

export async function pathExistsPrivileged(
  server: Server,
  filePath: string,
): Promise<boolean> {
  const result = await execPrivilegedLoose(
    server,
    `[ -e ${escapeDoubleQuotedShellArg(filePath)} ] && printf yes || printf no`,
  );

  return (result.stdout || "").trim() === "yes";
}

export async function readPrivilegedFile(
  server: Server,
  filePath: string,
): Promise<string | null> {
  if (!(await pathExistsPrivileged(server, filePath))) {
    return null;
  }

  return execPrivileged(server, `cat ${escapeDoubleQuotedShellArg(filePath)}`);
}

export async function writePrivilegedFile(
  server: Server,
  filePath: string,
  content: string,
): Promise<void> {
  const encoded = Buffer.from(content, "utf8").toString("base64");
  const parentDir = filePath.replace(/\/[^/]+$/, "") || "/";

  await execPrivileged(
    server,
    [
      `mkdir -p ${escapeDoubleQuotedShellArg(parentDir)}`,
      `printf %s ${escapeDoubleQuotedShellArg(encoded)} | base64 -d > ${escapeDoubleQuotedShellArg(filePath)}`,
    ].join(" && "),
  );
}

export async function removePrivilegedFile(
  server: Server,
  filePath: string,
): Promise<void> {
  await execPrivileged(server, `rm -f ${escapeDoubleQuotedShellArg(filePath)}`);
}
