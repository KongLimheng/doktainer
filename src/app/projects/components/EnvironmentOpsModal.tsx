"use client";

import { useMemo, useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import {
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
  ) => Promise<void>;
}

const kinds: Array<{ value: ProjectEnvironmentKind; label: string }> = [
  { value: "PRODUCTION", label: "Production" },
  { value: "STAGING", label: "Staging" },
  { value: "DEVELOPMENT", label: "Development" },
  { value: "PREVIEW", label: "Preview" },
  { value: "CUSTOM", label: "Custom" },
];

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
  const [error, setError] = useState("");

  const hasServerChanged = serverId !== environment.serverId;
  const hasAssignedContainers = environment.containersCount > 0;
  const canSubmit = useMemo(
    () =>
      name.trim().length >= 2 &&
      serverId.trim().length > 0 &&
      (!hasServerChanged || !hasAssignedContainers),
    [hasAssignedContainers, hasServerChanged, name, serverId],
  );

  const selectedServer = serverList.find((server) => server.id === serverId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSubmit) {
      setError(
        hasServerChanged && hasAssignedContainers
          ? "Move or unassign containers before moving this environment to another server."
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
              Informasi dan edit metadata environment.
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
            { label: "Containers", value: environment.containersCount },
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

        {hasServerChanged && hasAssignedContainers ? (
          <p style={{ color: "#f59e0b", fontSize: 12, marginTop: 10 }}>
            Environment can only be moved to another server if it does not have
            any container assigned. Use Import from Sync on the environment
            page to manage container assignments.
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
            disabled={!canSubmit || submitting}
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
