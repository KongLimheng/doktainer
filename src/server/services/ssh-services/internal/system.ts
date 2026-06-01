import { Server } from "@prisma/client";
import type { SSHExecCommandResponse } from "node-ssh";

import { exec } from "../commands";
import { escapeShellArg } from "./shell";

type CommandExecutor = (
  server: Server,
  command: string,
) => Promise<SSHExecCommandResponse>;

export async function hasCommand(
  server: Server,
  command: string,
  executor: CommandExecutor = exec,
): Promise<boolean> {
  const result = await executor(
    server,
    `bash -lc ${escapeShellArg(`command -v ${command} >/dev/null 2>&1`)}`,
  );
  return result.code === 0;
}

export type { CommandExecutor };
