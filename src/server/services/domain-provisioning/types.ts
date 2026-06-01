import { Container, ProxyType, Server } from "@prisma/client";

export interface DomainProvisioningResult {
  upstream: string;
  configPath: string;
  reloadTarget: string;
}

export class DomainProvisioningError extends Error {}

export interface ContainerPortBinding {
  containerPort: number;
  protocol: string;
  hostPort: number | null;
}

export interface ContainerUpstreamTarget {
  upstream: string;
  selectedPort: number;
}

export interface ProvisionDomainProxyOptions {
  server: Server;
  domainName: string;
  domainNames?: string[];
  nginxServerEntries?: Array<{
    domainName: string;
    upstream: string;
  }>;
  configMode?: "SHARED" | "ISOLATED";
  primaryDomainName?: string | null;
  proxy: ProxyType;
  sslEnabled: boolean;
  container: Pick<Container, "id" | "name" | "dockerId" | "serverId">;
  targetPort: number;
}

export interface RemoveManagedDomainProxyOptions {
  server: Server;
  domainName: string;
  domainNames?: string[];
  configMode?: "SHARED" | "ISOLATED";
  proxy: ProxyType;
  containerName?: string | null;
}
