import { Server } from "@prisma/client";
import yaml from "js-yaml";
import {
  readPrivilegedFile,
  removePrivilegedFile,
  writePrivilegedFile,
} from "./filesystem";
import { sanitizeDomainFileName } from "./names";
import { execPrivileged } from "./shell";
import { DomainProvisioningResult } from "./types";

interface TraefikStaticConfigLocation {
  path: string;
  format: "yaml" | "toml";
  content: string;
}

async function detectTraefikStaticConfig(
  server: Server,
): Promise<TraefikStaticConfigLocation | null> {
  const candidates: Array<{ path: string; format: "yaml" | "toml" }> = [
    { path: "/etc/traefik/traefik.yml", format: "yaml" },
    { path: "/etc/traefik/traefik.yaml", format: "yaml" },
    { path: "/etc/traefik/traefik.toml", format: "toml" },
  ];

  for (const candidate of candidates) {
    const content = await readPrivilegedFile(server, candidate.path);
    if (content !== null) {
      return { ...candidate, content };
    }
  }

  return null;
}

async function ensureTraefikFileProvider(server: Server): Promise<string> {
  const dynamicDirectory = "/etc/traefik/dynamic/portainer";
  const staticConfig = await detectTraefikStaticConfig(server);
  if (!staticConfig) {
    throw new Error(
      "Traefik static config file was not found. Configure a file provider first so Portainer can write dynamic domain routes.",
    );
  }

  if (staticConfig.format === "yaml") {
    const parsed =
      (yaml.load(staticConfig.content) as Record<string, unknown> | null) ?? {};
    const providers =
      typeof parsed.providers === "object" && parsed.providers !== null
        ? (parsed.providers as Record<string, unknown>)
        : {};
    const fileProvider =
      typeof providers.file === "object" && providers.file !== null
        ? (providers.file as Record<string, unknown>)
        : {};

    if (
      `${fileProvider.directory ?? ""}`.trim() !== dynamicDirectory ||
      fileProvider.watch !== true
    ) {
      parsed.providers = {
        ...providers,
        file: {
          ...fileProvider,
          directory: dynamicDirectory,
          watch: true,
        },
      };

      await writePrivilegedFile(
        server,
        staticConfig.path,
        yaml.dump(parsed, { lineWidth: 120 }),
      );
    }

    return dynamicDirectory;
  }

  if (!/\[providers\.file\]/.test(staticConfig.content)) {
    const nextContent = `${staticConfig.content.trimEnd()}\n\n[providers.file]\n  directory = "${dynamicDirectory}"\n  watch = true\n`;
    await writePrivilegedFile(server, staticConfig.path, nextContent);
  }

  return dynamicDirectory;
}

function buildTraefikDynamicConfig(
  domainName: string,
  upstream: string,
): string {
  const key = sanitizeDomainFileName(domainName).replace(/\./g, "-");
  const parsed = new URL(upstream);

  return yaml.dump(
    {
      http: {
        routers: {
          [`portainer-${key}`]: {
            rule: `Host(\`${domainName}\`)`,
            service: `portainer-${key}`,
          },
        },
        services: {
          [`portainer-${key}`]: {
            loadBalancer: {
              servers: [{ url: `${parsed.protocol}//${parsed.host}` }],
            },
          },
        },
      },
    },
    { lineWidth: 120 },
  );
}

export async function reloadTraefik(server: Server): Promise<void> {
  const script = [
    "if command -v systemctl >/dev/null 2>&1 && systemctl status traefik >/dev/null 2>&1; then",
    "  systemctl restart traefik",
    "  exit 0",
    "fi",
    "if command -v docker >/dev/null 2>&1; then",
    '  TRAEFIK_ID=$(docker ps --format "{{.ID}}|{{.Names}}|{{.Image}}" | awk -F"|" \'BEGIN{IGNORECASE=1} /traefik/ {print $1; exit}\')',
    '  if [ -n "$TRAEFIK_ID" ]; then',
    '    docker restart "$TRAEFIK_ID" >/dev/null',
    "    exit 0",
    "  fi",
    "fi",
    "exit 0",
  ].join("; ");

  await execPrivileged(server, script);
}

export async function provisionTraefikConfig(
  server: Server,
  domainName: string,
  upstream: string,
): Promise<DomainProvisioningResult> {
  const dynamicDirectory = await ensureTraefikFileProvider(server);
  const configPath = `${dynamicDirectory}/${sanitizeDomainFileName(domainName)}.yml`;

  await writePrivilegedFile(
    server,
    configPath,
    buildTraefikDynamicConfig(domainName, upstream),
  );
  await reloadTraefik(server);

  return {
    upstream,
    configPath,
    reloadTarget: "traefik",
  };
}

export async function removeManagedTraefikProxyConfig(options: {
  server: Server;
  domainName: string;
}): Promise<void> {
  await removePrivilegedFile(
    options.server,
    `/etc/traefik/dynamic/portainer/${sanitizeDomainFileName(options.domainName)}.yml`,
  );
  await reloadTraefik(options.server);
}
