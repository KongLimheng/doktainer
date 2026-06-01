import SearchField from "@/components/SearchField";
import { Loader2, Plus, RefreshCw } from "lucide-react";

interface DatabaseToolbarProps {
  search: string;
  syncing: boolean;
  onSearchChange: (value: string) => void;
  onSync: () => void | Promise<void>;
  onAdd: () => void;
}

export default function DatabaseToolbar({
  search,
  syncing,
  onSearchChange,
  onSync,
  onAdd,
}: DatabaseToolbarProps) {
  return (
    <div
      className="card ui-responsive-toolbar"
      style={{
        padding: "12px 16px",
      }}
    >
      <SearchField
        placeholder="Search databases..."
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        containerStyle={{ flex: "1 1 360px", minWidth: 240 }}
      />
      <div className="ui-toolbar-actions" style={{}}>
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
          onClick={onAdd}
        >
          <Plus size={12} /> Add Database
        </button>
      </div>
    </div>
  );
}
