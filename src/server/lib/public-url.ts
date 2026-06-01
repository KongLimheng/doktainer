const DEFAULT_PUBLIC_APP_ORIGIN = "http://localhost:3000";

type HeaderMap = Record<string, string | string[] | undefined>;
type HeaderSource =
  | HeaderMap
  | {
      get(name: string): string | null;
    };

function normalizeBaseUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, "");
}

function isBindableHost(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  return normalized === "0.0.0.0" || normalized === "::";
}

function isUsablePublicOrigin(value: string | null | undefined) {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(normalized);
    if (isBindableHost(parsed.hostname)) {
      return null;
    }

    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return normalized;
  }
}

function readHeader(source: HeaderSource | undefined, name: string) {
  if (!source) {
    return null;
  }

  if ("get" in source && typeof source.get === "function") {
    return source.get(name)?.trim() || null;
  }

  const headers = source as HeaderMap;
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }

  return value?.trim() || null;
}

function firstForwardedValue(value: string | null) {
  if (!value) {
    return null;
  }

  return value.split(",")[0]?.trim() || null;
}

function getBrowserOrigin() {
  const browserWindow = (
    globalThis as {
      window?: { location?: { origin?: string } };
    }
  ).window;

  if (!browserWindow?.location?.origin) {
    return null;
  }

  return browserWindow.location.origin;
}

export function resolvePublicAppOrigin(
  options: {
    env?: NodeJS.ProcessEnv;
    headers?: HeaderSource;
    protocol?: string | null;
    browserOrigin?: string | null;
    fallbackOrigin?: string;
  } = {},
) {
  const env = options.env ?? process.env;
  const configuredOrigin = isUsablePublicOrigin(
    env.NEXT_PUBLIC_PANEL_URL ?? env.FRONTEND_URL,
  );
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const host = firstForwardedValue(
    readHeader(options.headers, "x-forwarded-host") ||
      readHeader(options.headers, "host"),
  );
  const protocol =
    firstForwardedValue(readHeader(options.headers, "x-forwarded-proto")) ||
    normalizeBaseUrl(options.protocol)?.replace(/:$/, "") ||
    null;

  if (host) {
    return `${protocol || "http"}://${host}`;
  }

  const browserOrigin = normalizeBaseUrl(
    options.browserOrigin ?? getBrowserOrigin(),
  );
  if (browserOrigin) {
    return browserOrigin;
  }

  return normalizeBaseUrl(options.fallbackOrigin) || DEFAULT_PUBLIC_APP_ORIGIN;
}

export function resolvePublicAppUrl(
  path: string,
  options?: Parameters<typeof resolvePublicAppOrigin>[0],
) {
  return new URL(path, `${resolvePublicAppOrigin(options)}/`).toString();
}

export function isPublicHttpsUrl(value: string) {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const isLocalHost =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local");

    return parsed.protocol === "https:" && !isLocalHost;
  } catch {
    return false;
  }
}
