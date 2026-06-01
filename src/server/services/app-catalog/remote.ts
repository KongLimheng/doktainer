import { CatalogSourceMode } from "./types";
import { slugify } from "./utils";

export function normalizeGithubManifestUrl(url: string): string {
  const parsed = new URL(url);

  if (parsed.hostname === "github.com" && parsed.pathname.includes("/blob/")) {
    const parts = parsed.pathname.split("/").filter(Boolean);
    const owner = parts[0];
    const repo = parts[1];
    const branch = parts[3];
    const filePath = parts.slice(4).join("/");
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  }

  return url;
}

export function normalizeGithubArchiveUrl(url: string): string {
  const parsed = new URL(url);

  if (parsed.hostname === "github.com") {
    const match = parsed.pathname.match(
      /^\/([^/]+)\/([^/]+)\/archive\/refs\/(heads|tags)\/([^/]+)\.zip$/,
    );

    if (match) {
      const [, owner, repo, refType, refName] = match;
      return `https://codeload.github.com/${owner}/${repo}/zip/refs/${refType}/${refName}`;
    }
  }

  return url;
}

export function getFallbackIdFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const lastSegment = segments.at(-1) ?? "remote-manifest";
    const normalizedLast = lastSegment.toLowerCase();

    if (
      /^(config\.json|docker-compose\.ya?ml|compose\.ya?ml|umbrel-app\.ya?ml|app\.json|manifest\.json|manifest\.ya?ml)$/.test(
        normalizedLast,
      )
    ) {
      return slugify(segments.at(-2) ?? lastSegment);
    }

    return slugify(lastSegment.replace(/\.(json|ya?ml)$/i, ""));
  } catch {
    return slugify(url.split("/").pop() ?? "remote-manifest");
  }
}

function isZipUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /\.zip$/i.test(parsed.pathname);
  } catch {
    return /\.zip($|\?)/i.test(url);
  }
}

function isZipContentType(contentType?: string | null): boolean {
  if (!contentType) return false;

  const normalized = contentType.toLowerCase();
  return (
    normalized.includes("zip") ||
    normalized.includes("compressed") ||
    normalized.includes("x-zip")
  );
}

function getContentDispositionFileName(header?: string | null): string {
  if (!header) return "";

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] ?? "";
}

export function isZipResponse(response: Response, url: string): boolean {
  const contentType = response.headers.get("content-type");
  const fileName = getContentDispositionFileName(
    response.headers.get("content-disposition"),
  );

  return (
    isZipUrl(url) || isZipContentType(contentType) || /\.zip$/i.test(fileName)
  );
}

export async function fetchRemoteResponse(url: string): Promise<Response> {
  const parsedUrl = new URL(url);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Remote catalog URL must use HTTP or HTTPS");
  }

  const response = await fetch(url, {
    headers: {
      Accept:
        "application/json, application/yaml, text/yaml, text/x-yaml, text/plain, application/octet-stream, */*",
      "User-Agent": "vps-panel-app-catalog/1.0",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `Remote request failed with status ${response.status} for ${response.url}`,
    );
  }

  return response;
}

export function normalizeRemoteUrl(
  source: CatalogSourceMode,
  url: string,
): string {
  const manifestNormalized = normalizeGithubManifestUrl(url);
  return source === "github-archive"
    ? normalizeGithubArchiveUrl(url)
    : normalizeGithubArchiveUrl(manifestNormalized);
}
