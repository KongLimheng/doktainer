import { Container, ProxyType, Server } from "@prisma/client";
import yaml from "js-yaml";
import {
  DockerContainerInspect,
  dockerInspect,
  exec,
  resolveSslCertificate,
  restartManagedService,
} from "./ssh.service";

export interface DomainProvisioningResult {
  upstream: string;
  configPath: string;
  reloadTarget: string;
}

export class DomainProvisioningError extends Error {}

interface ContainerPortBinding {
  containerPort: number;
  protocol: string;
  hostPort: number | null;
}

interface ContainerUpstreamTarget {
  upstream: string;
  selectedPort: number;
}

function escapeShellArg(value: string): string {
  return `'${value.replace(/'/g, `"'"'`)}'`;
}

function escapeDoubleQuotedShellArg(value: string): string {
  return `"${value.replace(/[\\"$`]/g, "\\$&")}"`;
}

function shellCommand(command: string): string {
  return `sh -c ${escapeShellArg(command)}`;
}

function privilegedShellCommand(server: Server, command: string): string {
  return server.username === "root"
    ? shellCommand(command)
    : `sudo ${shellCommand(command)}`;
}

async function execPrivileged(server: Server, script: string): Promise<string> {
  const result = await exec(server, privilegedShellCommand(server, script));

  if (result.code !== 0) {
    throw new Error(result.stderr || result.stdout || "Remote command failed");
  }

  return result.stdout;
}

async function execPrivilegedLoose(
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

async function pathExists(server: Server, filePath: string): Promise<boolean> {
  const result = await exec(
    server,
    shellCommand(
      `[ -e ${escapeDoubleQuotedShellArg(filePath)} ] && printf yes || printf no`,
    ),
  );

  return (result.stdout || "").trim() === "yes";
}

async function pathExistsPrivileged(
  server: Server,
  filePath: string,
): Promise<boolean> {
  const result = await execPrivilegedLoose(
    server,
    `[ -e ${escapeDoubleQuotedShellArg(filePath)} ] && printf yes || printf no`,
  );

  return (result.stdout || "").trim() === "yes";
}

async function readPrivilegedFile(
  server: Server,
  filePath: string,
): Promise<string | null> {
  if (!(await pathExistsPrivileged(server, filePath))) {
    return null;
  }

  return execPrivileged(server, `cat ${escapeDoubleQuotedShellArg(filePath)}`);
}

async function writePrivilegedFile(
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

async function removePrivilegedFile(
  server: Server,
  filePath: string,
): Promise<void> {
  await execPrivileged(server, `rm -f ${escapeDoubleQuotedShellArg(filePath)}`);
}

function sanitizeDomainFileName(domainName: string): string {
  return domainName.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
}

function sanitizeContainerFileName(containerName: string): string {
  return containerName.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
}

function buildManagedNginxFileBase(
  containerName: string,
  domainName: string,
): string {
  return `${sanitizeContainerFileName(containerName)}--${sanitizeDomainFileName(domainName)}`;
}

function findHttpBlockEnd(configContent: string): number | null {
  const httpMatch = /\bhttp\s*\{/.exec(configContent);
  if (!httpMatch) {
    return null;
  }

  const braceStart = configContent.indexOf("{", httpMatch.index);
  if (braceStart < 0) {
    return null;
  }

  let depth = 0;
  for (let index = braceStart; index < configContent.length; index += 1) {
    const char = configContent[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return null;
}

function ensureNginxSitesEnabledInclude(configContent: string): string {
  if (
    /include\s+\/etc\/nginx\/sites-enabled\/\*\.conf\s*;/.test(configContent)
  ) {
    return configContent;
  }

  const httpBlockEnd = findHttpBlockEnd(configContent);
  if (httpBlockEnd === null) {
    throw new DomainProvisioningError(
      "Could not find the http block in nginx.conf to register /etc/nginx/sites-enabled/*.conf.",
    );
  }

  const includeLine = "\n    include /etc/nginx/sites-enabled/*.conf;\n";
  return `${configContent.slice(0, httpBlockEnd)}${includeLine}${configContent.slice(httpBlockEnd)}`;
}

function normalizeNginxFailureMessage(message: string): string {
  if (
    /socket\(\) \[::\]:80 failed \(97: Address family not supported by protocol\)/i.test(
      message,
    )
  ) {
    return [
      "Nginx validation failed on the target server because an IPv6 listener like `listen [::]:80` is enabled, but the host does not support IPv6.",
      "Adjust the existing Nginx configuration on that server to remove or conditionalize the IPv6 listener, then retry Add Domain.",
    ].join(" ");
  }

  return message;
}

async function detectNginxMainConfigPath(server: Server): Promise<string> {
  const candidates = new Set([
    "/etc/nginx/nginx.conf",
    "/etc/openresty/nginx.conf",
    "/usr/local/nginx/conf/nginx.conf",
    "/usr/local/openresty/nginx/conf/nginx.conf",
    "/usr/local/etc/nginx/nginx.conf",
    "/opt/nginx/conf/nginx.conf",
    "/www/server/nginx/conf/nginx.conf",
  ]);

  const versionOutput = await execPrivilegedLoose(
    server,
    "nginx -V 2>&1 || true",
  );
  const combinedVersionOutput = `${versionOutput.stdout}\n${versionOutput.stderr}`;
  const confPathMatch = combinedVersionOutput.match(/--conf-path=([^\s]+)/);
  if (confPathMatch?.[1]) {
    candidates.add(confPathMatch[1].trim());
  }

  for (const candidate of candidates) {
    if (await pathExistsPrivileged(server, candidate)) {
      return candidate;
    }
  }

  const discoveryResult = await execPrivilegedLoose(
    server,
    [
      "for root in /etc /usr/local /opt /www /home /srv; do",
      '  if [ -d "$root" ]; then',
      '    found=$(find -L "$root" -maxdepth 6 -type f -name nginx.conf 2>/dev/null | head -n 1);',
      '    if [ -n "$found" ]; then printf "%s\\n" "$found"; exit 0; fi',
      "  fi",
      "done",
    ].join(" "),
  );

  const discoveredPath = `${discoveryResult.stdout || ""}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (discoveredPath && (await pathExistsPrivileged(server, discoveredPath))) {
    return discoveredPath;
  }

  throw new DomainProvisioningError(
    `nginx.conf was not found on ${server.name}. Checked Nginx --conf-path and common locations: ${Array.from(candidates).join(", ")}`,
  );
}

async function ensureNginxSitesEnabledRegistration(
  server: Server,
): Promise<void> {
  const mainConfigPath = await detectNginxMainConfigPath(server);
  const currentContent = await readPrivilegedFile(server, mainConfigPath);

  if (currentContent === null) {
    throw new DomainProvisioningError(
      `Unable to read Nginx main config at ${mainConfigPath}.`,
    );
  }

  const nextContent = ensureNginxSitesEnabledInclude(currentContent);
  if (nextContent !== currentContent) {
    await writePrivilegedFile(server, mainConfigPath, nextContent);
  }
}

async function validateAndReloadNginx(
  server: Server,
  rollbackPaths: string[],
): Promise<void> {
  try {
    await execPrivileged(server, "nginx -t");
    await restartManagedService(server, "nginx");
  } catch (error) {
    for (const rollbackPath of rollbackPaths) {
      await removePrivilegedFile(server, rollbackPath).catch(() => undefined);
    }

    throw new DomainProvisioningError(
      normalizeNginxFailureMessage(
        error instanceof Error ? error.message : String(error),
      ),
    );
  }
}

function getContainerNetworkIp(inspect: DockerContainerInspect): string | null {
  const networkSettings = inspect.NetworkSettings as
    | {
        Networks?: Record<string, { IPAddress?: string }>;
      }
    | undefined;

  const networks = networkSettings?.Networks ?? {};
  for (const network of Object.values(networks)) {
    const ipAddress = `${network?.IPAddress ?? ""}`.trim();
    if (ipAddress) {
      return ipAddress;
    }
  }

  return null;
}

function getContainerPortBindings(
  inspect: DockerContainerInspect,
): ContainerPortBinding[] {
  const networkSettings = inspect.NetworkSettings as
    | {
        Ports?: Record<string, Array<{ HostPort?: string }> | null>;
      }
    | undefined;
  const config = inspect.Config as
    | {
        ExposedPorts?: Record<string, Record<string, never>>;
      }
    | undefined;

  const bindings = new Map<string, ContainerPortBinding>();

  for (const [rawPort, hosts] of Object.entries(networkSettings?.Ports ?? {})) {
    const [portRaw, protocolRaw] = rawPort.split("/");
    const containerPort = Number(portRaw);
    const protocol = protocolRaw || "tcp";
    if (!Number.isFinite(containerPort)) {
      continue;
    }

    if (!hosts || hosts.length === 0) {
      bindings.set(rawPort, {
        containerPort,
        protocol,
        hostPort: null,
      });
      continue;
    }

    for (const host of hosts) {
      const hostPort = Number(host?.HostPort ?? "");
      bindings.set(`${rawPort}:${host?.HostPort ?? "internal"}`, {
        containerPort,
        protocol,
        hostPort: Number.isFinite(hostPort) ? hostPort : null,
      });
    }
  }

  for (const rawPort of Object.keys(config?.ExposedPorts ?? {})) {
    const [portRaw, protocolRaw] = rawPort.split("/");
    const containerPort = Number(portRaw);
    const protocol = protocolRaw || "tcp";
    if (!Number.isFinite(containerPort)) {
      continue;
    }

    const existing = Array.from(bindings.values()).some(
      (binding) =>
        binding.containerPort === containerPort &&
        binding.protocol === protocol,
    );

    if (!existing) {
      bindings.set(rawPort, {
        containerPort,
        protocol,
        hostPort: null,
      });
    }
  }

  return Array.from(bindings.values()).sort(
    (left, right) => left.containerPort - right.containerPort,
  );
}

export function describeContainerTargetPorts(
  inspect: DockerContainerInspect,
): Array<{
  containerPort: number;
  hostPort: number | null;
  protocol: string;
  label: string;
}> {
  return getContainerPortBindings(inspect).map((binding) => ({
    ...binding,
    label: binding.hostPort
      ? `${binding.containerPort}/${binding.protocol} (published as ${binding.hostPort})`
      : `${binding.containerPort}/${binding.protocol} (container internal)`,
  }));
}

export async function resolveContainerUpstream(
  server: Server,
  container: Pick<Container, "id" | "name" | "dockerId" | "serverId">,
  targetPort: number,
): Promise<ContainerUpstreamTarget> {
  const inspect = await dockerInspect(
    server,
    container.dockerId || container.name,
  );
  const bindings = getContainerPortBindings(inspect);
  const matching = bindings.find(
    (binding) => binding.containerPort === targetPort,
  );

  if (!matching) {
    throw new Error(
      `Container ${container.name} does not expose port ${targetPort}.`,
    );
  }

  if (matching.hostPort) {
    return {
      upstream: `http://127.0.0.1:${matching.hostPort}`,
      selectedPort: targetPort,
    };
  }

  const containerIp = getContainerNetworkIp(inspect);
  if (!containerIp) {
    throw new Error(
      `Container ${container.name} has no reachable IP address for internal port ${targetPort}. Publish the port first or connect it to a reachable Docker network.`,
    );
  }

  return {
    upstream: `http://${containerIp}:${targetPort}`,
    selectedPort: targetPort,
  };
}

function buildNginxProxyLocation(upstream: string): string[] {
  return [
    "  location / {",
    `    proxy_pass ${upstream};`,
    "    proxy_http_version 1.1;",
    "    proxy_set_header Host $host;",
    "    proxy_set_header X-Real-IP $remote_addr;",
    "    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
    "    proxy_set_header X-Forwarded-Proto $scheme;",
    "    proxy_set_header Upgrade $http_upgrade;",
    '    proxy_set_header Connection "upgrade";',
    "  }",
  ];
}

function buildNginxConfig(
  domainName: string,
  upstream: string,
  sslCertName?: string | null,
): string {
  if (!sslCertName) {
    return [
      "server {",
      "  listen 80;",
      `  server_name ${domainName};`,
      "",
      ...buildNginxProxyLocation(upstream),
      "}",
      "",
    ].join("\n");
  }

  const certPath = `/etc/letsencrypt/live/${sslCertName}/fullchain.pem`;
  const keyPath = `/etc/letsencrypt/live/${sslCertName}/privkey.pem`;

  return [
    "server {",
    "  listen 80;",
    `  server_name ${domainName};`,
    "  return 301 https://$host$request_uri;",
    "}",
    "",
    "server {",
    "  listen 443 ssl http2;",
    `  server_name ${domainName};`,
    `  ssl_certificate ${certPath};`,
    `  ssl_certificate_key ${keyPath};`,
    "  ssl_session_cache shared:SSL:10m;",
    "  ssl_session_timeout 10m;",
    "  ssl_protocols TLSv1.2 TLSv1.3;",
    "  ssl_prefer_server_ciphers off;",
    "",
    ...buildNginxProxyLocation(upstream),
    "}",
    "",
  ].join("\n");
}

async function provisionNginxConfig(
  server: Server,
  domainName: string,
  upstream: string,
  containerName: string,
  sslEnabled: boolean,
): Promise<DomainProvisioningResult> {
  const domainSafeName = sanitizeDomainFileName(domainName);
  const safeName = buildManagedNginxFileBase(containerName, domainName);
  const legacyConfigPath = `/etc/nginx/conf.d/portainer-domains/${domainSafeName}.conf`;
  const configPath = `/etc/nginx/sites-available/${safeName}.conf`;
  const enabledPath = `/etc/nginx/sites-enabled/${safeName}.conf`;
  const previousConfigPath = `/etc/nginx/sites-available/${domainSafeName}.conf`;
  const previousEnabledPath = `/etc/nginx/sites-enabled/${domainSafeName}.conf`;

  await ensureNginxSitesEnabledRegistration(server);
  const sslCertificate = sslEnabled
    ? await resolveSslCertificate(server, domainName).catch(() => null)
    : null;
  await writePrivilegedFile(
    server,
    configPath,
    buildNginxConfig(domainName, upstream, sslCertificate?.certName ?? null),
  );
  await execPrivileged(
    server,
    [
      "mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled",
      `ln -sfn ${escapeDoubleQuotedShellArg(configPath)} ${escapeDoubleQuotedShellArg(enabledPath)}`,
      `rm -f ${escapeDoubleQuotedShellArg(legacyConfigPath)}`,
      safeName === domainSafeName
        ? "true"
        : `rm -f ${escapeDoubleQuotedShellArg(previousEnabledPath)} ${escapeDoubleQuotedShellArg(previousConfigPath)}`,
    ].join(" && "),
  );
  await validateAndReloadNginx(server, [enabledPath, configPath]);

  return {
    upstream,
    configPath,
    reloadTarget: "nginx",
  };
}

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

async function provisionCaddyConfig(
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

async function reloadTraefik(server: Server): Promise<void> {
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

async function provisionTraefikConfig(
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

export async function provisionDomainProxyConfig(options: {
  server: Server;
  domainName: string;
  proxy: ProxyType;
  sslEnabled: boolean;
  container: Pick<Container, "id" | "name" | "dockerId" | "serverId">;
  targetPort: number;
}): Promise<DomainProvisioningResult> {
  const upstreamTarget = await resolveContainerUpstream(
    options.server,
    options.container,
    options.targetPort,
  );

  if (options.proxy === "NGINX") {
    return provisionNginxConfig(
      options.server,
      options.domainName,
      upstreamTarget.upstream,
      options.container.name,
      options.sslEnabled,
    );
  }

  if (options.proxy === "CADDY") {
    return provisionCaddyConfig(
      options.server,
      options.domainName,
      upstreamTarget.upstream,
      options.sslEnabled,
    );
  }

  if (options.proxy === "TRAEFIK") {
    return provisionTraefikConfig(
      options.server,
      options.domainName,
      upstreamTarget.upstream,
    );
  }

  throw new Error(
    `Proxy ${options.proxy} does not support automatic provisioning.`,
  );
}

export async function removeManagedDomainProxyConfig(options: {
  server: Server;
  domainName: string;
  proxy: ProxyType;
  containerName?: string | null;
}): Promise<void> {
  if (options.proxy === "NONE") {
    return;
  }

  const domainSafeName = sanitizeDomainFileName(options.domainName);

  if (options.proxy === "NGINX") {
    const managedSafeName = options.containerName
      ? buildManagedNginxFileBase(options.containerName, options.domainName)
      : domainSafeName;
    const enabledPath = `/etc/nginx/sites-enabled/${managedSafeName}.conf`;
    const availablePath = `/etc/nginx/sites-available/${managedSafeName}.conf`;
    const previousEnabledPath = `/etc/nginx/sites-enabled/${domainSafeName}.conf`;
    const previousAvailablePath = `/etc/nginx/sites-available/${domainSafeName}.conf`;
    const legacyConfigPath = `/etc/nginx/conf.d/portainer-domains/${domainSafeName}.conf`;

    await removePrivilegedFile(options.server, enabledPath);
    await removePrivilegedFile(options.server, availablePath);
    if (managedSafeName !== domainSafeName) {
      await removePrivilegedFile(options.server, previousEnabledPath);
      await removePrivilegedFile(options.server, previousAvailablePath);
    }
    await removePrivilegedFile(options.server, legacyConfigPath);
    await validateAndReloadNginx(options.server, []);
    return;
  }

  if (options.proxy === "CADDY") {
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
    return;
  }

  await removePrivilegedFile(
    options.server,
    `/etc/traefik/dynamic/portainer/${domainSafeName}.yml`,
  );
  await reloadTraefik(options.server);
}
