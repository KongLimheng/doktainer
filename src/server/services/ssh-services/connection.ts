import { NodeSSH } from "node-ssh";
import { Server } from "@prisma/client";
import { decrypt } from "../../lib/crypto";

// Pool: serverId → active SSH connection
const pool = new Map<string, NodeSSH>();
const connectionPromises = new Map<string, Promise<NodeSSH>>();

function attachConnectionLifecycle(serverId: string, ssh: NodeSSH): void {
  const connection = ssh.connection;
  if (!connection) return;

  connection.on("error", () => {
    closeConnection(serverId);
  });

  connection.on("close", () => {
    closeConnection(serverId);
  });

  connection.on("end", () => {
    closeConnection(serverId);
  });
}

type SshConnectOptions = {
  readyTimeout?: number;
};

function buildConnectionOptions(
  server: Server,
  options: SshConnectOptions = {},
) {
  return {
    host: server.ip,
    port: server.sshPort,
    username: server.username,
    readyTimeout: options.readyTimeout ?? 10000,
    keepaliveInterval: 30000,
    keepaliveCountMax: 2,
  };
}

async function connectSsh(
  ssh: NodeSSH,
  server: Server,
  options: SshConnectOptions = {},
): Promise<void> {
  const baseOpts = buildConnectionOptions(server, options);

  if (server.authType === "SSH_KEY" && server.sshKeyEnc) {
    await ssh.connect({
      ...baseOpts,
      privateKey: decrypt(server.sshKeyEnc),
    });
    return;
  }

  if (server.passwordEnc) {
    await ssh.connect({
      ...baseOpts,
      password: decrypt(server.passwordEnc),
    });
    return;
  }

  throw new Error("No SSH credentials configured for this server");
}

/**
 * Get or create an SSH connection for a server
 */
export async function getConnection(server: Server): Promise<NodeSSH> {
  // Return existing connection if alive
  const existing = pool.get(server.id);
  if (existing?.isConnected()) return existing;

  const pending = connectionPromises.get(server.id);
  if (pending) return pending;

  const connectPromise = (async () => {
    const ssh = new NodeSSH();
    await connectSsh(ssh, server);

    attachConnectionLifecycle(server.id, ssh);
    pool.set(server.id, ssh);
    return ssh;
  })().finally(() => {
    connectionPromises.delete(server.id);
  });

  connectionPromises.set(server.id, connectPromise);
  return connectPromise;
}

/**
 * Close and remove a connection from the pool
 */
export function closeConnection(serverId: string): void {
  const conn = pool.get(serverId);
  pool.delete(serverId);
  connectionPromises.delete(serverId);

  try {
    conn?.dispose();
  } catch {
    // Ignore connection disposal races during keepalive timeout cleanup.
  }
}

export async function withIsolatedConnection<T>(
  server: Server,
  task: (ssh: NodeSSH) => Promise<T>,
  options: SshConnectOptions = {},
): Promise<T> {
  const ssh = new NodeSSH();

  try {
    await connectSsh(ssh, server, options);
    return await task(ssh);
  } finally {
    try {
      ssh.dispose();
    } catch {
      // Ignore disposal races for short-lived isolated probes.
    }
  }
}

/**
 * Test SSH connectivity — returns true/false
 */
export async function testConnection(server: Server): Promise<boolean> {
  try {
    await withIsolatedConnection(server, (ssh) => ssh.execCommand("echo ok"));
    return true;
  } catch {
    return false;
  }
}

export async function testConnectionDetailed(
  server: Server,
): Promise<{ connected: boolean; error?: string }> {
  try {
    const result = await withIsolatedConnection(server, (ssh) =>
      ssh.execCommand("echo ok"),
    );
    if (result.code !== 0) {
      return {
        connected: false,
        error: result.stderr || result.stdout || "SSH command failed",
      };
    }
    return { connected: true };
  } catch (err: unknown) {
    closeConnection(server.id);
    return {
      connected: false,
      error: err instanceof Error ? err.message : "SSH connection failed",
    };
  }
}
