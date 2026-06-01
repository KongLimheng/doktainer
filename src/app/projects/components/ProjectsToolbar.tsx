import SearchField from "@/components/SearchField";
import { FolderPlus, Loader2, RefreshCw } from "lucide-react";

interface ProjectsToolbarProps {
  search: string;
  refreshing: boolean;
  canCreate: boolean;
  searchPlaceholder?: string;
  addLabel?: string;
  refreshLabel?: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void | Promise<void>;
  onAdd: () => void;
}

export default function ProjectsToolbar({
  search,
  refreshing,
  canCreate,
  searchPlaceholder = "Search projects...",
  addLabel = "Add Project",
  refreshLabel = "Refresh",
  onSearchChange,
  onRefresh,
  onAdd,
}: ProjectsToolbarProps) {
  return (
    <div
      className="card ui-responsive-toolbar"
      style={{
        padding: "12px 16px",
      }}
    >
      <SearchField
        placeholder={searchPlaceholder}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        containerStyle={{ flex: "1 1 360px", minWidth: 240 }}
      />
      <div className="ui-toolbar-actions">
        <button
          type="button"
          className="btn btn-ghost"
          style={{ fontSize: 12 }}
          onClick={() => void onRefresh()}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          {refreshLabel}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ fontSize: 12 }}
          onClick={onAdd}
          disabled={!canCreate}
        >
          <FolderPlus size={12} /> {addLabel}
        </button>
      </div>
    </div>
  );
}
