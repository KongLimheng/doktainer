import SearchField from "@/components/SearchField";
import { Loader2, Plus, RefreshCw } from "lucide-react";

interface ContainersToolbarProps {
  search: string;
  statusFilter: string;
  syncing: boolean;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSync: () => void | Promise<void>;
  onDeploy: () => void;
}

export default function ContainersToolbar({
  search,
  statusFilter,
  syncing,
  onSearchChange,
  onStatusFilterChange,
  onSync,
  onDeploy,
}: ContainersToolbarProps) {
  return (
    <div
      className="card ui-responsive-toolbar"
      style={{
        padding: "12px 16px",
      }}
    >
      <SearchField
        placeholder="Search containers..."
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        containerStyle={{ flex: "1 1 320px", minWidth: 220 }}
      />
      <select
        className="input"
        value={statusFilter}
        onChange={(event) => onStatusFilterChange(event.target.value)}
        style={{
          cursor: "pointer",
          width: 130,
          maxWidth: "100%",
          flex: "0 0 auto",
        }}
      >
        <option value="ALL">All Status</option>
        {["RUNNING", "STOPPED", "STARTING", "ERROR"].map((status) => (
          <option key={status} value={status}>
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </option>
        ))}
      </select>
      <div className="ui-toolbar-actions">
        <button
          type="button"
          className="btn btn-ghost"
          style={{ fontSize: 12 }}
          onClick={() => void onSync()}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          Sync from Docker
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ fontSize: 12 }}
          onClick={onDeploy}
        >
          <Plus size={12} /> Deploy
        </button>
      </div>
    </div>
  );
}
