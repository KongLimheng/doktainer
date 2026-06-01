"use client";

import type { Server as ServerRecord } from "@/lib/api";

interface ServerAccessSelectorProps {
  availableServers: ServerRecord[];
  allServersAccess: boolean;
  selectedServerIds: string[];
  onAllServersChange: (value: boolean) => void;
  onSelectionChange: (value: string[]) => void;
}

export default function ServerAccessSelector({
  availableServers,
  allServersAccess,
  selectedServerIds,
  onAllServersChange,
  onSelectionChange,
}: ServerAccessSelectorProps) {
  const toggleServer = (serverId: string) => {
    if (selectedServerIds.includes(serverId)) {
      onSelectionChange(
        selectedServerIds.filter((value) => value !== serverId),
      );
      return;
    }
    onSelectionChange([...selectedServerIds, serverId]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onAllServersChange(true)}
          style={{
            flex: 1,
            borderColor: allServersAccess ? "rgba(16,185,129,0.35)" : undefined,
            color: allServersAccess ? "#10b981" : undefined,
            background: allServersAccess ? "rgba(16,185,129,0.08)" : undefined,
          }}
        >
          All Servers
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onAllServersChange(false)}
          style={{
            flex: 1,
            borderColor: !allServersAccess
              ? "rgba(59,130,246,0.35)"
              : undefined,
            color: !allServersAccess ? "#3b82f6" : undefined,
            background: !allServersAccess ? "rgba(59,130,246,0.08)" : undefined,
          }}
        >
          Selected Servers
        </button>
      </div>

      {!allServersAccess ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 8,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {availableServers.map((server) => {
            const checked = selectedServerIds.includes(server.id);
            return (
              <label
                key={server.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: checked
                    ? "rgba(59,130,246,0.08)"
                    : "var(--bg-input)",
                  border: `1px solid ${checked ? "rgba(59,130,246,0.28)" : "var(--border)"}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleServer(server.id)}
                  style={{ accentColor: "#3b82f6" }}
                />
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    {server.name}
                  </p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {server.ip}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
