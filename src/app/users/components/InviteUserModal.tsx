"use client";

import { AlertCircle, CheckCircle, Copy, Key, Loader2 } from "lucide-react";
import { useState } from "react";
import type {
  CreateUserInvitationBody,
  Server as ServerRecord,
} from "@/lib/api";
import ServerAccessSelector from "@/app/users/components/ServerAccessSelector";
import { manageableRoles } from "@/app/users/components/user-role-config";
import {
  copyText,
  formatRelativeDate,
} from "@/app/users/components/user-utils";

interface InviteUserModalProps {
  availableServers: ServerRecord[];
  onClose: () => void;
  onSubmit: (payload: CreateUserInvitationBody) => Promise<void>;
  onCopySuccess: () => void;
  submitting: boolean;
  error: string;
  result: { inviteUrl: string; email: string; expiresAt: string } | null;
}

export default function InviteUserModal({
  availableServers,
  onClose,
  onSubmit,
  onCopySuccess,
  submitting,
  error,
  result,
}: InviteUserModalProps) {
  const [form, setForm] = useState<CreateUserInvitationBody>({
    name: "",
    email: "",
    role: "DEVELOPER",
    allServersAccess: true,
    serverIds: [],
    expiresInDays: 7,
  });
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(form);
  };

  const handleCopy = async () => {
    if (!result) return;
    await copyText(result.inviteUrl);
    setCopied(true);
    onCopySuccess();
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 560 }}
        onClick={(event) => event.stopPropagation()}
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
                fontSize: 15,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Invite User
            </h3>
            <p
              style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}
            >
              Generate an onboarding link so the user sets their own password.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            x
          </button>
        </div>

        {result ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.28)",
                borderRadius: 10,
                padding: "12px 14px",
                color: "#10b981",
              }}
            >
              <CheckCircle size={16} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 700 }}>
                  Invitation link ready
                </p>
                <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  Send this link to {result.email}. It expires{" "}
                  {formatRelativeDate(result.expiresAt)}.
                </p>
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 14,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginBottom: 8,
                }}
              >
                Invitation Link
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-primary)",
                  wordBreak: "break-all",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {result.inviteUrl}
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={onClose}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => void handleCopy()}
              >
                {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy Invite Link"}
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            {error ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#ef4444",
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              >
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: 5,
                    display: "block",
                    fontWeight: 500,
                  }}
                >
                  Full Name
                </label>
                <input
                  className="input"
                  placeholder="Jane Doe"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: 5,
                    display: "block",
                    fontWeight: 500,
                  }}
                >
                  Email Address
                </label>
                <input
                  className="input"
                  placeholder="user@example.com"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: 5,
                    display: "block",
                    fontWeight: 500,
                  }}
                >
                  Role
                </label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      role: event.target
                        .value as CreateUserInvitationBody["role"],
                    }))
                  }
                >
                  {manageableRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: 5,
                    display: "block",
                    fontWeight: 500,
                  }}
                >
                  Link Expiry
                </label>
                <select
                  className="input"
                  value={form.expiresInDays ?? 7}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expiresInDays: Number(event.target.value),
                    }))
                  }
                >
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                  display: "block",
                  fontWeight: 500,
                }}
              >
                Server Access
              </label>
              <ServerAccessSelector
                availableServers={availableServers}
                allServersAccess={form.allServersAccess}
                selectedServerIds={form.serverIds}
                onAllServersChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    allServersAccess: value,
                    serverIds: value ? [] : current.serverIds,
                  }))
                }
                onSelectionChange={(value) =>
                  setForm((current) => ({ ...current, serverIds: value }))
                }
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1 }}
                type="button"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Key size={12} />
                )}
                Generate Invite
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
