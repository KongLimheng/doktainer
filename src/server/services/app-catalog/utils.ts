import yaml from "js-yaml";

export const REMOTE_CATALOG_SOURCE_HELP =
  "Custom source must point to a raw JSON/YAML app manifest or a direct ZIP archive URL, not a browser HTML page. Use a raw file URL or a repository archive URL.";

export class CatalogSourceValidationError extends Error {
  constructor(message = REMOTE_CATALOG_SOURCE_HELP) {
    super(message);
    this.name = "CatalogSourceValidationError";
  }
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function buildImageWithVersion(
  image?: string,
  version?: string,
): string {
  const imageValue = image?.trim() ?? "";
  const versionValue = version?.trim() ?? "";

  if (!imageValue) return "";
  if (!versionValue) return imageValue;

  const lastColon = imageValue.lastIndexOf(":");
  const lastSlash = imageValue.lastIndexOf("/");
  if (lastColon > lastSlash) {
    return imageValue;
  }

  return `${imageValue}:${versionValue}`;
}

export function isLikelyHtmlDocument(
  text: string,
  contentType?: string | null,
): boolean {
  if (contentType?.toLowerCase().includes("text/html")) {
    return true;
  }

  const preview = text.trimStart().slice(0, 4096).toLowerCase();
  if (!preview) return false;

  return (
    preview.startsWith("<!doctype html") ||
    preview.startsWith("<html") ||
    preview.includes("<head") ||
    preview.includes("<body") ||
    preview.includes("<style") ||
    preview.includes("<script")
  );
}

export function parseStructuredText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return {};

  if (isLikelyHtmlDocument(trimmed)) {
    throw new CatalogSourceValidationError();
  }

  try {
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return JSON.parse(trimmed);
    }

    return yaml.load(trimmed);
  } catch (error) {
    if (error instanceof CatalogSourceValidationError) {
      throw error;
    }

    throw new CatalogSourceValidationError(
      "Custom source could not be parsed as JSON or YAML. Check that the URL returns a raw app manifest or use a direct ZIP archive URL.",
    );
  }
}
