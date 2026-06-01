import dns from "node:dns/promises";
import net from "node:net";
import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

export interface CloudflareVerificationInput {
  zoneId: string;
  apiToken: string;
}

export interface AwsVerificationInput {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string;
}

export interface TokenVerificationInput {
  token: string;
}

export interface GitProviderVerificationInput {
  provider: "github" | "gitlab" | "bitbucket" | "gitea";
  providerUrl?: string;
  appUrl?: string;
  installationUrl?: string;
}

function toTrimmedUrl(value?: string) {
  return value?.trim() ?? "";
}

function isPrivateIpv4Address(hostname: string) {
  const octets = hostname.split(".").map((part) => Number.parseInt(part, 10));
  if (octets.length !== 4 || octets.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 10 ||
    first === 127 ||
    first === 0 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isPrivateIpAddress(hostname: string) {
  const ipVersion = net.isIP(hostname);
  if (ipVersion === 4) {
    return isPrivateIpv4Address(hostname);
  }

  if (ipVersion === 6) {
    const normalized = hostname.toLowerCase();
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:") ||
      normalized === "::"
    );
  }

  return false;
}

function isLocalHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal")
  );
}

async function assertSafeResolvedHostname(hostname: string) {
  const resolved = await dns.lookup(hostname, { all: true, verbatim: true });
  if (resolved.some((record) => isPrivateIpAddress(record.address))) {
    throw new Error(
      "Private or internal destinations are not allowed for integration verification",
    );
  }
}

export async function assertSafeOutboundUrl(raw: string) {
  const trimmed = toTrimmedUrl(raw);
  if (!trimmed) {
    throw new Error("URL is required");
  }

  const url = new URL(trimmed);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported");
  }

  if (process.env.ALLOW_PRIVATE_INTEGRATION_URLS === "true") {
    return url;
  }

  if (isLocalHostname(url.hostname) || isPrivateIpAddress(url.hostname)) {
    throw new Error(
      "Private or internal destinations are not allowed for integration verification",
    );
  }

  await assertSafeResolvedHostname(url.hostname);
  return url;
}

async function probePublicUrl(url: string) {
  const safeUrl = await assertSafeOutboundUrl(url);
  const response = await fetch(safeUrl, {
    method: "GET",
    redirect: "follow",
    headers: {
      "User-Agent": "Doktainer",
      Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`URL check failed with status ${response.status}`);
  }

  return {
    url,
    status: response.status,
  };
}

export async function verifyGitProviderConfiguration(
  input: GitProviderVerificationInput,
) {
  const normalizedProviderUrl = toTrimmedUrl(input.providerUrl);
  const normalizedAppUrl = toTrimmedUrl(input.appUrl);
  const normalizedInstallationUrl = toTrimmedUrl(input.installationUrl);

  const baseUrl =
    normalizedProviderUrl ||
    (input.provider === "github"
      ? "https://github.com"
      : input.provider === "gitlab"
        ? "https://gitlab.com"
        : input.provider === "bitbucket"
          ? "https://bitbucket.org"
          : "");

  const checks: Array<{ label: string; url: string }> = [];

  if (baseUrl) {
    checks.push({ label: "Provider URL", url: baseUrl });
  }

  if (normalizedAppUrl) {
    checks.push({ label: "App URL", url: normalizedAppUrl });
  }

  if (normalizedInstallationUrl) {
    checks.push({ label: "Installation URL", url: normalizedInstallationUrl });
  }

  if (checks.length === 0) {
    throw new Error(
      "At least one provider URL, app URL, or installation URL is required for verification",
    );
  }

  const results = await Promise.all(
    checks.map(async (check) => ({
      label: check.label,
      ...(await probePublicUrl(check.url)),
    })),
  );

  return {
    message: `${input.provider.toUpperCase()} configuration looks reachable`,
    detail: {
      provider: input.provider,
      checks: results,
    },
  };
}

export async function verifyCloudflareConnection(
  input: CloudflareVerificationInput,
) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(input.zoneId)}`,
    {
      headers: {
        Authorization: `Bearer ${input.apiToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  const payload = (await response.json()) as {
    success?: boolean;
    result?: { id: string; name: string; status?: string };
    errors?: Array<{ message?: string }>;
  };

  if (!response.ok || !payload.success || !payload.result) {
    throw new Error(
      payload.errors?.[0]?.message || "Cloudflare verification failed",
    );
  }

  return {
    message: `Connected to Cloudflare zone ${payload.result.name}`,
    detail: payload.result,
  };
}

export async function verifyAwsS3Connection(input: AwsVerificationInput) {
  if (input.endpoint) {
    await assertSafeOutboundUrl(input.endpoint);
  }

  const client = new S3Client({
    region: input.region,
    endpoint: input.endpoint || undefined,
    forcePathStyle: Boolean(input.endpoint),
    credentials: {
      accessKeyId: input.accessKeyId,
      secretAccessKey: input.secretAccessKey,
    },
  });

  await client.send(new HeadBucketCommand({ Bucket: input.bucket }));

  return {
    message: `Connected to S3 bucket ${input.bucket}`,
    detail: {
      bucket: input.bucket,
      region: input.region,
    },
  };
}

export async function verifyGithubConnection(input: TokenVerificationInput) {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${input.token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "VPS-Panel",
    },
  });

  const payload = (await response.json()) as {
    login?: string;
    name?: string;
    message?: string;
  };

  if (!response.ok || !payload.login) {
    throw new Error(payload.message || "GitHub verification failed");
  }

  return {
    message: `Connected to GitHub account ${payload.login}`,
    detail: {
      login: payload.login,
      name: payload.name ?? payload.login,
    },
  };
}

export async function verifyGitlabConnection(input: TokenVerificationInput) {
  const response = await fetch("https://gitlab.com/api/v4/user", {
    headers: {
      Authorization: `Bearer ${input.token}`,
    },
  });

  const payload = (await response.json()) as {
    username?: string;
    name?: string;
    message?: string;
    error?: string;
  };

  if (!response.ok || !payload.username) {
    throw new Error(
      payload.message || payload.error || "GitLab verification failed",
    );
  }

  return {
    message: `Connected to GitLab account ${payload.username}`,
    detail: {
      username: payload.username,
      name: payload.name ?? payload.username,
    },
  };
}
