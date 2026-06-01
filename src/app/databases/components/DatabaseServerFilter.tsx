import { HardDrive } from "lucide-react";
import type { Server } from "@/lib/api";

interface DatabaseServerFilterProps {
  serverList: Server[];
  selectedServerId: string;
  onChange: (serverId: string) => void | Promise<void>;
}

function getButtonStyles(isSelected: boolean) {
  return {
    padding: "5px 14px",
    borderRadius: 7,
    border: "none",
    cursor: "pointer",
    background: isSelected ? "rgba(59,130,246,0.15)" : "var(--bg-input)",
    color: isSelected ? "#3b82f6" : "var(--text-muted)",
    fontSize: 12,
    fontWeight: 500,
    outline: isSelected
      ? "1px solid rgba(59,130,246,0.3)"
      : "1px solid var(--border)",
  } as const;
}

export default function DatabaseServerFilter({
  serverList,
  selectedServerId,
  onChange,
}: DatabaseServerFilterProps) {
  return (
    <div
      className="card ui-responsive-toolbar"
      style={{
        padding: "12px 16px",
      }}
    >
      <div className="ui-inline-cluster">
        <HardDrive size={14} style={{ color: "var(--text-muted)" }} />
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
            style={getButtonStyles(selectedServerId === "")}
          >
            All Servers
          </button>
          {serverList.map((server) => (
            <button
              type="button"
              key={server.id}
              onClick={() => void onChange(server.id)}
              style={getButtonStyles(selectedServerId === server.id)}
            >
              {server.name}
            </button>
          ))}
        </div>
      </div>
      {/* <p
        className="ui-toolbar-note"
        style={{ fontSize: 12, color: "var(--text-muted)" }}
      >
        {selectedServerId
          ? "Sync database container only for the selected server"
          : "Default mode: show all databases from all servers"}
      </p> */}
    </div>
  );
}
