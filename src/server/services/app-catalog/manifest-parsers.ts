import { AppTemplate } from "../../config/app-templates";
import {
  asNumber,
  asRecord,
  asString,
  buildImageWithVersion,
  slugify,
  toStringArray,
} from "./utils";
import {
  extractCandidateEntries,
  normalizeEntry,
  normalizeEnv,
  normalizeIcon,
  normalizePorts,
  normalizeVolumes,
} from "./normalize";

function getMainService(
  composeRecord: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const services = asRecord(composeRecord.services);
  if (!services) return undefined;

  const casaOs = asRecord(composeRecord["x-casaos"]);
  const mainName = asString(casaOs?.main);
  if (mainName) {
    const service = asRecord(services[mainName]);
    if (service) return service;
  }

  const firstKey = Object.keys(services)[0];
  return firstKey ? asRecord(services[firstKey]) : undefined;
}

function isGenericAppTemplateRecord(record: Record<string, unknown>): boolean {
  return [
    "desc",
    "category",
    "tags",
    "defaultPort",
    "defaultEnv",
    "defaultVolumes",
    "defaultCommand",
    "defaultNetwork",
    "restartPolicy",
    "presets",
    "presentation",
  ].some((key) => key in record);
}

export function parseCasaOsCompose(
  composeRecord: Record<string, unknown>,
  fallbackId: string,
  baseUrl?: string,
): AppTemplate | null {
  const casaOs = asRecord(composeRecord["x-casaos"]);
  const mainService = getMainService(composeRecord);
  const titleBlock = asRecord(casaOs?.title);
  const descBlock = asRecord(casaOs?.description);
  const taglineBlock = asRecord(casaOs?.tagline);

  const name =
    asString(titleBlock?.en_us) ??
    asString(casaOs?.title) ??
    asString(casaOs?.name) ??
    fallbackId;
  const description =
    asString(descBlock?.en_us) ??
    asString(taglineBlock?.en_us) ??
    asString(casaOs?.description) ??
    "Community app compose manifest";
  const image =
    asString(mainService?.image) ??
    buildImageWithVersion(asString(casaOs?.image), asString(casaOs?.version));

  if (!image) return null;

  return {
    id: asString(casaOs?.id) ?? slugify(fallbackId),
    name,
    desc: description,
    category: asString(casaOs?.category) ?? "Community",
    icon: normalizeIcon({ icon: casaOs?.icon, logo: casaOs?.logo }, baseUrl),
    image,
    defaultPort: normalizePorts(casaOs?.port_map ?? mainService?.ports),
    defaultEnv: normalizeEnv(mainService?.environment),
    defaultVolumes: normalizeVolumes(mainService?.volumes) || undefined,
    defaultCommand: asString(mainService?.command),
    defaultNetwork:
      asString(mainService?.network_mode) ?? asString(casaOs?.network),
    restartPolicy:
      asString(mainService?.restart) ??
      asString(casaOs?.restart_policy) ??
      "unless-stopped",
    popular: false,
    tags: [
      ...new Set(
        [
          asString(casaOs?.category),
          "community",
          ...toStringArray(casaOs?.architectures),
        ].filter((tag): tag is string => Boolean(tag)),
      ),
    ],
  };
}

export function parseCasaOsConfigJson(
  record: Record<string, unknown>,
  fallbackId: string,
  baseUrl?: string,
): AppTemplate | null {
  const id = asString(record.id) ?? slugify(fallbackId);
  const name =
    asString(record.name) ??
    asString(asRecord(record.title)?.en_us) ??
    asString(record.id) ??
    fallbackId;
  const image = buildImageWithVersion(
    asString(record.image),
    asString(record.version),
  );

  if (!image) return null;

  return {
    id,
    name,
    icon: normalizeIcon(record, baseUrl),
    desc:
      asString(record.description) ??
      asString(record.short_desc) ??
      "Community app config",
    category: toStringArray(record.categories)[0] ?? "Community",
    image,
    defaultPort: normalizePorts(record.port),
    defaultEnv: normalizeEnv(record.form_fields),
    restartPolicy: "unless-stopped",
    popular: Boolean(record.featured ?? false),
    tags: [...new Set([...toStringArray(record.categories), "community"])],
  };
}

export function parseUmbrelManifest(
  record: Record<string, unknown>,
  fallbackId: string,
  baseUrl?: string,
): AppTemplate | null {
  const name = asString(record.name) ?? fallbackId;
  const id = asString(record.id) ?? slugify(fallbackId);
  const port = asNumber(record.port);
  const image =
    asString(record.image) ??
    buildImageWithVersion(asString(record.repo), asString(record.version));

  if (!name || !image) return null;

  return {
    id,
    name,
    icon: normalizeIcon(record, baseUrl),
    desc:
      asString(record.description) ??
      asString(record.tagline) ??
      "Umbrel manifest",
    category: asString(record.category) ?? "Umbrel",
    image,
    defaultPort: port ? `${port}:${port}` : normalizePorts(record.port),
    defaultEnv: "",
    defaultVolumes: undefined,
    defaultCommand: undefined,
    defaultNetwork: undefined,
    restartPolicy: "unless-stopped",
    popular: false,
    tags: [
      ...new Set(["umbrel", asString(record.category) ?? ""].filter(Boolean)),
    ],
  };
}

export function normalizeSingleManifest(
  payload: unknown,
  fallbackId: string,
  baseUrl?: string,
): AppTemplate[] {
  const record = asRecord(payload);
  if (!record) return [];

  const compose = parseCasaOsCompose(record, fallbackId, baseUrl);
  if (compose) return [compose];

  if (isGenericAppTemplateRecord(record)) {
    const generic = normalizeEntry(record, 0, baseUrl);
    if (generic) return [generic];
  }

  const casaConfig = parseCasaOsConfigJson(record, fallbackId, baseUrl);
  if (casaConfig) return [casaConfig];

  const umbrel = parseUmbrelManifest(record, fallbackId, baseUrl);
  if (umbrel) return [umbrel];

  return extractCandidateEntries(payload)
    .map((entry, index) => normalizeEntry(entry, index, baseUrl))
    .filter((entry): entry is AppTemplate => Boolean(entry));
}
