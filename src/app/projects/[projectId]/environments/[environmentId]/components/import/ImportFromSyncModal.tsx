"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  CloudSyncIcon,
  Info,
  Loader2,
  RefreshCw,
  Square,
  X,
} from "lucide-react";
import { containers as containersApi, type Container } from "@/lib/api";

interface ImportFromSyncModalProps {
  environmentId: string;
  serverId: string;
  serverName: string;
  environmentName: string;
  onClose: () => void;
  onAssign: (containerIds: string[]) => Promise<void>;
}

function formatStatus(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatPorts(ports: string[]) {
  if (ports.length === 0) return "internal only";
  return ports.join(", ");
}

export default function ImportFromSyncModal({
  environmentId,
  serverId,
  serverName,
  environmentName,
  onClose,
  onAssign,
}: ImportFromSyncModalProps) {
  const [serverContainers, setServerContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [assigningContainerId, setAssigningContainerId] = useState<
    string | null
  >(null);
  const [error, setError] = useState("");
  const [syncNotice, setSyncNotice] = useState("");

  const assignedContainerIds = useMemo(
    () =>
      serverContainers
        .filter((container) => container.environmentId === environmentId)
        .map((container) => container.id),
    [environmentId, serverContainers],
  );
  const unassignedCount = serverContainers.filter(
    (container) => !container.environmentId,
  ).length;

  const loadContainers = useCallback(
    async (syncFirst = false) => {
      if (syncFirst) {
        setSyncing(true);
      } else {
        setLoading(true);
      }
      setError("");
      setSyncNotice("");

      try {
        const response = syncFirst
          ? await containersApi.sync({ serverId })
          : await containersApi.list({ serverId });
        setServerContainers(response.data ?? []);
      } catch (loadError) {
        if (!syncFirst) {
          setServerContainers([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Container sync data could not be loaded.",
          );
          return;
        }

        try {
          const fallbackResponse = await containersApi.list({ serverId });
          setServerContainers(fallbackResponse.data ?? []);
          setSyncNotice(
            loadError instanceof Error
              ? loadError.message
              : "Live Docker sync failed. Showing saved server inventory.",
          );
        } catch (fallbackError) {
          setServerContainers([]);
          setError(
            fallbackError instanceof Error
              ? fallbackError.message
              : "Container sync data could not be loaded.",
          );
        }
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [serverId],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadContainers(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [loadContainers]);

  const handleAssign = async (container: Container) => {
    setAssigningContainerId(container.id);
    setError("");

    try {
      await onAssign(
        Array.from(new Set([...assignedContainerIds, container.id])),
      );
      setServerContainers((current) =>
        current.map((item) =>
          item.id === container.id
            ? { ...item, environmentId }
            : item.environmentId === environmentId
              ? item
              : item,
        ),
      );
    } catch (assignError) {
      setError(
        assignError instanceof Error
          ? assignError.message
          : "Container could not be assigned to this environment.",
      );
    } finally {
      setAssigningContainerId(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-shell"
        style={{ maxWidth: 760 }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="modal-close"
          aria-label="Close import from sync modal"
        >
          <X size={22} />
        </button>
      <div
        className="modal animate-slide-in"
        style={{ width: "100%", maxWidth: 760, padding: 24 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 16,
            paddingRight: 36,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                color: "var(--text-primary)",
                fontWeight: 700,
                fontSize: 16,
                margin: 0,
              }}
            >
              Import from Sync
            </h3>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: 12,
                margin: "3px 0 0",
              }}
            >
              Sync inventory from {serverName}, then assign containers into{" "}
              {environmentName}.
            </p>
          </div>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {[
            { label: "Synced Containers", value: serverContainers.length },
            { label: "Unassigned", value: unassignedCount },
            { label: "Assigned Here", value: assignedContainerIds.length },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: "var(--bg-input)",
                borderRadius: 7,
                padding: "8px 10px",
                border: "1px solid var(--border)",
                minWidth: 0,
              }}
            >
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: 10,
                  marginBottom: 2,
                }}
              >
                {item.label}
              </p>
              <p
                style={{
                  color: "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "JetBrains Mono, monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </section>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CloudSyncIcon size={14} style={{ color: "var(--text-muted)" }} />
            <strong style={{ fontSize: 13 }}>
              Services / Containers
            </strong>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void loadContainers(true)}
            disabled={syncing || loading || assigningContainerId !== null}
            style={{ fontSize: 12 }}
          >
            {syncing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            Sync from Server
          </button>
        </div>

        {syncNotice ? (
          <div
            style={{
              marginBottom: 10,
              borderRadius: 8,
              padding: "9px 12px",
              color: "#f59e0b",
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.3)",
              fontSize: 12,
            }}
          >
            {syncNotice}
          </div>
        ) : null}

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 7,
            overflow: "hidden",
            maxHeight: "52vh",
            overflowY: "auto",
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: 32,
                background: "var(--bg-input)",
                color: "var(--text-muted)",
                fontSize: 12,
              }}
            >
              <Loader2 size={14} className="animate-spin" />
              Loading synced containers
            </div>
          ) : null}

          {!loading && serverContainers.length > 0
            ? serverContainers.map((container) => {
                const assignedHere = container.environmentId === environmentId;
                const assignedElsewhere =
                  Boolean(container.environmentId) && !assignedHere;
                const assigning = assigningContainerId === container.id;

                return (
                  <div
                    key={container.id}
                    style={{
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: "20px minmax(0, 1fr) auto",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      background: assignedHere
                        ? "rgba(16,185,129,0.08)"
                        : "var(--bg-input)",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {assignedHere ? (
                      <CheckSquare size={14} style={{ color: "#10b981" }} />
                    ) : (
                      <Square
                        size={14}
                        style={{ color: "var(--text-muted)" }}
                      />
                    )}
                    <span style={{ minWidth: 0 }}>
                      <strong
                        style={{
                          display: "block",
                          fontSize: 12,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {container.name}
                      </strong>
                      <span
                        style={{
                          display: "block",
                          color: "var(--text-muted)",
                          fontSize: 11,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {container.image}
                      </span>
                      <span
                        style={{
                          display: "block",
                          color: "var(--text-muted)",
                          fontSize: 10,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginTop: 2,
                        }}
                      >
                        {formatStatus(container.status)} -{" "}
                        {formatPorts(container.ports)}
                      </span>
                    </span>
                    {assignedHere ? (
                      <span
                        style={{
                          color: "#94a3b8",
                          border: "1px solid rgba(100,116,139,0.3)",
                          borderRadius: 6,
                          padding: "3px 8px",
                          fontSize: 11,
                        }}
                      >
                        {formatStatus(container.status)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => void handleAssign(container)}
                        disabled={
                          assigningContainerId !== null ||
                          syncing ||
                          loading
                        }
                        style={{
                          color: assignedElsewhere ? "#f59e0b" : "#93c5fd",
                          borderColor: assignedElsewhere
                            ? "rgba(245,158,11,0.3)"
                            : "rgba(59,130,246,0.3)",
                          fontSize: 11,
                          padding: "4px 8px",
                        }}
                      >
                        {assigning ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : null}
                        {assignedElsewhere ? "Reassign" : "Assign"}
                      </button>
                    )}
                  </div>
                );
              })
            : null}

          {!loading && serverContainers.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: 12,
                background: "var(--bg-input)",
                color: "var(--text-muted)",
                fontSize: 12,
              }}
            >
              <Info size={14} />
              No synced containers found on this server.
            </div>
          ) : null}
        </div>

        {error ? (
          <div
            style={{
              marginTop: 14,
              borderRadius: 8,
              padding: "10px 14px",
              color: "#ef4444",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
}
