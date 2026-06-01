"use client";

import ConfirmActionDialog from "@/components/ConfirmActionDialog";
import DashboardLayout from "@/components/DashboardLayout";
import TablePagination from "@/components/TablePagination";
import ToastViewport from "@/components/ToastViewport";
import {
  RotateCcw,
  Plus,
  Download,
  Trash2,
  CheckCircle,
  Clock,
  Database,
  Server,
  HardDrive,
  Package,
  Loader2,
  X,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  backups as backupsApi,
  servers as serversApi,
  Backup,
  BackupDownloadFormat,
  BackupOptionsPayload,
  Server as SrvType,
} from "@/lib/api";
import { useTablePagination } from "@/lib/use-table-pagination";
import { useToastManager } from "@/lib/use-toast-manager";

const typeIcons: Record<string, React.ElementType> = {
  DATABASE: Database,
  VOLUME: HardDrive,
  FULL: Server,
};

const typeColors: Record<string, string> = {
  DATABASE: "#3b82f6",
  VOLUME: "#8b5cf6",
  FULL: "#f59e0b",
};

type PendingConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "warning" | "info";
  note?: string;
  onConfirm: () => void;
};

type PendingDownloadAction = {
  id: string;
  name: string;
  type: Backup["type"];
  databaseEngine: Backup["databaseEngine"];
};

function isSqlBackupEngine(engine: Backup["databaseEngine"]) {
  return engine === "POSTGRESQL" || engine === "MYSQL" || engine === "MARIADB";
}

function getDatabaseEngineLabel(engine: Backup["databaseEngine"]) {
  switch (engine) {
    case "POSTGRESQL":
      return "PostgreSQL";
    case "MYSQL":
      return "MySQL";
    case "MARIADB":
      return "MariaDB";
    case "MONGODB":
      return "MongoDB";
    case "REDIS":
      return "Redis";
    default:
      return null;
  }
}

const backupTypeDescriptions: Record<Backup["type"], string> = {
  DATABASE:
    "Dump database from the selected database container on the target server.",
  VOLUME:
    "Archive a single Docker volume. Typically contains persistent application data such as uploads, media, storage, or runtime data, not always source code.",
  FULL: "Archive common server directories such as /etc, /var/www, /home, and /opt. This is not a full disk image snapshot.",
};

const backupTypeHistoryNotes: Record<Backup["type"], string> = {
  DATABASE: "Dump or archive database from the selected container.",
  VOLUME: "Only 1 Docker volume selected by the user.",
  FULL: "Common server directories: /etc, /var/www, /home, /opt.",
};

const downloadFormatCards: Array<{
  format: BackupDownloadFormat;
  title: string;
  description: string;
}> = [
  {
    format: "zip",
    title: ".zip",
    description:
      "ZIP containing the original backup file stored on the server.",
  },
  {
    format: "sql-zip",
    title: ".sql.zip",
    description:
      "ZIP containing the SQL dump file, easier to extract on Windows.",
  },
  {
    format: "tar-gz",
    title: ".tar.gz",
    description: "Original archive format for volume or full server backups.",
  },
];

function CreateBackupModal({
  serverList,
  onClose,
  onAdded,
}: {
  serverList: SrvType[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    format: "sql-zip",
    type: "DATABASE" as Backup["type"],
    serverId: serverList[0]?.id ?? "",
    target: "Local" as "Local" | "S3",
    storageDestinationId: "",
    dbContainer: "",
    volumePath: "",
  });
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<BackupOptionsPayload>({
    databaseTargets: [],
    volumeTargets: [],
    storageDestinations: [],
  });

  useEffect(() => {
    if (!form.serverId) {
      setOptions({
        databaseTargets: [],
        volumeTargets: [],
        storageDestinations: [],
      });
      return;
    }

    let cancelled = false;

    const loadOptions = async () => {
      setOptionsLoading(true);
      try {
        const result = await backupsApi.options(form.serverId);
        if (cancelled) return;

        const nextOptions = result.data ?? {
          databaseTargets: [],
          volumeTargets: [],
          storageDestinations: [],
        };

        setOptions(nextOptions);
        setForm((current) => ({
          ...current,
          dbContainer: nextOptions.databaseTargets.some(
            (item) => item.value === current.dbContainer,
          )
            ? current.dbContainer
            : (nextOptions.databaseTargets.find((item) => !item.disabled)
                ?.value ?? ""),
          volumePath: nextOptions.volumeTargets.some(
            (item) => item.value === current.volumePath,
          )
            ? current.volumePath
            : (nextOptions.volumeTargets[0]?.value ?? ""),
          storageDestinationId: nextOptions.storageDestinations.some(
            (item) => item.id === current.storageDestinationId,
          )
            ? current.storageDestinationId
            : (nextOptions.storageDestinations.find((item) => !item.disabled)
                ?.id ?? ""),
        }));
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load backup options",
          );
        }
      } finally {
        if (!cancelled) {
          setOptionsLoading(false);
        }
      }
    };

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [form.serverId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.serverId) {
      setError("Please select a server");
      return;
    }

    if (form.type === "DATABASE" && !form.dbContainer) {
      setError("Please select a database target");
      return;
    }

    if (form.type === "VOLUME" && !form.volumePath) {
      setError("Please select a volume target");
      return;
    }

    if (form.target === "S3" && !form.storageDestinationId) {
      setError("Please select an S3 storage destination");
      return;
    }
    setLoading(true);
    try {
      await backupsApi.create({
        name: form.name,
        type: form.type,
        serverId: form.serverId,
        target: form.target,
        storageDestinationId:
          form.target === "S3" ? form.storageDestinationId : undefined,
        dbContainer: form.type === "DATABASE" ? form.dbContainer : undefined,
        volumePath: form.type === "VOLUME" ? form.volumePath : undefined,
      });
      onAdded();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Create backup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal animate-slide-in"
        style={{ width: "100%", maxWidth: 440, padding: 28 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <h3
              style={{
                color: "var(--text-primary)",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              Create Backup
            </h3>
            <p
              style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}
            >
              Backup a server&apos;s data to local or S3
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 14,
              fontSize: 13,
              color: "#ef4444",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={submit}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                display: "block",
                marginBottom: 5,
              }}
            >
              Server Target *
            </label>
            <select
              className="input"
              value={form.serverId}
              onChange={(e) =>
                setForm({
                  ...form,
                  serverId: e.target.value,
                  dbContainer: "",
                  volumePath: "",
                  storageDestinationId: "",
                })
              }
              required
              style={{ width: "100%" }}
            >
              <option value="">— Select server —</option>
              {serverList.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name} ({server.ip})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                display: "block",
                marginBottom: 5,
              }}
            >
              Backup Name *
            </label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. postgres-daily-backup"
              required
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                display: "block",
                marginBottom: 8,
              }}
            >
              Backup Type
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["DATABASE", "VOLUME", "FULL"] as const).map((type) => {
                const Icon = typeIcons[type];
                return (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setForm({ ...form, type })}
                    style={{
                      flex: 1,
                      padding: "9px 4px",
                      borderRadius: 8,
                      border: `1px solid ${form.type === type ? typeColors[type] : "var(--border)"}`,
                      background:
                        form.type === type
                          ? `${typeColors[type]}15`
                          : "var(--bg-input)",
                      color:
                        form.type === type
                          ? typeColors[type]
                          : "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 600,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Icon size={14} />
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
            <p
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              {backupTypeDescriptions[form.type]}
            </p>
          </div>

          {form.type === "DATABASE" && (
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Database Target *
              </label>
              <select
                className="input"
                value={form.dbContainer}
                onChange={(e) =>
                  setForm({ ...form, dbContainer: e.target.value })
                }
                required
                style={{ width: "100%" }}
                disabled={optionsLoading || !form.serverId}
              >
                <option value="">— Select database container —</option>
                {options.databaseTargets.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                    disabled={item.disabled}
                  >
                    {item.label}
                    {item.disabled ? " (inactive)" : ""}
                  </option>
                ))}
              </select>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 8,
                  lineHeight: 1.5,
                }}
              >
                Currently, automatic database backups support PostgreSQL, MySQL,
                MariaDB, MongoDB, and Redis. The engine type is automatically
                detected from the target container in the backend.
              </p>
            </div>
          )}

          {form.type === "VOLUME" && (
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Volume Target *
              </label>
              <select
                className="input"
                value={form.volumePath}
                onChange={(e) =>
                  setForm({ ...form, volumePath: e.target.value })
                }
                required
                style={{ width: "100%" }}
                disabled={optionsLoading || !form.serverId}
              >
                <option value="">— Select volume —</option>
                {options.volumeTargets.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                display: "block",
                marginBottom: 8,
              }}
            >
              Storage Target
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["Local", "S3"] as const).map((target) => (
                <button
                  type="button"
                  key={target}
                  onClick={() => setForm({ ...form, target })}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: 8,
                    border: `1px solid ${form.target === target ? "var(--accent)" : "var(--border)"}`,
                    background:
                      form.target === target
                        ? "rgba(59,130,246,0.1)"
                        : "var(--bg-input)",
                    color:
                      form.target === target
                        ? "var(--accent)"
                        : "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {target}
                </button>
              ))}
            </div>
          </div>

          {form.target === "S3" && (
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                S3 Storage Target *
              </label>
              <select
                className="input"
                value={form.storageDestinationId}
                onChange={(e) =>
                  setForm({ ...form, storageDestinationId: e.target.value })
                }
                required
                style={{ width: "100%" }}
                disabled={optionsLoading}
              >
                <option value="">— Select storage destination —</option>
                {options.storageDestinations.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={item.disabled}
                  >
                    {item.name} - {item.bucket}
                    {item.disabled ? " (inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {optionsLoading && (
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Loading server-specific backup targets...
            </p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                flex: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              <Package size={13} /> Create Backup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BackupsPage() {
  const { toasts, pushToast, dismissToast } = useToastManager();
  const [data, setData] = useState<Backup[]>([]);
  const [serverList, setServerList] = useState<SrvType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadDialog, setDownloadDialog] =
    useState<PendingDownloadAction | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] =
    useState<PendingConfirmAction | null>(null);
  const previousBackupsRef = useRef<
    Map<string, { status: Backup["status"]; error: string | null }>
  >(new Map());
  const hasLoadedBackupsRef = useRef(false);

  const syncBackupTransitions = useCallback(
    (nextData: Backup[]) => {
      const previousBackups = previousBackupsRef.current;

      if (hasLoadedBackupsRef.current) {
        for (const backup of nextData) {
          const previousBackup = previousBackups.get(backup.id);

          if (!previousBackup || previousBackup.status === backup.status) {
            continue;
          }

          if (backup.status === "FAILED") {
            pushToast({
              tone: "error",
              title: "Backup Failed",
              message:
                backup.error?.trim() ||
                `Backup "${backup.name}" gagal tanpa detail error tambahan.`,
            });
            continue;
          }

          if (backup.status === "COMPLETED") {
            pushToast({
              tone: "success",
              title: "Backup Completed",
              message:
                backup.sizeMb != null
                  ? `Backup "${backup.name}" selesai (${backup.sizeMb.toFixed(1)} MB).`
                  : `Backup "${backup.name}" selesai.`,
            });
          }
        }
      }

      previousBackupsRef.current = new Map(
        nextData.map((backup) => [
          backup.id,
          { status: backup.status, error: backup.error },
        ]),
      );
      hasLoadedBackupsRef.current = true;
    },
    [pushToast],
  );

  const load = useCallback(
    async (options?: { silent?: boolean; includeServers?: boolean }) => {
      const silent = options?.silent ?? false;
      const includeServers = options?.includeServers ?? false;

      if (!silent) {
        setLoading(true);
      }

      try {
        if (includeServers) {
          const [br, sr] = await Promise.all([
            backupsApi.list(),
            serversApi.list(),
          ]);
          const nextData = br.data ?? [];
          setData(nextData);
          syncBackupTransitions(nextData);
          setServerList(sr.data ?? []);
          return;
        }

        const br = await backupsApi.list();
        const nextData = br.data ?? [];
        setData(nextData);
        syncBackupTransitions(nextData);
      } catch {
        /* silently fail */
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [syncBackupTransitions],
  );

  useEffect(() => {
    void load({ includeServers: true });
  }, [load]);

  const hasActiveBackups = data.some(
    (backup) => backup.status === "RUNNING" || backup.status === "PENDING",
  );

  useEffect(() => {
    if (!hasActiveBackups) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void load({ silent: true });
    }, 4000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasActiveBackups, load]);

  const deleteBackup = async (id: string, name: string) => {
    setDeleting(id);
    try {
      await backupsApi.delete(id);
      setData((prev) => prev.filter((b) => b.id !== id));
      pushToast({
        tone: "success",
        message: `Backup \"${name}\" deleted successfully`,
      });
    } catch (err: unknown) {
      pushToast({
        tone: "error",
        message: err instanceof Error ? err.message : "Delete failed",
      });
    } finally {
      setDeleting(null);
    }
  };

  const restoreBackup = async (id: string) => {
    setRestoring(id);
    try {
      await backupsApi.restore(id);
      pushToast({
        tone: "success",
        title: "Restore Started",
        message: "Restore initiated successfully",
      });
    } catch (err: unknown) {
      pushToast({
        tone: "error",
        title: "Restore Failed",
        message: err instanceof Error ? err.message : "Restore failed",
      });
    } finally {
      setRestoring(null);
    }
  };

  const downloadBackup = async (id: string, format: BackupDownloadFormat) => {
    setDownloading(id);
    try {
      const { blob, fileName } = await backupsApi.download(id, format);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      pushToast({
        tone: "error",
        title: "Download Failed",
        message: err instanceof Error ? err.message : "Download failed",
      });
    } finally {
      setDownloading(null);
    }
  };

  const isDownloadFormatAllowed = (
    backup: PendingDownloadAction,
    format: BackupDownloadFormat,
  ) => {
    if (format === "sql-zip") {
      return (
        backup.type === "DATABASE" && isSqlBackupEngine(backup.databaseEngine)
      );
    }

    if (format === "tar-gz") {
      return backup.type !== "DATABASE";
    }

    return true;
  };

  const getDownloadFormatNote = (
    backup: PendingDownloadAction,
    format: BackupDownloadFormat,
  ) => {
    if (format === "sql-zip" && backup.type !== "DATABASE") {
      return "Hanya tersedia untuk backup database.";
    }

    if (
      format === "sql-zip" &&
      backup.type === "DATABASE" &&
      !isSqlBackupEngine(backup.databaseEngine)
    ) {
      return "Untuk MongoDB atau Redis gunakan .zip karena hasil backup bukan SQL dump.";
    }

    if (format === "tar-gz" && backup.type === "DATABASE") {
      return "Untuk database gunakan ZIP atau SQL ZIP agar isi dump terlihat jelas di Windows.";
    }

    return null;
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmDialog({
      title: "Delete Backup",
      description: `Delete backup "${name}"?`,
      confirmLabel: "Delete Backup",
      tone: "danger",
      note: "This removes the backup entry from the dashboard and cannot be undone.",
      onConfirm: () => {
        void deleteBackup(id, name);
      },
    });
  };

  const handleRestore = (id: string) => {
    setConfirmDialog({
      title: "Restore Backup",
      description: "Restore this backup? This will overwrite current data.",
      confirmLabel: "Start Restore",
      tone: "warning",
      note: "Active workloads may be interrupted while the restore is running.",
      onConfirm: () => {
        void restoreBackup(id);
      },
    });
  };

  const stats = {
    total: data.length,
    completed: data.filter((b) => b.status === "COMPLETED").length,
    running: data.filter((b) => b.status === "RUNNING").length,
    failed: data.filter((b) => b.status === "FAILED").length,
  };

  const lastBackup = data[0]
    ? new Date(data[0].createdAt).toLocaleString()
    : "—";
  const pagination = useTablePagination({
    items: data,
    resetKey: data.length,
  });

  return (
    <DashboardLayout
      title="Backups & Restore"
      subtitle="Automated backup management and one-click restore"
    >
      <ConfirmActionDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ""}
        description={confirmDialog?.description ?? ""}
        confirmLabel={confirmDialog?.confirmLabel ?? "Confirm"}
        tone={confirmDialog?.tone ?? "danger"}
        note={confirmDialog?.note}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => {
          const current = confirmDialog;
          setConfirmDialog(null);
          current?.onConfirm();
        }}
      />
      {downloadDialog && (
        <div className="modal-overlay">
          <div
            className="modal animate-slide-in"
            style={{ width: "100%", maxWidth: 720, padding: 24 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
                gap: 12,
              }}
            >
              <div>
                <h3
                  style={{
                    color: "var(--text-primary)",
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  Download Backup
                </h3>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginTop: 4,
                  }}
                >
                  Pilih format download untuk {downloadDialog.name}
                </p>
              </div>
              <button
                onClick={() => setDownloadDialog(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 12,
              }}
            >
              {downloadFormatCards.map((card) => {
                const enabled = isDownloadFormatAllowed(
                  downloadDialog,
                  card.format,
                );
                const note = getDownloadFormatNote(downloadDialog, card.format);

                return (
                  <button
                    key={card.format}
                    type="button"
                    onClick={() => {
                      if (!enabled) return;
                      void downloadBackup(downloadDialog.id, card.format);
                      setDownloadDialog(null);
                    }}
                    disabled={!enabled || downloading === downloadDialog.id}
                    style={{
                      textAlign: "left",
                      padding: 16,
                      borderRadius: 12,
                      border: `1px solid ${enabled ? "rgba(59,130,246,0.24)" : "var(--border)"}`,
                      background: enabled
                        ? "rgba(59,130,246,0.08)"
                        : "var(--bg-input)",
                      color: enabled
                        ? "var(--text-primary)"
                        : "var(--text-muted)",
                      cursor: enabled ? "pointer" : "not-allowed",
                      opacity: enabled ? 1 : 0.65,
                      minHeight: 128,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <strong style={{ fontSize: 14 }}>{card.title}</strong>
                      <Download size={14} />
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: enabled
                          ? "var(--text-secondary)"
                          : "var(--text-muted)",
                        lineHeight: 1.5,
                      }}
                    >
                      {card.description}
                    </p>
                    {note && (
                      <p
                        style={{
                          fontSize: 11,
                          marginTop: 10,
                          color: enabled ? "#93c5fd" : "var(--text-muted)",
                          lineHeight: 1.5,
                        }}
                      >
                        {note}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <ToastViewport toasts={toasts} onClose={dismissToast} />
      {showCreate && (
        <CreateBackupModal
          serverList={serverList}
          onClose={() => setShowCreate(false)}
          onAdded={() => {
            void load({ silent: true });
          }}
        />
      )}
      <div
        className="animate-slide-in"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 12,
          }}
        >
          {[
            {
              label: "Total Backups",
              value: stats.total,
              color: "#3b82f6",
              icon: Package,
            },
            {
              label: "Completed",
              value: stats.completed,
              color: "#10b981",
              icon: CheckCircle,
            },
            {
              label: "Running",
              value: stats.running,
              color: "#8b5cf6",
              icon: Clock,
            },
            {
              label: "Failed",
              value: stats.failed,
              color: "#ef4444",
              icon: Trash2,
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="card"
                style={{
                  padding: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: `${s.color}15`,
                    border: `1px solid ${s.color}25`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={18} style={{ color: s.color }} />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      lineHeight: 1,
                    }}
                  >
                    {s.value}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 3,
                    }}
                  >
                    {s.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {/* Toolbar */}
        <div
          className="card"
          style={{
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {loading ? "Loading..." : `Last backup: ${lastBackup}`}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12 }}
              onClick={() => {
                void load({ includeServers: true });
              }}
            >
              <RefreshCw size={12} /> Refresh
            </button>
            <button
              className="btn btn-primary"
              style={{ fontSize: 12 }}
              onClick={() => setShowCreate(true)}
            >
              <Plus size={12} /> Create Backup
            </button>
          </div>
        </div>
        {/* Loading / Empty */}
        {loading && (
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: 48, textAlign: "center" }}>
              <Loader2
                size={28}
                className="animate-spin"
                style={{ color: "var(--accent)", margin: "0 auto 12px" }}
              />
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                Loading backups...
              </p>
            </div>
          </div>
        )}
        {!loading && data.length === 0 && (
          <div
            className="card"
            style={{
              padding: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            <Package
              size={36}
              style={{ color: "var(--text-muted)", marginBottom: 12 }}
            />
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              No backups yet
            </p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 16, fontSize: 12 }}
              onClick={() => setShowCreate(true)}
            >
              <Plus size={12} /> Create First Backup
            </button>
          </div>
        )}
        {/* Table */}
        {!loading && data.length > 0 && (
          <div className="card" style={{ overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Backup</th>
                  <th>Type</th>
                  <th>Server</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Target</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedItems.map((b) => {
                  const TypeIcon = typeIcons[b.type] || Package;
                  const tColor = typeColors[b.type] || "#3b82f6";
                  const statusCfg = {
                    COMPLETED: { color: "#10b981", label: "Completed" },
                    RUNNING: { color: "#8b5cf6", label: "Running..." },
                    FAILED: { color: "#ef4444", label: "Failed" },
                    PENDING: { color: "#f59e0b", label: "Pending" },
                  }[b.status] ?? { color: "#64748b", label: b.status };
                  return (
                    <tr key={b.id}>
                      <td
                        style={{
                          color: "var(--text-primary)",
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        {b.name}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              background: `${tColor}10`,
                              color: tColor,
                              border: `1px solid ${tColor}25`,
                              padding: "2px 9px",
                              borderRadius: 5,
                              fontSize: 11,
                              fontWeight: 600,
                              width: "fit-content",
                            }}
                          >
                            <TypeIcon size={10} />
                            {b.type.charAt(0) + b.type.slice(1).toLowerCase()}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--text-muted)",
                              lineHeight: 1.45,
                              maxWidth: 220,
                            }}
                          >
                            {backupTypeHistoryNotes[b.type]}
                            {b.type === "DATABASE" &&
                            getDatabaseEngineLabel(b.databaseEngine)
                              ? ` Engine: ${getDatabaseEngineLabel(b.databaseEngine)}.`
                              : ""}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            background: "rgba(59,130,246,0.08)",
                            color: "#3b82f6",
                            padding: "2px 7px",
                            borderRadius: 4,
                            border: "1px solid rgba(59,130,246,0.2)",
                          }}
                        >
                          {b.server?.name ?? "—"}
                        </span>
                      </td>
                      <td
                        style={{
                          fontSize: 12,
                          fontFamily: "JetBrains Mono, monospace",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {b.sizeMb != null ? `${b.sizeMb.toFixed(1)} MB` : "—"}
                      </td>
                      <td>
                        <span
                          title={
                            b.status === "FAILED"
                              ? (b.error ?? undefined)
                              : undefined
                          }
                          style={{
                            background: `${statusCfg.color}12`,
                            color: statusCfg.color,
                            border: `1px solid ${statusCfg.color}25`,
                            padding: "2px 9px",
                            borderRadius: 5,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                      <td
                        style={{
                          fontSize: 11,
                          fontFamily: "JetBrains Mono, monospace",
                          color: "var(--text-muted)",
                        }}
                      >
                        {new Date(b.createdAt).toLocaleString()}
                      </td>
                      <td style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {b.target}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 5,
                          }}
                        >
                          {b.status === "COMPLETED" && (
                            <button
                              className="btn btn-ghost"
                              style={{ padding: "5px 8px" }}
                              title="Restore"
                              onClick={() => handleRestore(b.id)}
                              disabled={restoring === b.id}
                            >
                              {restoring === b.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <RotateCcw size={11} />
                              )}
                            </button>
                          )}
                          {b.filePath && (
                            <button
                              className="btn btn-ghost"
                              style={{ padding: "5px 8px" }}
                              title="Download"
                              onClick={() =>
                                setDownloadDialog({
                                  id: b.id,
                                  name: b.name,
                                  type: b.type,
                                  databaseEngine: b.databaseEngine,
                                })
                              }
                              disabled={downloading === b.id}
                            >
                              {downloading === b.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <Download size={11} />
                              )}
                            </button>
                          )}
                          <button
                            className="btn btn-danger"
                            style={{ padding: "5px 8px" }}
                            title="Delete"
                            onClick={() => handleDelete(b.id, b.name)}
                            disabled={deleting === b.id}
                          >
                            {deleting === b.id ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Trash2 size={11} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <TablePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              startItem={pagination.startItem}
              endItem={pagination.endItem}
              itemLabel="backups"
              onPageChange={pagination.setCurrentPage}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
