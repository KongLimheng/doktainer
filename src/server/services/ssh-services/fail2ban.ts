import { Server } from "@prisma/client";

import { exec, execStrict } from "./commands";
import type { ServerPlatformInfo } from "./platform";
import { detectServerPlatform } from "./platform";
import { privilegedCommand } from "./internal/privilege";
import { escapeShellArg } from "./internal/shell";
import { hasCommand } from "./internal/system";

export interface BannedIP {
  ip: string;
  jail: string;
  bannedAt: string;
}

export interface Fail2banStatus {
  enabled: boolean;
  installed: boolean;
  bannedIPs: BannedIP[];
}

export async function getFail2banStatus(
  server: Server,
): Promise<Fail2banStatus> {
  const installed = await hasCommand(server, "fail2ban-client");
  if (!installed) {
    return { enabled: false, installed: false, bannedIPs: [] };
  }

  const statusResult = await exec(
    server,
    `${privilegedCommand(server, "systemctl is-active fail2ban")} 2>/dev/null || echo "inactive"`,
  );
  const enabled = statusResult.stdout.trim() === "active";

  const bannedIPs: BannedIP[] = [];
  if (enabled) {
    const banned = await exec(
      server,
      `${privilegedCommand(server, "fail2ban-client status sshd")} 2>/dev/null | grep 'Banned IP list' | sed 's/.*Banned IP list://g'`,
    );
    const ips = banned.stdout.trim().split(/\s+/).filter(Boolean);
    for (const ip of ips) {
      bannedIPs.push({ ip, jail: "sshd", bannedAt: new Date().toISOString() });
    }
  }
  return { enabled, installed: true, bannedIPs };
}

export async function installFail2ban(server: Server): Promise<void> {
  const platform = await detectServerPlatform(server);

  if (!platform.packageManager) {
    throw new Error(
      `Fail2ban install is not supported on ${platform.distro ?? server.name}: no supported package manager found`,
    );
  }

  if (!platform.sudoNonInteractive && server.username !== "root") {
    throw new Error(
      `Fail2ban install requires non-interactive sudo access on server ${server.name}`,
    );
  }

  const installCommands: Record<
    NonNullable<ServerPlatformInfo["packageManager"]>,
    string
  > = {
    "apt-get": "apt-get update && apt-get install -y fail2ban",
    dnf: "dnf install -y fail2ban",
    yum: "yum install -y epel-release && yum install -y fail2ban",
    zypper: "zypper --non-interactive install fail2ban",
    apk: "apk add fail2ban",
  };

  await execStrict(
    server,
    privilegedCommand(
      server,
      `bash -lc ${escapeShellArg(installCommands[platform.packageManager])}`,
    ),
  );
  await enableFail2ban(server);
}

export async function enableFail2ban(server: Server): Promise<void> {
  await execStrict(
    server,
    privilegedCommand(server, "systemctl enable --now fail2ban"),
  );
}

export async function disableFail2ban(server: Server): Promise<void> {
  await execStrict(
    server,
    privilegedCommand(server, "systemctl disable --now fail2ban"),
  );
}

export async function unbanIP(
  server: Server,
  ip: string,
  jail = "sshd",
): Promise<void> {
  await execStrict(
    server,
    privilegedCommand(server, `fail2ban-client set ${jail} unbanip ${ip}`),
  );
}
