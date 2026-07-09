"use client";

import { useMemo, useState } from "react";
import { FolderArchive, Loader2, LucideRocket, X } from "lucide-react";
import type { ProjectCreateBody, ProjectRecord, Server } from "@/lib/api";
import SearchableSelect from "@/components/SearchableSelect";
import type { SearchableSelectOption } from "@/components/SearchableSelect";

interface ProjectFormModalProps {
  project?: ProjectRecord;
  submitting: boolean;
  servers?: Server[];
  onClose: () => void;
  onSubmit: (payload: ProjectCreateBody) => Promise<void>;
}

export default function ProjectFormModal({
  project,
  submitting,
  servers,
  onClose,
  onSubmit,
}: ProjectFormModalProps) {
  const isEditing = Boolean(project);
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [serverId, setServerId] = useState("");
  const [error, setError] = useState("");

  const canSubmit = useMemo(
    () => name.trim().length >= 5 && (isEditing || serverId),
    [name, isEditing, serverId],
  );

  const serverOptions: SearchableSelectOption[] = useMemo(
    () =>
      (servers ?? []).map((s) => ({
        value: s.id,
        label: s.name,
        keywords: `${s.ip} ${s.os ?? ""}`,
        description: `${s.ip} — ${s.status}`,
      })),
    [servers],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSubmit) {
      setError(
        isEditing
          ? "Complete the project name (minimum 5 characters)."
          : "Select a server and enter the project name.",
      );
      return;
    }

    setError("");
    const payload = {
      name: name.trim(),
      description: description.trim(),
      ...(isEditing
        ? {}
        : {
            environments: [
              {
                name: "Development",
                kind: "DEVELOPMENT" as const,
                serverId,
              },
            ],
          }),
    };

    await onSubmit(payload);
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
          aria-label="Close project modal"
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
                  display: "flex",
                  alignItems: "center",
                  color: "var(--text-primary)",
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                <FolderArchive size={18} style={{ marginRight: 8 }} />
                {isEditing ? "Project Detail/Ops" : "Create New Project"}
              </h3>
              <p
                style={{
                  marginTop: 2,
                  color: "var(--text-muted)",
                  fontSize: 12,
                }}
              >
                {isEditing
                  ? "Update project information used across environments and deployments."
                  : "Create a new project to manage your environments and deployments."}
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: 14, marginBottom: 20 }}>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 5,
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                Project Name
              </label>
              <input
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Project name, e.g. Doktainer App"
                minLength={5}
                maxLength={35}
                style={{ width: "100%" }}
              />
            </div>
            {!isEditing && serverOptions.length >= 0 ? (
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 5,
                    fontSize: 12,
                    color: "var(--text-muted)",
                  }}
                >
                  Default Server{" "}
                  <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <SearchableSelect
                  value={serverId}
                  options={serverOptions}
                  onChange={setServerId}
                  placeholder="Select a server…"
                  searchPlaceholder="Search servers…"
                  emptyText="No servers available"
                />
                <p
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: "var(--text-muted)",
                  }}
                >
                  An environment "Development" will be created on this server.
                </p>
              </div>
            ) : null}
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
              <textarea
                className="input"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Description of your project..."
                style={{ width: "100%", resize: "vertical" }}
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
              gap: 5,
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
              disabled={submitting || !canSubmit}
              className="btn btn-primary"
            >
              {submitting ? (
                <Loader2 size={18} style={{ marginRight: 0 }} />
              ) : (
                <LucideRocket size={18} style={{ marginRight: 0 }} />
              )}
              {submitting
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
