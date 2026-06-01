import { FolderTree, Loader2, Plus } from "lucide-react";

interface ProjectsStatePanelProps {
  loading: boolean;
  isEmpty: boolean;
  searchActive: boolean;
  canCreate: boolean;
  emptyText?: string;
  searchEmptyText?: string;
  createLabel?: string;
  onAdd: () => void;
}

export default function ProjectsStatePanel({
  loading,
  isEmpty,
  searchActive,
  canCreate,
  emptyText = "No projects have been created for the active organization",
  searchEmptyText = "No projects match your search",
  createLabel = "Create First Project",
  onAdd,
}: ProjectsStatePanelProps) {
  if (loading) {
    return (
      <div className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: 48,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <Loader2
            size={28}
            className="animate-spin"
            style={{ color: "var(--accent)", marginBottom: 12 }}
          />
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Loading Projects...
          </p>
        </div>
      </div>
    );
  }

  if (!isEmpty) {
    return null;
  }

  return (
    <div
      className="card"
      style={{
        padding: 48,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      {/* <FolderTree
        size={36}
        style={{ color: "var(--text-muted)", marginBottom: 12 }}
      /> */}

      <img
        src="/assets/images/img-chibi-confused.png"
        alt="No projects"
        style={{ width: 120, marginBottom: 5 }}
      />
      <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
        {searchActive ? searchEmptyText : emptyText}
      </p>
      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: 16, fontSize: 12 }}
        onClick={onAdd}
        disabled={!canCreate}
      >
        <Plus size={12} /> {createLabel}
      </button>
    </div>
  );
}
