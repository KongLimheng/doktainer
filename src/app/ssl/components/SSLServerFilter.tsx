"use client";

import { Lock } from "lucide-react";
import { Server } from "@/lib/api";

interface SSLServerFilterProps {
  serverList: Server[];
  selectedServerId: string;
  onChange: (serverId: string) => void | Promise<void>;
}

export default function SSLServerFilter({
  serverList,
  selectedServerId,
  onChange,
}: SSLServerFilterProps) {
  return (
    <div
      className="card ui-responsive-toolbar"
      style={{
        padding: "12px 16px",
      }}
    >
      <div className="ui-inline-cluster">
        <Lock size={14} style={{ color: "var(--text-muted)" }} />
        <span
          className="ui-inline-label"
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            fontWeight: 500,
          }}
        >
          Server:
        </span>
        <div className="ui-chip-scroll no-scrollbar">
          <button
            type="button"
            onClick={() => void onChange("")}
            style={{
              padding: "5px 14px",
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              background:
                selectedServerId === ""
                  ? "rgba(59,130,246,0.15)"
                  : "var(--bg-input)",
              color: selectedServerId === "" ? "#3b82f6" : "var(--text-muted)",
              fontSize: 12,
              fontWeight: 500,
              outline:
                selectedServerId === ""
                  ? "1px solid rgba(59,130,246,0.3)"
                  : "1px solid var(--border)",
            }}
          >
            All Servers
          </button>
          {serverList.map((server) => (
            <button
              key={server.id}
              type="button"
              onClick={() => void onChange(server.id)}
              style={{
                padding: "5px 14px",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                background:
                  selectedServerId === server.id
                    ? "rgba(59,130,246,0.15)"
                    : "var(--bg-input)",
                color:
                  selectedServerId === server.id
                    ? "#3b82f6"
                    : "var(--text-muted)",
                fontSize: 12,
                fontWeight: 500,
                outline:
                  selectedServerId === server.id
                    ? "1px solid rgba(59,130,246,0.3)"
                    : "1px solid var(--border)",
              }}
            >
              {server.name}
            </button>
          ))}
        </div>
      </div>
      <p
        className="ui-toolbar-note"
        style={{ fontSize: 12, color: "var(--text-muted)" }}
      >
        {selectedServerId
          ? "Showing SSL data for the selected server"
          : "Showing SSL data from all servers"}
      </p>
    </div>
  );
}
