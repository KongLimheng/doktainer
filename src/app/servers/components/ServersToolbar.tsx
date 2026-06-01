import SearchField from "@/components/SearchField";
import { Plus, RefreshCw } from "lucide-react";

interface ServersToolbarProps {
  search: string;
  filter: string;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onRefresh: () => void | Promise<void>;
  onAddServer: () => void;
}

export default function ServersToolbar({
  search,
  filter,
  totalCount,
  onSearchChange,
  onFilterChange,
  onRefresh,
  onAddServer,
}: ServersToolbarProps) {
  return (
    <div
      className="card ui-responsive-toolbar"
      style={{
        padding: "12px 16px",
      }}
    >
      <SearchField
        placeholder="Search servers..."
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        containerStyle={{ flex: "1 1 360px", minWidth: 240 }}
      />
      <div className="ui-pill-switch no-scrollbar" style={{}}>
        {["ALL", "ONLINE", "WARNING", "OFFLINE"].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onFilterChange(item)}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              background: filter === item ? "var(--bg-card)" : "transparent",
              color:
                filter === item ? "var(--text-primary)" : "var(--text-muted)",
              transition: "all 0.15s",
            }}
          >
            {item === "ALL"
              ? `All (${totalCount})`
              : item.charAt(0) + item.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      <div className="ui-toolbar-actions" style={{}}>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 12 }}
          onClick={() => void onRefresh()}
        >
          <RefreshCw size={12} /> Refresh
        </button>
        <button
          className="btn btn-primary"
          style={{ fontSize: 12 }}
          onClick={onAddServer}
        >
          <Plus size={12} /> Add Server
        </button>
      </div>
    </div>
  );
}
