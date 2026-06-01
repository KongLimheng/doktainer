"use client";

import { Settings2, Shield } from "lucide-react";
import type { Server as ServerType, ServerConfigSnapshot } from "@/lib/api";
import { formatDateTime } from "@/app/servers/components/server-utils";
import { ConfigInfoRow } from "@/app/servers/components/server-config/ServerConfigPrimitives";

interface ServerConfigOverviewPanelProps {
  server: ServerType;
  snapshot: ServerConfigSnapshot;
  snapshotLoadError?: string | null;
}

export default function ServerConfigOverviewPanel({
  server,
  snapshot,
  snapshotLoadError,
}: ServerConfigOverviewPanelProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 2fr))",
        gap: 16,
      }}
    >
      {snapshotLoadError ? (
        <div
          hidden
          className="card"
          style={{
            padding: 18,
            display: "grid",
            gap: 8,
            gridColumn: "1 / -1",
            border: "1px solid rgba(245,158,11,0.24)",
            background: "rgba(245,158,11,0.08)",
          }}
        >
          <strong style={{ color: "#f59e0b", fontSize: 14 }}>
            Runtime data unavailable
          </strong>
          <p
            style={{
              color: "var(--text-primary)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            The server is not returning a live configuration snapshot right now.
            Basic host identity is still shown below, and recovery actions
            remain available in the Actions tab.
          </p>
          <p style={{ color: "#fbbf24", fontSize: 12 }}>{snapshotLoadError}</p>
        </div>
      ) : null}
      <div
        className="card"
        style={{ padding: 18, display: "grid", gap: 12 }}
        hidden={snapshotLoadError != null}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Settings2 size={15} style={{ color: "#3b82f6" }} />
          <strong style={{ color: "var(--text-primary)", fontSize: 14 }}>
            Server Overview
          </strong>
        </div>
        <ConfigInfoRow
          label="Hostname"
          value={snapshot.hostname ?? server.name}
        />
        <ConfigInfoRow label="Operating System" value={snapshot.os ?? "—"} />
        <ConfigInfoRow label="Kernel" value={snapshot.kernel ?? "—"} />
        <ConfigInfoRow label="SSH User" value={snapshot.serverUser} />
        <ConfigInfoRow
          label="Detected User"
          value={snapshot.currentUser ?? "—"}
        />
        <ConfigInfoRow
          label="Last Boot"
          value={formatDateTime(snapshot.lastBoot)}
        />
        <ConfigInfoRow
          label="Fetched At"
          value={formatDateTime(snapshot.fetchedAt)}
        />
      </div>
      <div
        style={{ display: "grid", gap: 16 }}
        hidden={snapshotLoadError != null}
      >
        <div className="card" style={{ padding: 18, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Shield size={15} style={{ color: "#10b981" }} />
            <strong style={{ color: "var(--text-primary)", fontSize: 14 }}>
              Access & Runtime
            </strong>
          </div>
          <ConfigInfoRow
            label="Sudo"
            value={
              snapshot.sudoNonInteractive
                ? "Non-interactive sudo ready"
                : "Requires root or interactive sudo"
            }
          />
          <ConfigInfoRow
            label="Docker"
            value={
              snapshot.docker.probeFailed
                ? `Status check failed${snapshot.docker.reason ? ` • ${snapshot.docker.reason}` : ""}`
                : snapshot.docker.available
                ? `Ready${snapshot.docker.version ? ` • ${snapshot.docker.version}` : ""}`
                : (snapshot.docker.reason ?? "Not ready")
            }
          />
          <ConfigInfoRow
            label="Package Manager"
            value={snapshot.docker.platform.packageManager ?? "—"}
          />
          <ConfigInfoRow
            label="Tracked Users"
            value={`${snapshot.users.length} account(s)`}
          />
        </div>
        <div
          className="card"
          style={{
            padding: 18,
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(16,185,129,0.05))",
          }}
        >
          <p
            style={{
              color: "var(--text-primary)",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Root visibility
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>
            {snapshot.rootUser
              ? `Root account detected with groups: ${snapshot.rootUser.groups.join(", ") || "none"}.`
              : "No root account was detected from the current /etc/passwd snapshot."}
          </p>
        </div>
      </div>
    </div>
  );
}
