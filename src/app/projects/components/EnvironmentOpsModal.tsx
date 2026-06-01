"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  Info,
  Loader2,
  Save,
  Server as ServerIcon,
  Square,
  X,
} from "lucide-react";
import {
  type Container,
  containers,
  type ProjectEnvironmentKind,
  type ProjectEnvironmentRecord,
  type ProjectEnvironmentUpdateBody,
  type Server,
} from "@/lib/api";

interface EnvironmentOpsModalProps {
  environment: ProjectEnvironmentRecord;
  serverList: Server[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (
    environmentId: string,
    payload: ProjectEnvironmentUpdateBody,
    containerIds: string[],
  ) => Promise<void>;
}

const kinds: Array<{ value: ProjectEnvironmentKind; label: string }> = [
  { value: "PRODUCTION", label: "Production" },
  { value: "STAGING", label: "Staging" },
  { value: "DEVELOPMENT", label: "Development" },
  { value: "PREVIEW", label: "Preview" },
  { value: "CUSTOM", label: "Custom" },
];

function formatStatus(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function EnvironmentOpsModal({
  environment,
  serverList,
  submitting,
  onClose,
  onSubmit,
}: EnvironmentOpsModalProps) {
  const [name, setName] = useState(environment.name);
  const [kind, setKind] = useState<ProjectEnvironmentKind>(environment.kind);
  const [serverId, setServerId] = useState(environment.serverId);
  const [description, setDescription] = useState(environment.description ?? "");
  const [serverContainers, setServerContainers] = useState<Container[]>([]);
  const [selectedContainerIds, setSelectedContainerIds] = useState<string[]>(
    [],
  );
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadContainers = async () => {
      setLoadingContainers(true);
      setError("");

      try {
        const response = await containers.list({ serverId });
        if (!mounted) {
          return;
        }

        const nextContainers = response.data ?? [];
        setServerContainers(nextContainers);
        setSelectedContainerIds(
          nextContainers
            .filter((container) => container.environmentId === environment.id)
            .map((container) => container.id),
        );
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        setServerContainers([]);
        setSelectedContainerIds([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Container tidak bisa dimuat.",
        );
      } finally {
        if (mounted) {
          setLoadingContainers(false);
        }
      }
    };

    void loadContainers();

    return () => {
      mounted = false;
    };
  }, [environment.id, serverId]);

  const hasServerChanged = serverId !== environment.serverId;
  const canSubmit = useMemo(
    () =>
      name.trim().length >= 2 &&
      serverId.trim().length > 0 &&
      (!hasServerChanged || selectedContainerIds.length === 0),
    [hasServerChanged, name, selectedContainerIds.length, serverId],
  );

  const selectedServer = serverList.find((server) => server.id === serverId);

  const toggleContainer = (containerId: string) => {
    setSelectedContainerIds((current) =>
      current.includes(containerId)
        ? current.filter((id) => id !== containerId)
        : [...current, containerId],
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSubmit) {
      setError(
        hasServerChanged
          ? "Lepas semua container sebelum memindahkan environment ke server lain."
          : "Lengkapi nama environment dan server tujuan.",
      );
      return;
    }

    setError("");
    await onSubmit(
      environment.id,
      {
        name: name.trim(),
        kind,
        serverId,
        description: description.trim(),
      },
      selectedContainerIds,
    );
  };

  return (
    <div className="modal-overlay" onClick={submitting ? undefined : onClose}>
      <form
        className="modal animate-slide-in"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        style={{ width: "100%", maxWidth: 760, padding: 28 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
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
              Environment Detail/Ops
            </h3>
            <p
              style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}
            >
              Informasi, edit metadata, dan pointing services/container.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {[
            { label: "Environment", value: environment.slug },
            {
              label: "Server",
              value: selectedServer?.name ?? environment.server.name,
            },
            {
              label: "Server IP",
              value: selectedServer?.ip ?? environment.server.ip,
            },
            { label: "Containers", value: selectedContainerIds.length },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: "var(--bg-input)",
                borderRadius: 7,
                padding: "8px 10px",
                border: "1px solid var(--border)",
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

        <hr style={{ border: "1px solid var(--border)", marginBottom: 20 }} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 5,
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              Name
            </label>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 5,
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              Kind
            </label>
            <select
              className="input"
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as ProjectEnvironmentKind)
              }
              style={{ width: "100%" }}
            >
              {kinds.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 5,
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              Server
            </label>
            <select
              className="input"
              value={serverId}
              onChange={(event) => setServerId(event.target.value)}
              style={{ width: "100%" }}
            >
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
                display: "block",
                marginBottom: 5,
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              Description
            </label>
            <input
              className="input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <section style={{ marginTop: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ServerIcon size={14} style={{ color: "var(--text-muted)" }} />
              <strong style={{ fontSize: 13 }}>Services / Containers</strong>
            </div>
            {loadingContainers ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--text-muted)",
                  fontSize: 12,
                }}
              >
                <Loader2 size={12} className="animate-spin" />
                Loading
              </span>
            ) : null}
          </div>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 7,
              overflow: "hidden",
            }}
          >
            {serverContainers.length > 0 ? (
              serverContainers.map((container) => {
                const checked = selectedContainerIds.includes(container.id);
                const ownedByOtherEnvironment =
                  container.environmentId &&
                  container.environmentId !== environment.id;

                return (
                  <button
                    type="button"
                    key={container.id}
                    onClick={() => toggleContainer(container.id)}
                    style={{
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: "20px minmax(0, 1fr) auto",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      background: checked
                        ? "rgba(16,185,129,0.08)"
                        : "var(--bg-input)",
                      border: 0,
                      borderBottom: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {checked ? (
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
                    </span>
                    <span
                      style={{
                        color: ownedByOtherEnvironment ? "#f59e0b" : "#94a3b8",
                        border: `1px solid ${
                          ownedByOtherEnvironment
                            ? "rgba(245,158,11,0.3)"
                            : "rgba(100,116,139,0.3)"
                        }`,
                        borderRadius: 6,
                        padding: "3px 8px",
                        fontSize: 11,
                      }}
                    >
                      {ownedByOtherEnvironment
                        ? "Reassign"
                        : formatStatus(container.status)}
                    </span>
                  </button>
                );
              })
            ) : (
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
                No containers are assigned to this server.
              </div>
            )}
          </div>
        </section>

        {hasServerChanged ? (
          <p style={{ color: "#f59e0b", fontSize: 12, marginTop: 10 }}>
            Environment can only be moved to another server if it does not have
            any container assigned. Please reassign or remove all containers
            before changing the server.
          </p>
        ) : null}

        {error ? (
          <div
            style={{
              marginTop: 16,
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: 10,
            marginTop: 20,
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!canSubmit || submitting || loadingContainers}
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Save Ops
          </button>
        </div>
      </form>
    </div>
  );
}
