import type { Container, ContainerDetails } from "@/lib/api";
import type {
  StorageMountItem,
  StoragePathItem,
  StorageTabData,
  StorageVolumeItem,
} from "../types/app-detail-types";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown, fallback = "-") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function getBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatBytes(value: number | null | undefined) {
  if (!value || value <= 0) return "-";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

function formatPathLabel(path: string, fallback: string) {
  return path.split("/").filter(Boolean).at(-1) || fallback;
}

function createMountsFromInspect(detail: ContainerDetails | null) {
  const inspect = isRecord(detail?.inspect) ? detail.inspect : null;
  const mounts = Array.isArray(inspect?.Mounts) ? inspect.Mounts : [];

  return mounts.filter(isRecord).map<StorageMountItem>((mount, index) => {
    const source = getString(mount.Source, getString(mount.Name));
    const target = getString(mount.Destination);
    const type = getString(mount.Type, "volume").toLowerCase();

    return {
      id: `${source}-${target}-${index}`,
      name:
        getString(mount.Name, "") ||
        source.split("/").filter(Boolean).at(-1) ||
        `mount-${index + 1}`,
      source,
      target,
      type:
        type === "bind" ? "Bind" : type === "tmpfs" ? "Tmpfs" : "Volume",
      access: getBoolean(mount.RW) === false ? "Read only" : "Read / Write",
      size: "Not measured",
      usage: 0,
      status: "Mounted",
    };
  });
}

function createVolumesFromMounts(
  mounts: StorageMountItem[],
  detail: ContainerDetails | null,
): StorageVolumeItem[] {
  const inspect = isRecord(detail?.inspect) ? detail.inspect : null;
  const rawMounts = Array.isArray(inspect?.Mounts)
    ? inspect.Mounts.filter(isRecord)
    : [];

  return rawMounts.flatMap((mount, index) => {
    const type = getString(mount.Type, "").toLowerCase();
    if (type !== "volume") return [];

    const source = getString(mount.Source, getString(mount.Name));
    const name = getString(mount.Name, formatPathLabel(source, `volume-${index + 1}`));
    const matchedMount = mounts[index];
    const driver = getString(mount.Driver, "local");
    const mode = getString(mount.Mode, "");
    const propagation = getString(mount.Propagation, "");

    return [
      {
        id: `${name}-${index}`,
        name,
        driver,
        mountpoint: source,
        scope: "local",
        createdAt: "-",
        labels: [
          matchedMount?.access ?? "Read / Write",
          mode ? `mode=${mode}` : "",
          propagation ? `propagation=${propagation}` : "",
        ].filter(Boolean),
      },
    ];
  });
}

function createPathsFromMounts(mounts: StorageMountItem[]): StoragePathItem[] {
  return mounts.map((mount) => ({
    label: formatPathLabel(mount.target, mount.name),
    path: mount.target,
    purpose: `${mount.type} mounted from ${mount.source}`,
    status: mount.access === "Read only" ? "Readonly" : "Available",
  }));
}

export function createStorageData(
  container: Container,
  detail: ContainerDetails | null,
): StorageTabData {
  const inspect = isRecord(detail?.inspect) ? detail.inspect : {};
  const mounts = createMountsFromInspect(detail);
  const volumes = createVolumesFromMounts(mounts, detail);
  const paths = createPathsFromMounts(mounts);
  const writableLayerSize = formatBytes(getNumber(inspect.SizeRw));
  const rootFsSize = formatBytes(getNumber(inspect.SizeRootFs));

  return {
    summaries: [
      {
        label: "Writable Layer",
        value: writableLayerSize,
        subvalue:
          writableLayerSize === "-"
            ? "Docker size is not available"
            : `RootFS ${rootFsSize}`,
        tone: "blue",
      },
      {
        label: "Mounts",
        value: String(mounts.length),
        subvalue:
          mounts.length > 0
            ? "Detected from Docker inspect"
            : "No mounted storage detected",
        tone: "green",
      },
      {
        label: "Storage Driver",
        value: getString(inspect.Driver),
        subvalue: "Docker graph driver",
        tone: "purple",
      },
      {
        label: "Block I/O",
        value: detail?.stats.io.raw ?? "-",
        subvalue: detail ? "Runtime block read/write" : "Runtime detail unavailable",
        tone: "amber",
      },
    ],
    mounts,
    volumes,
    backups: [],
    paths,
  };
}
