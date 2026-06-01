"use client";

import { Database, Loader2, Play, Square, Trash2 } from "lucide-react";
import type { DatabaseContainer } from "./database-types";
import { typeColors } from "./database-constants";

interface DatabaseGridProps {
  filteredData: DatabaseContainer[];
  actioning: string | null;
  removing: string | null;
  onAction: (container: DatabaseContainer, action: "start" | "stop") => void;
  onRemove: (id: string, name: string) => void;
}

export default function DatabaseGrid({
  filteredData,
  actioning,
  removing,
  onAction,
  onRemove,
}: DatabaseGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(380px, 100%), 1fr))",
        gap: 14,
      }}
    >
      {filteredData.map((db) => {
        const color =
          db.databaseColor ?? typeColors[db.databaseType] ?? "#3b82f6";
        const label = db.databaseLabel;
        const isRunning = db.status === "RUNNING";
        const isFailed = db.status === "ERROR";

        return (
          <div
            key={db.id}
            className="card"
            style={{ padding: 18, position: "relative", overflow: "hidden" }}
          >
            <div
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: color,
                opacity: 0.05,
                filter: "blur(20px)",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 9,
                    background: `${color}18`,
                    border: `1px solid ${color}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Database size={16} style={{ color }} />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {db.name}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {label}
                    {db.exposedPort ? ` · :${db.exposedPort}` : ""}
                  </p>
                </div>
              </div>
              <span
                style={{
                  background: isRunning
                    ? "rgba(16,185,129,0.1)"
                    : isFailed
                      ? "rgba(239,68,68,0.1)"
                      : "rgba(100,116,139,0.1)",
                  color: isRunning
                    ? "#10b981"
                    : isFailed
                      ? "#ef4444"
                      : "#64748b",
                  border: `1px solid ${isRunning ? "rgba(16,185,129,0.3)" : isFailed ? "rgba(239,68,68,0.3)" : "rgba(100,116,139,0.3)"}`,
                  padding: "3px 9px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {isRunning && (
                  <span
                    className="animate-pulse-dot"
                    style={{
                      display: "inline-block",
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "currentColor",
                    }}
                  />
                )}
                {db.status.charAt(0) + db.status.slice(1).toLowerCase()}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {[
                { label: "Server", value: db.server?.name ?? "—" },
                { label: "Port", value: db.exposedPort ?? "—" },
                { label: "Container", value: db.name ?? "—" },
                { label: "Image", value: db.image },
              ].map((m) => (
                <div
                  key={m.label}
                  style={{
                    background: "var(--bg-input)",
                    borderRadius: 7,
                    padding: "8px 10px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      color: "var(--text-muted)",
                      marginBottom: 2,
                    }}
                  >
                    {m.label}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontFamily: "JetBrains Mono, monospace",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.value}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {isRunning ? (
                <button
                  className="btn btn-danger"
                  style={{ flex: 1, fontSize: 11, padding: "5px" }}
                  onClick={() => onAction(db, "stop")}
                  disabled={actioning === db.id}
                >
                  {actioning === db.id ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Square size={11} />
                  )}{" "}
                  Stop
                </button>
              ) : (
                <button
                  className="btn btn-success"
                  style={{ flex: 1, fontSize: 11, padding: "5px" }}
                  onClick={() => onAction(db, "start")}
                  disabled={actioning === db.id}
                >
                  {actioning === db.id ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Play size={11} />
                  )}{" "}
                  Start
                </button>
              )}
              <button
                className="btn btn-ghost"
                style={{ flex: 1, fontSize: 11, padding: "5px" }}
                onClick={() => onRemove(db.id, db.name)}
                disabled={removing === db.id}
              >
                {removing === db.id ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Trash2 size={11} />
                )}{" "}
                Remove
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
