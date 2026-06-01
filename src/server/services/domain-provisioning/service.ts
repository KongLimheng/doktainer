import { provisionCaddyConfig, removeManagedCaddyProxyConfig } from "./caddy";
import {
  describeContainerTargetPorts,
  resolveContainerUpstream,
} from "./container-upstream";
import { provisionNginxConfig, removeManagedNginxProxyConfig } from "./nginx";
import {
  ProvisionDomainProxyOptions,
  RemoveManagedDomainProxyOptions,
} from "./types";
import {
  provisionTraefikConfig,
  removeManagedTraefikProxyConfig,
} from "./traefik";

export { describeContainerTargetPorts, resolveContainerUpstream };

export async function provisionDomainProxyConfig(
  options: ProvisionDomainProxyOptions,
) {
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
      {
        domainNames: options.domainNames,
        serverEntries: options.nginxServerEntries,
        configMode: options.configMode,
        primaryDomainName: options.primaryDomainName,
      },
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

export async function removeManagedDomainProxyConfig(
  options: RemoveManagedDomainProxyOptions,
): Promise<void> {
  if (options.proxy === "NONE") {
    return;
  }

  if (options.proxy === "NGINX") {
    await removeManagedNginxProxyConfig({
      server: options.server,
      domainName: options.domainName,
      containerName: options.containerName,
      domainNames: options.domainNames,
      configMode: options.configMode,
    });
    return;
  }

  if (options.proxy === "CADDY") {
    await removeManagedCaddyProxyConfig({
      server: options.server,
      domainName: options.domainName,
    });
    return;
  }

  await removeManagedTraefikProxyConfig({
    server: options.server,
    domainName: options.domainName,
  });
}
