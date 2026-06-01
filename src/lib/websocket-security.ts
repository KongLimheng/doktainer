function normalizeProtocol(url: URL): URL {
  if (url.protocol === "http:") {
    url.protocol = "ws:";
  } else if (url.protocol === "https:") {
    url.protocol = "wss:";
  }

  return url;
}

export function resolveWebSocketBaseUrl(
  configuredUrl: string | undefined,
  browserOrigin?: string,
): string {
  const trimmedConfiguredUrl = configuredUrl?.trim();
  const baseUrl =
    trimmedConfiguredUrl || browserOrigin || "http://localhost:4000";
  const resolved = browserOrigin
    ? new URL(baseUrl, browserOrigin)
    : new URL(baseUrl);

  normalizeProtocol(resolved);

  if (browserOrigin) {
    const currentOrigin = new URL(browserOrigin);
    if (currentOrigin.protocol === "https:" && resolved.protocol === "ws:") {
      resolved.protocol = "wss:";
    }
  }

  return resolved.toString().replace(/\/$/, "");
}

export function buildTerminalWebSocketUrl(input: {
  configuredUrl: string | undefined;
  browserOrigin?: string;
  serverId: string;
  cols: number;
  rows: number;
  sessionId?: string;
  ticket?: string | null;
}): string {
  const baseUrl = resolveWebSocketBaseUrl(
    input.configuredUrl,
    input.browserOrigin,
  );
  const target = new URL(
    `/api/v1/terminal/ws/${encodeURIComponent(input.serverId)}`,
    `${baseUrl}/`,
  );

  target.searchParams.set("cols", String(input.cols));
  target.searchParams.set("rows", String(input.rows));

  if (input.sessionId) {
    target.searchParams.set("sessionId", input.sessionId);
  }

  if (input.ticket) {
    target.searchParams.set("ticket", input.ticket);
  }

  return target.toString();
}
