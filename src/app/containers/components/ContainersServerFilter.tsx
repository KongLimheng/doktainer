import { HardDrive } from "lucide-react";
import type { Server } from "@/lib/api";

interface ContainersServerFilterProps {
  serverList: Server[];
  selectedServerId: string;
  onChange: (serverId: string) => void | Promise<void>;
}

function getButtonStyle(isSelected: boolean) {
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

export default function ContainersServerFilter({
  serverList,
  selectedServerId,
  onChange,
}: ContainersServerFilterProps) {
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
            style={getButtonStyle(selectedServerId === "")}
          >
            All Servers
          </button>
          {serverList.map((server) => (
            <button
              type="button"
              key={server.id}
              onClick={() => void onChange(server.id)}
              style={getButtonStyle(selectedServerId === server.id)}
            >
              {server.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
