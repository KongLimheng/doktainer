import { Server } from "@prisma/client";
import {
  readPrivilegedFile,
  removePrivilegedFile,
  pathExistsPrivileged,
  writePrivilegedFile,
} from "./filesystem";
import { sanitizeDomainFileName } from "./names";
import { escapeDoubleQuotedShellArg, execPrivileged } from "./shell";
import { DomainProvisioningResult } from "./types";

function buildCaddyConfig(
  domainName: string,
  upstream: string,
  sslEnabled: boolean,
): string {
  const siteLabel = sslEnabled ? domainName : `http://${domainName}`;
  return [
    `${siteLabel} {`,
    `  reverse_proxy ${upstream.replace(/^https?:\/\//, "")}`,
    "}",
    "",
  ].join("\n");
}

export async function provisionCaddyConfig(
  server: Server,
  domainName: string,
  upstream: string,
  sslEnabled: boolean,
): Promise<DomainProvisioningResult> {
  const mainConfigCandidates = [
    "/etc/caddy/Caddyfile",
    "/usr/local/etc/caddy/Caddyfile",
  ];

  let mainConfigPath: string | null = null;
  let mainConfigContent: string | null = null;
  for (const candidate of mainConfigCandidates) {
    const content = await readPrivilegedFile(server, candidate);
    if (content !== null) {
      mainConfigPath = candidate;
      mainConfigContent = content;
      break;
    }
  }

  if (!mainConfigPath || mainConfigContent === null) {
    throw new Error(
      `Caddyfile was not found on ${server.name}. Expected one of: ${mainConfigCandidates.join(", ")}`,
    );
  }

  const importLine = "import /etc/caddy/portainer-domains/*.caddy";
  if (!mainConfigContent.includes(importLine)) {
    const nextContent = `${mainConfigContent.trimEnd()}\n\n${importLine}\n`;
    await writePrivilegedFile(server, mainConfigPath, nextContent);
  }

  const configPath = `/etc/caddy/portainer-domains/${sanitizeDomainFileName(domainName)}.caddy`;
  await writePrivilegedFile(
    server,
    configPath,
    buildCaddyConfig(domainName, upstream, sslEnabled),
  );
  await execPrivileged(
    server,
    `caddy validate --config ${escapeDoubleQuotedShellArg(mainConfigPath)}`,
  );
  await execPrivileged(
    server,
    `caddy reload --config ${escapeDoubleQuotedShellArg(mainConfigPath)}`,
  );

  return {
    upstream,
    configPath,
    reloadTarget: "caddy",
  };
}

export async function removeManagedCaddyProxyConfig(options: {
  server: Server;
  domainName: string;
}): Promise<void> {
  const domainSafeName = sanitizeDomainFileName(options.domainName);
  const mainConfigPath = (await pathExistsPrivileged(
    options.server,
    "/etc/caddy/Caddyfile",
  ))
    ? "/etc/caddy/Caddyfile"
    : "/usr/local/etc/caddy/Caddyfile";

  await removePrivilegedFile(
    options.server,
    `/etc/caddy/portainer-domains/${domainSafeName}.caddy`,
  );
  await execPrivileged(
    options.server,
    `caddy validate --config ${escapeDoubleQuotedShellArg(mainConfigPath)}`,
  );
  await execPrivileged(
    options.server,
    `caddy reload --config ${escapeDoubleQuotedShellArg(mainConfigPath)}`,
  );
}
