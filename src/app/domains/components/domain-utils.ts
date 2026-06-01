import {
  Container,
  DomainDiscoverySource,
  DomainProxy,
  ServerConfigSnapshot,
  SslCert,
} from "@/lib/api";
import { SslStatusKey } from "./domain-types";

export function sslStatusKey(cert: SslCert | null | undefined): SslStatusKey {
  if (!cert) return "none";

  switch (cert.status) {
    case "VALID":
      return "valid";
    case "EXPIRING":
      return "expiring";
    case "EXPIRED":
      return "expired";
    default:
      return "pending";
  }
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";

  return new Date(d).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function isIpv4WithPort(value: string): boolean {
  return /^(?:\d{1,3}\.){3}\d{1,3}:\d{1,5}$/.test(value.trim());
}

export function detectAvailableProxies(
  snapshot: ServerConfigSnapshot,
  containers: Container[],
): DomainProxy[] {
  const available = new Set<DomainProxy>(["NONE"]);

  if (
    snapshot.webServer.components.some(
      (component) =>
        component.key === "nginx" &&
        component.installed &&
        component.active === "active",
    )
  ) {
    available.add("NGINX");
  }

  if (
    snapshot.webServer.components.some(
      (component) =>
        component.key === "caddy" &&
        component.installed &&
        component.active === "active",
    )
  ) {
    available.add("CADDY");
  }

  if (
    containers.some((container) =>
      `${container.name} ${container.image}`.toLowerCase().includes("traefik"),
    )
  ) {
    available.add("TRAEFIK");
  }

  return ["NONE", "TRAEFIK", "NGINX", "CADDY"].filter((proxy) =>
    available.has(proxy as DomainProxy),
  ) as DomainProxy[];
}

export function parseInspectPortOptions(
  inspect: Record<string, unknown>,
): Array<{ value: number; label: string }> {
  const networkSettings = (inspect.NetworkSettings ?? {}) as {
    Ports?: Record<
      string,
      Array<{ HostPort?: string; HostIp?: string }> | null
    >;
  };
  const config = (inspect.Config ?? {}) as {
    ExposedPorts?: Record<string, Record<string, never>>;
  };

  const options = new Map<number, string>();

  for (const [rawPort, hosts] of Object.entries(networkSettings.Ports ?? {})) {
    const [containerPortRaw, protocol = "tcp"] = rawPort.split("/");
    const containerPort = Number(containerPortRaw);

    if (!Number.isFinite(containerPort)) {
      continue;
    }

    const hostLabels = (hosts ?? [])
      .map((host) => host?.HostPort)
      .filter((value): value is string => Boolean(value))
      .join(", ");

    options.set(
      containerPort,
      hostLabels
        ? `${containerPort}/${protocol} (published as ${hostLabels})`
        : `${containerPort}/${protocol} (container internal)`,
    );
  }

  for (const rawPort of Object.keys(config.ExposedPorts ?? {})) {
    const [containerPortRaw, protocol = "tcp"] = rawPort.split("/");
    const containerPort = Number(containerPortRaw);

    if (!Number.isFinite(containerPort) || options.has(containerPort)) {
      continue;
    }

    options.set(
      containerPort,
      `${containerPort}/${protocol} (container internal)`,
    );
  }

  return Array.from(options.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([value, label]) => ({ value, label }));
}

export function formatProxyLabel(proxy: DomainProxy): string {
  if (proxy === "NONE") return "None";
  if (proxy === "TRAEFIK") return "Traefik";
  if (proxy === "NGINX") return "Nginx";
  return "Caddy";
}

export function getDiscoverySourceMeta(source: DomainDiscoverySource): {
  label: string;
  detail: string;
  color: string;
  background: string;
  border: string;
} {
  switch (source) {
    case "NGINX":
      return {
        label: "Detected",
        detail: "from Nginx",
        color: "#10b981",
        background: "rgba(16,185,129,0.12)",
        border: "rgba(16,185,129,0.28)",
      };
    case "TRAEFIK":
      return {
        label: "Detected",
        detail: "from Traefik",
        color: "#f59e0b",
        background: "rgba(245,158,11,0.12)",
        border: "rgba(245,158,11,0.28)",
      };
    case "CADDY":
      return {
        label: "Detected",
        detail: "from Caddy file",
        color: "#3b82f6",
        background: "rgba(59,130,246,0.12)",
        border: "rgba(59,130,246,0.28)",
      };
    case "CADDY_ADMIN":
      return {
        label: "Detected",
        detail: "from Caddy Admin API",
        color: "#8b5cf6",
        background: "rgba(139,92,246,0.12)",
        border: "rgba(139,92,246,0.28)",
      };
    case "CERTBOT":
      return {
        label: "Detected",
        detail: "from SSL certificate",
        color: "#06b6d4",
        background: "rgba(6,182,212,0.12)",
        border: "rgba(6,182,212,0.28)",
      };
    default:
      return {
        label: "Manual",
        detail: "added manually",
        color: "#64748b",
        background: "rgba(100,116,139,0.12)",
        border: "rgba(100,116,139,0.25)",
      };
  }
}
