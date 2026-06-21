"use client";

import { useMemo, useState } from "react";
import { Loader2, LucideRocket, X } from "lucide-react";
import type {
  ProjectEnvironmentCreateBody,
  ProjectEnvironmentKind,
  Server,
} from "@/lib/api";

interface EnvironmentFormModalProps {
  projectName: string;
  serverList: Server[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: ProjectEnvironmentCreateBody) => Promise<void>;
}

const kinds: Array<{ value: ProjectEnvironmentKind; label: string }> = [
  { value: "PRODUCTION", label: "Production" },
  { value: "STAGING", label: "Staging" },
  { value: "DEVELOPMENT", label: "Development" },
  { value: "PREVIEW", label: "Preview" },
  { value: "CUSTOM", label: "Custom" },
];

export default function EnvironmentFormModal({
  projectName,
  serverList,
  submitting,
  onClose,
  onSubmit,
}: EnvironmentFormModalProps) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ProjectEnvironmentKind>("STAGING");
  const [serverId, setServerId] = useState(serverList[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const canSubmit = useMemo(
    () => name.trim().length >= 2 && serverId.trim().length > 0,
    [name, serverId],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSubmit) {
      setError("Lengkapi nama environment dan server tujuan.");
      return;
    }

    setError("");
    await onSubmit({
      name: name.trim(),
      kind,
      serverId,
      description: description.trim(),
    });
  };

  return (
    <div className="modal-overlay" onClick={submitting ? undefined : onClose}>
      <div
        className="modal-shell"
        style={{ maxWidth: 560 }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="modal-close"
          aria-label="Close environment modal"
        >
          <X size={22} />
        </button>
      <form
        className="modal animate-slide-in"
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 560,
          padding: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 20,
            paddingRight: 36,
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
              Add Environment
            </h3>
            <p
              style={{ marginTop: 2, color: "var(--text-muted)", fontSize: 12 }}
            >
              Tambahkan environment baru ke project {projectName}.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 5,
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              Name*
            </label>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Environment name, e.g. for Production Project"
              minLength={5}
              maxLength={36}
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
              Kind*
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
              Server*
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
              placeholder="Description of your environment before deployment..."
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {error ? (
          <div
            style={{
              marginTop: 16,
              borderRadius: 12,
              padding: 12,
              color: "#fecaca",
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
            onClick={onClose}
            disabled={submitting}
            className="btn btn-ghost"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="btn btn-primary"
          >
            {submitting ? (
              <Loader2 size={18} style={{ marginRight: 0 }} />
            ) : (
              <LucideRocket size={18} style={{ marginRight: 0 }} />
            )}
            {submitting ? "Adding..." : "Add Environment"}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
