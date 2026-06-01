"use client";

import type { ServerConfigSnapshot } from "@/lib/api";
import { UserBadge } from "@/app/servers/components/server-config/ServerConfigPrimitives";

interface ServerConfigMountsPanelProps {
  snapshot: ServerConfigSnapshot;
  snapshotLoadError?: string | null;
}

export default function ServerConfigMountsPanel({
  snapshot,
  snapshotLoadError,
}: ServerConfigMountsPanelProps) {
  const hasMounts = snapshot.diskMounts.length > 0;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card" style={{ padding: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong style={{ color: "var(--text-primary)", fontSize: 14 }}>
              Disk Mount Inventory
            </strong>
            <p
              style={{ marginTop: 6, color: "var(--text-muted)", fontSize: 13 }}
            >
              Filesystems reported by df excluding temporary mounts.
            </p>
          </div>
          <UserBadge
            label={`${snapshot.diskMounts.length} mounts`}
            tone="info"
          />
        </div>
      </div>
      {hasMounts ? (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Filesystem</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Used</th>
                  <th>Available</th>
                  <th>Use%</th>
                  <th>Mount Point</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.diskMounts.map((mount) => (
                  <tr key={`${mount.filesystem}-${mount.mountPoint}`}>
                    <td>{mount.filesystem}</td>
                    <td>{mount.type}</td>
                    <td>{mount.size}</td>
                    <td>{mount.used}</td>
                    <td>{mount.available}</td>
                    <td>{mount.usedPercent}</td>
                    <td>{mount.mountPoint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          className="card"
          style={{ padding: 20, color: "var(--text-muted)", fontSize: 13 }}
        >
          {snapshotLoadError
            ? `Disk mount information is unavailable because the live server snapshot could not be fetched: ${snapshotLoadError}`
            : "No disk mounts were returned by the server snapshot."}
        </div>
      )}
    </div>
  );
}
