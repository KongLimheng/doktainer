import type { SSHExecCommandResponse } from "node-ssh";
import { Server } from "@prisma/client";
import { AsyncLocalStorage } from "async_hooks";

import {
  closeConnection,
  getConnection,
  withIsolatedConnection,
} from "./connection";

const commandQueues = new Map<string, Promise<unknown>>();
const streamCommandQueues = new Map<string, Promise<unknown>>();
const commandLogSink = new AsyncLocalStorage<(data: string) => void>();

type ExecOptions = {
  timeoutMs?: number;
  queueTimeoutMs?: number;
};

function isRecoverableSshError(message: string): boolean {
  return (
    message.includes("Channel open failure") ||
    message.includes("Not connected") ||
    message.includes("No response from server") ||
    message.includes("Keepalive timeout") ||
    message.includes("client-timeout") ||
    message.includes("Timed out while waiting for handshake") ||
    message.includes("ECONNRESET")
  );
}

function logCommandTimeout(server: Server, command: string, timeoutMs: number) {
  const type = /\bdocker\s+exec\b/.test(command)
    ? "ssh-exec-timeout"
    : "ssh-timeout";
  console.warn(
    `[${type}] ${JSON.stringify({
      type,
      serverId: server.id,
      host: server.ip,
      duration: timeoutMs,
      command: command.slice(0, 160),
    })}`,
  );
}

function logQueueTimeout(server: Server, command: string, timeoutMs: number) {
  const type = /\bdocker\s+exec\b/.test(command)
    ? "ssh-exec-queue-timeout"
    : "ssh-queue-timeout";
  console.warn(
    `[${type}] ${JSON.stringify({
      type,
      serverId: server.id,
      host: server.ip,
      queueWait: timeoutMs,
      command: command.slice(0, 160),
    })}`,
  );
}

function enqueueCommand<T>(
  queue: Map<string, Promise<unknown>>,
  server: Server,
  command: string,
  task: () => Promise<T>,
  options: { queueTimeoutMs?: number } = {},
): Promise<T> {
  let started = false;
  let cancelled = false;
  const previous = queue.get(server.id) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(async () => {
      if (cancelled) {
        throw new Error("Command cancelled before execution");
      }

      started = true;
      return task();
    });

  const queued = next.finally(() => {
    if (queue.get(server.id) === queued) {
      queue.delete(server.id);
    }
  });
  queue.set(server.id, queued);

  const queueTimeoutMs = options.queueTimeoutMs;
  if (!queueTimeoutMs || queueTimeoutMs <= 0) {
    return queued;
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled || started) {
        return;
      }

      settled = true;
      cancelled = true;
      logQueueTimeout(server, command, queueTimeoutMs);
      reject(
        new Error(
          `Command queue timed out after ${Math.ceil(queueTimeoutMs / 1000)}s`,
        ),
      );
    }, queueTimeoutMs);
    timeoutId.unref?.();

    void queued
      .then((value) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function enqueueServerCommand<T>(
  server: Server,
  command: string,
  task: () => Promise<T>,
  options: { queueTimeoutMs?: number } = {},
): Promise<T> {
  return enqueueCommand(commandQueues, server, command, task, options);
}

function enqueueStreamCommand<T>(
  server: Server,
  command: string,
  task: () => Promise<T>,
): Promise<T> {
  return enqueueCommand(streamCommandQueues, server, command, task);
}

function withCommandTimeout<T>(
  execute: () => Promise<T>,
  timeoutMs: number | undefined,
  onTimeout: () => void,
): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) {
    return execute();
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      onTimeout();
      reject(
        new Error(`Command timed out after ${Math.ceil(timeoutMs / 1000)}s`),
      );
    }, timeoutMs);

    void execute()
      .then((value) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Execute a command and return stdout/stderr
 */
export async function exec(
  server: Server,
  command: string,
  options: ExecOptions = {},
): Promise<SSHExecCommandResponse> {
  const logSink = commandLogSink.getStore();
  if (logSink) {
    let stdout = "";
    let code = 0;

    await streamCommand(
      server,
      command,
      (data) => {
        stdout += data;
        logSink(data);
      },
      (exitCode) => {
        code = exitCode;
      },
    );

    return {
      code,
      signal: null,
      stdout,
      stderr: "",
    };
  }

  return enqueueServerCommand(
    server,
    command,
    async () => {
      try {
        const ssh = await getConnection(server);
        return await withCommandTimeout(
          () => ssh.execCommand(command),
          options.timeoutMs,
          () => {
            logCommandTimeout(server, command, options.timeoutMs!);
            closeConnection(server.id);
          },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const shouldRetry = isRecoverableSshError(message);

        if (!shouldRetry) {
          throw error;
        }

        closeConnection(server.id);
        const ssh = await getConnection(server);
        return withCommandTimeout(
          () => ssh.execCommand(command),
          options.timeoutMs,
          () => {
            logCommandTimeout(server, command, options.timeoutMs!);
            closeConnection(server.id);
          },
        );
      }
    },
    options,
  );
}

export async function execIsolated(
  server: Server,
  command: string,
  options?: { timeoutMs?: number },
): Promise<SSHExecCommandResponse> {
  const runOnce = () =>
    withIsolatedConnection(server, async (ssh) =>
      withCommandTimeout(
        () => ssh.execCommand(command),
        options?.timeoutMs,
        () => {
          logCommandTimeout(server, command, options!.timeoutMs!);
          try {
            ssh.dispose();
          } catch {
            // Ignore disposal races after timing out an isolated probe.
          }
        },
      ),
    );

  try {
    return await runOnce();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!isRecoverableSshError(message)) {
      throw error;
    }

    return runOnce();
  }
}

/**
 * Execute command, throw on non-zero exit
 */
export async function execStrict(
  server: Server,
  command: string,
  options: ExecOptions = {},
): Promise<string> {
  const logSink = commandLogSink.getStore();
  if (logSink) {
    let output = "";
    let exitCode = 0;

    await streamCommand(
      server,
      command,
      (data) => {
        output += data;
        logSink(data);
      },
      (code) => {
        exitCode = code;
      },
    );

    if (exitCode !== 0) {
      throw new Error(`Command failed: ${output.trim() || command}`);
    }

    return output;
  }

  const result = await exec(server, command, options);
  if (result.code !== 0) {
    const output = [result.stderr, result.stdout]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join("\n");
    throw new Error(`Command failed: ${output || command}`);
  }
  return result.stdout;
}

export function withCommandLogSink<T>(
  onData: (data: string) => void,
  execute: () => Promise<T>,
): Promise<T> {
  return commandLogSink.run(onData, execute);
}

export async function execStrictIsolated(
  server: Server,
  command: string,
  options?: { timeoutMs?: number },
): Promise<string> {
  const result = await execIsolated(server, command, options);
  if (result.code !== 0) {
    const output = [result.stderr, result.stdout]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join("\n");
    throw new Error(`Command failed: ${output || command}`);
  }
  return result.stdout;
}

// ─── Process streaming (for WebSocket terminal) ───────────────────────────────

export async function streamCommand(
  server: Server,
  command: string,
  onData: (data: string) => void,
  onClose: (code: number) => void,
): Promise<void> {
  return enqueueStreamCommand(server, command, async () => {
    const ssh = await getConnection(server);

    return new Promise((resolve, reject) => {
      ssh.connection!.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let settled = false;
        const cleanup = () => {
          stream.off("data", onStdout);
          stream.stderr?.off("data", onStderr);
          stream.off("close", onCloseStream);
          stream.off("end", onEnd);
          stream.off("error", onError);
          stream.stderr?.off("error", onError);
          stream.destroy();
        };
        const finish = (code = 0) => {
          if (settled) return;
          settled = true;
          onClose(code);
          cleanup();
          resolve();
        };
        const fail = (error: Error) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(error);
        };
        const onStdout = (d: Buffer) => onData(d.toString());
        const onStderr = (d: Buffer) => onData(d.toString());
        const onCloseStream = (code: number) => finish(code);
        const onEnd = () => finish(0);
        const onError = (error: Error) => fail(error);

        stream.on("data", onStdout);
        stream.stderr?.on("data", onStderr);
        stream.on("close", onCloseStream);
        stream.on("end", onEnd);
        stream.on("error", onError);
        stream.stderr?.on("error", onError);
      });
    });
  });
}
