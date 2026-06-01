import { APP_TEMPLATES } from "../../config/app-templates";
import {
  getCachedCatalog,
  getCacheKey,
  makeCachedResult,
  setCachedCatalog,
} from "./cache";
import { CatalogSyncResult, CatalogSourceMode } from "./types";
import { parseArchiveResponse } from "./archive";
import { dedupeTemplates } from "./normalize";
import { normalizeSingleManifest } from "./manifest-parsers";
import {
  fetchRemoteResponse,
  getFallbackIdFromUrl,
  isZipResponse,
  normalizeRemoteUrl,
} from "./remote";
import {
  CatalogSourceValidationError,
  isLikelyHtmlDocument,
  parseStructuredText,
} from "./utils";

function detectTextFormat(text: string): string {
  return text.trim().startsWith("{") || text.trim().startsWith("[")
    ? "json"
    : "yaml";
}

async function loadRemoteTextCatalog(
  source: Extract<CatalogSourceMode, "auto-detect" | "manifest-url">,
  url: string,
  label: string,
): Promise<CatalogSyncResult> {
  const normalizedUrl = normalizeRemoteUrl(source, url);
  const response = await fetchRemoteResponse(normalizedUrl);

  if (isZipResponse(response, normalizedUrl)) {
    return parseArchiveResponse(response, source, label, normalizedUrl);
  }

  const text = await response.text();
  if (isLikelyHtmlDocument(text, response.headers.get("content-type"))) {
    throw new CatalogSourceValidationError();
  }

  const payload = parseStructuredText(text);
  const fallbackId = getFallbackIdFromUrl(normalizedUrl);

  return {
    templates: dedupeTemplates(
      normalizeSingleManifest(payload, fallbackId, normalizedUrl),
    ),
    meta: {
      source,
      label,
      url: normalizedUrl,
      fetchedAt: new Date().toISOString(),
      isRemote: true,
      format: detectTextFormat(text),
    },
  };
}

async function loadGithubArchiveCatalog(
  url: string,
): Promise<CatalogSyncResult> {
  const normalizedUrl = normalizeRemoteUrl("github-archive", url);
  const response = await fetchRemoteResponse(normalizedUrl);
  return parseArchiveResponse(
    response,
    "github-archive",
    "GitHub Archive ZIP",
    normalizedUrl,
  );
}

export async function getCatalogTemplates(
  source: CatalogSourceMode,
  url?: string,
): Promise<CatalogSyncResult> {
  const fetchedAt = new Date().toISOString();

  if (source === "local") {
    return {
      templates: APP_TEMPLATES,
      meta: {
        source,
        label: "Built-in Catalog",
        fetchedAt,
        isRemote: false,
        cached: false,
      },
    };
  }

  if (!url?.trim()) {
    throw new Error("Remote catalog URL is required");
  }

  const trimmedUrl = url.trim();
  const cacheKey = getCacheKey(source, trimmedUrl);
  const cachedEntry = getCachedCatalog(cacheKey);
  if (cachedEntry) {
    return makeCachedResult(cachedEntry);
  }

  const result =
    source === "auto-detect"
      ? await loadRemoteTextCatalog(source, trimmedUrl, "Custom Source")
      : source === "manifest-url"
        ? await loadRemoteTextCatalog(source, trimmedUrl, "Remote Manifest URL")
        : await loadGithubArchiveCatalog(trimmedUrl);

  if (result.templates.length === 0) {
    throw new Error(
      "No app templates could be extracted from the remote source",
    );
  }

  return setCachedCatalog(cacheKey, result.templates, result.meta);
}
