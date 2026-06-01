import { Container, Server } from "@prisma/client";
import { DockerContainerInspect, dockerInspect } from "../ssh.service";
import { ContainerPortBinding, ContainerUpstreamTarget } from "./types";

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
