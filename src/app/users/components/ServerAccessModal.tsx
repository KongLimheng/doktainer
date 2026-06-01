"use client";

import { AlertCircle, Loader2, Shield } from "lucide-react";
import { useState } from "react";
import type { Server as ServerRecord, UserRecord } from "@/lib/api";
import ServerAccessSelector from "@/app/users/components/ServerAccessSelector";

interface ServerAccessModalProps {
  user: UserRecord;
  availableServers: ServerRecord[];
  onClose: () => void;
  onSubmit: (payload: {
    allServersAccess: boolean;
    serverIds: string[];
  }) => Promise<void>;
  submitting: boolean;
  error: string;
}

export default function ServerAccessModal({
  user,
  availableServers,
  onClose,
  onSubmit,
  submitting,
  error,
}: ServerAccessModalProps) {
  const [allServersAccess, setAllServersAccess] = useState(
    user.role === "SUPER_ADMIN" ? true : user.allServersAccess,
  );
  const [serverIds, setServerIds] = useState(
    user.serverAssignments.map((assignment) => assignment.serverId),
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 600 }}
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
              Server Access
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {user.email}
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
              marginBottom: 12,
            }}
          >
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        ) : null}

        {user.role === "SUPER_ADMIN" ? (
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              border: "1px solid rgba(239,68,68,0.25)",
              background: "rgba(239,68,68,0.08)",
              color: "var(--text-secondary)",
              fontSize: 12,
            }}
          >
            Super Admin always has access to all servers.
          </div>
        ) : (
          <ServerAccessSelector
            availableServers={availableServers}
            allServersAccess={allServersAccess}
            selectedServerIds={serverIds}
            onAllServersChange={(value) => {
              setAllServersAccess(value);
              if (value) setServerIds([]);
            }}
            onSelectionChange={setServerIds}
          />
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => void onSubmit({ allServersAccess, serverIds })}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Shield size={12} />
            )}
            Save Access
          </button>
        </div>
      </div>
    </div>
  );
}