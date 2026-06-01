import AdmZip from "adm-zip";
import { AppTemplate } from "../../config/app-templates";
import { CatalogSourceMode, CatalogSyncResult } from "./types";
import { dedupeTemplates, normalizePorts } from "./normalize";
import {
  normalizeSingleManifest,
  parseCasaOsCompose,
  parseCasaOsConfigJson,
} from "./manifest-parsers";
import { asRecord, parseStructuredText, slugify, toStringArray } from "./utils";

function getAppDirKey(entryName: string): string | undefined {
  const match = entryName.match(/(^|\/)Apps\/([^/]+)\//i);
  return match?.[2]?.toLowerCase();
}

function getGithubRawArchiveBase(
  archiveUrl: string,
): { owner: string; repo: string; ref: string } | undefined {
  try {
    const parsed = new URL(archiveUrl);

    if (parsed.hostname === "codeload.github.com") {
      const match = parsed.pathname.match(
        /^\/([^/]+)\/([^/]+)\/zip\/refs\/(?:heads|tags)\/(.+)$/i,
      );

      if (match) {
        return { owner: match[1], repo: match[2], ref: match[3] };
      }
    }

    if (parsed.hostname === "github.com") {
      const refMatch = parsed.pathname.match(
        /^\/([^/]+)\/([^/]+)\/archive\/refs\/(?:heads|tags)\/(.+)\.zip$/i,
      );

      if (refMatch) {
        return { owner: refMatch[1], repo: refMatch[2], ref: refMatch[3] };
      }

      const commitMatch = parsed.pathname.match(
        /^\/([^/]+)\/([^/]+)\/archive\/([a-f0-9]{7,40})\.zip$/i,
      );

      if (commitMatch) {
        return {
          owner: commitMatch[1],
          repo: commitMatch[2],
          ref: commitMatch[3],
        };
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function getArchiveEntryBaseUrl(
  archiveUrl: string,
  entryName: string,
): string | undefined {
  const github = getGithubRawArchiveBase(archiveUrl);
  if (!github) return undefined;

  const entryPath = entryName.split("/").filter(Boolean).slice(1).join("/");
  if (!entryPath) return undefined;

  return `https://raw.githubusercontent.com/${github.owner}/${github.repo}/${github.ref}/${entryPath}`;
}

export function parseCasaOsArchiveCatalog(
  zip: AdmZip,
  archiveUrl = "",
): AppTemplate[] {
  const configEntries = new Map<string, string>();
  const composeEntries = new Map<string, string>();
  const results: AppTemplate[] = [];

  zip.getEntries().forEach((entry) => {
    if (entry.isDirectory) return;

    const appDirKey = getAppDirKey(entry.entryName);
    if (!appDirKey) return;

    const lower = entry.entryName.toLowerCase();
    if (lower.endsWith("/config.json")) {
      configEntries.set(appDirKey, entry.entryName);
    }

    if (
      lower.endsWith("/docker-compose.yml") ||
      lower.endsWith("/docker-compose.yaml")
    ) {
      composeEntries.set(appDirKey, entry.entryName);
    }
  });

  Array.from(
    new Set([...configEntries.keys(), ...composeEntries.keys()]),
  ).forEach((appDirKey) => {
    const configPath = configEntries.get(appDirKey);
    const composePath = composeEntries.get(appDirKey);

    try {
      const configPayload = configPath
        ? JSON.parse(zip.readAsText(configPath))
        : undefined;
      const composePayload = composePath
        ? parseStructuredText(zip.readAsText(composePath))
        : undefined;

      let template: AppTemplate | null = null;

      if (composePayload) {
        template = parseCasaOsCompose(
          asRecord(composePayload) ?? {},
          appDirKey,
          composePath
            ? getArchiveEntryBaseUrl(archiveUrl, composePath)
            : undefined,
        );
      }

      if (!template && configPayload) {
        template = parseCasaOsConfigJson(
          asRecord(configPayload) ?? {},
          appDirKey,
          configPath
            ? getArchiveEntryBaseUrl(archiveUrl, configPath)
            : undefined,
        );
      }

      if (template) {
        if (configPayload && !template.defaultPort) {
          template.defaultPort = normalizePorts(asRecord(configPayload)?.port);
        }
        if (configPayload && template.tags.length === 0) {
          template.tags = toStringArray(asRecord(configPayload)?.categories);
        }
        results.push(template);
      }
    } catch {
      // Ignore malformed app folder data.
    }
  });

  return results;
}

export function parseGenericArchiveCatalog(
  zip: AdmZip,
  archiveUrl = "",
): AppTemplate[] {
  const templates: AppTemplate[] = [];
  const candidateEntries = zip
    .getEntries()
    .filter((entry) => {
      if (entry.isDirectory) return false;
      const lower = entry.entryName.toLowerCase();
      if (!/\.(json|ya?ml)$/.test(lower)) return false;
      return /(app|catalog|manifest|template|store|config|compose|umbrel)/.test(
        lower,
      );
    })
    .slice(0, 300);

  candidateEntries.forEach((entry) => {
    try {
      const payload = parseStructuredText(entry.getData().toString("utf8"));
      const fallbackId = slugify(
        entry.entryName.split("/").slice(-2, -1)[0] ?? entry.name,
      );
      templates.push(
        ...normalizeSingleManifest(
          payload,
          fallbackId,
          getArchiveEntryBaseUrl(archiveUrl, entry.entryName),
        ),
      );
    } catch {
      // Ignore malformed files.
    }
  });

  return templates;
}

export async function parseArchiveResponse(
  response: Response,
  source: CatalogSourceMode,
  label: string,
  url: string,
): Promise<CatalogSyncResult> {
  const buffer = Buffer.from(await response.arrayBuffer());
  const zip = new AdmZip(buffer);
  const casaOsTemplates = parseCasaOsArchiveCatalog(zip, url);
  const genericTemplates = parseGenericArchiveCatalog(zip, url);

  return {
    templates: dedupeTemplates([...casaOsTemplates, ...genericTemplates]),
    meta: {
      source,
      label,
      url,
      fetchedAt: new Date().toISOString(),
      isRemote: true,
      format: casaOsTemplates.length > 0 ? "casaos-archive" : "archive",
    },
  };
}
